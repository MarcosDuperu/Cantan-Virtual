// Interfaz de Piratas y Exploradores: amplía la pantalla de partida (GameUI).
(function (root) {
  const C = root.Catan;
  const PE = C.PE;
  const { icon, pieceSVG } = C.UIIcons;
  const esc = C.esc;
  const RES = C.RES;
  const G = C.GameUI.prototype;

  const MISSION_ICON = { lairs: 'pirate', fish: 'fish', spice: 'spice' };
  const BEN_ICON = { fastTravel: '⛵', pirate4: '⚔', pirate5: '⚔', fastGold: '★' };
  const costHTML = (cost, size = 12) => RES.filter(k => cost[k]).map(k => icon(k, size).repeat(cost[k])).join('');
  const itemName = k => PE.ITEM_NAME[k];

  G.isPE = function () { return !!(this.view && C.isPE(this.view)); };

  // ---------- panel de misiones ----------
  G.peRenderPanel = function () {
    let el = this.$.pePanel;
    if (!el) {
      el = this.$.pePanel = document.createElement('div');
      el.className = 'pe-panel';
      this.el.querySelector('.board-wrap').appendChild(el);
    }
    if (!this.isPE()) { el.style.display = 'none'; return; }
    const v = this.view, sc = PE.SCENARIOS[v.pe.scenario];
    el.style.display = '';
    const rows = PE.MISSIONS.filter(m => sc[m]).map(m => {
      const leader = v.pe.leader[m];
      return `<div class="pm-row" title="${PE.MISSION_NAME[m]}: cada casilla da PV (${PE.TRACK_VP.join(', ')}); el líder suma 1 PV">
        <span class="pm-name">${icon(MISSION_ICON[m], 18)}${PE.MISSION_NAME[m]}</span>
        <span class="pm-track">${v.players.map(p => `<i class="pm-dot ${leader === p.id ? 'lead' : ''}" style="--pc:${C.colorHex(p.color)}" title="${esc(p.name)}: ${p.missions[m]} pasos">${p.missions[m]}</i>`).join('')}</span></div>`;
    }).join('');
    const pir = v.pe.pirate;
    el.innerHTML = `<div class="pm-head"><b>${esc(sc.name)}</b><small>${v.pe.hiddenLeft} hexágonos por descubrir</small></div>
      ${rows || '<div class="pm-note">Explora el mar y funda poblados en las islas nuevas.</div>'}
      ${sc.pirate ? `<div class="pm-note">${icon('pirate', 16)} Barco pirata: ${pir ? `<b style="color:${C.colorHex(v.players[pir.owner].color)}">${esc(v.players[pir.owner].name)}</b>` : 'fuera del tablero'}</div>` : ''}
      ${v.pe.pairs ? `<div class="pm-note">👥 Jugadores en pareja${v.pe.p2 ? `: juega <b>${esc(v.players[v.pe.p2.p2].name)}</b> (jugador 2)` : ''}</div>` : ''}
      ${v.pe.fishDie ? `<div class="pm-note">${icon('fish', 16)} Dado de pesca: <b>${v.pe.fishDie}</b></div>` : ''}`;
  };

  // ---------- jugadores ----------
  G.pePlayerExtra = function (p) {
    const v = this.view;
    const ships = Object.values(v.pe.ships).filter(x => x.owner === p.id).length;
    const stats = `<span title="Cartas de recurso"><i class="mini-card res"></i>${p.resCount}</span>
      <span title="Oro">${icon('gold', 15)}${p.gold}</span>
      <span title="Barcos en el mar">${pieceSVG('ship', p.color, 15)}${ships}</span>
      <span title="Tripulaciones en reserva">${icon('crew', 15)}${p.pieces.crew}</span>`;
    const tags = [];
    PE.MISSIONS.forEach(m => { if (v.pe.leader[m] === p.id && PE.missionActive(v, m)) tags.push(`<span class="badge road" title="Líder de la misión ${PE.MISSION_NAME[m]} (+1 PV)">${icon(MISSION_ICON[m], 13)} Líder</span>`); });
    if ((p.benefits || []).length) {
      const ben = [...new Set(p.benefits)];
      tags.push(`<span class="badge isl" title="${esc(ben.map(x => PE.BENEFIT_NAME[x] + (p.benefits.filter(y => y === x).length > 1 ? ' ×2' : '')).join(', '))}">${p.benefits.map(x => BEN_ICON[x] + (x.startsWith('pirate') ? x.slice(6) : '')).join(' ')}</span>`);
    }
    if (v.pe.pirate && v.pe.pirate.owner === p.id) tags.push(`<span class="badge army" title="Su barco pirata está en el tablero">${icon('pirate', 13)} Pirata</span>`);
    return { stats, bars: '', tags };
  };

  // ---------- estado ----------
  G.peSelShip = function () {
    const v = this.view;
    if (this.peShip === null || this.peShip === undefined) return null;
    const sh = v.pe.ships[this.peShip];
    if (!sh || sh.owner !== this.me || v.phase !== 'move' || v.current !== this.me) { this.peShip = null; return null; }
    return sh;
  };

  G.peStatus = function () {
    const v = this.view, me = this.me;
    const who = this.pname(v.current);
    const mine = v.current === me;
    switch (v.phase) {
      case 'setup': {
        const st = v.setup.step;
        if (!mine) return `${who} está colocando ${{ harbor: 'su poblado portuario', settlement: 'su poblado', road: 'una carretera', ship: 'su barco', nharbor: 'un poblado portuario neutral', nsettlement: 'un poblado neutral' }[st]}…`;
        if (st === 'harbor') return v.board.harborSites ? 'Coloca tu poblado portuario en uno de los cruces marcados de la costa este de la isla inicial' : 'Coloca tu poblado portuario en la costa de la isla inicial';
        if (st === 'nharbor') return 'Coloca un poblado portuario <b>neutral</b> (gris): será un obstáculo para tu rival';
        if (st === 'nsettlement') return 'Coloca un poblado <b>neutral</b> (gris) en la isla inicial';
        if (st === 'settlement') return 'Coloca tu poblado en la isla inicial (recibirás sus recursos)';
        if (st === 'road') return 'Coloca una carretera junto a tu poblado (no junto al portuario)';
        return 'Coloca tu barco (lleva un colono) en una ruta marítima junto a tu poblado portuario';
      }
      case 'roll': return mine ? 'Tira los dados' : `Esperando a que ${who} tire los dados…`;
      case 'pirate': return mine ? 'Coloca tu barco pirata: haz clic en un mar (no junto a la isla inicial ni en el borde)' : `${who} coloca su barco pirata…`;
      case 'main':
        if (!mine) return v.pe.p2 ? `${who} juega como jugador 2 de la pareja…` : null;
        if (this.mode) {
          const M = { road: 'Elige dónde construir la carretera', settlement: 'Elige dónde construir el poblado', harbor: 'Elige el poblado costero a mejorar',
            ship: 'Elige una ruta marítima junto a tu poblado portuario' + (this.shipRemove !== null && this.shipRemove !== undefined ? ' (el barco retirado pierde su carga)' : ''),
            shipRemove: 'No te quedan barcos: elige uno de los tuyos para retirarlo y construirlo de nuevo', settler: 'Elige un muelle (poblado portuario) o un barco junto a él para el colono',
            crew: 'Elige un muelle (poblado portuario) o un barco junto a él para la tripulación' };
          if (M[this.mode]) return M[this.mode] + ' (Esc para cancelar)';
        }
        if (v.pe.p2) return 'Eres el <b>jugador 2</b> de la pareja: comercia con el banco, construye y mueve tus barcos';
        return 'Construye y comercia; después pasa a la <b>fase de movimiento</b>';
      case 'move': {
        if (!mine) return `${who} mueve sus barcos…`;
        const sh = this.peSelShip();
        if (sh) return sh.stopped || sh.mp <= 0 ? 'Este barco ya no se mueve más este turno: elige otro o actúa con él' :
          `Barco seleccionado: ${sh.mp} movimiento(s). Elige el destino (Esc para soltarlo)`;
        return 'Fase de movimiento: elige uno de tus barcos o termina el turno';
      }
    }
    return null;
  };

  // ---------- resaltados ----------
  G.peHighlights = function () {
    const v = this.view, me = this.me;
    if (v.current !== me && v.phase !== 'specialBuild') return {};
    if (v.phase === 'setup') return PE.setupSpots(v, me);
    if (v.phase === 'pirate') return { hexes: PE.pirateHexes(v) };
    const own = Object.values(v.pe.ships).filter(x => x.owner === me);
    if (v.phase === 'move') {
      const sh = this.peSelShip();
      if (sh) {
        const r = PE.reach(v, sh.id);
        const others = [...new Set(own.filter(x => x.id !== sh.id && !r.has(x.edge)).map(x => x.edge))];
        return { edges: [...r.keys()].concat(others), edgeClass: 'move', selected: [sh.edge], selShip: sh.id, vertices: PE.foundable(v, sh), vertexR: 12 };
      }
      return { edges: [...new Set(own.map(x => x.edge))], edgeClass: 'move' };
    }
    if (v.phase !== 'main' || !this.mode) return {};
    switch (this.mode) {
      case 'road': return { edges: C.validRoutes(v, me, 'road') };
      case 'settlement': return { vertices: PE.settleSpots(v, me) };
      case 'harbor': return { vertices: PE.harborSpots(v, me), vertexR: 16 };
      case 'ship': return { edges: this.peShipEdges() };
      case 'shipRemove': return { edges: [...new Set(Object.values(v.pe.ships).filter(x => x.owner === me).map(x => x.edge))], edgeClass: 'move' };
      case 'settler': case 'crew': {
        const t = PE.cargoTargets(v, me, this.mode);
        return { vertices: t.docks, vertexR: 16, edges: [...new Set(t.ships.map(id => v.pe.ships[id].edge))], edgeClass: 'move' };
      }
    }
    return {};
  };

  // rutas para un barco nuevo (si se retira uno, su lado queda libre)
  G.peShipEdges = function () {
    const v = this.view, rm = this.shipRemove;
    const old = rm !== undefined && rm !== null ? v.pe.ships[rm] : null;
    if (!old) return PE.shipBuildEdges(v, this.me);
    delete v.pe.ships[rm];
    const out = PE.shipBuildEdges(v, this.me);
    v.pe.ships[rm] = old;
    return out;
  };

  // Elige entre los barcos propios de una arista (puede haber dos)
  G.pePickShip = function (list, title, onPick) {
    if (list.length === 1) { onPick(list[0]); return; }
    const P = this.P;
    this.modal(`<h2>${esc(title)}</h2><div class="choice-row">${list.map(x => `<button class="big-choice" data-s="${x.id}">${pieceSVG('ship', P.color, 44)}
      <span>${x.cargo.length ? x.cargo.map(itemName).join(', ') : 'vacío'}</span><small>${x.mp} mov.</small></button>`).join('')}</div>`, {
      dismiss: true,
      mount: (m, close) => m.addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) { close(); onPick(this.view.pe.ships[+b.dataset.s]); } })
    });
  };

  G.peBoardClick = function (kind, id) {
    const v = this.view, me = this.me;
    if (v.current !== me) return true;
    if (v.phase === 'setup') {
      const st = v.setup.step;
      if (kind === 'vertex' && ['harbor', 'settlement', 'nharbor', 'nsettlement'].includes(st)) this.send({ type: st === 'harbor' || st === 'nharbor' ? 'buildHarbor' : 'buildSettlement', vertex: id });
      if (kind === 'edge' && (st === 'road' || st === 'ship')) this.send({ type: st === 'road' ? 'buildRoad' : 'buildShip', edge: id });
      return true;
    }
    if (v.phase === 'pirate') {
      if (kind !== 'hex') return true;
      const c = PE.pirateVictims(v, me, id);
      if (c.length > 1) {
        this.modal(`<h2>¿A quién robas?</h2><div class="choice-row">${c.map(p => `<button class="big-choice" data-p="${p}">
          <div class="pc-avatar" style="--pc:${C.colorHex(v.players[p].color)}">${esc(v.players[p].avatar || v.players[p].name[0])}</div>
          <span>${esc(v.players[p].name)}</span><small>${v.players[p].resCount} cartas · ${v.players[p].gold} oro</small></button>`).join('')}</div>`, {
          dismiss: true,
          mount: (m, close) => m.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) { close(); this.send({ type: 'placePirate', hex: id, victim: +b.dataset.p }); } })
        });
      } else this.send({ type: 'placePirate', hex: id, victim: c.length ? c[0] : null });
      return true;
    }
    if (v.phase === 'move') {
      const sh = this.peSelShip();
      if (sh && kind === 'vertex') { this.send({ type: 'foundSettlement', ship: sh.id, vertex: id }); return true; }
      if (kind !== 'edge') return true;
      if (sh && PE.reach(v, sh.id).has(id)) { this.send({ type: 'moveShip', ship: sh.id, to: id }); return true; }
      const mine = Object.values(v.pe.ships).filter(x => x.owner === me && x.edge === id);
      if (mine.length) this.pePickShip(mine, '¿Qué barco?', x => { this.peShip = x.id; this.render(); });
      return true;
    }
    if (v.phase !== 'main' || !this.mode) return false;
    const m = this.mode;
    if (m === 'road' && kind === 'edge') { this.setMode(null); this.send({ type: 'buildRoad', edge: id }); }
    else if (m === 'settlement' && kind === 'vertex') { this.setMode(null); this.send({ type: 'buildSettlement', vertex: id }); }
    else if (m === 'harbor' && kind === 'vertex') { this.setMode(null); this.send({ type: 'buildHarbor', vertex: id }); }
    else if (m === 'ship' && kind === 'edge') { const rm = this.shipRemove; this.shipRemove = null; this.setMode(null); this.send({ type: 'buildShip', edge: id, remove: rm === null ? undefined : rm }); }
    else if (m === 'shipRemove' && kind === 'edge') {
      const list = Object.values(v.pe.ships).filter(x => x.owner === me && x.edge === id);
      if (list.length) this.pePickShip(list, 'Barco a retirar', sh => { this.shipRemove = sh.id; this.setMode('ship'); });
    }
    else if (m === 'settler' || m === 'crew') {
      const type = m === 'settler' ? 'buildSettler' : 'buildCrew';
      if (kind === 'vertex') { this.setMode(null); this.send({ type, dock: id }); }
      if (kind === 'edge') {
        const t = PE.cargoTargets(v, me, m);
        const list = t.ships.map(x => v.pe.ships[x]).filter(x => x.edge === id);
        this.setMode(null);
        if (list.length) this.pePickShip(list, '¿En qué barco?', x => this.send({ type, ship: x.id }));
      }
    }
    return true;
  };

  // ---------- panel del barco seleccionado ----------
  G.peRenderShipPanel = function () {
    let el = this.$.peShipEl;
    if (!el) {
      el = this.$.peShipEl = document.createElement('div');
      el.className = 'pe-ship';
      this.el.querySelector('.board-wrap').appendChild(el);
      el.addEventListener('click', e => this.peShipClick(e));
    }
    const sh = this.isPE() ? this.peSelShip() : null;
    if (!sh) { el.className = 'pe-ship'; el.innerHTML = ''; return; }
    const v = this.view, me = this.me, P = this.P;
    const btns = [];
    const add = (act, label, extra = '', enabled = true) => btns.push(`<button class="mini ${extra}" data-pa="${act}" ${enabled ? '' : 'disabled'}>${label}</button>`);
    if (!sh.boosted && !sh.stopped) add('boost', `+2 movimientos (${icon('sheep', 13)})`, '', P.resources.sheep > 0);
    const hv = PE.harborOf(v, me, sh.edge);
    if (hv !== undefined) {
      const dock = v.pe.docks[hv] || [];
      [...new Set(dock)].forEach(k => add('load:' + k, `Cargar ${itemName(k)} ${icon(k, 14)}`, '', PE.space(sh.cargo) >= PE.SIZE[k]));
      [...new Set(sh.cargo)].forEach(k => add('unload:' + k, `Dejar ${itemName(k)} en el muelle`, '', PE.space(dock) >= PE.SIZE[k]));
    }
    const sc = PE.SCENARIOS[v.pe.scenario];
    if (sh.cargo.includes('crew') && sc.lairs && PE.adjacentLairs(v, sh.edge).length) add('dropCrew', `${icon('crew', 14)} Asaltar la guarida`, 'ok');
    if (PE.space(sh.cargo) >= 1 && PE.pickupHexes(v, sh).length) add('pickupCrew', `${icon('crew', 14)} Recoger tripulación`, 'ok');
    if (sh.cargo.includes('crew') && sc.spice && PE.adjacentSpices(v, sh.edge, me).length) add('tradeSpice', `${icon('spice', 14)} Cambiar tripulación por especia`, 'ok');
    if (!sh.cargo.length && sc.fish && PE.adjacentFish(v, sh.edge).length) add('loadFish', `${icon('fish', 14)} Cargar pescado`, 'ok');
    const ch = PE.councilHex(v);
    if (ch !== null && PE.edgeTouchesHex(v, sh.edge, ch) && sh.cargo.some(k => k === 'fish' || k === 'spice')) add('deliver', `${icon('council', 14)} Entregar al Consejo`, 'ok');
    if (PE.canFight(v, me, sh)) add('fight', `${icon('pirate', 14)} Atacar al barco pirata`, 'no');
    const fv = PE.foundable(v, sh);
    el.className = 'pe-ship show';
    el.innerHTML = `<div class="tf-head">${pieceSVG('ship', P.color, 20)} Tu barco <span class="ps-mp">${sh.stopped ? 'detenido' : sh.mp + ' mov.'}</span></div>
      <div class="ps-cargo">Bodega: ${sh.cargo.length ? sh.cargo.map(k => `<span class="rr">${icon(k, 18)}${itemName(k)}</span>`).join(' ') : '<i>vacía</i>'}
        <small>(${PE.CAP - PE.space(sh.cargo)}/${PE.CAP})</small></div>
      ${fv.length ? '<div class="ps-hint">Haz clic en una esquina resaltada para fundar un poblado con el colono.</div>' : ''}
      ${sh.paid ? '<div class="ps-hint">Ya pagó el tributo pirata este turno.</div>' : ''}
      <div class="ps-btns">${btns.join('')}<button class="mini" data-pa="close">Soltar</button></div>`;
  };

  G.peShipClick = function (e) {
    const b = e.target.closest('[data-pa]');
    if (!b || b.disabled) return;
    const sh = this.peSelShip();
    if (!sh) return;
    C.Sound.play('click');
    const a = b.dataset.pa;
    const ship = sh.id;
    if (a === 'close') { this.peShip = null; this.render(); return; }
    if (a === 'boost') this.send({ type: 'boostShip', ship });
    else if (a.startsWith('load:')) this.send({ type: 'transfer', ship, item: a.slice(5), dir: 'load' });
    else if (a.startsWith('unload:')) this.send({ type: 'transfer', ship, item: a.slice(7), dir: 'unload' });
    else if (a === 'dropCrew') this.send({ type: 'dropCrew', ship });
    else if (a === 'pickupCrew') this.send({ type: 'pickupCrew', ship });
    else if (a === 'tradeSpice') this.send({ type: 'tradeSpice', ship });
    else if (a === 'loadFish') this.send({ type: 'loadFish', ship });
    else if (a === 'deliver') this.send({ type: 'deliver', ship });
    else if (a === 'fight') this.send({ type: 'fightPirate', ship });
  };

  // ---------- mano ----------
  G.peRenderHand = function () {
    const v = this.view, P = this.P;
    this.$.hand.classList.remove('compact');
    this.$.hand.innerHTML = RES.map(k => `<div class="rcard r-${k} ${P.resources[k] ? '' : 'empty'}" title="${C.RES_NAME[k]}">
      <div class="rc-art">${icon(k, 46)}</div><div class="rc-name">${C.RES_NAME[k]}</div><div class="rc-count">${P.resources[k]}</div></div>`).join('') +
      `<div class="rcard r-gold ${P.gold ? '' : 'empty'}" title="Oro: 2 oro = 1 recurso (2 veces por turno). No cuenta para el límite de 7 cartas.">
      <div class="rc-art">${icon('gold', 46)}</div><div class="rc-name">Oro</div><div class="rc-count">${P.gold}</div></div>`;
    const sc = PE.SCENARIOS[v.pe.scenario];
    const ms = PE.MISSIONS.filter(m => sc[m]);
    this.$.devs.classList.remove('many');
    this.$.devs.innerHTML = ms.length ? ms.map(m => {
      const n = P.missions[m];
      const lead = v.pe.leader[m] === this.me;
      return `<div class="mcard ${lead ? 'lead' : ''}" title="${PE.MISSION_NAME[m]}: ${n} pasos = ${PE.TRACK_VP[n]} PV${lead ? ' + 1 PV de líder' : ''}">
        <div class="mc-h">${icon(MISSION_ICON[m], 20)}<b>${PE.MISSION_NAME[m]}</b></div>
        <div class="mc-cells">${PE.TRACK_VP.map((vp, i) => `<i class="${i <= n && i ? 'on' : ''} ${i === n ? 'cur' : ''}">${i ? vp : ''}</i>`).join('')}</div>
        <div class="mc-f">${PE.missionVP(v, this.me, m)} PV${lead ? ' · líder' : ''}</div></div>`;
    }).join('') : '<div class="devs-empty">Sin misiones en este escenario</div>';
    const bens = P.benefits || [];
    this.$.specials.innerHTML = bens.length ? `<div class="bcard" title="${esc([...new Set(bens)].map(b => PE.BENEFIT_NAME[b] + ': ' + PE.BENEFIT_HELP[b]).join('\n'))}"><b>Ventajas</b>
      ${[...new Set(bens)].map(b => `<span>${BEN_ICON[b]} ${PE.BENEFIT_NAME[b].replace('Bonificación pirata', 'Pirata')}${bens.filter(x => x === b).length > 1 ? ' ×2' : ''}</span>`).join('')}</div>` : '';
  };

  // ---------- acciones ----------
  G.peRenderActions = function () {
    const v = this.view, P = this.P, me = this.me;
    const main = this.isMyMain();
    const move = v.phase === 'move' && this.isMyTurn();
    const has = c => C.hasRes(P.resources, c);
    const btn = (act, label, ic, enabled, cost, title = '') => `<button class="abtn ${this.mode === act ? 'active' : ''}" data-a="${act}" ${enabled ? '' : 'disabled'} title="${esc(title)}">
      <span class="ab-ic">${ic}</span><span class="ab-l">${label}</span>${cost ? `<span class="ab-cost">${costHTML(cost)}</span>` : ''}</button>`;
    const tgt = it => { const t = PE.cargoTargets(v, me, it); return t.docks.length + t.ships.length > 0; };
    let html = '';
    if (v.phase === 'roll' && this.isMyTurn()) html += `<button class="abtn primary roll" data-a="roll"><span class="ab-ic">🎲</span><span class="ab-l">Tirar dados</span></button>`;
    html += btn('road', 'Carretera', pieceSVG('road', P.color, 22), main && P.pieces.road > 0 && has(PE.COST.road) && C.validRoutes(v, me, 'road').length, PE.COST.road);
    html += btn('settlement', 'Poblado', pieceSVG('settlement', P.color, 22), main && P.pieces.settlement > 0 && has(PE.COST.settlement) && PE.settleSpots(v, me).length, PE.COST.settlement);
    html += btn('harbor', 'Portuario', '⚓', main && P.pieces.harbor > 0 && has(PE.COST.harbor) && PE.harborSpots(v, me).length, PE.COST.harbor, 'Poblado portuario: mejora un poblado costero (2 PV)');
    const ownShips = Object.values(v.pe.ships).filter(x => x.owner === me).length;
    html += btn(P.pieces.ship > 0 ? 'ship' : 'shipRemove', 'Barco', pieceSVG('ship', P.color, 22), main && has(PE.COST.ship) && (P.pieces.ship > 0 ? PE.shipBuildEdges(v, me).length : ownShips > 0), PE.COST.ship,
      P.pieces.ship > 0 ? 'Barco: junto a tu poblado portuario' : 'No te quedan barcos: retira uno del tablero (pierde su carga) y constrúyelo de nuevo');
    html += btn('settler', 'Colono', icon('settler', 22), main && P.pieces.settler > 0 && has(PE.COST.settler) && tgt('settler'), PE.COST.settler, 'Colono: funda un poblado en otra isla');
    html += btn('crew', 'Tripulación', icon('crew', 22), main && P.pieces.crew > 0 && has(PE.COST.crew) && tgt('crew'), PE.COST.crew, 'Tripulación: guaridas piratas y especias');
    html += btn('trade', 'Comerciar', '⇄', main && !v.trade, null, v.pe.p2 ? 'Jugador 2: solo con el banco' : 'Banco 3:1 y otros jugadores');
    html += btn('gold', 'Oro', icon('gold', 22), main, null, 'Cambiar oro por recursos o vender recursos');
    if (move && PE.canRollFish(v)) html += `<button class="abtn" data-a="rollFish" title="Si sale el número de un banco de pesca descubierto, aparece pescado"><span class="ab-ic">🎲</span><span class="ab-l">Dado de pesca</span></button>`;
    if (main) html += `<button class="abtn primary" data-a="startMove" title="Después ya no podrás comerciar ni construir este turno"><span class="ab-ic">⛵</span><span class="ab-l">Mover barcos</span></button>`;
    html += `<button class="abtn end ${move ? 'primary' : ''}" data-a="end" ${main || move ? '' : 'disabled'}><span class="ab-l">Terminar turno</span></button>`;
    html += `<div class="pieces-left" title="Piezas restantes">${pieceSVG('road', P.color, 15)}${P.pieces.road} ${pieceSVG('settlement', P.color, 15)}${P.pieces.settlement}
      ⚓${P.pieces.harbor} ${pieceSVG('ship', P.color, 15)}${P.pieces.ship} ${icon('settler', 15)}${P.pieces.settler} ${icon('crew', 15)}${P.pieces.crew}</div>`;
    this.$.actions.innerHTML = html;
  };

  G.peAction = function (a) {
    if (['road', 'settlement', 'harbor', 'ship', 'shipRemove', 'settler', 'crew'].includes(a)) { this.shipRemove = null; this.setMode(this.mode === a ? null : a); return true; }
    if (a === 'rollFish') { this.send({ type: 'rollFish' }); return true; }
    if (a === 'startMove') { this.setMode(null, true); this.send({ type: 'startMove' }); return true; }
    if (a === 'gold') { this.peOpenGold(); return true; }
    return false;
  };

  G.peOpenGold = function () {
    const draw = m => {
      const v = this.view, P = this.P, me = this.me;
      const buys = 2 - v.pe.goldBuys;
      const sell = k => PE.tradeRate(v, me, k, 'gold');
      m.innerHTML = `<h2>Oro</h2>
        <div class="tr-label">Comprar: 2 oro → 1 recurso (te quedan ${buys} este turno · tienes ${P.gold} oro)</div>
        <div class="res-pick">${RES.map(k => `<button class="rp" data-buy="${k}" ${buys > 0 && P.gold >= 2 && v.bank[k] > 0 ? '' : 'disabled'}>${icon(k, 34)}<span>${C.RES_NAME[k]}</span><small>banco ${v.bank[k]}</small></button>`).join('')}</div>
        <div class="tr-label">Vender: recursos → 1 oro${PE.countBen(P, 'fastGold') ? ` (Oro rápido: 1:1, te quedan ${Math.max(0, PE.countBen(P, 'fastGold') - v.pe.goldSales)} este turno)` : ''}</div>
        <div class="res-pick">${RES.map(k => `<button class="rp" data-sell="${k}" ${P.resources[k] >= sell(k) ? '' : 'disabled'}>${icon(k, 34)}<span>${C.RES_NAME[k]}</span><small>${sell(k)}:1 · tienes ${P.resources[k]}</small></button>`).join('')}</div>
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

  // ---------- eventos ----------
  G.peEvent = function (ev, v) {
    const me = this.me;
    const pn = id => v.players[id].name;
    switch (ev.type) {
      case 'produce': {
        const g = ev.got && ev.got[me];
        if (g) {
          const res = Object.assign({}, g); delete res.gold;
          this.toast('Recibes ' + (C.total(res) ? '<span>' + RES.filter(k => res[k]).map(k => `<span class="rr">${icon(k, 16)}<b>${res[k]}</b></span>`).join('') + '</span>' : '') +
            (g.gold ? `<span class="rr">${icon('gold', 16)}<b>${g.gold}</b></span>` : ''), 'ok', true);
          C.Sound.play('coin');
        } else if (ev.comp && ev.comp.includes(me)) this.toast(`Compensación: recibes <span class="rr">${icon('gold', 16)}<b>1</b></span>`, 'ok', true);
        return true;
      }
      case 'discover':
        C.Sound.play('ship');
        ev.found.forEach(f => {
          const what = f.lair ? 'una guarida pirata' : PE.TERRAIN_NAME[f.terrain];
          if (ev.pid === me) this.toast(`¡Descubres ${what}! ` + (f.res ? `+1 ${C.RES_NAME[f.res]}` : f.gold ? '+2 oro' : ''), 'ok');
          else this.toast(`${pn(ev.pid)} descubre ${what}`);
        });
        return true;
      case 'shipMove': C.Sound.play('click'); return true;
      case 'build':
        if (ev.what === 'harbor') { C.Sound.play('city'); return true; }
        if (ev.what === 'settler' || ev.what === 'crew') { C.Sound.play('build'); return true; }
        return false;
      case 'found':
        if (ev.pid !== me) this.toast(`${pn(ev.pid)} funda un poblado con su colono`);
        else this.toast('¡Fundas un poblado nuevo!', 'ok');
        return true;
      case 'crew': C.Sound.play('knight'); return true;
      case 'capture': this.peShowCapture(ev, v); return true;
      case 'fish':
        C.Sound.play('dice');
        this.toast(`Dado de pesca: ${ev.d}` + (ev.hex !== null ? ' — aparece pescado' : ' — no aparece pescado'));
        return true;
      case 'loadFish': C.Sound.play('build'); return true;
      case 'deliver':
        C.Sound.play('improve');
        this.toast((ev.pid === me ? 'Entregas ' : pn(ev.pid) + ' entrega ') + ev.items.map(itemName).join(' y ') + ' al Consejo de Catan', ev.pid === me ? 'ok' : '');
        return true;
      case 'spice':
        C.Sound.play('coin');
        if (ev.benefit) this.toast((ev.pid === me ? 'Obtienes ' : pn(ev.pid) + ' obtiene ') + 'la ventaja ' + PE.BENEFIT_NAME[ev.benefit], ev.pid === me ? 'ok' : '');
        return true;
      case 'fight':
        C.Sound.play(ev.win ? 'horn' : 'error');
        this.toast(`${ev.pid === me ? 'Atacas' : pn(ev.pid) + ' ataca'} al barco pirata: sale un ${ev.d}. ${ev.win ? '¡Ahuyentado!' : 'Falla.'}`, ev.win ? 'ok' : '');
        return true;
      case 'leader':
        C.Sound.play('improve');
        this.toast((ev.pid === me ? '¡Encabezas' : pn(ev.pid) + ' encabeza') + ' la misión ' + PE.MISSION_NAME[ev.mission] + '! (+1 PV)', ev.pid === me ? 'ok' : '');
        return true;
      case 'stealGold':
        C.Sound.play('steal');
        if (ev.from === me) this.toast(`${pn(ev.to)} te robó 1 oro`, 'err');
        else if (ev.to === me) this.toast(`Robaste 1 oro a ${pn(ev.from)}`, 'ok');
        return true;
      case 'trade': if (ev.b === null) { C.Sound.play('coin'); return true; } return false;
      case 'pair':
        if (ev.p2 === me) { C.Sound.play('turn'); this.toast('¡Juegas como jugador 2 de la pareja!', 'big'); }
        return true;
    }
    return false;
  };

  G.peShowCapture = function (ev, v) {
    C.Sound.play('horn');
    const el = document.createElement('div');
    el.className = 'barb-attack win';
    el.innerHTML = `<div class="ba-ship">${icon('pirate', 80)}</div><h2>¡Guarida pirata capturada!</h2>
      <div class="ba-vs">${ev.parts.map(p => `<div><span class="pc-avatar" style="--pc:${C.colorHex(v.players[p].color)}">${esc(v.players[p].avatar || v.players[p].name[0])}</span>
        <b>${ev.rolls[p].total}</b><small>${esc(v.players[p].name)} (🎲${ev.rolls[p].die} + ${ev.rolls[p].crews})</small></div>`).join('')}</div>
      <p>Cada participante recibe 2 oro y avanza 1 en la misión. <b>${esc(v.players[ev.hero].name)}</b> es el héroe: avanza 1 más.</p>
      <small class="muted">Clic para cerrar.</small>`;
    el.addEventListener('click', () => el.remove());
    this.$.reveal.appendChild(el);
    setTimeout(() => el.classList.add('out'), 5200);
    setTimeout(() => el.remove(), 5700);
  };

  // ---------- costes ----------
  G.peCosts = function () {
    const col = this.P.color;
    const row = (piece, name, cost, pts) => `<div class="cost-row"><span class="cr-p">${piece}</span><span class="cr-n">${name}</span>
      <span class="cr-c">${costHTML(cost, 20)}</span><span class="cr-v">${pts}</span></div>`;
    return `<h2>Costes — Piratas y Exploradores</h2><div class="costs">
      ${row(pieceSVG('road', col, 28), 'Carretera', PE.COST.road, '0 PV')}
      ${row(pieceSVG('settlement', col, 28), 'Poblado', PE.COST.settlement, '1 PV')}
      ${row('⚓', 'Poblado portuario (mejora)', PE.COST.harbor, '2 PV')}
      ${row(pieceSVG('ship', col, 28), 'Barco', PE.COST.ship, '4 mov.')}
      ${row(icon('settler', 28), 'Colono', PE.COST.settler, 'funda poblado')}
      ${row(icon('crew', 28), 'Tripulación', PE.COST.crew, 'misiones')}
      ${row('💨', '+2 movimientos (1 vez por barco)', PE.COST.boost, '')}</div>
      <p class="muted">Banco 3:1 (o 3 iguales → 1 oro). 2 oro → 1 recurso, dos veces por turno. Si una tirada no te da nada, recibes 1 oro.
      Pistas de misión: ${PE.TRACK_VP.slice(1).map((vp, i) => (i + 1) + '→' + vp).join(', ')} PV; el líder de cada misión suma 1 PV.</p>`;
  };
})(window);
