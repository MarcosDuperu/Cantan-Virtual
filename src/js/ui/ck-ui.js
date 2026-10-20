// Interfaz de Ciudades y Caballeros: amplía la pantalla de partida (GameUI).
(function (root) {
  const C = root.Catan;
  const CK = C.CK;
  const { icon, pieceSVG } = C.UIIcons;
  const esc = C.esc;
  const RES = C.RES, COMM = C.COMM, KEYS = C.KEYS;
  const G = C.GameUI.prototype;

  const AREA_ICON = { trade: 'cloth', politics: 'coin', science: 'paper' };
  const shipIcon = (size = 22, col = '#1b1b1b') => `<svg width="${size}" height="${size}" viewBox="-16 -16 32 32" class="ic"><path d="M-13,3 L13,3 L9,10 L-9,10Z" fill="${col}"/>
    <path d="M0,-13 L0,3" stroke="${col}" stroke-width="1.8"/><path d="M1,-12 L11,1 L1,1Z" fill="#c0281c"/><path d="M-1,-10 L-9,1 L-1,1Z" fill="#8a1f15"/></svg>`;
  const gateIcon = (col, size = 22) => `<svg width="${size}" height="${size}" viewBox="0 0 32 32" class="ic"><path d="M4,30 V10 L8,10 V6 L12,6 V10 L20,10 V6 L24,6 V10 L28,10 V30Z" fill="${col}" stroke="#1b1b1b" stroke-width="1.4"/>
    <path d="M11,30 V20 Q16,13 21,20 V30Z" fill="#2b2218"/></svg>`;
  const shieldIcon = (size = 18) => icon('knight', size);

  G.isCK = function () { return !!(this.view && C.isCK(this.view)); };
  G.cardKeys = function () { return this.isCK() ? KEYS : RES; };

  // ---------- pista de bárbaros ----------
  G.ckRenderTrack = function () {
    let el = this.$.barb;
    if (!el) {
      el = this.$.barb = document.createElement('div');
      el.className = 'barb-track';
      this.el.querySelector('.board-wrap').appendChild(el);
    }
    if (!this.isCK()) { el.style.display = 'none'; return; }
    const v = this.view, ck = v.ck;
    el.style.display = '';
    let cells = '';
    for (let i = 0; i <= ck.track; i++) {
      const last = i === ck.track;
      cells += `<div class="bt-cell ${i === ck.barbarian ? 'on' : ''} ${last ? 'catan' : ''} ${i >= 5 && !last ? 'warn' : ''}">${i === ck.barbarian ? shipIcon(24) : last ? gateIcon('#c9a874', 20) : ''}</div>`;
    }
    const danger = ck.defense < ck.barbarianStrength;
    el.innerHTML = `<div class="bt-head"><b>Bárbaros</b><span class="bt-vs ${danger ? 'bad' : 'good'}" title="Fuerza bárbara (ciudades en juego) contra defensa (caballeros activos)">
      ${shipIcon(16)} ${ck.barbarianStrength} <i>vs</i> ${shieldIcon(16)} ${ck.defense}</span></div>
      <div class="bt-cells">${cells}</div>
      ${ck.attacks ? `<div class="bt-note">Ataques: ${ck.attacks}</div>` : '<div class="bt-note">El ladrón no se mueve hasta el primer ataque</div>'}`;
  };

  // ---------- dados ----------
  const PIPS = { 1: [[2, 2]], 2: [[1, 1], [3, 3]], 3: [[1, 1], [2, 2], [3, 3]], 4: [[1, 1], [1, 3], [3, 1], [3, 3]], 5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]], 6: [[1, 1], [1, 2], [1, 3], [3, 1], [3, 2], [3, 3]] };
  const colorDie = (n, bg, pip) => `<svg viewBox="0 0 40 40" class="die-svg"><rect x="2" y="2" width="36" height="36" rx="7" fill="${bg}" stroke="#4a3a22" stroke-width="2"/>
    ${(PIPS[n] || []).map(([r, c]) => `<circle cx="${c * 10}" cy="${r * 10}" r="3.6" fill="${pip}"/>`).join('')}</svg>`;
  const eventDie = ev => `<svg viewBox="0 0 40 40" class="die-svg"><rect x="2" y="2" width="36" height="36" rx="7" fill="#fdfaf2" stroke="#4a3a22" stroke-width="2"/>
    <g transform="translate(20,21)">${ev === 'ship' ? '<path d="M-12,2 L12,2 L8,9 L-8,9Z" fill="#1b1b1b"/><path d="M0,-12 L0,2" stroke="#1b1b1b" stroke-width="2"/><path d="M1,-11 L10,0 L1,0Z" fill="#c0281c"/><path d="M-1,-9 L-8,0 L-1,0Z" fill="#8a1f15"/>'
      : `<path d="M-11,11 V-4 L-8,-4 V-8 L-4,-8 V-4 L4,-4 V-8 L8,-8 V-4 L11,-4 V11Z" fill="${CK.AREA_COLOR[ev]}" stroke="#1b1b1b" stroke-width="1.2"/><path d="M-4,11 V4 Q0,-1 4,4 V11Z" fill="#2b2218"/>`}</g></svg>`;
  G.ckDiceHTML = function (d, ev, rolling) {
    const r = rolling ? 1 + Math.floor(Math.random() * 6) : d[0];
    const y = rolling ? 1 + Math.floor(Math.random() * 6) : d[1];
    const e = rolling ? ['ship', 'trade', 'politics', 'science'][Math.floor(Math.random() * 4)] : ev;
    return `<div class="die ${rolling ? 'rolling' : ''}" title="Dado rojo">${colorDie(r, '#c9302c', '#fff')}</div>
      <div class="die ${rolling ? 'rolling' : ''}" title="Dado amarillo">${colorDie(y, '#f2c230', '#2b2218')}</div>
      <div class="die event ${rolling ? 'rolling' : ''}" title="Dado de eventos">${eventDie(e)}</div>
      ${rolling ? '' : `<div class="dice-sum ${r + y === 7 ? 'seven' : ''}">${r + y}</div>`}`;
  };

  // ---------- panel de jugadores ----------
  G.ckPlayerExtra = function (p) {
    const v = this.view;
    const stats = `<span title="Cartas en la mano"><i class="mini-card res"></i>${p.resCount}</span>
      <span title="Cartas de progreso"><i class="mini-card prog"></i>${p.progressCount}</span>
      <span title="Fuerza de caballeros activos / total">${shieldIcon(15)}${p.strength}/${p.strengthTotal}</span>
      <span title="Ruta comercial más larga">${pieceSVG('road', p.color, 15)}${p.routeLength}</span>`;
    const bars = `<div class="imp-bars" title="Mejoras de ciudad">${CK.AREAS.map(a => `<span class="imp-bar" title="${CK.AREA_NAME[a]}: nivel ${p.improve[a]}">
      ${[1, 2, 3, 4, 5].map(i => `<i style="${i <= p.improve[a] ? 'background:' + CK.AREA_COLOR[a] : ''}"></i>`).join('')}</span>`).join('')}</div>`;
    const tags = [];
    CK.AREAS.forEach(a => { const m = v.ck.metropolis[a]; if (m && m.owner === p.id) tags.push(`<span class="badge metro" style="--ac:${CK.AREA_COLOR[a]}" title="${CK.METRO_NAME[a]} (+2 PV)">Metrópolis</span>`); });
    if (p.ckVP.defender) tags.push(`<span class="badge army" title="Defensor de Catan (+1 PV cada uno)">${shieldIcon(13)} Defensor ×${p.ckVP.defender}</span>`);
    if (p.ckVP.progress) tags.push(`<span class="badge road" title="Imprenta / Constitución">+${p.ckVP.progress} PV</span>`);
    if (v.ck.merchant && v.ck.merchant.owner === p.id) tags.push(`<span class="badge road" title="Mercader (+1 PV)">Mercader</span>`);
    if (p.walls) tags.push(`<span class="badge isl" title="Murallas: +2 al límite de cartas cada una">Murallas ${p.walls}</span>`);
    return { stats: stats, bars, tags };
  };

  // ---------- estado ----------
  G.ckStatus = function () {
    const v = this.view, me = this.me;
    const who = this.pname(v.current);
    if (v.phase === 'setup' && v.setup.round === 2 && v.setup.step === 'settlement') {
      return v.current === me ? 'Coloca tu ciudad inicial (recibirás sus recursos)' : `${who} está colocando su ciudad…`;
    }
    if (v.phase === 'roll') return v.current === me ? 'Tira los dados (puedes jugar el Alquimista antes)' : `Esperando a que ${who} tire los dados…`;
    if (v.phase === 'peek') return v.current === me ? 'Elige la carta que te llevas' : `${who} está mirando las cartas de un rival…`;
    if (v.phase === 'give') return v.pendingGive[me] ? `Boda: entrega ${v.pendingGive[me]} cartas a ${this.pname(v.ck.giveTo)}` : 'Esperando los regalos de boda…';
    if (v.phase === 'placeKnight') return v.current === me ? 'Desertor: coloca tu caballero en un cruce junto a tus carreteras' : `${who} coloca un caballero…`;
    if (v.phase === 'main' && v.current === me && this.mode) {
      const M = {
        knight: 'Elige un cruce libre junto a tus carreteras para el caballero', activate: 'Elige el caballero a activar',
        promote: 'Elige el caballero a ascender', wall: 'Elige la ciudad donde levantar la muralla', kfrom: 'Elige el caballero que actuará',
        kto: 'Mover, desalojar (rojo) o ahuyentar al ladrón (hexágono)', prog: this.prog && this.prog.prompt
      };
      if (M[this.mode]) return M[this.mode] + ' (Esc para cancelar)';
    }
    if (v.phase === 'specialBuild' && this.mode && v.specialBuilder === me) {
      const M = { knight: 'Elige un cruce para el caballero', activate: 'Elige el caballero a activar', promote: 'Elige el caballero a ascender', wall: 'Elige la ciudad para la muralla' };
      if (M[this.mode]) return M[this.mode];
    }
    return null;
  };

  // ---------- resaltados ----------
  G.ckHighlights = function () {
    const v = this.view, me = this.me;
    if (v.phase === 'placeKnight' && v.current === me) return { vertices: CK.knightSpots(v, me), vertexR: 12 };
    if (!this.mode || !this.isMyBuild()) return null;
    const own = Object.keys(v.knights).map(Number).filter(x => v.knights[x].owner === me);
    switch (this.mode) {
      case 'knight': return { vertices: CK.knightSpots(v, me), vertexR: 11 };
      case 'activate': return { vertices: own.filter(x => !v.knights[x].active), vertexR: 16 };
      case 'promote': return { vertices: own.filter(x => CK.promotable(v, me, x)), vertexR: 16 };
      case 'wall': return { vertices: CK.citiesOf(v, me).filter(x => !v.buildings[x].wall), vertexR: 18 };
      case 'kfrom': return { vertices: own.filter(x => this.ckKnightCanAct(x)), vertexR: 16 };
      case 'kto': {
        const t = CK.knightTargets(v, me, this.kFrom);
        return { vertices: t.empty, vertices2: t.displace, hexes: CK.canChase(v, me, this.kFrom) ? [v.robber] : [], selectedVertices: [this.kFrom], vertexR: 10 };
      }
      case 'prog': {
        const pr = this.prog;
        const valid = pr.valid.filter(x => !pr.picks.includes(x));
        if (pr.need === 'hex') return { hexes: valid, selectedHexes: pr.picks };
        if (pr.need === 'vertex') return { vertices: valid, selectedVertices: pr.picks, vertexR: 16 };
        if (pr.need === 'edge') return { edges: valid };
      }
    }
    return null;
  };

  G.ckKnightCanAct = function (x) {
    const v = this.view, me = this.me, k = v.knights[x];
    if (!k || k.owner !== me || !k.active || k.actTurn === v.turn) return false;
    const t = CK.knightTargets(v, me, x);
    return t.empty.length > 0 || t.displace.length > 0 || CK.canChase(v, me, x);
  };

  G.ckBoardClick = function (kind, id) {
    const v = this.view, me = this.me;
    if (v.phase === 'placeKnight' && v.current === me) { if (kind === 'vertex') this.send({ type: 'placeFreeKnight', vertex: id }); return true; }
    if (!this.mode) return false;
    const m = this.mode;
    if (kind === 'vertex' && ['knight', 'activate', 'promote', 'wall'].includes(m)) {
      const type = { knight: 'buildKnight', activate: 'activateKnight', promote: 'promoteKnight', wall: 'buildWall' }[m];
      this.setMode(null);
      this.send({ type, vertex: id });
      return true;
    }
    if (m === 'kfrom' && kind === 'vertex') { this.mode = 'kto'; this.kFrom = id; this.render(); return true; }
    if (m === 'kto') {
      const from = this.kFrom;
      if (kind === 'vertex') { this.setMode(null); this.send({ type: 'moveKnight', from, to: id }); return true; }
      if (kind === 'hex') { this.setMode(null); this.send({ type: 'chaseRobber', vertex: from }); return true; }
    }
    if (m === 'prog') {
      const pr = this.prog;
      if ((pr.need === 'hex' && kind !== 'hex') || (pr.need === 'vertex' && kind !== 'vertex') || (pr.need === 'edge' && kind !== 'edge')) return true;
      pr.picks.push(id);
      if (pr.picks.length >= pr.count) this.finishProg();
      else this.render();
      return true;
    }
    return false;
  };

  G.finishProg = function () {
    const pr = this.prog;
    this.setMode(null);
    this.prog = null;
    this.send(Object.assign({ type: 'playProgress', card: pr.card }, pr.build(pr.picks)));
  };

  // ---------- mano ----------
  G.ckRenderHand = function () {
    const v = this.view, P = this.P;
    this.$.hand.classList.add('compact');
    this.$.hand.innerHTML = KEYS.map(k => `<div class="rcard r-${k} ${P.resources[k] ? '' : 'empty'}" title="${C.RES_NAME[k]}${COMM.includes(k) ? ' (mercancía)' : ''}">
      <div class="rc-art">${icon(k, 38)}</div><div class="rc-name">${C.RES_NAME[k]}</div><div class="rc-count">${P.resources[k]}</div></div>`).join('');
    const mine = v.current === this.me;
    const prog = P.progress || [];
    this.$.devs.classList.toggle('many', prog.length > 3);
    this.$.devs.innerHTML = prog.length ? prog.map((c, i) => {
      const can = mine && ((c.type === 'alchemist' && v.phase === 'roll') || (c.type !== 'alchemist' && v.phase === 'main'));
      return `<div class="dcard ${can ? 'playable' : ''}" data-prog="${i}" title="${esc(CK.PROGRESS_NAME[c.type])}: ${esc(CK.PROGRESS_HELP[c.type])}${can ? ' — clic para jugar' : ''}">
        ${C.CardArt.progressCard(c.type)}${can ? '<div class="dc-play">Jugar</div>' : ''}</div>`;
    }).join('') : '<div class="devs-empty">Sin cartas de progreso</div>';
    const sp = [];
    if (v.longestRoad === this.me) sp.push(`<div class="scard" title="${C.CardArt.DEV_HELP.longestRoad}">${C.CardArt.specialCard('longestRoad')}</div>`);
    CK.AREAS.forEach(a => { const m = v.ck.metropolis[a]; if (m && m.owner === this.me) sp.push(`<div class="scard" title="${CK.METRO_NAME[a]}: tu ciudad vale 4 PV y no puede ser saqueada">${C.CardArt.ckSpecialCard('metro_' + a)}</div>`); });
    if (P.ckVP.defender) sp.push(`<div class="scard" title="Defensor de Catan: 1 PV cada una">${C.CardArt.ckSpecialCard('defender')}${P.ckVP.defender > 1 ? `<div class="rc-count">${P.ckVP.defender}</div>` : ''}</div>`);
    if (v.ck.merchant && v.ck.merchant.owner === this.me) sp.push(`<div class="scard" title="Mercader: 1 PV y cambio 2:1 del recurso de su terreno">${C.CardArt.ckSpecialCard('merchant')}</div>`);
    this.$.specials.innerHTML = sp.join('');
    if (!this.$.devs.dataset.ckBound) {
      this.$.devs.dataset.ckBound = '1';
      this.$.devs.addEventListener('click', e => {
        const c = e.target.closest('[data-prog]');
        if (c && this.isCK()) this.playProgressUI(+c.dataset.prog);
      });
    }
  };

  // ---------- acciones ----------
  G.ckRenderActions = function () {
    const v = this.view, P = this.P, me = this.me;
    const build = this.isMyBuild(), main = this.isMyMain();
    const has = c => C.hasRes(P.resources, c);
    const own = Object.keys(v.knights).map(Number).filter(x => v.knights[x].owner === me);
    const btn = (act, label, ic, enabled, cost, title = '') => `<button class="abtn ${this.mode === act ? 'active' : ''}" data-a="${act}" ${enabled ? '' : 'disabled'} title="${esc(title)}">
      <span class="ab-ic">${ic}</span><span class="ab-l">${label}</span>${cost ? `<span class="ab-cost">${KEYS.filter(k => cost[k]).map(k => icon(k, 12).repeat(cost[k])).join('')}</span>` : ''}</button>`;
    let html = '';
    if (v.phase === 'roll' && this.isMyTurn()) html += `<button class="abtn primary roll" data-a="roll"><span class="ab-ic">🎲</span><span class="ab-l">Tirar dados</span></button>`;
    if (v.phase === 'roadBuilding' && this.isMyTurn()) html += `<button class="abtn" data-a="endRoadBuilding"><span class="ab-l">Terminar construcción gratis</span></button>`;
    if (v.phase === 'placeKnight' && this.isMyTurn()) html += `<button class="abtn" data-a="skipKnight"><span class="ab-l">No colocar</span></button>`;
    if (this.mode === 'prog' && this.prog && this.prog.multi && this.prog.picks.length) html += `<button class="abtn primary" data-a="progOk"><span class="ab-l">Confirmar (${this.prog.picks.length})</span></button>`;
    html += btn('road', 'Carretera', pieceSVG('road', P.color, 22), build && P.pieces.road > 0 && this.afford('road') && C.validRoutes(v, me, 'road').length, C.COST.road);
    html += btn('settlement', 'Poblado', pieceSVG('settlement', P.color, 22), build && P.pieces.settlement > 0 && this.afford('settlement') && C.validSettlements(v, me, false).length, C.COST.settlement);
    html += btn('city', 'Ciudad', pieceSVG('city', P.color, 22), build && P.pieces.city > 0 && this.afford('city') && C.validCities(v, me).length, C.COST.city);
    html += btn('wall', 'Muralla', '🧱', build && P.walls < 3 && has(CK.WALL_COST) && CK.citiesOf(v, me).some(x => !v.buildings[x].wall), CK.WALL_COST, 'Muralla: +2 al límite de cartas');
    html += btn('knight', 'Caballero', shieldIcon(22), build && P.knightPieces[1] > 0 && has(CK.KNIGHT_COST) && CK.knightSpots(v, me).length, CK.KNIGHT_COST, 'Reclutar caballero básico');
    html += btn('activate', 'Activar', '⚡', build && has(CK.ACTIVATE_COST) && own.some(x => !v.knights[x].active), CK.ACTIVATE_COST, 'Activar caballero');
    html += btn('promote', 'Ascender', '⬆', build && has(CK.KNIGHT_COST) && own.some(x => CK.promotable(v, me, x)), CK.KNIGHT_COST, 'Ascender caballero (poderoso requiere Fortaleza)');
    html += btn('kfrom', 'Acción', '⚔', main && own.some(x => this.ckKnightCanAct(x)), null, 'Mover, desalojar o ahuyentar al ladrón');
    html += btn('improve', 'Mejoras', gateIcon('#c9a874', 22), build && CK.citiesOf(v, me).length > 0, null, 'Mejoras de ciudad');
    html += btn('trade', 'Comerciar', '⇄', main && !v.trade, null);
    if (v.phase === 'specialBuild' && v.specialBuilder === me) html += `<button class="abtn primary" data-a="pass"><span class="ab-l">Pasar</span></button>`;
    else html += `<button class="abtn end ${main ? 'primary' : ''}" data-a="end" ${main ? '' : 'disabled'}><span class="ab-l">Terminar turno</span></button>`;
    html += `<div class="pieces-left" title="Piezas restantes">${pieceSVG('road', P.color, 15)}${P.pieces.road} ${pieceSVG('settlement', P.color, 15)}${P.pieces.settlement}
      ${pieceSVG('city', P.color, 15)}${P.pieces.city} · caballeros I:${P.knightPieces[1]} II:${P.knightPieces[2]} III:${P.knightPieces[3]}</div>`;
    this.$.actions.innerHTML = html;
  };

  G.ckAction = function (a) {
    if (['knight', 'activate', 'promote', 'wall', 'kfrom'].includes(a)) { this.setMode(this.mode === a ? null : a); return true; }
    if (a === 'improve') { this.openImprovements(); return true; }
    if (a === 'skipKnight') { this.send({ type: 'skipFreeKnight' }); return true; }
    if (a === 'progOk') { this.finishProg(); return true; }
    return false;
  };

  // ---------- eventos ----------
  G.ckEvent = function (ev, v) {
    const me = this.me;
    switch (ev.type) {
      case 'barbarianMove':
        C.Sound.play('drum');
        if (ev.pos >= 5) this.toast(`¡El barco bárbaro se acerca! (${ev.pos}/7)`, 'err');
        else this.toast(`El barco bárbaro avanza (${ev.pos}/7)`);
        return true;
      case 'barbarians': this.showBarbarianAttack(ev, v); return true;
      case 'progress':
        C.Sound.play('card');
        if (ev.pid === me) this.toast('Recibes una carta de progreso de ' + CK.AREA_NAME[ev.area], 'ok');
        return true;
      case 'progressVP':
        this.reveal(C.CardArt.progressCard(ev.card), (ev.pid === me ? 'Obtienes ' : v.players[ev.pid].name + ' obtiene ') + CK.PROGRESS_NAME[ev.card] + ' (+1 PV)', ev.pid === me);
        return true;
      case 'playProgress':
        C.Sound.play('card');
        this.reveal(C.CardArt.progressCard(ev.card), (ev.pid === me ? 'Juegas ' : v.players[ev.pid].name + ' juega ') + CK.PROGRESS_NAME[ev.card]);
        return true;
      case 'metropolis':
        C.Sound.play('metropolis');
        this.reveal(C.CardArt.ckSpecialCard('metro_' + ev.area), (ev.pid === me ? '¡Fundas la ' : v.players[ev.pid].name + ' funda la ') + CK.METRO_NAME[ev.area] + '! (+2 PV)', ev.pid === me);
        return true;
      case 'improve':
        C.Sound.play('improve');
        if (ev.pid === me) this.toast(`${CK.IMPROVEMENTS[ev.area][ev.level - 1]} construido (${CK.AREA_NAME[ev.area]} ${ev.level})`, 'ok');
        return true;
      case 'merchant': C.Sound.play('coin'); return true;
    }
    return false;
  };

  G.showBarbarianAttack = function (ev, v) {
    C.Sound.play(ev.win ? 'horn' : 'pillage');
    const names = ids => ids.map(i => esc(v.players[i].name)).join(', ');
    let detail;
    if (ev.win) detail = ev.defenders.length === 1 ? `${names(ev.defenders)} es nombrado <b>Defensor de Catan</b> (+1 PV).` :
      ev.defenders.length ? `Empate entre ${names(ev.defenders)}: cada uno recibe una carta de progreso.` : '';
    else detail = ev.losers.length ? `Ciudades saqueadas: ${names(ev.losers)}.` : 'No había ciudades que saquear.';
    const el = document.createElement('div');
    el.className = 'barb-attack ' + (ev.win ? 'win' : 'lose');
    el.innerHTML = `<div class="ba-ship">${shipIcon(90)}</div><h2>${ev.win ? '¡Catan resiste!' : '¡Los bárbaros saquean Catan!'}</h2>
      <div class="ba-vs"><div>${shipIcon(28)}<b>${ev.strength}</b><small>Bárbaros</small></div><i>vs</i><div>${shieldIcon(28)}<b>${ev.defense}</b><small>Caballeros</small></div></div>
      <p>${detail}</p><small class="muted">Todos los caballeros quedan inactivos. Clic para cerrar.</small>`;
    el.addEventListener('click', () => el.remove());
    this.$.reveal.appendChild(el);
    setTimeout(() => el.classList.add('out'), 5200);
    setTimeout(() => el.remove(), 5700);
  };

  // ---------- mejoras de ciudad ----------
  G.openImprovements = function () {
    const draw = m => {
      const v = this.view, P = this.P, me = this.me;
      const build = this.isMyBuild();
      const crane = v.ck.crane === me && v.phase === 'main';
      const hasCity = CK.citiesOf(v, me).length > 0;
      m.innerHTML = `<h2>Mejoras de ciudad</h2>
        <p class="muted">Cada nivel cuesta tantas mercancías como su número${crane ? ' (Grúa: 1 menos)' : ''}. Nivel 3: habilidad especial. Nivel 4: metrópolis.</p>
        <div class="imp-cols">${CK.AREAS.map(a => {
          const lvl = P.improve[a], comm = CK.AREA_COMM[a];
          const cost = lvl < 5 ? lvl + 1 - (crane ? 1 : 0) : null;
          const metro = v.ck.metropolis[a];
          const can = build && hasCity && lvl < 5 && P.resources[comm] >= cost;
          return `<div class="imp-col" style="--ac:${CK.AREA_COLOR[a]}">
            <div class="imp-head">${icon(comm, 26)}<b>${CK.AREA_NAME[a]}</b><small>${C.RES_NAME[comm]}: tienes ${P.resources[comm]}</small></div>
            ${CK.IMPROVEMENTS[a].map((n, i) => `<div class="imp-lvl ${i < lvl ? 'done' : ''} ${i === lvl ? 'next' : ''}">
              <span class="imp-n">${i + 1}</span><span class="imp-name">${n}</span>
              <span class="imp-cost">${icon(comm, 13).repeat(i + 1)}</span>
              ${i === 2 ? `<small class="imp-ab">${{ trade: 'Mercancías 2:1', politics: 'Caballeros poderosos', science: 'Acueducto' }[a]}</small>` : ''}
              ${i === 3 ? '<small class="imp-ab">Metrópolis</small>' : ''}</div>`).reverse().join('')}
            <div class="imp-metro">${metro ? `Metrópolis: <b>${esc(v.players[metro.owner].name)}</b>` : 'Metrópolis libre'}</div>
            <button class="btn primary small" data-imp="${a}" ${can ? '' : 'disabled'}>${lvl >= 5 ? 'Completo' : `Construir nivel ${lvl + 1} (${cost})`}</button>
          </div>`;
        }).join('')}</div>${hasCity ? '' : '<p class="muted">Necesitas al menos una ciudad para construir mejoras.</p>'}
        <button class="modal-x" data-close>×</button>`;
    };
    this.impModal = this.modal('', {
      dismiss: true, cls: 'wide',
      mount: (m, close) => {
        this.impDraw = () => draw(m);
        draw(m);
        m.addEventListener('click', e => {
          const b = e.target.closest('button');
          if (!b || b.disabled) return;
          if (b.dataset.close !== undefined) { this.impDraw = null; close(); return; }
          if (b.dataset.imp) this.send({ type: 'improve', area: b.dataset.imp });
        });
      }
    });
  };

  // ---------- cartas de progreso ----------
  G.playProgressUI = function (index) {
    const v = this.view, me = this.me, P = this.P;
    const c = (P.progress || [])[index];
    if (!c) return;
    const type = c.type;
    const name = CK.PROGRESS_NAME[type];
    if (v.current !== me) { this.toast('Solo puedes jugar cartas de progreso en tu turno'); return; }
    if (type === 'alchemist' && v.phase !== 'roll') { this.toast('El Alquimista se juega antes de tirar los dados'); return; }
    if (type !== 'alchemist' && v.phase !== 'main') { this.toast(v.phase === 'roll' ? 'Primero tira los dados' : 'Ahora no puedes jugar cartas'); return; }
    const send = extra => this.send(Object.assign({ type: 'playProgress', card: type }, extra || {}));
    const opp = v.players.filter(p => p.id !== me);
    const myVP = v.players[me].vp;
    const startPick = (need, valid, count, prompt, build, multi) => {
      if (!valid.length) { this.toast('No hay objetivos válidos para ' + name); return; }
      this.prog = { card: type, need, valid, count, prompt: name + ': ' + prompt, picks: [], build, multi };
      this.setMode('prog');
    };
    const pickPlayer = (list, sub, key) => {
      if (!list.length) { this.toast('No hay jugadores válidos para ' + name); return; }
      this.modal(`<h2>${esc(name)}</h2><p>${esc(sub)}</p><div class="choice-row">${list.map(p => `<button class="big-choice" data-p="${p.id}">
        <div class="pc-avatar" style="--pc:${C.colorHex(p.color)}">${esc(p.avatar || p.name[0])}</div><span>${esc(p.name)}</span>
        <small>${p.vp} PV · ${p.resCount} cartas · ${p.progressCount} progreso</small></button>`).join('')}</div>`, {
        dismiss: true,
        mount: (m, close) => m.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) { close(); send({ [key]: +b.dataset.p }); } })
      });
    };
    const pickKey = (keys, sub) => {
      this.modal(`<h2>${esc(name)}</h2><p>${esc(sub)}</p><div class="res-pick ${keys.length > 5 ? 'wide8' : ''}">${keys.map(k => `<button class="rp" data-k="${k}">${icon(k, 36)}<span>${C.RES_NAME[k]}</span></button>`).join('')}</div>`, {
        dismiss: true,
        mount: (m, close) => m.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) { close(); send({ resource: b.dataset.k }); } })
      });
    };
    switch (type) {
      case 'alchemist': {
        const st = { red: 3, yellow: 4 };
        const draw = m => {
          m.innerHTML = `<h2>Alquimista</h2><p>Elige el resultado de los dados de producción. El dado de eventos se tira normalmente.</p>
            ${['red', 'yellow'].map(d => `<div class="alch-row"><b>${d === 'red' ? 'Dado rojo' : 'Dado amarillo'}</b>${[1, 2, 3, 4, 5, 6].map(n => `<button class="alch-die ${st[d] === n ? 'on' : ''}" data-d="${d}" data-n="${n}">
              ${colorDie(n, d === 'red' ? '#c9302c' : '#f2c230', d === 'red' ? '#fff' : '#2b2218')}</button>`).join('')}</div>`).join('')}
            <div class="tr-foot"><span>Suma: <b>${st.red + st.yellow}</b>${st.red + st.yellow === 7 ? ' (¡7!)' : ''}</span><button class="btn primary" data-ok>Jugar</button></div>
            <button class="modal-x" data-close>×</button>`;
        };
        this.modal('', {
          dismiss: true,
          mount: (m, close) => {
            draw(m);
            m.addEventListener('click', e => {
              const b = e.target.closest('button');
              if (!b) return;
              if (b.dataset.close !== undefined) return close();
              if (b.dataset.d) { st[b.dataset.d] = +b.dataset.n; draw(m); }
              if (b.dataset.ok !== undefined) { close(); send({ red: st.red, yellow: st.yellow }); }
            });
          }
        });
        return;
      }
      case 'inventor': return startPick('hex', CK.inventorHexes(v), 2, 'elige dos fichas numéricas para intercambiar', p => ({ hexes: p }));
      case 'engineer': return startPick('vertex', CK.citiesOf(v, me).filter(x => !v.buildings[x].wall), 1, 'elige la ciudad para la muralla gratis', p => ({ vertex: p[0] }));
      case 'medicine': return startPick('vertex', C.validCities(v, me), 1, 'elige el poblado a mejorar (2 mineral + 1 cereal)', p => ({ vertex: p[0] }));
      case 'smith': {
        const ks = Object.keys(v.knights).map(Number).filter(x => CK.promotable(v, me, x, true));
        return startPick('vertex', ks, Math.min(2, ks.length), 'elige hasta 2 caballeros para ascender', p => ({ vertices: p }), true);
      }
      case 'bishop':
        if (!v.ck.attacks) { this.toast('El ladrón no se mueve hasta el primer ataque bárbaro'); return; }
        return startPick('hex', v.board.hexes.filter(h => C.isLand(h.terrain) && h.id !== v.robber).map(h => h.id), 1, 'elige dónde mover el ladrón', p => ({ hex: p[0] }));
      case 'merchant': return startPick('hex', CK.merchantHexes(v, me), 1, 'elige el terreno para el mercader', p => ({ hex: p[0] }));
      case 'diplomat': return startPick('edge', Object.keys(v.roads).map(Number).filter(e => CK.isOpenRoad(v, e)), 1, 'elige una carretera abierta para retirar', p => ({ edge: p[0] }));
      case 'intrigue': return startPick('vertex', Object.keys(v.knights).map(Number).filter(x => v.knights[x].owner !== me &&
        v.board.vertices[x].edges.some(e => v.roads[e] && v.roads[e].owner === me)), 1, 'elige el caballero rival a desalojar', p => ({ vertex: p[0] }));
      case 'deserter': return pickPlayer(opp.filter(p => Object.values(v.knights).some(k => k.owner === p.id)), 'Ese jugador retira su caballero más débil y tú colocas uno de la misma fuerza.', 'target');
      case 'spy': return pickPlayer(opp.filter(p => p.progressCount > 0), 'Mira sus cartas de progreso y quédate con una.', 'target');
      case 'masterMerchant': return pickPlayer(opp.filter(p => p.vp > myVP && p.resCount > 0), 'Mira la mano de un jugador con más puntos y toma 2 cartas.', 'target');
      case 'merchantFleet': return pickKey(KEYS, 'Durante este turno cambias ese recurso o mercancía 2:1 con el banco.');
      case 'resourceMonopoly': return pickKey(RES, 'Cada rival te da hasta 2 cartas de ese recurso.');
      case 'tradeMonopoly': return pickKey(COMM, 'Cada rival te da 1 carta de esa mercancía.');
      default:
        this.confirm(`¿Jugar ${esc(name)}?`, esc(CK.PROGRESS_HELP[type]), () => send());
    }
  };

  // ---------- diálogos obligatorios ----------
  G.ckModalKey = function () {
    const v = this.view, me = this.me;
    if (v.phase === 'give' && v.pendingGive[me]) return 'give:' + v.turn + ':' + v.logSeq;
    if (v.phase === 'peek' && v.current === me) return 'peek:' + v.turn + ':' + v.ck.peek.kind;
    if (v.ck.pendingProgressDiscard[me]) return 'pdisc:' + v.players[me].progress.length;
    return null;
  };
  G.ckOpenModal = function (key) {
    const v = this.view, me = this.me, P = this.P;
    if (key.startsWith('give')) {
      const n = v.pendingGive[me];
      return this.pickResources('Boda', `Entrega ${n} cartas de tu mano a ${esc(v.players[v.ck.giveTo].name)}`, n, P.resources, r => this.send({ type: 'give', resources: r }), false, true, KEYS);
    }
    if (key.startsWith('peek')) {
      if (v.ck.peek.kind === 'spy') {
        return this.modal(`<h2>Espía</h2><p>Cartas de progreso de ${esc(v.players[v.ck.peek.target].name)}. Elige una:</p>
          <div class="peek-cards">${(v.ck.peekCards || []).map((c, i) => `<button class="peek-card" data-i="${i}" title="${esc(CK.PROGRESS_HELP[c.type])}">${C.CardArt.progressCard(c.type)}</button>`).join('')}</div>
          <div class="go-btns"><button class="btn" data-cancel>No tomar ninguna</button></div>`, {
          mount: (m, close) => m.addEventListener('click', e => {
            const b = e.target.closest('[data-i]');
            if (b) { close(); this.send({ type: 'peekTake', index: +b.dataset.i }); }
            if (e.target.closest('[data-cancel]')) { close(); this.send({ type: 'peekCancel' }); }
          })
        });
      }
      const hand = v.ck.peekHand || {};
      const n = Math.min(2, C.total(hand));
      return this.pickResources('Maestro mercader', `Mano de ${esc(v.players[v.ck.peek.target].name)}: elige ${n} cartas`, n, hand, r => this.send({ type: 'peekTake', resources: r }), false, true, KEYS);
    }
    if (key.startsWith('pdisc')) return this.openProgressDiscard('Tienes más de 4 cartas de progreso: descarta una.', false);
    return null;
  };

  G.openProgressDiscard = function (text, dismiss) {
    const P = this.P;
    return this.modal(`<h2>Cartas de progreso</h2><p>${esc(text)}</p>
      <div class="peek-cards">${P.progress.map((c, i) => `<button class="peek-card" data-i="${i}" title="${esc(CK.PROGRESS_HELP[c.type])}">${C.CardArt.progressCard(c.type)}</button>`).join('')}</div>
      ${dismiss ? '<button class="modal-x" data-close>×</button>' : ''}`, {
      dismiss,
      mount: (m, close) => m.addEventListener('click', e => {
        if (e.target.closest('[data-close]')) return close();
        const b = e.target.closest('[data-i]');
        if (b) { close(); this.send({ type: 'discardProgress', index: +b.dataset.i }); }
      })
    });
  };

  // ---------- costes ----------
  G.ckCosts = function () {
    const col = this.P.color;
    const row = (piece, name, cost, pts) => `<div class="cost-row"><span class="cr-p">${piece}</span><span class="cr-n">${name}</span>
      <span class="cr-c">${KEYS.filter(k => cost[k]).map(k => icon(k, 20).repeat(cost[k])).join('')}</span><span class="cr-v">${pts}</span></div>`;
    return `<h2>Costes — Ciudades y Caballeros</h2><div class="costs">
      ${row(pieceSVG('road', col, 28), 'Carretera', C.COST.road, '0 PV')}
      ${row(pieceSVG('settlement', col, 28), 'Poblado', C.COST.settlement, '1 PV')}
      ${row(pieceSVG('city', col, 28), 'Ciudad', C.COST.city, '2 PV')}
      ${row('🧱', 'Muralla (máx. 3)', CK.WALL_COST, '+2 cartas')}
      ${row(shieldIcon(28), 'Caballero básico', CK.KNIGHT_COST, 'fuerza 1')}
      ${row('⚡', 'Activar caballero', CK.ACTIVATE_COST, '')}
      ${row('⬆', 'Ascender caballero', CK.KNIGHT_COST, '+1 fuerza')}
      ${CK.AREAS.map(a => row(icon(CK.AREA_COMM[a], 26), 'Mejora de ' + CK.AREA_NAME[a], { [CK.AREA_COMM[a]]: 1 }, 'nivel 1…5')).join('')}</div>
      <p class="muted">Cada nivel de mejora cuesta tantas mercancías como su número. Metrópolis: +2 PV. Defensor de Catan: +1 PV. Gran Ruta Comercial: +2 PV.</p>`;
  };
})(window);
