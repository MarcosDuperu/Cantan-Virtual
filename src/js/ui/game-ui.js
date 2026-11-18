// Interfaz de la partida: tablero, jugadores, mano, acciones, comercio y diálogos.
(function (root) {
  const C = root.Catan;
  const { icon, pieceSVG } = C.UIIcons;
  const RES = C.RES;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const DIE = n => {
    const P = { 1: [[2, 2]], 2: [[1, 1], [3, 3]], 3: [[1, 1], [2, 2], [3, 3]], 4: [[1, 1], [1, 3], [3, 1], [3, 3]], 5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]], 6: [[1, 1], [1, 2], [1, 3], [3, 1], [3, 2], [3, 3]] };
    return `<svg viewBox="0 0 40 40" class="die-svg"><rect x="2" y="2" width="36" height="36" rx="7" fill="#fdfaf2" stroke="#7a6a4a" stroke-width="2"/>
      ${(P[n] || []).map(([r, c]) => `<circle cx="${c * 10}" cy="${r * 10}" r="3.6" fill="${n === 1 ? '#c0281c' : '#222'}"/>`).join('')}</svg>`;
  };

  function resRow(r, size = 18) {
    return C.KEYS.concat('gold').filter(k => r[k] > 0).map(k => `<span class="rr">${icon(k, size)}<b>${r[k]}</b></span>`).join('') || '<i>nada</i>';
  }

  class GameUI {
    constructor(container, session, opts) {
      this.el = container;
      this.session = session;
      this.opts = opts || {};
      this.view = null;
      this.mode = null; // modo de interacción: road, ship, settlement, city, moveFrom, moveTo
      this.moveFrom = null;
      this.lastEvent = 0;
      this.lastLog = 0;
      this.lastCurrent = null;
      this.modalKey = null;
      this.chatMsgs = [];
      this.statsSaved = false;
      this.mount();
    }

    mount() {
      this.el.innerHTML = `<div class="game">
        <header class="topbar">
          <button class="tb-btn" data-act="menu" title="Menú">☰</button>
          <div class="tb-title"><span class="logo-sm">CATAN</span><span class="tb-mode"></span></div>
          <div class="tb-turn"></div>
          <div class="tb-bank" title="Cartas en el banco"></div>
          <button class="tb-btn" data-act="costs" title="Tabla de costes">Costes</button>
          <button class="tb-btn" data-act="rules" title="Reglas">Reglas</button>
          <button class="tb-btn" data-act="sound" title="Sonido">${C.Sound.enabled ? '🔊' : '🔈'}</button>
        </header>
        <aside class="players"></aside>
        <main class="board-wrap">
          <div class="status-banner"></div>
          <div class="board"></div>
          <div class="dice-box"></div>
          <div class="trade-float"></div>
          <div class="toasts"></div>
          <div class="reveal-layer"></div>
        </main>
        <aside class="side">
          <div class="side-title">Registro</div>
          <div class="log"></div>
          <div class="side-title">Chat</div>
          <div class="chat-list"></div>
          <form class="chat-form"><input maxlength="300" placeholder="Escribe un mensaje..."><button>➤</button></form>
        </aside>
        <footer class="hand-bar">
          <div class="hand"></div>
          <div class="devs"></div>
          <div class="specials"></div>
          <div class="actions"></div>
        </footer>
        <div class="modal-layer"></div>
      </div>`;
      const q = s => this.el.querySelector(s);
      this.$ = { players: q('.players'), board: q('.board'), banner: q('.status-banner'), dice: q('.dice-box'), trade: q('.trade-float'),
        toasts: q('.toasts'), log: q('.log'), chat: q('.chat-list'), hand: q('.hand'), devs: q('.devs'), specials: q('.specials'), reveal: q('.reveal-layer'), actions: q('.actions'),
        modal: q('.modal-layer'), mode: q('.tb-mode'), turn: q('.tb-turn'), bank: q('.tb-bank') };
      this.board = new C.BoardView(this.$.board, { onClick: (k, id) => this.boardClick(k, id) });
      this.el.querySelector('.topbar').addEventListener('click', e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        C.Sound.play('click');
        const a = b.dataset.act;
        if (a === 'menu') this.openMenu();
        else if (a === 'costs') this.openCosts();
        else if (a === 'rules') this.openRules();
        else if (a === 'sound') { b.textContent = C.Sound.toggle() ? '🔊' : '🔈'; }
      });
      this.el.querySelector('.chat-form').addEventListener('submit', e => {
        e.preventDefault();
        const inp = e.target.querySelector('input');
        if (inp.value.trim()) this.session.chat(inp.value.trim());
        inp.value = '';
      });
      this.$.actions.addEventListener('click', e => this.actionClick(e));
      this.$.devs.addEventListener('click', e => {
        const c = e.target.closest('[data-dev]');
        if (c) this.playDev(c.dataset.dev);
      });
      this.$.trade.addEventListener('click', e => this.tradeClick(e));
      this.keyHandler = e => {
        if (e.target.tagName === 'INPUT') return;
        if (e.key === 'Escape') { this.setMode(null); }
        if (!this.view) return;
        if ((e.key === 'r' || e.key === 'R' || e.key === ' ') && this.canRoll()) { e.preventDefault(); this.send({ type: 'roll' }); }
        if ((e.key === 'e' || e.key === 'E') && (this.isMyMain() || (['move', 'tbMove'].includes(this.view.phase) && this.isMyTurn()))) this.endTurn();
      };
      document.addEventListener('keydown', this.keyHandler);
    }

    destroy() { document.removeEventListener('keydown', this.keyHandler); this.el.innerHTML = ''; }

    send(a) { this.session.send(a); }

    // ---------- helpers de estado ----------
    get me() { return this.view.me; }
    get P() { return this.view.players[this.view.me]; }
    isMyTurn() { return this.view.current === this.me; }
    isMyMain() { return this.view.phase === 'main' && this.isMyTurn(); }
    isMyBuild() { return this.isMyMain() || (this.view.phase === 'specialBuild' && this.view.specialBuilder === this.me); }
    canRoll() { return this.view.phase === 'roll' && this.isMyTurn(); }
    afford(what) { return C.hasRes(this.P.resources, C.COST[what]); }
    pname(pid) { const p = this.view.players[pid]; return `<b class="pn"><i class="dot" style="background:${C.colorHex(p.color)}"></i>${esc(p.name)}</b>`; }

    // ---------- entrada de red ----------
    onState(v) {
      const first = !this.view;
      this.view = v;
      if (first) { this.lastLog = v.logSeq - 12; this.lastEvent = v.events.length ? v.events[v.events.length - 1].seq : 0; }
      if (this.mode && !this.isMyBuild()) this.setMode(null, true);
      this.processEvents(v);
      this.checkSpecials(v, first);
      this.render();
      if (v.current === this.me && this.lastCurrent !== this.me && v.phase === 'roll') {
        C.Sound.play('turn');
        this.toast('¡Es tu turno!', 'big');
      }
      this.lastCurrent = v.current;
    }
    onChat(m) {
      this.chatMsgs.push(m);
      if (this.chatMsgs.length > 80) this.chatMsgs.shift();
      this.renderChat();
      if (m.from !== this.me) C.Sound.play('click');
    }
    onError(msg) { C.Sound.play('error'); this.toast(msg, 'err'); }

    processEvents(v) {
      for (const ev of v.events) {
        if (ev.seq <= this.lastEvent) continue;
        this.lastEvent = ev.seq;
        if (this.isCK() && this.ckEvent(ev, v)) continue;
        if (this.isPE() && this.peEvent(ev, v)) continue;
        if (this.isTB() && this.tbEvent(ev, v)) continue;
        if (this.isSF() && this.sfEvent(ev, v)) continue;
        if (ev.type === 'roll') { this.animateDice(ev.dice, ev.eventDie); C.Sound.play('dice'); }
        else if (ev.type === 'build') C.Sound.play(ev.what);
        else if (ev.type === 'robber') C.Sound.play(ev.pirate ? 'pirate' : 'robber');
        else if (ev.type === 'dev') {
          C.Sound.play('card');
          if (ev.pid === this.me) {
            const c = this.P.devCards[this.P.devCards.length - 1];
            if (c) this.reveal(C.CardArt.devCard(c.type, c.variant), 'Compraste: ' + (c.type === 'vp' ? C.CardArt.VP_VARIANTS[c.variant] + ' (1 PV)' : C.DEV_NAME[c.type]));
          }
        }
        else if (ev.type === 'trade') C.Sound.play('coin');
        else if (ev.type === 'steal') {
          if (ev.from === this.me) this.toast(`${v.players[ev.to].name} te robó 1 ${C.RES_NAME[ev.res]}`, 'err');
          else if (ev.to === this.me) this.toast(`Robaste 1 ${C.RES_NAME[ev.res]} a ${v.players[ev.from].name}`, 'ok');
          C.Sound.play('steal');
        } else if (ev.type === 'produce') {
          const g = ev.got && ev.got[this.me];
          if (g) { this.toast('Recibes ' + resRow(g, 16), 'ok', true); C.Sound.play('coin'); }
        } else if (ev.type === 'playDev') {
          this.reveal(C.CardArt.devCard(ev.card), (ev.pid === this.me ? 'Juegas ' : v.players[ev.pid].name + ' juega ') + C.DEV_NAME[ev.card]);
        } else if (ev.type === 'pair') {
          if (ev.p2 === this.me) { C.Sound.play('turn'); this.toast('¡Juegas como jugador 2 de la pareja!', 'big'); }
        } else if (ev.type === 'win') C.Sound.play('win');
      }
    }

    // ---------- render ----------
    render() {
      const v = this.view;
      this.$.mode.textContent = ' · ' + (this.isPE() ? 'P&E: ' + C.PE.SCENARIOS[v.pe.scenario].name : this.isTB() && v.tb.scenario ? 'M&B: ' + C.TB.SCENARIOS[v.tb.scenario].name : this.isSF() ? this.sfTitle() : C.MODES[v.mode].name) + ' · ' + v.vpTarget + ' PV';
      this.$.turn.textContent = v.phase === 'setup' ? 'Colocación inicial' : v.phase === 'sfHarbor' && v.turn === 0 ? 'Puertos' : 'Turno ' + v.turn;
      if (this.isCK()) {
        this.$.bank.innerHTML = C.KEYS.map(k => `<span class="bk">${icon(k, 16)}${v.bank[k]}</span>`).join('') +
          C.CK.AREAS.map(a => `<span class="bk" title="Cartas de progreso de ${C.CK.AREA_NAME[a]}"><i class="mini-card prog" style="background:${C.CK.AREA_COLOR[a]}"></i>${v.ck.decks[a]}</span>`).join('');
      } else if (this.isPE()) {
        this.$.bank.innerHTML = RES.map(k => `<span class="bk">${icon(k, 18)}${v.bank[k]}</span>`).join('');
      } else {
        this.$.bank.innerHTML = RES.map(k => `<span class="bk">${icon(k, 18)}${v.bank[k]}</span>`).join('') +
          `<span class="bk">${icon('knight', 18)}${v.devDeck}</span>`;
      }
      this.ckRenderTrack();
      this.peRenderPanel();
      this.tbRenderPanel();
      this.sfRenderPanel();
      if (this.impDraw) this.impDraw();
      this.renderPlayers();
      this.renderBanner();
      this.board.render(v, this.highlights());
      this.renderHand();
      this.renderActions();
      this.renderTrade();
      this.peRenderShipPanel();
      this.tbRenderFloat();
      this.renderLog();
      if (!this.diceAnimating) this.renderDice(v.dice);
      this.checkModals();
    }

    renderPlayers() {
      const v = this.view;
      this.$.players.innerHTML = v.players.map(p => {
        const cur = (v.phase === 'specialBuild' ? v.specialBuilder : v.current) === p.id;
        const kind = v.seatKinds ? v.seatKinds[p.id] : (p.bot ? 'bot' : 'local');
        const tags = [];
        if (v.longestRoad === p.id) tags.push(`<span class="badge road" title="Gran Ruta Comercial (+2 PV)"><span class="mini-scard">${C.CardArt.specialCard('longestRoad')}</span>Gran Ruta</span>`);
        if (v.largestArmy === p.id) tags.push(`<span class="badge army" title="Gran Ejército (+2 PV)"><span class="mini-scard">${C.CardArt.specialCard('largestArmy')}</span>Gran Ejército</span>`);
        if (p.islands && p.islands.length) tags.push(`<span class="badge isl" title="Islas colonizadas">⛵ ${p.islands.length} isla(s)</span>`);
        let waiting = '';
        if (v.pendingDiscard && v.pendingDiscard[p.id]) waiting = '<span class="pc-wait">descartando…</span>';
        if (v.pendingGold && v.pendingGold[p.id]) waiting = '<span class="pc-wait">eligiendo oro…</span>';
        const vp = p.id === v.me || v.phase === 'ended' ? (p.vpTotal !== undefined ? p.vpTotal : p.vp) : p.vp;
        const ck = this.isCK() ? this.ckPlayerExtra(p) : this.isPE() ? this.pePlayerExtra(p) : this.isTB() ? this.tbPlayerExtra(p) : null;
        if (ck) tags.push(...ck.tags);
        if (this.isSF()) tags.push(...this.sfTags(p));
        return `<div class="pcard ${cur ? 'current' : ''} ${p.id === v.me ? 'mine' : ''}" style="--pc:${C.colorHex(p.color)}">
          <div class="pc-avatar">${esc(p.avatar || p.name[0])}</div>
          <div class="pc-main">
            <div class="pc-name">${esc(p.name)} ${kind === 'bot' ? '<span class="tag-bot" title="Máquina">IA</span>' : ''}${p.id === v.me ? '<span class="tag-me">Tú</span>' : ''}</div>
            <div class="pc-stats">${ck ? ck.stats : `
              <span title="Cartas de recurso"><i class="mini-card res"></i>${p.resCount}</span>
              <span title="Cartas de desarrollo"><i class="mini-card dev"></i>${p.devCount}</span>
              <span title="Caballeros jugados">${icon('knight', 15)}${p.knights}</span>
              <span title="Ruta comercial más larga">${pieceSVG('road', p.color, 15)}${p.routeLength}</span>`}
            </div>${ck ? ck.bars : ''}
            ${tags.length ? `<div class="pc-badges">${tags.join('')}</div>` : ''}${waiting}
          </div>
          <div class="pc-vp" title="Puntos de victoria${p.id === v.me ? ' (incluye cartas ocultas)' : ' visibles'}">${vp}<small>PV</small></div>
        </div>`;
      }).join('');
    }

    statusText() {
      const v = this.view, me = this.me;
      if (this.isCK()) { const t = this.ckStatus(); if (t) return t; }
      if (this.isPE()) { const t = this.peStatus(); if (t) return t; }
      if (this.isTB()) { const t = this.tbStatus(); if (t) return t; }
      if (this.isSF()) { const t = this.sfStatus(); if (t) return t; }
      const cur = v.players[v.current];
      const who = this.pname(v.current);
      switch (v.phase) {
        case 'setup':
          if (v.current === me) return v.setup.step === 'settlement' ? `Coloca tu ${v.setup.round === 2 ? 'segundo' : 'primer'} poblado` +
            (v.setup.round === 2 ? ' (recibirás sus recursos)' : '') : 'Coloca una carretera' + (C.MODES[v.mode].ships ? ' o un barco' : '') + ' junto a tu poblado';
          return `${who} está colocando ${v.setup.step === 'settlement' ? 'un poblado' : 'una carretera'}…`;
        case 'roll': return v.current === me ? 'Tira los dados (o juega un Caballero antes)' : `Esperando a que ${who} tire los dados…`;
        case 'discard': {
          const why = v.ck && v.discardReturn === 'main' && v.dice && v.dice[0] + v.dice[1] !== 7 ? 'Saboteador' : 'Salió un 7';
          return v.pendingDiscard[me] ? `${why}: descarta ${v.pendingDiscard[me]} cartas` : `${why}: esperando descartes…`;
        }
        case 'gold': return v.pendingGold[me] ? 'Elige tus recursos del río de oro' : 'Esperando elección del oro…';
        case 'robber': return v.current === me ? 'Mueve el ladrón' + (C.MODES[v.mode].ships ? ' o el pirata' : '') + ': haz clic en un hexágono' : `${who} está moviendo el ladrón…`;
        case 'roadBuilding': return v.current === me ? `Construye ${v.freeRoads} carretera(s) gratis` : `${who} construye carreteras gratis…`;
        case 'specialBuild': return v.specialBuilder === me ? 'Fase de construcción especial: puedes construir o comprar' : `Fase de construcción especial: ${this.pname(v.specialBuilder)}`;
        case 'main':
          if (v.current !== me) return v.pair ? `${who} juega como jugador 2 de la pareja…` : `Turno de ${who}`;
          if (this.mode === 'road') return 'Elige dónde construir la carretera (Esc para cancelar)';
          if (this.mode === 'ship') return 'Elige dónde construir el barco (Esc para cancelar)';
          if (this.mode === 'settlement') return 'Elige dónde construir el poblado (Esc para cancelar)';
          if (this.mode === 'city') return 'Elige el poblado a mejorar (Esc para cancelar)';
          if (this.mode === 'moveFrom') return 'Elige el barco a mover';
          if (this.mode === 'moveTo') return 'Elige el nuevo lugar del barco';
          if (v.pair) return 'Eres el <b>jugador 2</b> de la pareja: comercia con el banco, construye y juega cartas';
          return 'Tu turno: construye, comercia o termina el turno';
        case 'ended': return `¡${who} ganó la partida!`;
      }
      return cur ? cur.name : '';
    }

    renderBanner() {
      const mine = this.isMyTurn() || (this.view.pendingDiscard || {})[this.me] || (this.view.pendingGold || {})[this.me] || (this.view.pendingGive || {})[this.me] ||
        (this.view.phase === 'specialBuild' && this.view.specialBuilder === this.me) ||
        (this.view.phase === 'ckChoice' && this.view.ck.choices[0] && this.view.ck.choices[0].pid === this.me) ||
        (this.view.phase === 'tbDamage' && this.view.tb.pending.who.includes(this.me));
      this.$.banner.className = 'status-banner' + (mine ? ' mine' : '');
      this.$.banner.innerHTML = this.statusText();
    }

    highlights() {
      const v = this.view, me = this.me;
      if (this.isCK()) { const h = this.ckHighlights(); if (h) return h; }
      if (this.isPE()) return this.peHighlights();
      if (this.isTB()) { const h = this.tbHighlights(); if (h) return h; }
      if (this.isSF()) { const h = this.sfHighlights(); if (h) return h; }
      const hl = {};
      if (v.phase === 'setup' && v.current === me) {
        if (v.setup.step === 'settlement') hl.vertices = C.validSettlements(v, me, true);
        else hl.edges = this.routeOptions(v.setup.vertex);
      } else if (v.phase === 'robber' && v.current === me) {
        hl.hexes = C.robberHexes(v, me);
      } else if (v.phase === 'roadBuilding' && v.current === me) {
        hl.edges = this.routeOptions();
      } else if (this.isMyBuild() && this.mode) {
        if (this.mode === 'road') hl.edges = C.validRoutes(v, me, 'road');
        if (this.mode === 'ship') hl.edges = C.validRoutes(v, me, 'ship');
        if (this.mode === 'settlement') hl.vertices = C.validSettlements(v, me, false);
        if (this.mode === 'city') hl.vertices = C.validCities(v, me);
        if (this.mode === 'moveFrom') { hl.edges = C.movableShips(v, me); hl.edgeClass = 'move'; }
        if (this.mode === 'moveTo') { hl.edges = C.shipTargets(v, me, this.moveFrom); hl.selected = [this.moveFrom]; }
      }
      return hl;
    }

    routeOptions(setupVertex) {
      const v = this.view, me = this.me, P = this.P;
      const set = new Set();
      if (P.pieces.road > 0) C.validRoutes(v, me, 'road', setupVertex).forEach(e => set.add(e));
      if (P.pieces.ship > 0) C.validRoutes(v, me, 'ship', setupVertex).forEach(e => set.add(e));
      return [...set];
    }

    renderHand() {
      const P = this.P;
      if (this.isCK()) return this.ckRenderHand();
      if (this.isPE()) return this.peRenderHand();
      this.$.hand.innerHTML = RES.map(k => `<div class="rcard r-${k} ${P.resources[k] ? '' : 'empty'}" title="${C.RES_NAME[k]}">
        <div class="rc-art">${icon(k, 46)}</div><div class="rc-name">${C.RES_NAME[k]}</div><div class="rc-count">${P.resources[k]}</div></div>`).join('');
      const groups = new Map();
      (P.devCards || []).forEach(c => {
        const k = c.type === 'vp' ? 'vp:' + (c.variant || 'university') : c.type;
        const g = groups.get(k) || { type: c.type, variant: c.variant, n: 0 };
        g.n++;
        groups.set(k, g);
      });
      const playable = C.playableDev(this.view, this.me);
      const help = C.CardArt.DEV_HELP;
      this.$.devs.classList.toggle('many', groups.size > 4);
      this.$.devs.innerHTML = groups.size ? [...groups.values()].map(g => {
        const name = g.type === 'vp' ? C.CardArt.VP_VARIANTS[g.variant || 'university'] + ' (Punto de Victoria)' : C.DEV_NAME[g.type];
        const can = playable.includes(g.type);
        return `<div class="dcard ${can ? 'playable' : ''}" data-dev="${g.type}" title="${esc(name)}: ${help[g.type]}${can ? ' — clic para jugar' : ''}">
          ${C.CardArt.devCard(g.type, g.variant)}${g.n > 1 ? `<div class="rc-count">${g.n}</div>` : ''}${can ? '<div class="dc-play">Jugar</div>' : ''}</div>`;
      }).join('') : '<div class="devs-empty">Sin cartas de desarrollo</div>';
      const sp = [];
      if (this.view.longestRoad === this.me) sp.push('longestRoad');
      if (this.view.largestArmy === this.me) sp.push('largestArmy');
      this.$.specials.innerHTML = sp.map(k => `<div class="scard" title="${help[k]}">${C.CardArt.specialCard(k)}</div>`).join('');
      if (this.isTB()) this.tbHandExtras();
    }

    renderActions() {
      if (this.isCK()) return this.ckRenderActions();
      if (this.isPE()) return this.peRenderActions();
      const v = this.view, P = this.P, ships = C.MODES[v.mode].ships;
      const build = this.isMyBuild();
      const main = this.isMyMain();
      const btn = (act, label, ic, enabled, cost, extra = '') => `<button class="abtn ${this.mode === act ? 'active' : ''} ${extra}" data-a="${act}" ${enabled ? '' : 'disabled'}>
        <span class="ab-ic">${ic}</span><span class="ab-l">${label}</span>${cost ? `<span class="ab-cost">${RES.filter(k => cost[k]).map(k => icon(k, 13).repeat(cost[k])).join('')}</span>` : ''}</button>`;
      let html = '';
      if (v.phase === 'roll' && this.isMyTurn()) html += `<button class="abtn primary roll" data-a="roll"><span class="ab-ic">${v.tb && v.tb.events ? '🂠' : '🎲'}</span><span class="ab-l">${v.tb && v.tb.events ? 'Carta de evento' : 'Tirar dados'}${v.tb && v.tb.two && v.tb.rolls === 1 ? ' (2.ª)' : ''}</span></button>`;
      if (v.phase === 'roadBuilding' && this.isMyTurn()) html += `<button class="abtn" data-a="endRoadBuilding"><span class="ab-l">Terminar construcción gratis</span></button>`;
      if (v.phase === 'robber' && this.isMyTurn() && C.canPirateFrame(v, this.me)) html += `<button class="abtn" data-a="pirateFrame" title="Reglas 2025: el pirata sale del mar y no roba"><span class="ab-ic">🏴‍☠️</span><span class="ab-l">Pirata al marco</span></button>`;
      html += btn('road', 'Carretera', pieceSVG('road', P.color, 26), build && P.pieces.road > 0 && this.afford('road') && C.validRoutes(v, this.me, 'road').length, C.COST.road);
      if (ships) html += btn('ship', 'Barco', pieceSVG('ship', P.color, 26), build && P.pieces.ship > 0 && this.afford('ship') && C.validRoutes(v, this.me, 'ship').length, C.COST.ship);
      html += btn('settlement', 'Poblado', pieceSVG('settlement', P.color, 26), build && P.pieces.settlement > 0 && this.afford('settlement') && C.validSettlements(v, this.me, false).length, C.COST.settlement);
      html += btn('city', 'Ciudad', pieceSVG('city', P.color, 26), build && P.pieces.city > 0 && this.afford('city') && C.validCities(v, this.me).length, C.COST.city);
      html += btn('dev', 'Carta', icon('knight', 24), build && this.afford('dev') && v.devDeck > 0, C.COST.dev);
      if (ships) html += btn('moveFrom', 'Mover barco', '⛵', main && C.movableShips(v, this.me).length > 0, null);
      html += btn('trade', 'Comerciar', '⇄', main && !v.trade, null);
      if (v.phase === 'specialBuild' && v.specialBuilder === this.me) html += `<button class="abtn primary" data-a="pass"><span class="ab-l">Pasar</span></button>`;
      else {
        const canEnd = main || (this.isTB() && v.phase === 'tbMove' && this.isMyTurn());
        if (this.isTB()) html += this.tbActionsHTML();
        if (this.isSF()) html += this.sfActionsHTML();
        html += `<button class="abtn end ${canEnd ? 'primary' : ''}" data-a="end" ${canEnd ? '' : 'disabled'}><span class="ab-l">Terminar turno</span></button>`;
      }
      html += `<div class="pieces-left" title="Piezas restantes">${pieceSVG('road', P.color, 16)}${P.pieces.road}
        ${ships ? pieceSVG('ship', P.color, 16) + P.pieces.ship : ''} ${pieceSVG('settlement', P.color, 16)}${P.pieces.settlement} ${pieceSVG('city', P.color, 16)}${P.pieces.city}</div>`;
      this.$.actions.innerHTML = html;
    }

    actionClick(e) {
      const b = e.target.closest('[data-a]');
      if (!b || b.disabled) return;
      C.Sound.play('click');
      const a = b.dataset.a;
      if (this.isCK() && this.ckAction(a)) return;
      if (this.isPE() && this.peAction(a)) return;
      if (this.isTB() && this.tbAction(a)) return;
      if (this.isSF() && this.sfAction(a)) return;
      if (a === 'roll') this.send({ type: 'roll' });
      else if (a === 'end') this.endTurn();
      else if (a === 'pass') this.send({ type: 'endTurn' });
      else if (a === 'endRoadBuilding') this.send({ type: 'endRoadBuilding' });
      else if (a === 'pirateFrame') this.send({ type: 'moveRobber', frame: true });
      else if (a === 'dev') this.send({ type: 'buyDev' });
      else if (a === 'trade') this.openTrade();
      else if (['road', 'ship', 'settlement', 'city', 'moveFrom'].includes(a)) this.setMode(this.mode === a ? null : a);
    }

    endTurn() {
      this.setMode(null, true);
      if (this.isCK() && this.P.progress.length > 4) { this.openProgressDiscard('Antes de terminar el turno debes quedarte con 4 cartas de progreso como máximo.', true); return; }
      this.send({ type: 'endTurn' });
    }

    setMode(m, silent) {
      this.mode = m;
      this.moveFrom = null;
      if (m !== 'prog') this.prog = null;
      if (m !== 'kto') this.kFrom = null;
      this.peShip = null;
      if (m !== 'tb') this.tbSel = null;
      if (!silent && this.view) this.render();
    }

    boardClick(kind, id) {
      const v = this.view, me = this.me;
      if (this.isCK() && this.ckBoardClick(kind, id)) return;
      if (this.isPE() && this.peBoardClick(kind, id)) return;
      if (this.isTB() && this.tbBoardClick(kind, id)) return;
      if (this.isSF() && this.sfBoardClick(kind, id)) return;
      if (v.phase === 'setup' && v.current === me) {
        if (kind === 'vertex') this.send({ type: 'buildSettlement', vertex: id });
        if (kind === 'edge') this.chooseRouteKind(id, v.setup.vertex);
        return;
      }
      if (v.phase === 'robber' && v.current === me && kind === 'hex') {
        const c = C.stealCandidates(v, me, id);
        if (c.length > 1) this.chooseVictim(id, c);
        else this.send({ type: 'moveRobber', hex: id, victim: c.length ? c[0] : null });
        return;
      }
      if (v.phase === 'roadBuilding' && v.current === me && kind === 'edge') { this.chooseRouteKind(id); return; }
      if (!this.mode) return;
      if (this.mode === 'road' && kind === 'edge') { this.setMode(null); this.send({ type: 'buildRoad', edge: id }); }
      else if (this.mode === 'ship' && kind === 'edge') { this.setMode(null); this.send({ type: 'buildShip', edge: id }); }
      else if (this.mode === 'settlement' && kind === 'vertex') { this.setMode(null); this.send({ type: 'buildSettlement', vertex: id }); }
      else if (this.mode === 'city' && kind === 'vertex') { this.setMode(null); this.send({ type: 'buildCity', vertex: id }); }
      else if (this.mode === 'moveFrom' && kind === 'edge') { this.mode = 'moveTo'; this.moveFrom = id; this.render(); }
      else if (this.mode === 'moveTo' && kind === 'edge') { const from = this.moveFrom; this.setMode(null); this.send({ type: 'moveShip', from, to: id }); }
    }

    chooseRouteKind(edge, setupVertex) {
      const v = this.view, me = this.me, P = this.P;
      const road = P.pieces.road > 0 && C.canPlaceRoute(v, me, edge, 'road', setupVertex);
      const ship = P.pieces.ship > 0 && C.canPlaceRoute(v, me, edge, 'ship', setupVertex);
      if (road && ship) {
        this.modal(`<h2>¿Qué quieres construir?</h2><div class="choice-row">
          <button class="big-choice" data-k="road">${pieceSVG('road', P.color, 48)}<span>Carretera</span></button>
          <button class="big-choice" data-k="ship">${pieceSVG('ship', P.color, 48)}<span>Barco</span></button></div>`, {
          dismiss: true,
          mount: (m, close) => m.addEventListener('click', e => {
            const b = e.target.closest('[data-k]');
            if (b) { close(); this.send({ type: b.dataset.k === 'ship' ? 'buildShip' : 'buildRoad', edge }); }
          })
        });
      } else if (road) this.send({ type: 'buildRoad', edge });
      else if (ship) this.send({ type: 'buildShip', edge });
    }

    chooseVictim(hex, cands) {
      const v = this.view;
      this.modal(`<h2>¿A quién robas?</h2><div class="choice-row">${cands.map(p => `<button class="big-choice" data-p="${p}">
        <div class="pc-avatar" style="--pc:${C.colorHex(v.players[p].color)}">${esc(v.players[p].avatar || v.players[p].name[0])}</div>
        <span>${esc(v.players[p].name)}</span><small>${v.players[p].resCount} cartas</small></button>`).join('')}</div>`, {
        dismiss: true,
        mount: (m, close) => m.addEventListener('click', e => {
          const b = e.target.closest('[data-p]');
          if (b) { close(); this.send({ type: 'moveRobber', hex, victim: +b.dataset.p }); }
        })
      });
    }

    checkSpecials(v, first) {
      for (const [k, label] of [['longestRoad', 'la Gran Ruta Comercial'], ['largestArmy', 'el Gran Ejército']]) {
        const prev = this['prev_' + k];
        this['prev_' + k] = v[k];
        if (first || prev === v[k]) continue;
        if (v[k] !== null) {
          const who = v[k] === this.me ? '¡Obtienes ' : v.players[v[k]].name + ' obtiene ';
          this.reveal(C.CardArt.specialCard(k), who + label + '! (+2 PV)', v[k] === this.me);
        } else if (prev !== null && prev !== undefined) {
          this.toast(v.players[prev].name + ' pierde ' + label);
        }
      }
    }

    // Muestra una carta grande en el centro durante un momento
    reveal(svg, caption, celebrate) {
      this.revealQueue = this.revealQueue || [];
      this.revealQueue.push({ svg, caption, celebrate });
      if (!this.revealing) this.nextReveal();
    }
    nextReveal() {
      const r = this.revealQueue.shift();
      if (!r) { this.revealing = false; return; }
      this.revealing = true;
      const el = document.createElement('div');
      el.className = 'reveal' + (r.celebrate ? ' celebrate' : '');
      el.innerHTML = `<div class="reveal-card">${r.svg}</div><div class="reveal-cap">${esc(r.caption)}</div>`;
      el.addEventListener('click', () => el.classList.add('out'));
      this.$.reveal.appendChild(el);
      if (r.celebrate) C.Sound.play('win');
      setTimeout(() => el.classList.add('out'), 1900);
      setTimeout(() => { el.remove(); this.nextReveal(); }, 2300);
    }

    // ---------- dados ----------
    renderDice(d) {
      if (!d) { this.$.dice.innerHTML = ''; return; }
      if (this.isCK()) { this.$.dice.innerHTML = this.ckDiceHTML(d, this.view.ck.event); return; }
      if (this.isTB() && this.view.tb.events && this.view.tb.lastEvent) { this.$.dice.innerHTML = this.tbEventCardHTML(this.view.tb.lastEvent); return; }
      this.$.dice.innerHTML = `<div class="die">${DIE(d[0])}</div><div class="die">${DIE(d[1])}</div><div class="dice-sum ${d[0] + d[1] === 7 ? 'seven' : ''}">${d[0] + d[1]}</div>`;
    }
    animateDice(final) {
      if (this.isTB() && this.view.tb.events) { this.renderDice(final); return; }
      this.diceAnimating = true;
      let n = 0;
      const tick = () => {
        n++;
        if (n < 9 && this.isCK()) {
          this.$.dice.innerHTML = this.ckDiceHTML(final, null, true);
          setTimeout(tick, 70);
        } else if (n < 9) {
          this.$.dice.innerHTML = `<div class="die rolling">${DIE(1 + Math.floor(Math.random() * 6))}</div><div class="die rolling">${DIE(1 + Math.floor(Math.random() * 6))}</div>`;
          setTimeout(tick, 70);
        } else {
          this.diceAnimating = false;
          this.renderDice(final);
          this.$.dice.classList.remove('land'); void this.$.dice.offsetWidth; this.$.dice.classList.add('land');
        }
      };
      tick();
    }

    // ---------- registro y chat ----------
    renderLog() {
      const v = this.view;
      const atBottom = this.$.log.scrollTop + this.$.log.clientHeight >= this.$.log.scrollHeight - 30;
      this.$.log.innerHTML = v.log.slice(-60).map(l => `<div class="log-line">${l.pid !== null && v.players[l.pid] ?
        `<i class="dot" style="background:${C.colorHex(v.players[l.pid].color)}"></i>` : '<i class="dot sys"></i>'}${esc(l.msg)}</div>`).join('');
      if (atBottom || v.logSeq !== this.lastLog) this.$.log.scrollTop = this.$.log.scrollHeight;
      this.lastLog = v.logSeq;
    }
    renderChat() {
      this.$.chat.innerHTML = this.chatMsgs.map(m => `<div class="chat-line"><i class="dot" style="background:${C.colorHex(m.color)}"></i> <b>${esc(m.name)}:</b> ${esc(m.text)}</div>`).join('');
      this.$.chat.scrollTop = this.$.chat.scrollHeight;
    }

    toast(html, kind = '', raw = false) {
      const t = document.createElement('div');
      t.className = 'toast ' + kind;
      t.innerHTML = raw ? html : esc(html);
      this.$.toasts.appendChild(t);
      setTimeout(() => t.classList.add('out'), kind === 'big' ? 1800 : 2600);
      setTimeout(() => t.remove(), kind === 'big' ? 2300 : 3100);
    }

    // ---------- comercio ----------
    renderTrade() {
      const v = this.view, t = v.trade, me = this.me;
      if (!t || v.phase !== 'main') { this.$.trade.innerHTML = ''; this.$.trade.className = 'trade-float'; return; }
      const from = v.players[t.from];
      let body = '';
      if (t.from === me) {
        const others = v.players.filter(p => p.id !== me && (t.to === null || t.to === p.id));
        body = `<div class="tf-head">Tu oferta</div><div class="tf-deal"><div>Das ${resRow(t.give)}</div><div>Pides ${resRow(t.get)}</div></div>
          <div class="tf-resp">${others.map(p => {
            const r = t.responses[p.id];
            return `<div class="tf-r"><span>${this.pname(p.id)}</span>${r === 'accept' ? `<button class="mini ok" data-tc="${p.id}">Cambiar ✔</button>` :
              r === 'reject' ? '<span class="no">rechaza</span>' : '<span class="wait">pensando…</span>'}</div>`;
          }).join('')}</div><button class="mini" data-tcancel>Cancelar oferta</button>`;
      } else if (t.to === null || t.to === me) {
        const r = t.responses[me];
        const can = C.hasRes(this.P.resources, t.get) && (t.get.gold || 0) <= (this.P.gold || 0);
        body = `<div class="tf-head">${this.pname(t.from)} propone un cambio</div>
          <div class="tf-deal"><div>Te da ${resRow(t.give)}</div><div>Pide ${resRow(t.get)}</div></div>
          ${r ? `<div class="tf-done">Respondiste: ${r === 'accept' ? 'aceptar' : 'rechazar'}</div>` :
            `<div class="tf-btns"><button class="mini ok" data-tr="1" ${can ? '' : 'disabled title="No tienes esas cartas"'}>Aceptar</button><button class="mini no" data-tr="0">Rechazar</button></div>`}`;
      } else {
        body = `<div class="tf-head">${esc(from.name)} negocia con ${esc(v.players[t.to].name)}</div>`;
      }
      this.$.trade.className = 'trade-float show';
      this.$.trade.innerHTML = body;
    }

    tradeClick(e) {
      const v = this.view;
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      if (b.dataset.tc !== undefined) this.send({ type: 'confirmTrade', with: +b.dataset.tc });
      else if (b.dataset.tcancel !== undefined) this.send({ type: 'cancelTrade' });
      else if (b.dataset.tr !== undefined) this.send({ type: 'respondTrade', id: v.trade.id, accept: b.dataset.tr === '1' });
    }

    openTrade() {
      const v = this.view, me = this.me, P = this.P;
      const ratios = C.tradeRatios(v, me);
      const KS = this.cardKeys();
      // con jugadores, en Piratas y Exploradores también se comercia oro
      const gt = C.goldTrades(v);
      const KT = gt ? KS.concat('gold') : KS;
      const hand = gt ? Object.assign({}, P.resources, { gold: P.gold || 0 }) : P.resources;
      const zero = () => Object.fromEntries(KT.map(k => [k, 0]));
      const st = { tab: 'bank', give: null, get: null, n: 1, offerGive: zero(), offerGet: zero(), to: 'all' };
      const draw = (m) => {
        const others = v.players.filter(p => p.id !== me);
        const bankOnly = !!v.pair || (this.isPE() && v.pe.p2) || (this.isTB() && v.tb.p2);
        if (bankOnly) st.tab = 'bank';
        let html = `<h2>Comerciar</h2><div class="tabs"><button class="tab ${st.tab === 'bank' ? 'on' : ''}" data-tab="bank">${this.isPE() ? 'Banco' : 'Banco y puertos'}</button>
          ${bankOnly ? '' : `<button class="tab ${st.tab === 'players' ? 'on' : ''}" data-tab="players">Con jugadores</button>`}</div>`;
        if (st.tab === 'bank') {
          const maxN = st.give ? Math.floor(P.resources[st.give] / ratios[st.give]) : 0;
          if (st.n > maxN) st.n = Math.max(1, maxN);
          html += `<div class="tr-label">Entregas</div><div class="res-pick ${KS.length > 5 ? 'wide8' : ''}">${KS.map(k => `<button class="rp ${st.give === k ? 'on' : ''}" data-give="${k}" ${P.resources[k] >= ratios[k] ? '' : 'disabled'}>
              ${icon(k, 34)}<span>${C.RES_NAME[k]}</span><small>${ratios[k]}:1 · tienes ${P.resources[k]}</small></button>`).join('')}</div>
            <div class="tr-label">Recibes</div><div class="res-pick ${KS.length > 5 ? 'wide8' : ''}">${KS.map(k => `<button class="rp ${st.get === k ? 'on' : ''}" data-get="${k}" ${k !== st.give && v.bank[k] > 0 ? '' : 'disabled'}>
              ${icon(k, 34)}<span>${C.RES_NAME[k]}</span><small>banco ${v.bank[k]}</small></button>`).join('')}</div>
            <div class="tr-foot">${st.give && st.get ? `<div class="stepper"><button data-n="-1">−</button><b>${st.n}</b><button data-n="1">+</button></div>
              <span>${st.n * ratios[st.give]} ${C.RES_NAME[st.give]} → ${st.n} ${C.RES_NAME[st.get]}</span>` : '<span>Elige qué das y qué recibes</span>'}
              <button class="btn primary" data-bank ${st.give && st.get && maxN >= 1 ? '' : 'disabled'}>Cambiar</button></div>`;
        } else {
          const counter = (obj, key, lim) => KT.map(k => `<div class="cnt">${icon(k, 30)}<div class="stepper"><button data-c="${key}:${k}:-1">−</button><b>${obj[k]}</b>
            <button data-c="${key}:${k}:1" ${lim && obj[k] >= lim[k] ? 'disabled' : ''}>+</button></div></div>`).join('');
          const sum = r => KT.reduce((a, k) => a + (r[k] || 0), 0);
          const ok = sum(st.offerGive) > 0 && sum(st.offerGet) > 0 && KT.every(k => !(st.offerGive[k] && st.offerGet[k]));
          html += `<div class="tr-label">Ofreces (de tu mano)</div><div class="cnt-row ${KT.length > 5 ? 'k8' : ''}">${counter(st.offerGive, 'g', hand)}</div>
            <div class="tr-label">Pides</div><div class="cnt-row ${KT.length > 5 ? 'k8' : ''}">${counter(st.offerGet, 'w', null)}</div>
            <div class="tr-foot"><label>Para: <select data-to><option value="all">Todos</option>${others.map(p => `<option value="${p.id}" ${String(st.to) === String(p.id) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
            <button class="btn primary" data-offer ${ok ? '' : 'disabled'}>Enviar oferta</button></div>`;
        }
        m.innerHTML = html + '<button class="modal-x" data-close>×</button>';
      };
      this.modal('', {
        dismiss: true, cls: 'wide',
        mount: (m, close) => {
          draw(m);
          m.addEventListener('click', e => {
            const b = e.target.closest('button');
            if (!b || b.disabled) return;
            if (b.dataset.close !== undefined) return close();
            if (b.dataset.tab) st.tab = b.dataset.tab;
            if (b.dataset.give) { st.give = b.dataset.give; if (st.get === st.give) st.get = null; }
            if (b.dataset.get) st.get = b.dataset.get;
            if (b.dataset.n) st.n = Math.max(1, st.n + +b.dataset.n);
            if (b.dataset.c) {
              const [key, k, d] = b.dataset.c.split(':');
              const obj = key === 'g' ? st.offerGive : st.offerGet;
              obj[k] = Math.max(0, obj[k] + +d);
            }
            if (b.dataset.bank !== undefined) { this.send({ type: 'bankTrade', give: st.give, get: st.get, count: st.n }); close(); return; }
            if (b.dataset.offer !== undefined) {
              this.send({ type: 'offerTrade', give: st.offerGive, get: st.offerGet, to: st.to === 'all' ? undefined : +st.to });
              close(); return;
            }
            draw(m);
          });
          m.addEventListener('change', e => { if (e.target.dataset.to !== undefined) st.to = e.target.value; });
        }
      });
    }

    // ---------- cartas de desarrollo ----------
    playDev(type) {
      const v = this.view;
      if (!C.playableDev(v, this.me).includes(type)) {
        if (type === 'vp') this.toast('Los puntos de victoria cuentan automáticamente');
        else if (v.devPlayed) this.toast('Ya jugaste una carta de desarrollo este turno');
        else if (!this.isMyTurn()) this.toast('Solo puedes jugar cartas en tu turno');
        else this.toast('No puedes jugar una carta comprada en este turno');
        return;
      }
      if (type === 'knight' || type === 'roadBuilding' || type === 'swiftJourney') {
        const txt = type === 'swiftJourney' ? C.CardArt.DEV_HELP.swiftJourney : type === 'roadBuilding' ? 'Construyes 2 carreteras gratis.'
          : v.tb && v.tb.scenario === 5 ? 'Mueves un bárbaro; si lo pones sobre una carretera, robas 1 carta a su dueño.' : 'Moverás el ladrón y robarás una carta.';
        this.confirm(`¿Jugar ${C.DEV_NAME[type]}?`, txt, () => this.send({ type: 'playDev', card: type }));
      } else if (type === 'yearOfPlenty') {
        this.pickResources('Descubrimiento', 'Elige 2 recursos del banco', 2, v.bank, r => this.send({ type: 'playDev', card: 'yearOfPlenty', resources: r }), true);
      } else if (type === 'monopoly') {
        this.modal(`<h2>Monopolio</h2><p>Todos los jugadores te entregan todas sus cartas del recurso que elijas.</p>
          <div class="res-pick">${RES.map(k => `<button class="rp" data-m="${k}">${icon(k, 40)}<span>${C.RES_NAME[k]}</span></button>`).join('')}</div>`, {
          dismiss: true,
          mount: (m, close) => m.addEventListener('click', e => {
            const b = e.target.closest('[data-m]');
            if (b) { close(); this.send({ type: 'playDev', card: 'monopoly', resource: b.dataset.m }); }
          })
        });
      }
    }

    // ---------- diálogos obligatorios ----------
    checkModals() {
      const v = this.view, me = this.me;
      let key = null;
      if (v.phase === 'discard' && v.pendingDiscard[me]) key = 'discard:' + v.rollSeq;
      else if (v.phase === 'gold' && v.pendingGold[me]) key = 'gold:' + v.rollSeq + ':' + v.turn + ':' + v.setup.index;
      else if (v.phase === 'ended') key = 'end';
      else if (this.isCK()) key = this.ckModalKey();
      else if (this.isTB()) key = this.tbModalKey();
      else if (this.isSF()) key = this.sfModalKey();
      if (this.modalKey && this.modalKey !== key && this.forcedClose) { this.forcedClose(); this.forcedClose = null; this.modalKey = null; }
      if (!key || key === this.modalKey) return;
      this.modalKey = key;
      if (key.startsWith('discard')) {
        const n = v.pendingDiscard[me];
        const lim = this.isCK() ? C.CK.handLimit(v, me) : 7;
        const why = v.ck && v.discardReturn === 'main' && v.dice && v.dice[0] + v.dice[1] !== 7 ? 'Saboteador' : '¡Salió un 7!';
        this.forcedClose = this.pickResources(why, why === 'Saboteador' ? `Debes descartar ${n} cartas` : `Tienes más de ${lim} cartas: descarta ${n}`, n, this.P.resources, r => this.send({ type: 'discard', resources: r }), false, true, this.cardKeys());
      } else if (key.startsWith('gold')) {
        const n = v.pendingGold[me];
        this.forcedClose = this.pickResources(v.sf && v.sf.goldWhy ? v.sf.goldWhy : 'Río de oro', `Elige ${n} recurso(s) del banco`, n, v.bank, r => this.send({ type: 'chooseGold', resources: r }), false);
      } else if (key === 'end') {
        this.showGameOver();
      } else if (this.isTB()) {
        this.forcedClose = this.tbOpenModal(key);
      } else if (this.isSF()) {
        this.forcedClose = this.sfOpenModal(key);
      } else {
        this.forcedClose = this.ckOpenModal(key);
      }
    }

    pickResources(title, sub, n, limits, onDone, dismiss, fromHand, keys) {
      keys = keys || RES;
      const sel = {};
      keys.forEach(k => { sel[k] = 0; limits[k] = limits[k] || 0; });
      let closeFn;
      const draw = m => {
        const tot = C.total(sel);
        m.innerHTML = `<h2>${title}</h2><p>${sub}</p><div class="cnt-row big ${keys.length > 5 ? 'k8' : ''}">${keys.map(k => `<div class="cnt">${icon(k, 40)}<small>${C.RES_NAME[k]}${fromHand ? ' (' + limits[k] + ')' : ''}</small>
          <div class="stepper"><button data-c="${k}:-1" ${sel[k] ? '' : 'disabled'}>−</button><b>${sel[k]}</b><button data-c="${k}:1" ${tot < n && sel[k] < limits[k] ? '' : 'disabled'}>+</button></div></div>`).join('')}</div>
          <div class="tr-foot"><span>${tot} / ${n}</span><button class="btn primary" data-ok ${tot === n ? '' : 'disabled'}>Confirmar</button></div>
          ${dismiss ? '<button class="modal-x" data-close>×</button>' : ''}`;
      };
      closeFn = this.modal('', {
        dismiss: !!dismiss,
        mount: (m, close) => {
          draw(m);
          m.addEventListener('click', e => {
            const b = e.target.closest('button');
            if (!b || b.disabled) return;
            if (b.dataset.close !== undefined) return close();
            if (b.dataset.c) { const [k, d] = b.dataset.c.split(':'); sel[k] += +d; draw(m); }
            if (b.dataset.ok !== undefined) { close(); onDone(Object.assign({}, sel)); }
          });
        }
      });
      return closeFn;
    }

    showGameOver() {
      const v = this.view;
      const rank = v.players.slice().sort((a, b) => (b.vpTotal || b.vp) - (a.vpTotal || a.vp));
      const won = v.winner === this.me;
      if (!this.statsSaved && this.opts.onGameEnd) { this.statsSaved = true; this.opts.onGameEnd(won); }
      this.modal(`<div class="gameover ${won ? 'won' : ''}"><div class="go-crown">${icon('vp', 70)}</div>
        <h1>${won ? '¡Has ganado!' : '¡' + esc(v.players[v.winner].name) + ' gana!'}</h1>
        <div class="go-rank">${rank.map((p, i) => `<div class="go-row"><span class="go-pos">${i + 1}º</span><span class="pc-avatar" style="--pc:${C.colorHex(p.color)}">${esc(p.avatar || p.name[0])}</span>
          <span class="go-name">${esc(p.name)}</span><span class="go-vp">${p.vpTotal !== undefined ? p.vpTotal : p.vp} PV</span></div>`).join('')}</div>
        <div class="go-btns"><button class="btn" data-stay>Ver tablero</button><button class="btn primary" data-exit>Volver al menú</button></div></div>`, {
        mount: (m, close) => m.addEventListener('click', e => {
          if (e.target.closest('[data-exit]')) { close(); this.exit(); }
          if (e.target.closest('[data-stay]')) { close(); }
        })
      });
    }

    // ---------- menús ----------
    openMenu() {
      this.modal(`<h2>Menú</h2><div class="menu-col">
        <button class="btn" data-m="resume">Continuar</button>
        <button class="btn" data-m="rules">Reglas</button>
        ${root.desktop ? '<button class="btn" data-m="full">Pantalla completa</button>' : ''}
        <button class="btn danger" data-m="leave">Abandonar partida</button></div>`, {
        dismiss: true,
        mount: (m, close) => m.addEventListener('click', e => {
          const b = e.target.closest('[data-m]');
          if (!b) return;
          const a = b.dataset.m;
          close();
          if (a === 'rules') this.openRules();
          if (a === 'full') root.desktop.toggleFullscreen();
          if (a === 'leave') this.confirm('¿Abandonar la partida?', 'Volverás al menú principal.', () => this.exit());
        })
      });
    }
    openCosts() {
      const row = (piece, name, cost, pts) => `<div class="cost-row"><span class="cr-p">${piece}</span><span class="cr-n">${name}</span>
        <span class="cr-c">${RES.filter(k => cost[k]).map(k => icon(k, 22).repeat(cost[k])).join('')}</span><span class="cr-v">${pts}</span></div>`;
      const col = this.P.color;
      if (this.isCK()) { this.modal(this.ckCosts(), { dismiss: true, cls: 'wide' }); return; }
      if (this.isPE()) { this.modal(this.peCosts(), { dismiss: true, cls: 'wide' }); return; }
      if (this.isTB() && this.view.tb.scenario) { this.modal(this.tbCosts(), { dismiss: true, cls: 'wide' }); return; }
      this.modal(`<h2>Costes de construcción</h2><div class="costs">
        ${row(pieceSVG('road', col, 30), 'Carretera', C.COST.road, '0 PV')}
        ${C.MODES[this.view.mode].ships ? row(pieceSVG('ship', col, 30), 'Barco', C.COST.ship, '0 PV') : ''}
        ${row(pieceSVG('settlement', col, 30), 'Poblado', C.COST.settlement, '1 PV')}
        ${row(pieceSVG('city', col, 30), 'Ciudad', C.COST.city, '2 PV')}
        ${row(icon('knight', 30), 'Carta de desarrollo', C.COST.dev, '?')}</div>
        <p class="muted">Gran Ruta Comercial (5+ tramos seguidos) y Gran Ejército (3+ caballeros): 2 PV cada uno.</p>`, { dismiss: true });
    }
    openRules() {
      const rk = { cities56: 'citiesAll', extended: 'classic56', explorers56: 'explorers', traders56: 'traders', seafarers56: 'seafarersAll' }[this.view.mode] || this.view.mode;
      this.modal(`<div class="rules-modal">${C.RULES_TEXT[rk] || ''}</div><button class="modal-x" data-close>×</button>`, {
        dismiss: true, cls: 'wide',
        mount: (m, close) => m.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); })
      });
    }
    confirm(title, text, onYes) {
      this.modal(`<h2>${title}</h2><p>${text}</p><div class="go-btns"><button class="btn" data-no>Cancelar</button><button class="btn primary" data-yes>Aceptar</button></div>`, {
        dismiss: true,
        mount: (m, close) => m.addEventListener('click', e => {
          if (e.target.closest('[data-yes]')) { close(); onYes(); }
          if (e.target.closest('[data-no]')) close();
        })
      });
    }

    modal(html, { dismiss, mount, cls } = {}) {
      const back = document.createElement('div');
      back.className = 'modal-back';
      const box = document.createElement('div');
      box.className = 'modal ' + (cls || '');
      box.innerHTML = html;
      back.appendChild(box);
      this.$.modal.appendChild(back);
      let closed = false;
      const close = () => { if (closed) return; closed = true; back.classList.add('out'); setTimeout(() => back.remove(), 150); };
      if (dismiss) back.addEventListener('mousedown', e => { if (e.target === back) close(); });
      if (mount) mount(box, close);
      return close;
    }

    exit() {
      this.session.leave();
      this.destroy();
      if (this.opts.onExit) this.opts.onExit();
    }
  }

  C.GameUI = GameUI;
  C.esc = esc;
})(window);
