// Interfaz de Mercaderes y Bárbaros (escenarios y variantes): amplía la pantalla de partida (GameUI).
(function (root) {
  const C = root.Catan;
  const TB = C.TB;
  const { icon, pieceSVG } = C.UIIcons;
  const esc = C.esc;
  const RES = C.RES;
  const G = C.GameUI.prototype;
  const costHTML = (cost, size = 12) => RES.filter(k => cost[k]).map(k => icon(k, size).repeat(cost[k])).join('');
  const GOOD_ICON = { glass: '🔷', marble: '⬜', sand: '🟨', tools: '🔨' };

  G.isTB = function () { return !!(this.view && this.view.tb); };
  const scn = v => v.tb.scenario;

  // ---------- panel ----------
  G.tbRenderPanel = function () {
    let el = this.$.tbPanel;
    if (!el) {
      el = this.$.tbPanel = document.createElement('div');
      el.className = 'pe-panel tb-panel';
      this.el.querySelector('.board-wrap').appendChild(el);
    }
    if (!this.isTB()) { el.style.display = 'none'; return; }
    const v = this.view, T = v.tb;
    const lines = [];
    const pn = id => `<b style="color:${C.colorHex(v.players[id].color)}">${esc(v.players[id].name)}</b>`;
    if (T.events) lines.push(`🂠 Cartas de evento: quedan ${T.eventDeck}${T.lastEvent ? ` · última: <b>${T.lastEvent.n}</b> ${T.lastEvent.type !== 'none' ? esc(TB.EVENT_NAME[T.lastEvent.type]) : ''}` : ''}`);
    if (T.harbormaster) lines.push(`⚓ Señor del puerto: ${T.harborHolder !== null ? pn(T.harborHolder) : 'nadie (3 puntos de puerto)'}`);
    if (T.two) lines.push(`⚑ Catan para dos: ${v.players.filter(p => p.neutral).length} neutrales`);
    if (T.pairs) lines.push(`👥 Jugadores en pareja${T.p2 ? `: juega ${pn(T.p2.p2)} (jugador 2)` : ''}`);
    switch (scn(v)) {
      case 1: lines.push(`${icon('fish', 14)} Fichas en la bolsa: ${T.fishBag}`, `🥾 Bota vieja: ${T.boot !== null ? pn(T.boot) + ' (necesita 1 PV más)' : 'en el agua'}`); break;
      case 2: {
        const r = TB.coinRanks(v);
        lines.push(`🪙 Más rico (+1 PV): ${r.rich !== null ? pn(r.rich) : 'nadie'}`, `Más pobres (−2 PV): ${r.poor.map(pn).join(', ')}`);
        break;
      }
      case 3: lines.push(`🐪 Camellos: ${T.camelsLeft} en reserva · ${T.caravans.length} caravana(s)`); break;
      case 4: lines.push(`⚔ Bárbaros en reserva: ${T.barbSupply}`, `Hexágonos conquistados: ${v.board.hexes.filter(h => h.conquered).length}`); break;
      case 5: lines.push(`📦 Mercancías: castillo ${T.stacks.castle} · cantera ${T.stacks.quarry} · vidriería ${T.stacks.glassworks}`); break;
    }
    if (!lines.length) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.innerHTML = `<div class="pm-head"><b>${scn(v) ? esc(TB.SCENARIOS[scn(v)].name) : 'Variantes'}</b><small>Mercaderes y Bárbaros</small></div>` +
      lines.map(l => `<div class="pm-note">${l}</div>`).join('');
  };

  // ---------- jugadores ----------
  G.tbPlayerExtra = function (p) {
    const v = this.view, T = v.tb;
    if (p.neutral) return { stats: `<span class="muted">Jugador neutral (no juega ni gana)</span>`, bars: '', tags: [] };
    let stats = `<span title="Cartas de recurso"><i class="mini-card res"></i>${p.resCount}</span>`;
    if (scn(v) <= 3) stats += `<span title="Cartas de desarrollo"><i class="mini-card dev"></i>${p.devCount}</span><span title="Caballeros jugados">${icon('knight', 15)}${p.knights}</span>`;
    if (TB.usesGold(v)) stats += `<span title="Oro">${icon('gold', 15)}${p.gold}</span>`;
    if (scn(v) === 1) stats += `<span title="Fichas de pescado">${icon('fish', 15)}${p.fishCount}</span>`;
    if (scn(v) === 4) stats += `<span title="Caballeros en el tablero">${icon('knight', 15)}${TB.knightsOnBoard(v, p.id)}</span><span title="Prisioneros (2 = 1 PV)">⛓${p.prisoners}</span>`;
    if (scn(v) === 5) stats += `<span title="Mercancías entregadas (1 PV cada una)">📦${p.delivered}</span><span title="Nivel del tren de equipaje">🛒${p.wagon.level}</span>`;
    if (T.two && scn(v) !== 1) stats += `<span title="Fichas de comercio">🎫${p.tokens}</span>`;
    if (scn(v) !== 5) stats += `<span title="Ruta comercial más larga">${pieceSVG('road', p.color, 15)}${p.routeLength}</span>`;
    const tags = [];
    if (T.harborHolder === p.id) tags.push(`<span class="badge isl" title="Señor del puerto (+2 PV)">⚓ Señor del puerto</span>`);
    if (T.boot === p.id) tags.push(`<span class="badge army" title="Necesita 1 PV más para ganar">🥾 Bota vieja</span>`);
    if (scn(v) === 2) { const r = TB.coinRanks(v); if (r.rich === p.id) tags.push('<span class="badge road">🪙 Más rico +1</span>'); if (r.poor.includes(p.id)) tags.push('<span class="badge army">Pobre −2</span>'); }
    if (p.damaged !== null && p.damaged !== undefined) tags.push('<span class="badge army" title="Carretera dañada por el terremoto">🚧 Carretera dañada</span>');
    if (scn(v) === 5 && p.cargo) tags.push(`<span class="badge road" title="Lleva ${TB.GOOD_NAME[p.cargo]} a ${TB.PLAZA_NAME[TB.GOOD_DEST[p.cargo]]}">${GOOD_ICON[p.cargo]} ${TB.GOOD_NAME[p.cargo]}</span>`);
    return { stats, bars: '', tags };
  };

  // ---------- estado ----------
  G.tbStatus = function () {
    const v = this.view, me = this.me, T = v.tb;
    const who = this.pname(v.current);
    const mine = v.current === me;
    switch (v.phase) {
      case 'tbGive': {
        const pair = T.pending.pairs.find(x => x.from === me);
        return pair ? 'Evento: entrega 1 recurso' : 'Esperando la entrega de recursos…';
      }
      case 'tbVote': {
        const V = T.vote;
        return V.order[V.idx] === me ? 'Votación del camello: elige un camino (resaltado) y cuánta lana/cereal ofreces' : `Votación del camello: vota ${this.pname(V.order[V.idx])}…`;
      }
      case 'tbSteal': return mine ? 'Elige a quién robar 1 carta' : `${who} elige a quién robar…`;
      case 'tbNeutral': return mine ? `Construye gratis ${T.neutralBuild.kind === 'road' ? 'una carretera' : 'un poblado'} para un jugador neutral (resaltado)` : `${who} construye para un neutral…`;
      case 'tbKnight': return mine ? 'Coloca tu caballero en un camino resaltado' : `${who} coloca un caballero…`;
      case 'tbTreason': return mine ? 'Traición: elige un hexágono con bárbaros y luego a dónde mandarlo (hasta 2)' : `${who} mueve bárbaros…`;
      case 'tbBarbarian': return mine ? (this.tbSel && this.tbSel.barb !== undefined ? 'Elige el camino al que mandas al bárbaro' : 'Elige el bárbaro que vas a mover') : `${who} mueve un bárbaro…`;
      case 'tbMove':
        if (!mine) return `${who} mueve ${scn(v) === 4 ? 'sus caballeros' : 'su carreta'}…`;
        if (scn(v) === 4) return this.tbSel && this.tbSel.knight !== undefined ? 'Elige el destino del caballero' : 'Fase de movimiento: mueve tus caballeros (deben salir del castillo) o termina el turno';
        if (this.tbSel && this.tbSel.drive !== undefined) return 'Elige a dónde mandar al bárbaro (luego se tira el dado)';
        return 'Fase de movimiento: mueve tu carreta a un cruce resaltado o termina el turno';
      case 'main':
        if (!mine) return T.p2 ? `${who} juega como jugador 2 de la pareja…` : null;
        if (this.mode === 'bridge') return 'Elige un sitio de puente (Esc para cancelar)';
        if (T.p2) return 'Eres el <b>jugador 2</b>: comercia con el banco y construye';
        if (T.two && T.rolls === 1) return null;
        return null;
      case 'roll': {
        const what = T.events ? 'roba una carta de evento' : 'tira los dados';
        if (!mine) return `Esperando a que ${who} ${T.events ? 'robe una carta de evento' : 'tire los dados'}…`;
        if (T.two && T.rolls === 1) return 'Catan para dos: ' + what + ' otra vez' + (T.events ? '' : ' (debe dar otro número)');
        const pre = scn(v) === 4 ? '' : ' (o juega un Caballero antes)';
        return what.charAt(0).toUpperCase() + what.slice(1) + pre;
      }
    }
    return null;
  };

  // ---------- resaltados ----------
  G.tbHighlights = function () {
    const v = this.view, me = this.me, T = v.tb;
    if (v.phase === 'tbVote' && T.vote.order[T.vote.idx] === me) {
      const opts = TB.camelOptions(v);
      const sel = this.tbVotePref !== undefined && opts[this.tbVotePref] ? [opts[this.tbVotePref].edge] : [];
      return { edges: opts.map(o => o.edge), edgeClass: 'move', selected: sel };
    }
    if (v.current !== me) return null;
    switch (v.phase) {
      case 'tbNeutral': {
        const opts = TB.neutralOptions(v, T.neutralBuild.kind);
        return T.neutralBuild.kind === 'road' || !opts.some(o => o.kind === 'settlement') ? { edges: opts.map(o => o.at) } : { vertices: opts.map(o => o.at) };
      }
      case 'tbKnight': return { edges: TB.knightSpots(v, T.knightPlace.any) };
      case 'tbTreason': {
        const sel = this.tbSel || {};
        if (sel.from === undefined) return { hexes: v.board.hexes.filter(h => h.coastal && h.barbs && !(sel.moves || []).some(m => m.from === h.id)).map(h => h.id) };
        return { hexes: v.board.hexes.filter(h => h.coastal && !h.conquered && h.barbs < 3 && h.id !== sel.from).map(h => h.id), selectedHexes: [sel.from] };
      }
      case 'tbBarbarian': {
        const sel = this.tbSel || {};
        if (sel.barb === undefined) return { edges: T.barbs.slice(), edgeClass: 'move' };
        return { edges: TB.barbFreeEdges(v), selected: [sel.barb] };
      }
      case 'tbMove': {
        const sel = this.tbSel || {};
        if (scn(v) === 4) {
          const own = Object.keys(T.knights).map(Number).filter(e => T.knights[e].owner === me);
          if (sel.knight !== undefined && T.knights[sel.knight]) {
            const k = T.knights[sel.knight];
            const tg = sel.boost && !k.boost ? [...knightReach5(v, sel.knight, k)] : TB.knightTargets(v, sel.knight).map(t => t.edge);
            return { edges: tg, selected: [sel.knight], edgeClass: 'move' };
          }
          return { edges: own, edgeClass: 'move' };
        }
        if (scn(v) === 5) {
          const P = this.P;
          if (sel.drive !== undefined) return { edges: TB.barbFreeEdges(v), selected: [sel.drive] };
          const near = P.wagon.level >= 2 ? T.barbs.filter(e => v.board.edges[e].v.includes(P.wagon.v) && !P.wagon.tried.includes(e)) : [];
          return { vertices: [...TB.wagonReach(v, me).keys()], vertexR: 10, edges: near, edgeClass: 'move' };
        }
        return {};
      }
      case 'main':
        if (this.mode === 'bridge') return { edges: TB.bridgeSpots(v, me) };
        return null;
    }
    return null;
  };
  // caminos a los que llega un caballero si paga 1 cereal (5 en vez de 3)
  function knightReach5(v, from, k) {
    const E = v.board.edges, V = v.board.vertices;
    const dist = new Map([[from, 0]]);
    const q = [from];
    while (q.length) {
      const e = q.shift(), d = dist.get(e);
      if (d >= 5 - k.used) continue;
      for (const x of E[e].v) for (const n of V[x].edges) { if (!dist.has(n) && E[n].land) { dist.set(n, d + 1); q.push(n); } }
    }
    dist.delete(from);
    return [...dist.keys()].filter(e => !v.tb.knights[e]);
  }

  G.tbBoardClick = function (kind, id) {
    const v = this.view, me = this.me, T = v.tb;
    if (v.phase === 'tbVote') {
      if (kind === 'edge' && T.vote.order[T.vote.idx] === me) { this.tbVotePref = TB.camelOptions(v).findIndex(o => o.edge === id); this.render(); }
      return true;
    }
    if (v.current !== me) return false;
    switch (v.phase) {
      case 'tbNeutral': {
        const o = TB.neutralOptions(v, T.neutralBuild.kind).find(x => x.at === id);
        if (o) this.send({ type: 'neutralBuild', pid: o.pid, at: o.at });
        return true;
      }
      case 'tbKnight': if (kind === 'edge') this.send({ type: 'placeKnight', edge: id }); return true;
      case 'tbTreason': {
        if (kind !== 'hex') return true;
        const sel = this.tbSel = this.tbSel || { moves: [] };
        if (sel.from === undefined) { sel.from = id; this.render(); return true; }
        sel.moves.push({ from: sel.from, to: id });
        sel.from = undefined;
        if (sel.moves.length >= 2 || !v.board.hexes.some(h => h.coastal && h.barbs && !sel.moves.some(m => m.from === h.id))) { this.tbSel = null; this.send({ type: 'treason', moves: sel.moves }); }
        else this.render();
        return true;
      }
      case 'tbBarbarian': {
        if (kind !== 'edge') return true;
        const sel = this.tbSel = this.tbSel || {};
        if (sel.barb === undefined) { if (T.barbs.includes(id)) { sel.barb = id; this.render(); } return true; }
        this.tbSel = null;
        this.send({ type: 'moveBarbarian', from: sel.barb, to: id });
        return true;
      }
      case 'tbMove': {
        const sel = this.tbSel = this.tbSel || {};
        if (scn(v) === 4 && kind === 'edge') {
          if (sel.knight !== undefined && T.knights[sel.knight] && id !== sel.knight && !T.knights[id]) {
            this.tbSel = null;
            this.send({ type: 'moveKnight', from: sel.knight, to: id, boost: !!sel.boost });
          } else if (T.knights[id] && T.knights[id].owner === me) { this.tbSel = { knight: id }; this.render(); }
          return true;
        }
        if (scn(v) === 5) {
          if (sel.drive !== undefined && kind === 'edge') { this.tbSel = null; this.send({ type: 'driveBarbarian', edge: sel.drive, to: id }); return true; }
          if (kind === 'edge' && T.barbs.includes(id)) { this.tbSel = { drive: id }; this.render(); return true; }
          if (kind === 'vertex') this.send({ type: 'moveWagon', to: id });
          return true;
        }
        return true;
      }
      case 'main':
        if (this.mode === 'bridge' && kind === 'edge') { this.setMode(null); this.send({ type: 'buildBridge', edge: id }); return true; }
        return false;
    }
    return false;
  };

  // ---------- panel flotante (votación, caballero seleccionado, carreta) ----------
  G.tbRenderFloat = function () {
    let el = this.$.tbFloat;
    if (!el) {
      el = this.$.tbFloat = document.createElement('div');
      el.className = 'pe-ship';
      this.el.querySelector('.board-wrap').appendChild(el);
      el.addEventListener('click', e => this.tbFloatClick(e));
    }
    const hide = () => { el.className = 'pe-ship'; el.innerHTML = ''; };
    if (!this.isTB()) return hide();
    const v = this.view, me = this.me, T = v.tb, P = this.P;
    if (v.phase === 'tbVote' && T.vote.order[T.vote.idx] === me) {
      const b = this.tbBid = this.tbBid || { sheep: 0, wheat: 0 };
      const opts = TB.camelOptions(v);
      if (this.tbVotePref === undefined || !opts[this.tbVotePref]) this.tbVotePref = 0;
      el.className = 'pe-ship show';
      el.innerHTML = `<div class="tf-head">🐪 Votación del camello</div>
        <div class="ps-hint">Haz clic en un camino resaltado para elegir dónde quieres el camello. Cada lana o cereal que ofrezcas es un voto (se pierden).</div>
        <div class="ps-btns">${['sheep', 'wheat'].map(k => `<span class="cnt">${icon(k, 22)}<span class="stepper"><button data-tv="${k}:-1" ${b[k] ? '' : 'disabled'}>−</button><b>${b[k]}</b>
          <button data-tv="${k}:1" ${b[k] < P.resources[k] ? '' : 'disabled'}>+</button></span></span>`).join('')}
          <button class="mini ok" data-tvote>Votar (${b.sheep + b.wheat})</button></div>`;
      return;
    }
    if (v.phase === 'tbMove' && v.current === me && scn(v) === 4 && this.tbSel && this.tbSel.knight !== undefined && T.knights[this.tbSel.knight]) {
      const k = T.knights[this.tbSel.knight];
      el.className = 'pe-ship show';
      el.innerHTML = `<div class="tf-head">${icon('knight', 18)} Tu caballero <span class="ps-mp">${(k.boost ? 5 : 3) - k.used} caminos</span></div>
        <div class="ps-btns">${!k.boost ? `<button class="mini ${this.tbSel.boost ? 'ok' : ''}" data-kboost ${P.resources.wheat > 0 ? '' : 'disabled'}>Hasta 5 caminos (${icon('wheat', 13)})</button>` : ''}
        <button class="mini" data-tclose>Soltar</button></div>`;
      return;
    }
    if (v.phase === 'tbMove' && v.current === me && scn(v) === 5) {
      const W = P.wagon, tr = TB.TRAIN[W.level];
      el.className = 'pe-ship show';
      el.innerHTML = `<div class="tf-head">🛒 Tu carreta <span class="ps-mp">${W.stopped ? 'detenida' : W.mp + ' mov.'}</span></div>
        <div class="ps-cargo">Carga: ${P.cargo ? `${GOOD_ICON[P.cargo]} ${TB.GOOD_NAME[P.cargo]} → ${TB.PLAZA_NAME[TB.GOOD_DEST[P.cargo]]}` : '<i>vacía: ve a cualquier plaza</i>'}</div>
        <div class="ps-hint">Camino sin carretera 2 · carretera tuya 1 · ajena 1 + 1 oro · bárbaro +2.${tr.drive.length ? ' Ahuyentas bárbaros con ' + tr.drive.join(', ') + ' (clic en un bárbaro junto a la carreta).' : ''}</div>
        <div class="ps-btns">${!W.boosted && !W.stopped ? `<button class="mini" data-wboost ${P.resources.wheat > 0 ? '' : 'disabled'}>+2 movimientos (${icon('wheat', 13)})</button>` : ''}</div>`;
      return;
    }
    hide();
  };
  G.tbFloatClick = function (e) {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    C.Sound.play('click');
    if (b.dataset.tv) { const [k, d] = b.dataset.tv.split(':'); this.tbBid[k] = Math.max(0, this.tbBid[k] + +d); this.render(); }
    if (b.dataset.tvote !== undefined) { this.send(Object.assign({ type: 'vote', option: this.tbVotePref || 0 }, this.tbBid)); this.tbBid = null; this.tbVotePref = undefined; }
    if (b.dataset.kboost !== undefined) { this.tbSel.boost = !this.tbSel.boost; this.render(); }
    if (b.dataset.tclose !== undefined) { this.tbSel = null; this.render(); }
    if (b.dataset.wboost !== undefined) this.send({ type: 'boostWagon' });
  };

  // ---------- mano ----------
  G.tbHandExtras = function () {
    const v = this.view, P = this.P, T = v.tb;
    let html = '';
    if (TB.usesGold(v)) html += `<div class="rcard r-gold ${P.gold ? '' : 'empty'}" title="Oro: 2 oro = 1 recurso (2 veces por turno). No cuenta para el 7.">
      <div class="rc-art">${icon('gold', 42)}</div><div class="rc-name">Oro</div><div class="rc-count">${P.gold}</div></div>`;
    if (scn(v) === 1) html += `<div class="rcard r-fish ${P.fish.length ? '' : 'empty'}" title="Fichas de pescado: ${P.fish.join(', ') || 'ninguna'} (máx. 7)">
      <div class="rc-art">${icon('fish', 42)}</div><div class="rc-name">Peces ${P.fish.reduce((a, b) => a + b, 0)}</div><div class="rc-count">${P.fish.length}</div></div>`;
    if (T.two && scn(v) !== 1) html += `<div class="rcard r-token ${P.tokens ? '' : 'empty'}" title="Fichas de comercio (Catan para dos)"><div class="rc-art" style="font-size:34px">🎫</div><div class="rc-name">Fichas</div><div class="rc-count">${P.tokens}</div></div>`;
    if (html) this.$.hand.insertAdjacentHTML('beforeend', html);
    this.$.hand.classList.toggle('compact', scn(v) === 4 || scn(v) === 5);
    if (scn(v) === 4 || scn(v) === 5) {
      const extra = [];
      if (scn(v) === 4) extra.push(`<div class="bcard" title="Prisioneros: cada 2 valen 1 PV"><b>Prisioneros</b><span>⛓ ${P.prisoners} (${Math.floor(P.prisoners / 2)} PV)</span><span>Caballeros: ${P.knightsLeft}</span></div>`);
      if (scn(v) === 5) {
        const tr = TB.TRAIN[P.wagon.level], nx = TB.TRAIN[P.wagon.level + 1];
        extra.push(`<div class="bcard" title="Tren de equipaje"><b>Tren nivel ${P.wagon.level}</b><span>${tr.mp} mov. · ${tr.gold} oro</span><span>Ahuyenta: ${tr.drive.join(',') || '—'}</span>${nx ? `<span>Siguiente: ${costHTML(nx.cost, 11)}</span>` : '<span>+1 PV</span>'}</div>`);
        extra.push(`<div class="bcard"><b>Entregas</b><span>📦 ${P.delivered} PV</span><span>${P.cargo ? GOOD_ICON[P.cargo] + ' ' + TB.GOOD_NAME[P.cargo] : 'sin carga'}</span></div>`);
      }
      this.$.specials.insertAdjacentHTML('beforeend', extra.join(''));
    }
  };

  // ---------- acciones ----------
  G.tbActionsHTML = function () {
    const v = this.view, P = this.P, me = this.me, T = v.tb;
    const main = this.isMyMain();
    const has = c => C.hasRes(P.resources, c);
    const btn = (act, label, ic, enabled, cost, title = '', extra = '') => `<button class="abtn ${this.mode === act ? 'active' : ''} ${extra}" data-a="${act}" ${enabled ? '' : 'disabled'} title="${esc(title)}">
      <span class="ab-ic">${ic}</span><span class="ab-l">${label}</span>${cost ? `<span class="ab-cost">${costHTML(cost)}</span>` : ''}</button>`;
    let h = '';
    if (P.damaged !== null) h += btn('repair', 'Reparar', '🚧', main && has(TB.COST.repair), TB.COST.repair, 'Reparar la carretera dañada por el terremoto');
    if (scn(v) === 2) h += btn('bridge', 'Puente', '🌉', main && P.pieces.bridge > 0 && has(TB.COST.bridge) && TB.bridgeSpots(v, me).length, TB.COST.bridge, 'Puente: +3 monedas (máx. 3)');
    if (TB.usesGold(v)) h += btn('tbgold', 'Oro', icon('gold', 22), main, null, 'Comprar recursos con oro o vender recursos por oro');
    if (scn(v) === 1) h += btn('tbfish', 'Pescado', icon('fish', 22), main && P.fish.length > 0, null, 'Usar fichas de pescado');
    if (T.boot === me) h += btn('tbboot', 'Bota', '🥾', main && TB.real(v).some(p => p.id !== me && p.vp >= v.players[me].vp), null, 'Pasar la bota vieja');
    if (T.two && scn(v) !== 1) h += btn('tbtokens', 'Fichas', '🎫', main && (P.tokens > 0 || (P.knights > 0 && !T.knightSwap)), null, 'Acciones con fichas de comercio');
    if (scn(v) === 5) {
      const nx = TB.TRAIN[P.wagon.level + 1];
      h += btn('wagonUp', 'Mejorar tren', '🛒', main && nx && has(nx.cost), nx ? nx.cost : null, 'Mejorar el tren de equipaje');
    }
    if (TB.hasMove(v) && main) h += `<button class="abtn primary" data-a="tbStartMove" title="Después ya no podrás comerciar ni construir"><span class="ab-ic">${scn(v) === 4 ? '⚔' : '🛒'}</span><span class="ab-l">${scn(v) === 4 ? 'Mover caballeros' : 'Mover carreta'}</span></button>`;
    return h;
  };
  G.tbAction = function (a) {
    const v = this.view;
    switch (a) {
      case 'repair': this.send({ type: 'repairRoad' }); return true;
      case 'bridge': this.setMode(this.mode === 'bridge' ? null : 'bridge'); return true;
      case 'tbgold': this.tbOpenGold(); return true;
      case 'tbfish': this.tbOpenFish(); return true;
      case 'tbboot': {
        const list = TB.real(v).filter(p => p.id !== this.me && p.vp >= v.players[this.me].vp);
        this.tbPickPlayer('Bota vieja', 'Pásala a un jugador con tantos o más puntos que tú.', list, p => this.send({ type: 'giveBoot', to: p }));
        return true;
      }
      case 'tbtokens': this.tbOpenTokens(); return true;
      case 'wagonUp': this.send({ type: 'upgradeWagon' }); return true;
      case 'tbStartMove': this.setMode(null, true); this.send({ type: 'startMove' }); return true;
      case 'dev':
        if (scn(v) === 4) { this.send({ type: 'buyDev' }); return true; }
        return false;
    }
    return false;
  };

  G.tbPickPlayer = function (title, sub, list, onPick) {
    const v = this.view;
    if (!list.length) { this.toast('No hay jugadores válidos'); return; }
    this.modal(`<h2>${esc(title)}</h2><p>${esc(sub)}</p><div class="choice-row">${list.map(p => `<button class="big-choice" data-p="${p.id}">
      <div class="pc-avatar" style="--pc:${C.colorHex(p.color)}">${esc(p.avatar || p.name[0])}</div><span>${esc(p.name)}</span>
      <small>${p.vp} PV · ${p.resCount} cartas</small></button>`).join('')}</div>`, {
      dismiss: true,
      mount: (m, close) => m.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) { close(); onPick(+b.dataset.p); } })
    });
  };

  G.tbOpenGold = function () {
    const draw = m => {
      const v = this.view, P = this.P;
      const ratio = Object.entries(v.buildings).some(([x, b]) => b.owner === this.me && !b.conquered && v.board.vertices[x].port === 'any') ? 3 : 4;
      const buys = 2 - v.tb.goldBuys;
      m.innerHTML = `<h2>Oro</h2>
        <div class="tr-label">Comprar: 2 oro → 1 recurso (te quedan ${buys} este turno · tienes ${P.gold} oro)</div>
        <div class="res-pick">${RES.map(k => `<button class="rp" data-buy="${k}" ${buys > 0 && P.gold >= 2 && v.bank[k] > 0 ? '' : 'disabled'}>${icon(k, 34)}<span>${C.RES_NAME[k]}</span><small>banco ${v.bank[k]}</small></button>`).join('')}</div>
        <div class="tr-label">Vender: ${ratio} iguales → 1 oro</div>
        <div class="res-pick">${RES.map(k => `<button class="rp" data-sell="${k}" ${P.resources[k] >= ratio ? '' : 'disabled'}>${icon(k, 34)}<span>${C.RES_NAME[k]}</span><small>tienes ${P.resources[k]}</small></button>`).join('')}</div>
        <button class="modal-x" data-close>×</button>`;
    };
    this.modal('', {
      dismiss: true, cls: 'wide',
      mount: (m, close) => {
        draw(m);
        const redraw = () => setTimeout(() => { if (m.isConnected) draw(m); }, 60);
        m.addEventListener('click', e => {
          const b = e.target.closest('button');
          if (!b || b.disabled) return;
          if (b.dataset.close !== undefined) return close();
          if (b.dataset.buy) { this.send({ type: 'bankTrade', give: 'gold', get: b.dataset.buy }); redraw(); }
          if (b.dataset.sell) { this.send({ type: 'bankTrade', give: b.dataset.sell, get: 'gold' }); redraw(); }
        });
      }
    });
  };

  G.tbOpenFish = function () {
    const v = this.view, P = this.P, me = this.me;
    const sum = P.fish.reduce((a, b) => a + b, 0);
    const pick = cost => { const idx = P.fish.map((f, i) => [f, i]).sort((a, b) => a[0] - b[0]); const out = []; let t = 0; for (const [f, i] of idx) { if (t >= cost) break; out.push(i); t += f; } return t >= cost ? out : null; };
    const acts = Object.keys(TB.FISH_COST).map(k => ({ k, cost: TB.fishCost(v, me, k) }));
    this.modal(`<h2>Pescado</h2><p>Tienes ${P.fish.length} ${P.fish.length === 1 ? 'ficha' : 'fichas'} (${P.fish.join(' + ') || '0'} = ${sum} peces). No se da cambio: el sobrante se pierde.</p>
      <div class="menu-col">${acts.map(a => `<button class="btn" data-f="${a.k}" ${pick(a.cost) ? '' : 'disabled'}>${a.cost} peces — ${TB.FISH_NAME[a.k]}</button>`).join('')}</div>
      <button class="modal-x" data-close>×</button>`, {
      dismiss: true,
      mount: (m, close) => m.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b || b.disabled) return;
        if (b.dataset.close !== undefined) return close();
        const k = b.dataset.f;
        if (!k) return;
        close();
        const tokens = pick(TB.fishCost(v, me, k));
        if (k === 'steal') this.tbPickPlayer('Robar 1 recurso', 'Elige a quién robar.', TB.real(v).filter(p => p.id !== me && p.resCount > 0), p => this.send({ type: 'fishAction', action: k, tokens, victim: p }));
        else if (k === 'resource') this.pickResources('1 recurso del banco', 'Elige el recurso', 1, v.bank, r => this.send({ type: 'fishAction', action: k, tokens, resource: RES.find(x => r[x]) }), true);
        else this.send({ type: 'fishAction', action: k, tokens });
      })
    });
  };

  G.tbOpenTokens = function () {
    const v = this.view, P = this.P, me = this.me;
    const opp = TB.real(v).find(p => p.id !== me);
    const cost = v.players[me].vp <= opp.vp ? 1 : 2;
    this.modal(`<h2>Fichas de comercio</h2><p>Tienes ${P.tokens}. Cada acción te cuesta ${cost} (${cost === 1 ? 'vas por detrás o empatado' : 'vas por delante'}).</p>
      <div class="menu-col">
        <button class="btn" data-t="forced" ${P.tokens >= cost && opp.resCount > 0 && C.total(P.resources) >= 2 ? '' : 'disabled'}>Comercio forzoso: tomas 2 cartas al azar de ${esc(opp.name)} y le das 2 tuyas</button>
        <button class="btn" data-t="robber" ${P.tokens >= cost ? '' : 'disabled'}>Mandar al ladrón al ${v.board.hexes.some(h => h.terrain === 'swamp') ? 'pantano' : 'desierto'}</button>
        <button class="btn" data-t="knight" ${P.knights > 0 && !v.tb.knightSwap ? '' : 'disabled'}>Descartar un caballero jugado: +2 fichas (1 vez por turno)</button></div>
      <button class="modal-x" data-close>×</button>`, {
      dismiss: true,
      mount: (m, close) => m.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b || b.disabled) return;
        if (b.dataset.close !== undefined) return close();
        close();
        if (b.dataset.t === 'forced') this.pickResources('Comercio forzoso', 'Elige las 2 cartas que das', 2, P.resources, r => this.send({ type: 'tokenAction', action: 'forcedTrade', give: r }), true, true);
        if (b.dataset.t === 'robber') this.send({ type: 'tokenAction', action: 'robberHome' });
        if (b.dataset.t === 'knight') this.send({ type: 'discardKnight' });
      })
    });
  };

  // ---------- diálogos obligatorios ----------
  G.tbModalKey = function () {
    const v = this.view, me = this.me, T = v.tb;
    if (v.phase === 'tbGive' && T.pending.pairs.some(x => x.from === me)) return 'tbgive:' + v.logSeq;
    if (v.phase === 'tbSteal' && v.current === me) return 'tbsteal:' + v.logSeq;
    return null;
  };
  G.tbOpenModal = function (key) {
    const v = this.view, me = this.me, T = v.tb, P = this.P;
    if (key.startsWith('tbgive')) {
      const pair = T.pending.pairs.find(x => x.from === me);
      const send = to => this.pickResources('Evento', `Da 1 recurso a ${esc(v.players[to].name)}`, 1, P.resources, r => this.send({ type: 'tbGive', resources: r, to }), false, true);
      if (pair.to !== null) return send(pair.to);
      const list = TB.giveTargets(v, me).map(id => v.players[id]);
      return this.modal(`<h2>Ayuda vecinal</h2><p>Eres de los que más puntos tienen: elige a quién das 1 recurso.</p><div class="choice-row">${list.map(p => `<button class="big-choice" data-p="${p.id}">
        <div class="pc-avatar" style="--pc:${C.colorHex(p.color)}">${esc(p.avatar || p.name[0])}</div><span>${esc(p.name)}</span><small>${p.vp} PV</small></button>`).join('')}</div>`, {
        mount: (m, close) => m.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) { close(); send(+b.dataset.p); } })
      });
    }
    if (key.startsWith('tbsteal')) {
      const list = TB.stealVictims(v, T.pending ? T.pending.by : me).map(id => v.players[id]);
      return this.modal(`<h2>Robar 1 carta</h2><p>Elige a quién robas 1 carta al azar.</p><div class="choice-row">${list.map(p => `<button class="big-choice" data-p="${p.id}">
        <div class="pc-avatar" style="--pc:${C.colorHex(p.color)}">${esc(p.avatar || p.name[0])}</div><span>${esc(p.name)}</span><small>${p.resCount} cartas</small></button>`).join('')}</div>`, {
        mount: (m, close) => m.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) { close(); this.send({ type: 'tbSteal', victim: +b.dataset.p }); } })
      });
    }
    return null;
  };

  // ---------- carta de evento ----------
  G.tbEventCardHTML = function (ev) {
    const red = ev.n === 6 || ev.n === 8;
    return `<div class="event-card ${ev.type !== 'none' ? 'has' : ''}" title="${esc(TB.EVENT_HELP[ev.type] || '')}">
      <div class="ec-n ${red ? 'red' : ''}">${ev.n}</div><div class="ec-t">${esc(TB.EVENT_NAME[ev.type])}</div></div>`;
  };

  // ---------- eventos ----------
  G.tbEvent = function (ev, v) {
    const me = this.me;
    const pn = id => v.players[id] ? v.players[id].name : '';
    switch (ev.type) {
      case 'roll':
        if (ev.card) {
          C.Sound.play('card');
          if (ev.card.type !== 'none') this.toast(`🂠 ${TB.EVENT_NAME[ev.card.type]}: ${TB.EVENT_HELP[ev.card.type]}`, 'big');
          return true;
        }
        return false;
      case 'fish': if (ev.got && ev.got[me]) { C.Sound.play('coin'); this.toast(`Pescas ${ev.got[me]} ficha(s) de pescado`, 'ok'); } return true;
      case 'boot': C.Sound.play('error'); this.toast(ev.pid === me ? '¡Tienes la bota vieja! Necesitas 1 PV más para ganar' : `${pn(ev.pid)} tiene la bota vieja`, ev.pid === me ? 'err' : ''); return true;
      case 'fishAction': C.Sound.play('coin'); return true;
      case 'harbormaster': C.Sound.play('improve'); this.toast((ev.pid === me ? '¡Eres' : pn(ev.pid) + ' es') + ' Señor del puerto! (+2 PV)', ev.pid === me ? 'ok' : ''); return true;
      case 'camel': C.Sound.play('knightMove'); return true;
      case 'barbLand': C.Sound.play('drum'); this.toast(`Desembarcan bárbaros (${ev.rolled.join(', ')})`, 'err'); return true;
      case 'expel': C.Sound.play('horn'); ev.results.forEach(r => this.toast(`¡Victoria contra los bárbaros! Prisioneros: ${Object.entries(r.got).map(([p, n]) => pn(+p) + ' ' + n).join(', ')}`, 'ok')); return true;
      case 'tbDev': C.Sound.play('card'); this.toast((ev.pid === me ? 'Juegas ' : pn(ev.pid) + ' juega ') + TB.BA_NAME[ev.card] + ': ' + TB.BA_HELP[ev.card]); return true;
      case 'knightPlace': case 'knightMove': C.Sound.play('knightMove'); return true;
      case 'barbMove': C.Sound.play('robber'); return true;
      case 'wagonMove': C.Sound.play('knightMove'); return true;
      case 'cargo': if (ev.pid === me) this.toast(`Cargas ${TB.GOOD_NAME[ev.good]}: llévalo a ${TB.PLAZA_NAME[TB.GOOD_DEST[ev.good]]}`, 'ok'); return true;
      case 'deliver': C.Sound.play('coin'); this.toast((ev.pid === me ? 'Entregas ' : pn(ev.pid) + ' entrega ') + TB.GOOD_NAME[ev.good] + ` (+1 PV, +${ev.gold} oro)`, ev.pid === me ? 'ok' : ''); return true;
      case 'drive': C.Sound.play(ev.win ? 'horn' : 'error'); this.toast(`Dado ${ev.d}: ${ev.win ? '¡bárbaro ahuyentado!' : 'no lo consigues'}`); return true;
      case 'train': C.Sound.play('improve'); return true;
      case 'stealGold': return true;
      case 'pair': if (ev.p2 === me) { C.Sound.play('turn'); this.toast('¡Juegas como jugador 2 de la pareja!', 'big'); } return true;
      case 'trade': if (ev.b === null) { C.Sound.play('coin'); return true; } return false;
      case 'build':
        if (ev.what === 'bridge') { C.Sound.play('road'); return true; }
        return false;
    }
    return false;
  };

  // ---------- costes ----------
  G.tbCosts = function () {
    const v = this.view, col = this.P.color;
    const row = (piece, name, cost, pts) => `<div class="cost-row"><span class="cr-p">${piece}</span><span class="cr-n">${name}</span>
      <span class="cr-c">${costHTML(cost, 20)}</span><span class="cr-v">${pts}</span></div>`;
    let h = `<h2>Costes — ${esc(TB.SCENARIOS[scn(v)].name)}</h2><div class="costs">
      ${row(pieceSVG('road', col, 28), 'Carretera', C.COST.road, '0 PV')}
      ${row(pieceSVG('settlement', col, 28), 'Poblado', C.COST.settlement, '1 PV')}
      ${row(pieceSVG('city', col, 28), 'Ciudad', C.COST.city, '2 PV')}
      ${row(icon('knight', 28), scn(v) === 4 ? 'Carta (se juega al comprarla)' : 'Carta de desarrollo', C.COST.dev, '?')}`;
    if (scn(v) === 2) h += row('🌉', 'Puente (+3 monedas)', TB.COST.bridge, '');
    if (scn(v) === 4) h += row(icon('knight', 28), 'Mover un caballero 5 caminos', TB.COST.knightBoost, '');
    if (scn(v) === 5) { for (let l = 2; l <= 5; l++) h += row('🛒', 'Tren de equipaje nivel ' + l, TB.TRAIN[l].cost, l === 5 ? '1 PV' : ''); h += row('🛒', '+2 movimientos de la carreta', TB.COST.wagonBoost, ''); }
    h += '</div>';
    const notes = {
      1: 'Pescado: 2 sacar al ladrón, 3 robar 1 recurso, 4 tomar 1 recurso, 5 carretera gratis, 7 carta de desarrollo. Máximo 7 fichas.',
      2: '2 monedas = 1 recurso (2 veces por turno). Carretera o poblado junto a un río: +1 moneda. El más rico +1 PV; los más pobres −2 PV.',
      3: 'Un poblado o ciudad entre 2 camellos vale 1 PV más; una carretera con camello cuenta doble para la Gran Ruta.',
      4: '2 prisioneros = 1 PV. Edificios conquistados no dan puntos. 2 oro = 1 recurso.',
      5: 'Cada entrega: 1 PV y oro según tu tren. 2 oro = 1 recurso (2 veces por turno).'
    };
    return h + `<p class="muted">${notes[scn(v)] || ''}</p>`;
  };
})(window);
