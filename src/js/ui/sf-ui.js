// Interfaz de Navegantes (escenarios 1-9): amplía la pantalla de partida (GameUI).
(function (root) {
  const C = root.Catan;
  const SF = C.SF;
  const { icon } = C.UIIcons;
  const esc = C.esc;
  const RES = C.RES;
  const G = C.GameUI.prototype;
  const costHTML = (cost, size = 12) => RES.filter(k => cost[k]).map(k => icon(k, size).repeat(cost[k])).join('');

  G.isSF = function () { return !!(this.view && this.view.sf); };
  const scn = v => v.sf.scenario;

  G.sfTitle = function () {
    const v = this.view;
    return 'Navegantes: ' + SF.scName(scn(v), v.sf.big);
  };

  // ---------- panel ----------
  G.sfRenderPanel = function () {
    let el = this.$.sfPanel;
    if (!el) {
      el = this.$.sfPanel = document.createElement('div');
      el.className = 'pe-panel sf-panel';
      this.el.querySelector('.board-wrap').appendChild(el);
    }
    if (!this.isSF()) { el.style.display = 'none'; return; }
    const v = this.view, S = v.sf;
    const pn = id => `<b style="color:${C.colorHex(v.players[id].color)}">${esc(v.players[id].name)}</b>`;
    const lines = [];
    if (S.islandVP) lines.push(`⛵ +${S.islandVP} PV por el primer poblado en cada ${scn(v) === 4 ? 'zona' : 'isla'} ${scn(v) === 2 || scn(v) === 9 ? 'ajena' : 'nueva'}`);
    if (v.pairs) lines.push(`👥 Jugadores en pareja${v.pair ? `: juega ${pn(v.pair.p2)} (jugador 2)` : ''}`);
    switch (scn(v)) {
      case 3: lines.push(`🌫 Hexágonos en la niebla: ${S.fog.left}`); break;
      case 5: {
        const left = k => S.gifts.filter(g => g.kind === k && g.taken === null).length;
        lines.push(`🎁 Regalos de la tribu: ${left('vp')} PV · ${left('dev')} cartas · ${left('harbor')} puertos`);
        break;
      }
      case 6:
        lines.push(`🧵 Aldeas con tela: ${S.villages.filter(x => x.cloth > 0).length} de ${S.villages.length} (con 3 o menos termina la partida)`);
        lines.push(S.villages.map(x => `<span class="sf-vil" title="Aldea del ${x.number}">${x.number}:${x.cloth}</span>`).join(' ') + ` · reserva ${S.supply}`);
        break;
      case 7:
        if (S.fleet) lines.push('🏴‍☠️ La flota pirata avanza con el dado menor y ataca tu costa');
        S.forts.forEach(f => lines.push(`🏰 ${pn(f.owner)}: ${f.hp > 0 ? f.hp + ' defensa(s)' : 'conquistada'}`));
        break;
      case 8:
        S.wonders.filter(w => w.owner !== null).forEach(w => lines.push(`🏛 ${esc(SF.WONDERS[w.kind].name)}: ${pn(w.owner)} — nivel ${w.level}/4`));
        lines.push(`🏛 Maravillas libres: ${S.wonders.filter(w => w.owner === null).length} (botón «Maravilla»)`);
        break;
    }
    el.style.display = lines.length ? '' : 'none';
    el.innerHTML = `<div class="pm-head"><b>${esc(SF.scName(scn(v), S.big))}</b><small>Navegantes${S.big ? ' 5-6' : ''}</small></div>` +
      lines.map(l => `<div class="pm-note">${l}</div>`).join('');
  };

  // ---------- jugadores ----------
  G.sfTags = function (p) {
    const v = this.view;
    const tags = [];
    if (p.chits) tags.push(`<span class="badge isl" title="Puntos de victoria de la tribu">★ ${p.chits} PV</span>`);
    if (scn(v) === 6) tags.push(`<span class="badge road" title="Telas (2 = 1 PV)">🧵 ${p.cloth} tela${p.cloth === 1 ? '' : 's'}</span>`);
    if (scn(v) === 7) {
      const w = SF.warships(v, p.id), F = SF.fortOf(v, p.id);
      tags.push(`<span class="badge army" title="Barcos de guerra">⚔ ${w}</span>`);
      if (F && F.hp <= 0) tags.push('<span class="badge road" title="Fortaleza conquistada">🏰 conquistada</span>');
    }
    if (scn(v) === 8) {
      const w = v.sf.wonders.find(x => x.owner === p.id);
      if (w) tags.push(`<span class="badge road" title="${esc(SF.WONDERS[w.kind].name)}">🏛 ${esc(SF.WONDERS[w.kind].name)} ${w.level}/4</span>`);
    }
    if (p.harborsHeld && p.harborsHeld.length) tags.push(`<span class="badge isl" title="Puertos esperando un poblado costero">⚓ ${p.harborsHeld.length}</span>`);
    return tags;
  };

  // ---------- estado ----------
  G.sfStatus = function () {
    const v = this.view, me = this.me;
    const who = this.pname(v.current);
    if (v.phase === 'sfHarbor' && v.sf.hp) {
      const hp = v.sf.hp, t = harborName(hp.type);
      if (hp.pid !== me) return hp.kind === 'nw' ? `${this.pname(hp.pid)} coloca un puerto (${hp.n + 1} de ${hp.total})…` : `${this.pname(hp.pid)} coloca su puerto regalado…`;
      return hp.kind === 'nw' ? `Coloca el puerto <b>${t}</b> (${hp.n + 1} de ${hp.total}) en un lado entre tierra y mar resaltado`
        : `Coloca tu puerto regalado <b>${t}</b> en un lado de la costa junto a tu poblado`;
    }
    if (v.phase === 'gold' && v.sf.goldWhy) return v.pendingGold[me] ? v.sf.goldWhy + ': elige tu recurso' : v.sf.goldWhy + ': esperando la elección…';
    if (v.phase === 'sfSteal') return v.current === me ? 'Salió un 7: elige a quién robar 1 carta' : `${who} elige a quién robar…`;
    if (v.phase === 'setup' && v.current === me && v.setup.step === 'settlement' && v.setup.resFrom !== undefined) {
      const r = v.setup.round;
      return `Coloca tu ${['primer', 'segundo', 'tercer'][r - 1] || ''} poblado` + (v.setup.index >= v.setup.resFrom ? ' (recibirás sus recursos)' : '');
    }
    if (v.phase === 'robber' && v.current === me && scn(v) === 6 && !v.sf.villages.some(x => x.conn.includes(me)))
      return 'Mueve el ladrón (el pirata solo se mueve cuando tienes una ruta hasta una aldea)';
    if (v.phase === 'main' && v.current === me && !this.mode) {
      if (scn(v) === 7 && SF.routeDone(v, me) && SF.fortOf(v, me).hp > 0) return 'Tu ruta llegó a la fortaleza: puedes atacarla al final del turno';
      if (scn(v) === 8 && !v.sf.wonders.some(w => w.owner === me) && SF.wonderOptions(v, me).length) return 'Ya cumples los requisitos de una maravilla: puedes empezar a construirla';
    }
    return null;
  };

  // ---------- acciones ----------
  G.sfActionsHTML = function () {
    const v = this.view, P = this.P, me = this.me;
    const main = this.isMyMain();
    let h = '';
    if (scn(v) === 7) {
      const F = SF.fortOf(v, me);
      const can = main && F && F.hp > 0 && SF.routeDone(v, me) && v.sf.attacked !== me;
      h += `<button class="abtn ${can ? 'primary' : ''}" data-a="sfAttack" ${can ? '' : 'disabled'} title="Tira un dado: ganas si tienes más barcos de guerra. Termina tu turno.">
        <span class="ab-ic">⚔</span><span class="ab-l">Atacar fortaleza</span></button>`;
    }
    if (scn(v) === 8) {
      const w = v.sf.wonders.find(x => x.owner === me);
      const can = main && (w ? w.level < 4 : SF.wonderOptions(v, me).length > 0);
      h += `<button class="abtn" data-a="sfWonder" ${can || main ? '' : 'disabled'}>
        <span class="ab-ic">🏛</span><span class="ab-l">Maravilla</span>${w && w.level < 4 ? `<span class="ab-cost">${costHTML(SF.WONDERS[w.kind].cost)}</span>` : ''}</button>`;
    }
    return h;
  };
  G.sfAction = function (a) {
    if (a === 'sfAttack') {
      this.confirm('¿Atacar la fortaleza pirata?', `Tienes ${SF.warships(this.view, this.me)} barco(s) de guerra. Después del ataque termina tu turno.`, () => this.send({ type: 'sfAttack' }));
      return true;
    }
    if (a === 'sfWonder') { this.sfOpenWonders(); return true; }
    return false;
  };

  G.sfOpenWonders = function () {
    const v = this.view, me = this.me, P = this.P;
    const mine = v.sf.wonders.find(w => w.owner === me);
    const opts = SF.wonderOptions(v, me);
    const main = this.isMyMain();
    const rows = v.sf.wonders.map(w => {
      const W = SF.WONDERS[w.kind];
      const owner = w.owner !== null ? `<b style="color:${C.colorHex(v.players[w.owner].color)}">${esc(v.players[w.owner].name)}</b> · nivel ${w.level}/4` : '<span class="muted">libre</span>';
      let btn = '';
      if (main && !mine && opts.includes(w.id)) btn = `<button class="btn primary" data-start="${w.id}">Empezar</button>`;
      if (main && mine === w && w.level < 4) btn = `<button class="btn primary" data-build ${C.hasRes(P.resources, W.cost) ? '' : 'disabled'}>Construir nivel ${w.level + 1}</button>`;
      return `<div class="sf-wonder ${mine === w ? 'mine' : ''}"><div><b>🏛 ${esc(W.name)}</b> <small>${owner}</small><br>
        <small>Requisito: ${esc(W.req)}</small><br><small>Cada nivel: ${costHTML(W.cost, 14)}</small></div>${btn}</div>`;
    }).join('');
    this.modal(`<h2>Maravillas de Catan</h2><p>Ganas al terminar el 4.º nivel, o con ${v.vpTarget} PV si tu maravilla es la más alta. Para empezar una maravilla se usa uno de tus barcos.</p>
      <div class="sf-wonders">${rows}</div><button class="modal-x" data-close>×</button>`, {
      dismiss: true, cls: 'wide',
      mount: (m, close) => m.addEventListener('click', e => {
        const s = e.target.closest('[data-start]'), b = e.target.closest('[data-build]');
        if (s) { close(); this.send({ type: 'sfWonderStart', wonder: +s.dataset.start }); }
        else if (b && !b.disabled) { close(); this.send({ type: 'sfWonderBuild' }); }
        else if (e.target.closest('[data-close]')) close();
      })
    });
  };

  // ---------- resaltados ----------
  G.sfHighlights = function () {
    const v = this.view;
    if (v.phase === 'sfHarbor' && v.sf.hp && v.sf.hp.pid === this.me) return { edges: SF.harborEdges(v) };
    return null;
  };

  // Tela para Catan: el pirata puede robar una tela en lugar de un recurso
  G.sfBoardClick = function (kind, id) {
    const v = this.view, me = this.me;
    if (v.phase === 'sfHarbor') {
      if (kind === 'edge' && v.sf.hp && v.sf.hp.pid === me) this.send({ type: 'sfPlaceHarbor', edge: id });
      return true;
    }
    if (scn(v) !== 6 || v.phase !== 'robber' || v.current !== me || kind !== 'hex') return false;
    if (v.board.hexes[id].terrain !== 'sea' || !C.robberHexes(v, me).includes(id)) return false;
    const cands = C.stealCandidates(v, me, id);
    if (!cands.length) return false;
    const opts = [];
    cands.forEach(p => {
      const P = v.players[p];
      if (P.resCount > 0) opts.push({ p, cloth: false });
      if (P.cloth > 0) opts.push({ p, cloth: true });
    });
    this.modal(`<h2>Pirata</h2><p>Elige a quién robar y qué: una carta de recurso al azar o una tela.</p><div class="choice-row">${opts.map((o, i) => {
      const P = v.players[o.p];
      return `<button class="big-choice" data-i="${i}"><div class="pc-avatar" style="--pc:${C.colorHex(P.color)}">${esc(P.avatar || P.name[0])}</div>
        <span>${esc(P.name)}</span><small>${o.cloth ? '🧵 1 tela (' + P.cloth + ')' : '1 recurso (' + P.resCount + ')'}</small></button>`;
    }).join('')}</div>`, {
      mount: (m, close) => m.addEventListener('click', e => {
        const b = e.target.closest('[data-i]');
        if (b) { close(); const o = opts[+b.dataset.i]; this.send({ type: 'moveRobber', hex: id, victim: o.p, cloth: o.cloth }); }
      })
    });
    return true;
  };

  // ---------- diálogos obligatorios ----------
  G.sfModalKey = function () {
    const v = this.view;
    if (v.phase === 'sfSteal' && v.current === this.me) return 'sfsteal:' + v.rollSeq;
    return null;
  };
  G.sfOpenModal = function (key) {
    const v = this.view, me = this.me;
    if (!key.startsWith('sfsteal')) return null;
    const list = SF.stealVictims(v, me).map(id => v.players[id]);
    if (!list.length) { this.send({ type: 'sfSteal', victim: null }); return null; }
    return this.modal(`<h2>Salió un 7</h2><p>No hay ladrón en este escenario: elige a quién robas 1 carta al azar.</p><div class="choice-row">${list.map(p => `<button class="big-choice" data-p="${p.id}">
      <div class="pc-avatar" style="--pc:${C.colorHex(p.color)}">${esc(p.avatar || p.name[0])}</div><span>${esc(p.name)}</span><small>${p.resCount} cartas</small></button>`).join('')}</div>`, {
      mount: (m, close) => m.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) { close(); this.send({ type: 'sfSteal', victim: +b.dataset.p }); } })
    });
  };

  // ---------- eventos ----------
  G.sfEvent = function (ev, v) {
    const me = this.me;
    const pn = id => v.players[id] ? v.players[id].name : '';
    switch (ev.type) {
      case 'sfReveal':
        C.Sound.play('build');
        if (ev.pid === me) this.toast(isLandT(ev.terrain) ? 'Descubres ' + C.TERRAIN_NAME_ES[ev.terrain] : 'Solo hay mar bajo la niebla', isLandT(ev.terrain) ? 'ok' : '');
        return true;
      case 'sfGift':
        C.Sound.play('coin');
        this.toast((ev.pid === me ? 'Recibes' : pn(ev.pid) + ' recibe') + ' un regalo de la tribu: ' + { vp: '1 punto de victoria', dev: 'una carta de desarrollo', harbor: 'un puerto' }[ev.kind], ev.pid === me ? 'ok' : '');
        return true;
      case 'sfFleet':
        if (ev.pid !== me) return true;
        C.Sound.play('pirate');
        this.toast(ev.result === 'lose' ? `La flota pirata te ataca: pierdes ${ev.lost} carta(s)` : ev.result === 'win' ? 'Rechazas a la flota pirata: elige 1 recurso' : 'Empate con la flota pirata', ev.result === 'lose' ? 'err' : 'ok', true);
        return true;
      case 'sfAttack':
        C.Sound.play(ev.result === 'win' ? 'win' : 'pirate');
        this.toast(`${ev.pid === me ? 'Atacas' : pn(ev.pid) + ' ataca'} la fortaleza: ${ev.str} barco(s) de guerra contra ${ev.die} → ${ev.result === 'win' ? '¡victoria!' : ev.result === 'tie' ? 'empate' : 'derrota'}`, ev.result === 'win' ? 'ok' : 'err', true);
        return true;
      case 'sfHarbor':
        C.Sound.play('build');
        return true;
      case 'sfWonder':
        C.Sound.play('build');
        if (ev.level) this.toast(`${ev.pid === me ? 'Construyes' : pn(ev.pid) + ' construye'} el nivel ${ev.level} de ${SF.WONDERS[v.sf.wonders[ev.wid].kind].name}`, ev.pid === me ? 'ok' : '');
        return true;
    }
    return false;
  };
  const isLandT = t => C.isLand(t);
  const harborName = t => (t === 'any' ? '3:1' : '2:1 de ' + C.RES_NAME[t]);
})(typeof window !== 'undefined' ? window : globalThis);
