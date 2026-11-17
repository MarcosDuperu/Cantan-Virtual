// Piratas y Exploradores: exploración de hexágonos ocultos, barcos con puntos de movimiento,
// poblados portuarios, colonos, tripulaciones, oro, barco pirata, guaridas, pescado, especias y misiones.
(function (root) {
  const C = root.Catan;
  const R = () => C._R;
  const { RES, TERRAIN_RES } = C;

  const SCENARIOS = {
    1: { id: 1, name: '¡Tierra a la vista!', vp: 8, pirate: false, lairs: false, fish: false, spice: false,
      desc: 'Explora el mar y funda poblados en las islas nuevas.' },
    2: { id: 2, name: 'Guaridas piratas', vp: 12, pirate: true, lairs: true, fish: false, spice: false,
      desc: 'Barco pirata y guaridas que se capturan con tripulaciones.' },
    3: { id: 3, name: 'Pescado para Catan', vp: 15, pirate: true, lairs: true, fish: true, spice: false,
      desc: 'Guaridas piratas y bancos de pesca para el Consejo de Catan.' },
    4: { id: 4, name: 'Especias para Catan', vp: 15, pirate: true, lairs: false, fish: true, spice: true,
      desc: 'Pescado y especias para el Consejo; las aldeas dan ventajas.' },
    5: { id: 5, name: 'Exploradores y piratas', vp: 17, pirate: true, lairs: true, fish: true, spice: true,
      desc: 'La campaña completa: las tres misiones.' }
  };
  const MISSIONS = ['lairs', 'fish', 'spice'];
  const MISSION_NAME = { lairs: 'Guaridas piratas', fish: 'Pescado', spice: 'Especias' };
  // PV de cada casilla de la pista de misión (decisión propia: el reglamento solo los muestra en la carta)
  // PV de cada casilla de la pista de misión (ejemplo 9 del reglamento: casillas 1-7 → 1, 1, 2, 2, 2, 3, 3)
  const TRACK_VP = [0, 1, 1, 2, 2, 2, 3, 3];
  const TRACK_MAX = TRACK_VP.length - 1;

  const COST = {
    settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
    harbor: { wheat: 2, ore: 2 },
    ship: { wood: 1, sheep: 1 },
    settler: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
    crew: { ore: 1, sheep: 1 },
    road: { wood: 1, brick: 1 },
    boost: { sheep: 1 }
  };
  const PIECES = { road: 15, settlement: 5, city: 0, ship: 3, harbor: 4, settler: 2, crew: 9 };
  const SIZE = { settler: 2, fish: 2, crew: 1, spice: 1 };
  const CAP = 2;
  const MAX_MP = 8;
  const ITEM_NAME = { settler: 'colono', crew: 'tripulación', fish: 'pescado', spice: 'especia' };
  const BENEFIT_NAME = { fastTravel: 'Viaje rápido', pirate4: 'Bonificación pirata (4)', pirate5: 'Bonificación pirata (5)', fastGold: 'Oro rápido' };
  const BENEFIT_HELP = {
    fastTravel: '+1 movimiento para todos tus barcos (cada aldea de Viaje rápido suma 1).',
    pirate4: 'Ahuyentas al barco pirata también con un 4.',
    pirate5: 'Ahuyentas al barco pirata también con un 5.',
    fastGold: 'En tu fase de comercio puedes vender 1 recurso por 1 oro (una vez por cada aldea de Oro rápido).'
  };
  const NEUTRAL = -1;
  const countBen = (P, b) => P.benefits.filter(x => x === b).length;
  const TERRAIN_NAME = { forest: 'bosque', hills: 'colinas', pasture: 'pastos', fields: 'campos', mountains: 'montañas',
    gold: 'río de oro', sea: 'mar', fish: 'banco de pesca', spice: 'isla de especias', council: 'Consejo de Catan' };

  const err = m => ({ result: { error: m } });
  const ok = () => ({ result: undefined });
  const name = (s, pid) => s.players[pid].name;
  const die = () => 1 + Math.floor(Math.random() * 6);
  const scen = s => SCENARIOS[s.pe.scenario];
  const cardsOf = p => p.resources ? C.total(p.resources) : (p.resCount || 0);

  function init(s, mode, config) {
    const o = config.options || {};
    const sc = SCENARIOS[s.board.scenario] ? s.board.scenario : 2;
    if (!o.vpTarget) s.vpTarget = SCENARIOS[sc].vp;
    s.robber = null;
    s.pirate = null;
    s.pe = { scenario: sc, ships: {}, shipSeq: 0, docks: {}, pirate: null, leader: { lairs: null, fish: null, spice: null },
      fishRolled: false, fishDie: null, pirateReturn: null, goldBuys: 0, goldSales: 0, lastFight: null,
      pairs: !!mode.pairs, p2: null, fishSupply: mode.pairs ? 8 : 6 };
    s.players.forEach(P => {
      P.pieces = Object.assign({}, PIECES);
      P.gold = 2;
      P.missions = { lairs: 0, fish: 0, spice: 0 };
      P.benefits = [];
    });
    s.board.hexes.forEach(h => { if (h.spice) h.spice.left = s.players.length; });
    // Cola de colocación: portuario y poblado en orden; con 2 jugadores, además un portuario y un poblado
    // neutrales cada uno; después, en orden inverso, carretera y barco colono.
    const n = s.players.length;
    const fwd = s.setup.order.slice(0, n), rev = s.setup.order.slice(n);
    const q = [];
    if (n === 2) {
      fwd.forEach(p => q.push({ pid: p, step: 'harbor' }));
      fwd.forEach(p => q.push({ pid: p, step: 'nharbor' }));
      fwd.forEach(p => q.push({ pid: p, step: 'nsettlement' }));
      rev.forEach(p => q.push({ pid: p, step: 'settlement' }));
    } else fwd.forEach(p => { q.push({ pid: p, step: 'harbor' }); q.push({ pid: p, step: 'settlement' }); });
    const last = q[q.length - 1].pid;
    const roads = n === 2 ? rev.slice().reverse() : rev;
    (roads[0] === last ? roads : roads.slice().reverse()).forEach(p => { q.push({ pid: p, step: 'road' }); q.push({ pid: p, step: 'ship' }); });
    s.setup.queue = q;
    s.setup.index = 0;
    s.setup.step = q[0].step;
    s.current = q[0].pid;
    if (s.board.fixedStarts) fixedSetup(s);
  }

  // Escenario 1 «¡Tierra a la vista!»: las posiciones iniciales están dadas (ejemplo 2 del reglamento).
  // Con 3 jugadores no se usa la cuarta posición; con 2, las piezas de los otros dos colores quedan como
  // obstáculos neutrales (sin sus barcos).
  function fixedSetup(s) {
    const n = s.players.length;
    const order = s.setup.order.slice(0, n);
    s.board.fixedStarts.forEach((f, i) => {
      const pid = i < n ? order[i] : (n === 2 ? NEUTRAL : null);
      if (pid === null) return;
      const own = pid === NEUTRAL ? NEUTRAL : pid;
      s.buildings[f.settle] = { owner: own, type: 'settlement' };
      s.roads[f.road] = { owner: own, type: 'road', turn: -1 };
      s.buildings[f.harbor] = { owner: own, type: 'harbor' };
      if (pid === NEUTRAL) return;
      const P = s.players[pid];
      P.pieces.settlement--; P.pieces.road--; P.pieces.harbor--;
      s.pe.docks[f.harbor] = [];
      newShip(s, pid, f.ship, ['settler']);
      P.pieces.ship--; P.pieces.settler--;
      const got = C.emptyRes();
      s.board.vertices[f.settle].hexes.forEach(h => {
        const res = TERRAIN_RES[s.board.hexes[h].terrain];
        if (res && s.bank[res] > 0) { got[res]++; s.bank[res]--; P.resources[res]++; }
      });
      R().log(s, name(s, pid) + ' empieza en su posición fija y recibe ' + C.resText(got) + '.', pid);
    });
    s.phase = 'roll';
    s.current = s.first;
    s.turn = 1;
    onTurnStart(s);
  }

  // ---------- geometría ----------
  const isWater = h => !h.hidden && (h.terrain === 'sea' || h.terrain === 'fish' || h.terrain === 'council');
  const touchesHidden = (s, v) => s.board.vertices[v].hexes.some(h => s.board.hexes[h].hidden);
  const edgeTouchesHidden = (s, e) => s.board.edges[e].v.some(v => touchesHidden(s, v));
  // Ruta marítima: arista con al menos un hexágono de agua visible
  const isRoute = (s, e) => !s.board.edges[e].offBoard && s.board.edges[e].hexes.some(h => isWater(s.board.hexes[h]));
  // Un barco "apunta" a un hexágono si uno de los extremos de su arista es una esquina de ese hexágono
  const edgeTouchesHex = (s, e, hid) => s.board.edges[e].v.some(v => s.board.vertices[v].hexes.includes(hid));
  const coastal = (s, v) => s.board.vertices[v].hexes.some(h => isWater(s.board.hexes[h]));
  const touchesLair = (s, v) => s.board.vertices[v].hexes.some(h => s.board.hexes[h].lair);
  const onStart = (s, v) => s.board.vertices[v].hexes.some(h => s.board.hexes[h].start);

  const shipsAt = (s, e) => Object.values(s.pe.ships).filter(x => x.edge === e);
  const used = items => items.reduce((a, k) => a + SIZE[k], 0);
  const space = items => CAP - used(items);
  const ownHarbors = (s, pid) => Object.keys(s.buildings).map(Number).filter(v => s.buildings[v].owner === pid && s.buildings[v].type === 'harbor');
  const harborOf = (s, pid, e) => s.board.edges[e].v.find(v => s.buildings[v] && s.buildings[v].owner === pid && s.buildings[v].type === 'harbor');
  const councilHex = s => { const h = s.board.hexes.find(x => x.terrain === 'council' && !x.hidden); return h ? h.id : null; };

  function settleOk(s, v) {
    const vx = s.board.vertices[v];
    return !!vx && vx.land && R().distanceOk(s, v) && !touchesHidden(s, v) && !touchesLair(s, v);
  }
  // No se construye en las esquinas de una isla de especias hasta haber dejado allí una tripulación propia
  const spiceOk = (s, pid, v) => s.board.vertices[v].hexes.every(h => { const x = s.board.hexes[h]; return !x.spice || x.spice.crews.includes(pid); });
  function settleSpots(s, pid) {
    return s.board.vertices.filter(v => settleOk(s, v.id) && spiceOk(s, pid, v.id) && v.edges.some(e => s.roads[e] && s.roads[e].owner === pid)).map(v => v.id);
  }
  function harborSpots(s, pid) {
    return Object.keys(s.buildings).map(Number).filter(v => s.buildings[v].owner === pid && s.buildings[v].type === 'settlement' && coastal(s, v));
  }
  function shipBuildEdges(s, pid) {
    const out = new Set();
    ownHarbors(s, pid).forEach(v => s.board.vertices[v].edges.forEach(e => {
      if (isRoute(s, e) && !edgeTouchesHidden(s, e) && shipsAt(s, e).length < 2) out.add(e);
    }));
    return [...out];
  }
  // En la colocación la carretera va junto al poblado (no junto al portuario)
  function roadEdgesNear(s, pid) {
    return s.board.edges.filter(e => e.land && !s.roads[e.id] && e.v.some(v => s.buildings[v] && s.buildings[v].owner === pid && s.buildings[v].type === 'settlement')).map(e => e.id);
  }
  function setupSpots(s, pid) {
    const st = s.setup;
    if (st.step === 'harbor' || st.step === 'nharbor') {
      // en el tablero oficial 3-4, solo en los cruces marcados con un círculo (la costa este de la isla inicial)
      const sites = s.board.harborSites;
      return { vertices: s.board.vertices.filter(v => onStart(s, v.id) && settleOk(s, v.id) && coastal(s, v.id) && (!sites || sites.includes(v.id)) &&
        v.edges.some(e => isRoute(s, e) && !edgeTouchesHidden(s, e))).map(v => v.id) };
    }
    if (st.step === 'settlement' || st.step === 'nsettlement') return { vertices: s.board.vertices.filter(v => onStart(s, v.id) && settleOk(s, v.id)).map(v => v.id) };
    if (st.step === 'road') return { edges: roadEdgesNear(s, pid) };
    if (st.step === 'ship') return { edges: shipBuildEdges(s, pid) };
    return {};
  }

  // Dónde puede ponerse un colono o una tripulación nueva: muelle de un poblado portuario
  // propio o un barco propio junto a él
  function cargoTargets(s, pid, item) {
    const docks = ownHarbors(s, pid).filter(v => space(s.pe.docks[v] || []) >= SIZE[item]);
    const ships = Object.values(s.pe.ships).filter(x => x.owner === pid && harborOf(s, pid, x.edge) !== undefined && space(x.cargo) >= SIZE[item]).map(x => x.id);
    return { docks, ships };
  }

  const baseMP = (s, pid) => Math.min(MAX_MP, 4 + countBen(s.players[pid], 'fastTravel'));
  function freshShip(s, x) { Object.assign(x, { mp: baseMP(s, x.owner), moved: false, boosted: false, paid: false, fought: false, stopped: false }); }
  function newShip(s, pid, edge, cargo) {
    const id = ++s.pe.shipSeq;
    const x = { id, owner: pid, edge, cargo: cargo || [] };
    freshShip(s, x);
    s.pe.ships[id] = x;
    return x;
  }

  // Aristas alcanzables por un barco con sus puntos de movimiento: Map arista -> {cost, tribute}
  function reach(s, id) {
    const out = new Map();
    const sh = s.pe.ships[id];
    if (!sh || sh.stopped || sh.mp <= 0) return out;
    const E = s.board.edges, V = s.board.vertices;
    const pir = s.pe.pirate && s.pe.pirate.owner !== sh.owner && !sh.paid ? s.pe.pirate.hex : null;
    const bfs = allowPirate => {
      const dist = new Map([[sh.edge, 0]]);
      const q = [sh.edge];
      while (q.length) {
        const e = q.shift();
        const d = dist.get(e);
        // descubrir termina el movimiento: no se sigue desde una arista junto a lo oculto
        if (d >= sh.mp || (e !== sh.edge && edgeTouchesHidden(s, e))) continue;
        for (const v of E[e].v) {
          for (const n of V[v].edges) {
            if (dist.has(n) || !isRoute(s, n)) continue;
            if (pir !== null && !allowPirate && E[n].hexes.includes(pir)) continue;
            dist.set(n, d + 1);
            q.push(n);
          }
        }
      }
      return dist;
    };
    bfs(false).forEach((d, e) => { if (e !== sh.edge && shipsAt(s, e).length < 2) out.set(e, { cost: d, tribute: false }); });
    if (pir !== null && s.players[sh.owner].gold >= 1) {
      bfs(true).forEach((d, e) => { if (e !== sh.edge && !out.has(e) && shipsAt(s, e).length < 2) out.set(e, { cost: d, tribute: true }); });
    }
    return out;
  }

  // Camino más corto (sin límite de movimiento) desde el barco hasta alguna arista objetivo
  function pathTo(s, sh, targets) {
    const E = s.board.edges, V = s.board.vertices;
    const prev = new Map([[sh.edge, null]]);
    const q = [sh.edge];
    while (q.length) {
      const e = q.shift();
      if (e !== sh.edge && targets.has(e)) {
        const path = [];
        for (let x = e; x !== sh.edge; x = prev.get(x)) path.unshift(x);
        return path;
      }
      if (e !== sh.edge && edgeTouchesHidden(s, e)) continue;
      for (const v of E[e].v) {
        for (const n of V[v].edges) {
          if (prev.has(n) || !isRoute(s, n)) continue;
          prev.set(n, e);
          q.push(n);
        }
      }
    }
    return null;
  }

  const adjacentLairs = (s, e) => s.board.hexes.filter(h => h.lair && !h.hidden && h.lair.crews.length < 3 && edgeTouchesHex(s, e, h.id)).map(h => h.id);
  const adjacentFish = (s, e) => s.board.hexes.filter(h => h.terrain === 'fish' && !h.hidden && h.fish && edgeTouchesHex(s, e, h.id)).map(h => h.id);
  const adjacentSpices = (s, e, pid) => s.board.hexes.filter(h => h.terrain === 'spice' && !h.hidden && h.spice && h.spice.left > 0 &&
    !(pid !== undefined && h.spice.crews.includes(pid)) && edgeTouchesHex(s, e, h.id)).map(h => h.id);
  const foundable = (s, sh) => sh.cargo.includes('settler') && s.players[sh.owner].pieces.settlement > 0 ? s.board.edges[sh.edge].v.filter(v => settleOk(s, v) && spiceOk(s, sh.owner, v)) : [];
  // Tripulaciones que quedaron en una guarida capturada y el barco puede recoger
  const pickupHexes = (s, sh) => s.board.hexes.filter(h => h.leftCrews && h.leftCrews.includes(sh.owner) && edgeTouchesHex(s, sh.edge, h.id)).map(h => h.id);
  function canFight(s, pid, sh) {
    const p = s.pe.pirate;
    return !!(scen(s).pirate && p && p.owner !== pid && sh.owner === pid && !sh.moved && !sh.fought && !sh.stopped && edgeTouchesHex(s, sh.edge, p.hex));
  }

  function pirateHexes(s) {
    return s.board.hexes.filter(h => isWater(h) && !h.frame && !h.nearStart && !(s.pe.pirate && s.pe.pirate.hex === h.id)).map(h => h.id);
  }
  function pirateVictims(s, pid, hex) {
    const set = new Set();
    Object.values(s.pe.ships).forEach(x => { if (x.owner !== pid && edgeTouchesHex(s, x.edge, hex)) set.add(x.owner); });
    return [...set].filter(o => cardsOf(s.players[o]) > 0 || s.players[o].gold > 0);
  }

  // ---------- puntos ----------
  function missionActive(s, m) { return !!scen(s)[m]; }
  function missionVP(s, pid, m) {
    if (!missionActive(s, m)) return 0;
    return TRACK_VP[s.players[pid].missions[m]] + (s.pe.leader[m] === pid ? 1 : 0);
  }
  function extraVP(s, pid) { return MISSIONS.reduce((a, m) => a + missionVP(s, pid, m), 0); }

  function advance(s, pid, m, n) {
    const P = s.players[pid];
    P.missions[m] = Math.min(TRACK_MAX, P.missions[m] + n);
    const L = s.pe.leader[m];
    if (P.missions[m] > 0 && (L === null || (L !== pid && P.missions[m] > s.players[L].missions[m]))) {
      s.pe.leader[m] = pid;
      R().log(s, name(s, pid) + ' encabeza la misión ' + MISSION_NAME[m] + ' (+1 PV).', pid);
      R().event(s, { type: 'leader', pid, mission: m });
    }
  }

  // ---------- producción ----------
  function produce(s, roll) {
    const demand = {};
    RES.forEach(k => { demand[k] = {}; });
    const gold = {};
    for (const h of s.board.hexes) {
      if (h.hidden || h.number !== roll) continue;
      for (const v of h.vertices) {
        const b = s.buildings[v];
        if (!b || b.owner === NEUTRAL) continue;
        if (h.terrain === 'gold') { if (!h.lair) gold[b.owner] = (gold[b.owner] || 0) + 2; continue; }
        const res = TERRAIN_RES[h.terrain];
        if (res) demand[res][b.owner] = (demand[res][b.owner] || 0) + 1;
      }
    }
    const got = {};
    for (const k of RES) {
      const owners = Object.keys(demand[k]);
      if (!owners.length) continue;
      const need = owners.reduce((a, o) => a + demand[k][o], 0);
      if (need > s.bank[k] && owners.length > 1) { R().log(s, 'El banco no tiene suficiente ' + C.RES_NAME[k] + ': nadie lo recibe.'); continue; }
      for (const o of owners) {
        const amt = Math.min(demand[k][o], s.bank[k]);
        if (amt <= 0) continue;
        s.bank[k] -= amt;
        s.players[o].resources[k] += amt;
        (got[o] || (got[o] = {}))[k] = amt;
      }
    }
    Object.entries(gold).forEach(([o, n]) => { s.players[o].gold += n; (got[o] || (got[o] = {})).gold = n; });
    Object.entries(got).forEach(([o, r]) => R().log(s, name(s, o) + ' recibe ' + C.resText(r) + (r.gold ? (C.resText(r) === 'nada' ? '' : ' y ') + r.gold + ' oro' : '') + '.', +o));
    // Compensación: quien no recibe nada toma 1 oro
    const comp = s.players.filter(p => !got[p.id]).map(p => p.id);
    comp.forEach(p => { s.players[p].gold++; });
    if (comp.length) R().log(s, 'Compensación de oro (+1): ' + comp.map(p => name(s, p)).join(', ') + '.');
    R().event(s, { type: 'produce', got, comp });
  }

  function roll(s, pid, a) {
    const d1 = a.forced ? a.forced[0] : die();
    const d2 = a.forced ? a.forced[1] : die();
    s.dice = [d1, d2];
    s.rollSeq++;
    const sum = d1 + d2;
    R().log(s, name(s, pid) + ' tira ' + sum + ' (' + d1 + '+' + d2 + ').', pid);
    R().event(s, { type: 'roll', dice: [d1, d2], pid });
    if (sum === 7) {
      const pend = {};
      s.players.forEach(p => { const t = C.total(p.resources); if (t > 7) pend[p.id] = Math.floor(t / 2); });
      const next = scen(s).pirate ? 'pirate' : 'main';
      s.pe.pirateReturn = 'main';
      if (Object.keys(pend).length) {
        s.pendingDiscard = pend;
        s.discardReturn = next;
        s.phase = 'discard';
        R().log(s, 'Deben descartar: ' + Object.keys(pend).map(p => name(s, p) + ' (' + pend[p] + ')').join(', ') + '.');
      } else s.phase = next;
      return;
    }
    produce(s, sum);
    s.phase = 'main';
  }

  // ---------- descubrimiento ----------
  function discover(s, pid, e) {
    const ids = new Set();
    s.board.edges[e].v.forEach(v => s.board.vertices[v].hexes.forEach(h => { if (s.board.hexes[h].hidden) ids.add(h); }));
    if (!ids.size) return false;
    const P = s.players[pid];
    const found = [];
    ids.forEach(h => {
      const hx = s.board.hexes[h];
      hx.hidden = false;
      const res = TERRAIN_RES[hx.terrain];
      if (res || (hx.terrain === 'gold' && !hx.lair)) {
        const pool = s.board.numberPool[hx.area] || [];
        hx.number = pool.length ? pool.pop() : (s.board.numberPool[1 - hx.area] || []).pop() || 6;
      }
      const f = { hex: h, terrain: hx.terrain, lair: !!hx.lair, res: null, gold: 0 };
      if (res) { if (s.bank[res] > 0) { s.bank[res]--; P.resources[res]++; f.res = res; } }
      else { P.gold += 2; f.gold = 2; }
      found.push(f);
    });
    C.refreshFlags(s.board);
    R().log(s, name(s, pid) + ' descubre ' + found.map(f => (f.lair ? 'una guarida pirata' : TERRAIN_NAME[f.terrain]) +
      (f.res ? ' (+1 ' + C.RES_NAME[f.res] + ')' : f.gold ? ' (+2 oro)' : '')).join(', ') + '.', pid);
    R().event(s, { type: 'discover', pid, found });
    return true;
  }

  // ---------- guaridas ----------
  function capture(s, hexId, last) {
    const hx = s.board.hexes[hexId];
    const crews = hx.lair.crews;
    const parts = [...new Set(crews)];
    const rolls = {};
    parts.forEach(p => { rolls[p] = { crews: crews.filter(c => c === p).length }; });
    // Héroe: dado + tripulaciones; en empate, quien puso más tripulaciones; si sigue el empate, se repite la tirada
    let top = parts;
    for (let t = 0; t < 50 && top.length > 1; t++) {
      top.forEach(p => { rolls[p].die = die(); rolls[p].total = rolls[p].die + rolls[p].crews; });
      const best = Math.max(...top.map(p => rolls[p].total));
      top = top.filter(p => rolls[p].total === best);
      const most = Math.max(...top.map(p => rolls[p].crews));
      top = top.filter(p => rolls[p].crews === most);
    }
    parts.forEach(p => { if (rolls[p].die === undefined) { rolls[p].die = die(); rolls[p].total = rolls[p].die + rolls[p].crews; } });
    const hero = top[0];
    parts.forEach(p => { s.players[p].gold += 2; advance(s, p, 'lairs', 1); });
    advance(s, hero, 'lairs', 1);
    // el héroe devuelve 1 tripulación a su reserva; las demás quedan junto a la guarida para recogerlas en barco
    const left = crews.slice();
    left.splice(left.indexOf(hero), 1);
    s.players[hero].pieces.crew++;
    hx.leftCrews = left;
    delete hx.lair;
    hx.number = s.board.lairPool.length ? s.board.lairPool.pop() : 8;
    R().log(s, '¡Guarida pirata capturada! Participan ' + parts.map(p => name(s, p)).join(', ') + ' (+2 oro y +1 en la misión). Héroe: ' +
      name(s, hero) + ' (+1 más). El río de oro queda libre con el número ' + hx.number + '.', hero);
    R().event(s, { type: 'capture', hex: hexId, hero, parts, rolls });
  }

  // ---------- acciones ----------
  function nextSetup(s) {
    const st = s.setup;
    st.index++;
    if (st.index >= st.queue.length) {
      s.phase = 'roll';
      s.current = s.first;
      s.turn = 1;
      onTurnStart(s);
      R().log(s, 'Fase de colocación terminada. Turno de ' + name(s, s.current) + '.', s.current);
      return;
    }
    const q = st.queue[st.index];
    st.step = q.step;
    st.round = ['road', 'ship'].includes(q.step) ? 2 : 1;
    s.current = q.pid;
  }

  function setup(s, pid, a) {
    const st = s.setup;
    if (pid !== s.current) return err('No es tu turno');
    const P = s.players[pid];
    const sp = setupSpots(s, pid);
    const neutral = st.step === 'nharbor' || st.step === 'nsettlement';
    if (st.step === 'harbor' || st.step === 'nharbor') {
      if (a.type !== 'buildHarbor') return err(neutral ? 'Coloca un poblado portuario neutral' : 'Coloca tu poblado portuario');
      if (!sp.vertices.includes(a.vertex)) return err('Lugar no válido: en la costa de la isla inicial, respetando la distancia');
      s.buildings[a.vertex] = { owner: neutral ? NEUTRAL : pid, type: 'harbor' };
      if (!neutral) { P.pieces.harbor--; s.pe.docks[a.vertex] = []; }
      R().log(s, name(s, pid) + (neutral ? ' coloca un poblado portuario neutral.' : ' coloca un poblado portuario.'), pid);
      R().event(s, { type: 'build', what: 'harbor', pid, at: a.vertex });
      nextSetup(s);
      return ok();
    }
    if (st.step === 'settlement' || st.step === 'nsettlement') {
      if (a.type !== 'buildSettlement') return err(neutral ? 'Coloca un poblado neutral' : 'Coloca tu poblado');
      if (!sp.vertices.includes(a.vertex)) return err('Lugar no válido');
      s.buildings[a.vertex] = { owner: neutral ? NEUTRAL : pid, type: 'settlement' };
      R().event(s, { type: 'build', what: 'settlement', pid, at: a.vertex });
      if (neutral) R().log(s, name(s, pid) + ' coloca un poblado neutral.', pid);
      else {
        P.pieces.settlement--;
        const got = C.emptyRes();
        s.board.vertices[a.vertex].hexes.forEach(h => {
          const res = TERRAIN_RES[s.board.hexes[h].terrain];
          if (res && s.bank[res] > 0) { got[res]++; s.bank[res]--; P.resources[res]++; }
        });
        R().log(s, name(s, pid) + ' coloca un poblado y recibe ' + C.resText(got) + '.', pid);
      }
      nextSetup(s);
      return ok();
    }
    if (st.step === 'road') {
      if (a.type !== 'buildRoad') return err('Coloca una carretera junto a tu poblado');
      if (!sp.edges.includes(a.edge)) return err('Lugar no válido: junto a tu poblado');
      s.roads[a.edge] = { owner: pid, type: 'road', turn: -1 };
      P.pieces.road--;
      R().event(s, { type: 'build', what: 'road', pid, at: a.edge });
      nextSetup(s);
      return ok();
    }
    if (a.type !== 'buildShip') return err('Coloca tu barco junto a tu poblado portuario');
    if (!sp.edges.includes(a.edge)) return err('El barco debe ir en una ruta marítima junto a tu poblado portuario');
    newShip(s, pid, a.edge, ['settler']);
    P.pieces.ship--;
    P.pieces.settler--;
    R().log(s, name(s, pid) + ' bota un barco con un colono.', pid);
    R().event(s, { type: 'build', what: 'ship', pid, at: a.edge });
    nextSetup(s);
    return ok();
  }

  // Ampliación 5-6, jugadores en pareja: al terminar el jugador 1, juega el jugador 2 (el tercero a su
  // izquierda): solo comercia con el banco, construye y mueve sus barcos. Después pasa el turno.
  function endTurn(s) {
    s.trade = null;
    if (s.pe.pairs && !s.pe.p2) {
      const p1 = s.current;
      const p2 = (p1 + 3) % s.players.length;
      s.pe.p2 = { p1, p2 };
      s.current = p2;
      s.phase = 'main';
      s.pe.goldBuys = 0;
      s.pe.goldSales = 0;
      Object.values(s.pe.ships).forEach(x => { if (x.owner === p2) freshShip(s, x); });
      R().log(s, name(s, p2) + ' juega como jugador 2 (solo comercia con el banco).', p2);
      R().event(s, { type: 'pair', p1, p2 });
      R().checkWin(s, p2);
      return;
    }
    if (s.pe.p2) { s.current = s.pe.p2.p1; s.pe.p2 = null; }
    R().nextTurn(s);
  }

  function buildMain(s, pid, a) {
    const P = s.players[pid];
    const t = a.type;
    const payOr = cost => C.hasRes(P.resources, cost) ? null : err('Recursos insuficientes');
    if (t === 'buildSettlement') {
      if (P.pieces.settlement <= 0) return err('No te quedan poblados');
      const e = payOr(COST.settlement); if (e) return e;
      if (!settleSpots(s, pid).includes(a.vertex)) return err('Lugar no válido');
      R().pay(s, pid, COST.settlement);
      s.buildings[a.vertex] = { owner: pid, type: 'settlement' };
      P.pieces.settlement--;
      R().log(s, name(s, pid) + ' construye un poblado.', pid);
      R().event(s, { type: 'build', what: 'settlement', pid, at: a.vertex });
    } else if (t === 'buildHarbor') {
      if (P.pieces.harbor <= 0) return err('No te quedan poblados portuarios');
      const e = payOr(COST.harbor); if (e) return e;
      if (!harborSpots(s, pid).includes(a.vertex)) return err('Elige uno de tus poblados en la costa');
      R().pay(s, pid, COST.harbor);
      s.buildings[a.vertex].type = 'harbor';
      s.pe.docks[a.vertex] = s.pe.docks[a.vertex] || [];
      P.pieces.harbor--;
      P.pieces.settlement++;
      R().log(s, name(s, pid) + ' convierte un poblado en poblado portuario.', pid);
      R().event(s, { type: 'build', what: 'harbor', pid, at: a.vertex });
    } else if (t === 'buildShip') {
      // con todos los barcos en el tablero, puedes retirar uno (su carga se pierde) para construirlo de nuevo
      const old = P.pieces.ship <= 0 && a.remove !== undefined && a.remove !== null ? s.pe.ships[a.remove] : null;
      if (P.pieces.ship <= 0 && !old) return err('No te quedan barcos: elige uno para retirarlo');
      if (old && old.owner !== pid) return err('Elige uno de tus barcos');
      const e = payOr(COST.ship); if (e) return e;
      let edges = shipBuildEdges(s, pid);
      if (old) {
        // el lado del barco retirado queda libre
        delete s.pe.ships[old.id];
        edges = shipBuildEdges(s, pid);
        s.pe.ships[old.id] = old;
      }
      if (!edges.includes(a.edge)) return err('El barco debe ir en una ruta marítima junto a tu poblado portuario (máx. 2 por ruta)');
      if (old) {
        delete s.pe.ships[old.id];
        old.cargo.forEach(it => { if (it === 'settler' || it === 'crew') P.pieces[it]++; else if (it === 'fish') s.pe.fishSupply++; });
        P.pieces.ship++;
        R().log(s, name(s, pid) + ' retira un barco' + (old.cargo.length ? ' (pierde su carga)' : '') + '.', pid);
      }
      R().pay(s, pid, COST.ship);
      newShip(s, pid, a.edge, []);
      P.pieces.ship--;
      R().log(s, name(s, pid) + ' construye un barco.', pid);
      R().event(s, { type: 'build', what: 'ship', pid, at: a.edge });
    } else {
      const item = t === 'buildSettler' ? 'settler' : 'crew';
      if (P.pieces[item] <= 0) return err(item === 'settler' ? 'No te quedan colonos' : 'No te quedan tripulaciones');
      const e = payOr(COST[item]); if (e) return e;
      const tg = cargoTargets(s, pid, item);
      let holder = null;
      if (a.ship !== undefined && a.ship !== null) { if (tg.ships.includes(a.ship)) holder = s.pe.ships[a.ship].cargo; }
      else if (a.dock !== undefined && a.dock !== null) { if (tg.docks.includes(a.dock)) holder = s.pe.docks[a.dock] || (s.pe.docks[a.dock] = []); }
      else if (tg.ships.length) holder = s.pe.ships[tg.ships[0]].cargo;
      else if (tg.docks.length) holder = s.pe.docks[tg.docks[0]] || (s.pe.docks[tg.docks[0]] = []);
      if (!holder) return err('Debe ir al muelle de tu poblado portuario o a un barco tuyo junto a él, con espacio libre');
      R().pay(s, pid, COST[item]);
      holder.push(item);
      P.pieces[item]--;
      R().log(s, name(s, pid) + (item === 'settler' ? ' prepara un colono.' : ' recluta una tripulación.'), pid);
      R().event(s, { type: 'build', what: item, pid });
    }
    R().checkWin(s, pid);
    return ok();
  }

  function tradeRate(s, pid, give, get) {
    if (give === 'gold') return RES.includes(get) ? 2 : null;
    if (!RES.includes(give)) return null;
    if (get === 'gold') return s.pe.goldSales < countBen(s.players[pid], 'fastGold') ? 1 : 3;
    return RES.includes(get) && get !== give ? 3 : null;
  }
  function bankTrade(s, pid, a) {
    const P = s.players[pid];
    const rate = tradeRate(s, pid, a.give, a.get);
    if (!rate) return err('Comercio inválido');
    if (a.give === 'gold') {
      if (s.pe.goldBuys >= 2) return err('Solo puedes cambiar oro por recursos 2 veces por turno');
      if (P.gold < rate) return err('Necesitas 2 de oro');
      if (s.bank[a.get] < 1) return err('El banco no tiene ese recurso');
      P.gold -= rate; s.bank[a.get]--; P.resources[a.get]++;
      s.pe.goldBuys++;
      R().log(s, name(s, pid) + ' cambia 2 oro por 1 ' + C.RES_NAME[a.get] + '.', pid);
    } else if (a.get === 'gold') {
      if (P.resources[a.give] < rate) return err('Necesitas ' + rate + ' ' + C.RES_NAME[a.give]);
      R().pay(s, pid, { [a.give]: rate });
      P.gold++;
      if (rate === 1) s.pe.goldSales++;
      R().log(s, name(s, pid) + ' vende ' + rate + ' ' + C.RES_NAME[a.give] + ' por 1 oro.', pid);
    } else {
      const n = Math.max(1, a.count | 0);
      if (P.resources[a.give] < rate * n) return err('No tienes suficientes cartas');
      if (s.bank[a.get] < n) return err('El banco no tiene ese recurso');
      P.resources[a.give] -= rate * n; s.bank[a.give] += rate * n;
      P.resources[a.get] += n; s.bank[a.get] -= n;
      R().log(s, name(s, pid) + ' cambia ' + rate * n + ' ' + C.RES_NAME[a.give] + ' por ' + n + ' ' + C.RES_NAME[a.get] + ' con el banco.', pid);
    }
    R().event(s, { type: 'trade', a: pid, b: null });
    return ok();
  }

  function startMove(s, pid, a) {
    s.trade = null;
    s.phase = 'move';
    return ok();
  }

  // dado de pesca: una vez por turno, durante la fase de movimiento, si quieres
  const canRollFish = s => !!scen(s).fish && s.phase === 'move' && !s.pe.fishRolled && s.pe.fishSupply > 0 && !s.pe.p2;
  function rollFish(s, pid, a) {
    if (!canRollFish(s)) return err(scen(s).fish ? (s.pe.fishRolled ? 'Ya tiraste el dado de pesca este turno' : 'No quedan cargas de pescado') : 'En este escenario no hay pescado');
    s.pe.fishRolled = true;
    const d = a.forcedFish || die();
    s.pe.fishDie = d;
    const h = s.board.hexes.find(x => x.terrain === 'fish' && !x.hidden && x.fishNo === d);
    if (h && !h.fish && !(s.pe.pirate && s.pe.pirate.hex === h.id)) {
      s.pe.fishSupply--;
      h.fish = 1;
      R().log(s, 'Dado de pesca: ' + d + '. Aparece pescado en el banco ' + d + '.', pid);
      R().event(s, { type: 'fish', d, hex: h.id, pid });
    } else {
      R().log(s, 'Dado de pesca: ' + d + '. No aparece pescado.', pid);
      R().event(s, { type: 'fish', d, hex: null, pid });
    }
    return ok();
  }

  function resolveCaptures(s) {
    const list = s.pe.captures || [];
    s.pe.captures = [];
    list.forEach(hex => { if (s.board.hexes[hex].lair) capture(s, hex); });
  }

  function shipAction(s, pid, a) {
    const P = s.players[pid];
    const sh = s.pe.ships[a.ship];
    if (!sh || sh.owner !== pid) return err('Elige uno de tus barcos');
    const sc = scen(s);
    switch (a.type) {
      case 'moveShip': {
        const r = reach(s, sh.id).get(a.to);
        if (!r) return err(sh.stopped ? 'Ese barco ya terminó su movimiento' : 'Ese barco no puede llegar ahí');
        if (r.tribute) {
          P.gold--;
          sh.paid = true;
          R().log(s, name(s, pid) + ' paga 1 oro de tributo al pasar junto al barco pirata.', pid);
        }
        sh.mp -= r.cost;
        sh.moved = true;
        sh.edge = a.to;
        R().event(s, { type: 'shipMove', pid, ship: sh.id, to: a.to });
        if (discover(s, pid, a.to)) { sh.stopped = true; sh.mp = 0; }
        return ok();
      }
      case 'boostShip':
        if (sh.boosted) return err('Ese barco ya recibió +2 movimientos este turno');
        if (sh.stopped) return err('Ese barco ya terminó su movimiento');
        if (!C.hasRes(P.resources, COST.boost)) return err('Necesitas 1 lana');
        R().pay(s, pid, COST.boost);
        sh.boosted = true;
        sh.mp = Math.min(MAX_MP, sh.mp + 2);
        R().log(s, name(s, pid) + ' paga 1 lana: +2 movimientos para un barco.', pid);
        return ok();
      case 'transfer': {
        const hv = harborOf(s, pid, sh.edge);
        if (hv === undefined) return err('El barco debe estar junto a uno de tus poblados portuarios');
        const dock = s.pe.docks[hv] || (s.pe.docks[hv] = []);
        const item = a.item;
        if (!SIZE[item]) return err('Carga inválida');
        const [from, to] = a.dir === 'unload' ? [sh.cargo, dock] : [dock, sh.cargo];
        const i = from.indexOf(item);
        if (i < 0) return err('No hay ' + ITEM_NAME[item] + ' para mover');
        if (space(to) < SIZE[item]) return err(a.dir === 'unload' ? 'El muelle no tiene espacio' : 'El barco no tiene espacio');
        from.splice(i, 1);
        to.push(item);
        R().log(s, name(s, pid) + (a.dir === 'unload' ? ' descarga ' : ' carga ') + (item === 'crew' ? 'una tripulación' : 'un ' + ITEM_NAME[item]) + '.', pid);
        return ok();
      }
      case 'foundSettlement': {
        if (!sh.cargo.includes('settler')) return err('El barco no lleva un colono');
        if (P.pieces.settlement <= 0) return err('No te quedan poblados');
        if (!s.board.edges[sh.edge].v.includes(a.vertex) || !settleOk(s, a.vertex) || !spiceOk(s, pid, a.vertex)) return err('El colono funda en una esquina de tierra a la que apunta el barco, respetando la distancia');
        s.buildings[a.vertex] = { owner: pid, type: 'settlement' };
        P.pieces.settlement--;
        sh.cargo.forEach(it => { if (it === 'settler' || it === 'crew') P.pieces[it]++; });
        P.pieces.ship++;
        delete s.pe.ships[sh.id];
        R().log(s, name(s, pid) + ' funda un poblado con su barco colono.', pid);
        R().event(s, { type: 'build', what: 'settlement', pid, at: a.vertex });
        R().event(s, { type: 'found', pid, at: a.vertex });
        R().checkWin(s, pid);
        return ok();
      }
    }
    if (s.phase !== 'move') return err('Esa acción es de la fase de movimiento');
    switch (a.type) {
      case 'dropCrew': {
        if (!sc.lairs) return err('En este escenario no hay guaridas piratas');
        if (!sh.cargo.includes('crew')) return err('El barco no lleva tripulación');
        const opts = adjacentLairs(s, sh.edge);
        const hex = a.hex === undefined || a.hex === null ? opts[0] : (opts.includes(a.hex) ? a.hex : undefined);
        if (hex === undefined) return err('El barco debe apuntar a una guarida pirata sin capturar');
        sh.cargo.splice(sh.cargo.indexOf('crew'), 1);
        const lair = s.board.hexes[hex].lair;
        lair.crews.push(pid);
        R().log(s, name(s, pid) + ' desembarca una tripulación en una guarida pirata (' + lair.crews.length + '/3).', pid);
        R().event(s, { type: 'crew', pid, hex });
        if (lair.crews.length >= 3) {
          // capturada: el reparto (oro, misión y héroe) se resuelve al terminar la fase de movimiento
          (s.pe.captures || (s.pe.captures = [])).push(hex);
          R().log(s, '¡La guarida pirata cae! El botín se reparte al terminar la fase de movimiento.', pid);
        }
        R().checkWin(s, pid);
        return ok();
      }
      case 'loadFish': {
        if (!sc.fish) return err('En este escenario no hay pescado');
        if (sh.cargo.length) return err('El pescado ocupa toda la bodega: el barco debe estar vacío');
        const opts = adjacentFish(s, sh.edge);
        const hex = a.hex === undefined || a.hex === null ? opts[0] : (opts.includes(a.hex) ? a.hex : undefined);
        if (hex === undefined) return err('El barco debe apuntar a un banco de pesca con pescado');
        s.board.hexes[hex].fish = 0;
        sh.cargo.push('fish');
        R().log(s, name(s, pid) + ' carga pescado.', pid);
        R().event(s, { type: 'loadFish', pid, hex });
        return ok();
      }
      case 'deliver': {
        const ch = councilHex(s);
        if (ch === null || !edgeTouchesHex(s, sh.edge, ch)) return err('El barco debe apuntar al Consejo de Catan');
        const items = sh.cargo.filter(it => it === 'fish' || it === 'spice');
        if (!items.length) return err('El barco no lleva pescado ni especias');
        sh.cargo = sh.cargo.filter(it => it !== 'fish' && it !== 'spice');
        items.forEach(it => { advance(s, pid, it, 1); if (it === 'fish') s.pe.fishSupply++; });
        R().log(s, name(s, pid) + ' entrega ' + items.map(it => ITEM_NAME[it]).join(' y ') + ' al Consejo de Catan.', pid);
        R().event(s, { type: 'deliver', pid, items });
        R().checkWin(s, pid);
        return ok();
      }
      case 'pickupCrew': {
        const opts = pickupHexes(s, sh);
        const hex = a.hex === undefined || a.hex === null ? opts[0] : (opts.includes(a.hex) ? a.hex : undefined);
        if (hex === undefined) return err('El barco debe apuntar a una guarida capturada donde queden tripulaciones tuyas');
        if (space(sh.cargo) < SIZE.crew) return err('El barco no tiene espacio');
        const hx = s.board.hexes[hex];
        hx.leftCrews.splice(hx.leftCrews.indexOf(pid), 1);
        if (!hx.leftCrews.length) delete hx.leftCrews;
        sh.cargo.push('crew');
        R().log(s, name(s, pid) + ' recoge una tripulación.', pid);
        return ok();
      }
      case 'tradeSpice': {
        if (!sc.spice) return err('En este escenario no hay especias');
        if (!sh.cargo.includes('crew')) return err('Necesitas una tripulación a bordo para comerciar');
        const opts = adjacentSpices(s, sh.edge, pid);
        const hex = a.hex === undefined || a.hex === null ? opts[0] : (opts.includes(a.hex) ? a.hex : undefined);
        if (hex === undefined) return err('El barco debe apuntar a una isla de especias con especias en la que aún no tengas tripulación');
        const sp = s.board.hexes[hex].spice;
        sh.cargo.splice(sh.cargo.indexOf('crew'), 1);
        sh.cargo.push('spice');
        sp.left--;
        sp.crews.push(pid);
        const newBen = true;
        P.benefits.push(sp.benefit);
        if (newBen && sp.benefit === 'fastTravel') Object.values(s.pe.ships).forEach(x => { if (x.owner === pid && !x.stopped) x.mp = Math.min(MAX_MP, x.mp + 1); });
        R().log(s, name(s, pid) + ' deja una tripulación en la aldea y carga una especia' + (newBen ? '. Ventaja: ' + BENEFIT_NAME[sp.benefit] : '') + '.', pid);
        R().event(s, { type: 'spice', pid, hex, benefit: newBen ? sp.benefit : null });
        return ok();
      }
      case 'fightPirate': {
        if (!canFight(s, pid, sh)) return err('Necesitas un barco que no se haya movido este turno y apunte al hexágono del barco pirata rival');
        const d = a.forced || die();
        const win = d === 6 || P.benefits.includes('pirate' + d);
        sh.fought = true;
        sh.stopped = true;
        sh.mp = 0;
        s.pe.lastFight = { pid, d, win };
        R().log(s, name(s, pid) + ' ataca al barco pirata y saca un ' + d + (win ? ': ¡lo ahuyenta!' : ': no lo consigue.'), pid);
        R().event(s, { type: 'fight', pid, d, win });
        if (win) {
          s.pe.pirate = null;
          s.pe.pirateReturn = 'move';
          s.phase = 'pirate';
        }
        return ok();
      }
    }
    return err('Acción no disponible');
  }

  function placePirate(s, pid, a) {
    if (!pirateHexes(s).includes(a.hex)) return err('El barco pirata va en un mar que no toque la isla inicial ni el borde');
    s.pe.pirate = { hex: a.hex, owner: pid };
    const hx = s.board.hexes[a.hex];
    R().log(s, name(s, pid) + ' coloca su barco pirata.', pid);
    R().event(s, { type: 'robber', pirate: true, pid, hex: a.hex });
    if (hx.fish) { hx.fish = 0; s.pe.fishSupply++; R().log(s, 'El barco pirata espanta el pescado de ese banco.'); }
    const cands = pirateVictims(s, pid, a.hex);
    if (cands.length) {
      const victim = cands.includes(a.victim) ? a.victim : cands[0];
      const V = s.players[victim];
      const pool = [];
      RES.forEach(k => { for (let i = 0; i < V.resources[k]; i++) pool.push(k); });
      if (pool.length) {
        const card = pool[Math.floor(Math.random() * pool.length)];
        V.resources[card]--;
        s.players[pid].resources[card]++;
        R().log(s, name(s, pid) + ' roba una carta a ' + V.name + '.', pid);
        R().event(s, { type: 'steal', from: victim, to: pid, res: card });
      } else {
        V.gold--;
        s.players[pid].gold++;
        R().log(s, name(s, pid) + ' roba 1 oro a ' + V.name + '.', pid);
        R().event(s, { type: 'stealGold', from: victim, to: pid });
      }
    }
    s.phase = s.pe.pirateReturn || 'main';
    s.pe.pirateReturn = null;
    return ok();
  }

  const SHIP_ACTIONS = ['moveShip', 'boostShip', 'transfer', 'foundSettlement', 'dropCrew', 'pickupCrew', 'loadFish', 'deliver', 'tradeSpice', 'fightPirate'];

  function handle(s, pid, a) {
    const t = a.type;
    if (s.phase === 'setup') return setup(s, pid, a);
    if (s.phase === 'roll') {
      if (pid !== s.current) return err('No es tu turno');
      if (t === 'roll') { roll(s, pid, a); return ok(); }
      return err('Primero tira los dados');
    }
    if (s.phase === 'pirate') {
      if (pid !== s.current) return err('Esperando a ' + name(s, s.current));
      if (t !== 'placePirate') return err('Coloca tu barco pirata');
      return placePirate(s, pid, a);
    }
    if (s.phase === 'main') {
      if (pid !== s.current) return null;
      if (['buildSettlement', 'buildHarbor', 'buildShip', 'buildSettler', 'buildCrew'].includes(t)) return buildMain(s, pid, a);
      if (t === 'buildCity' || t === 'buyDev' || t === 'playDev') return err('En Piratas y Exploradores no hay ciudades ni cartas de desarrollo');
      if (t === 'bankTrade') return bankTrade(s, pid, a);
      if (t === 'startMove') return startMove(s, pid, a);
      if (t === 'endTurn') { endTurn(s); return ok(); }
      if (s.pe.p2 && ['offerTrade', 'respondTrade', 'confirmTrade'].includes(t)) return err('El jugador 2 solo comercia con el banco');
      if (t === 'transfer' || t === 'foundSettlement') return shipAction(s, pid, a);
      if (SHIP_ACTIONS.includes(t)) return err('Primero pasa a la fase de movimiento');
      return null;
    }
    if (s.phase === 'move') {
      if (pid !== s.current) return err('No es tu turno');
      if (t === 'endTurn') {
        resolveCaptures(s);
        R().checkWin(s, pid);
        if (s.phase !== 'ended') endTurn(s);
        return ok();
      }
      if (t === 'rollFish') return rollFish(s, pid, a);
      if (SHIP_ACTIONS.includes(t)) return shipAction(s, pid, a);
      return err('En la fase de movimiento ya no se comercia ni se construye');
    }
    return null;
  }

  function onTurnStart(s) {
    s.pe.captures = [];
    s.pe.fishRolled = false;
    s.pe.fishDie = null;
    s.pe.p2 = null;
    s.pe.goldBuys = 0;
    s.pe.goldSales = 0;
    Object.values(s.pe.ships).forEach(x => { if (x.owner === s.current) freshShip(s, x); });
  }

  // Oculta el contenido de los hexágonos sin descubrir
  function redact(s, v) {
    v.board.hexes.forEach(h => {
      if (!h.hidden) return;
      h.terrain = 'hidden';
      h.number = null;
      h.island = -1;
      delete h.lair; delete h.fishNo; delete h.fish; delete h.spice;
    });
    delete v.board.numberPool;
    delete v.board.lairPool;
    v.pe.hiddenLeft = s.board.hexes.filter(h => h.hidden).length;
  }

  C.PE = {
    SCENARIOS, MISSIONS, MISSION_NAME, TRACK_VP, TRACK_MAX, COST, PIECES, SIZE, CAP, MAX_MP, ITEM_NAME, BENEFIT_NAME, BENEFIT_HELP, TERRAIN_NAME,
    init, handle, onTurnStart, canRollFish, redact, extraVP, missionVP, missionActive,
    isWater, isRoute, touchesHidden, edgeTouchesHidden, edgeTouchesHex, coastal, settleOk, settleSpots, harborSpots, shipBuildEdges,
    setupSpots, cargoTargets, reach, pathTo, shipsAt, space, ownHarbors, harborOf, councilHex, baseMP,
    adjacentLairs, adjacentFish, adjacentSpices, foundable, pickupHexes, spiceOk, countBen, NEUTRAL, canFight, pirateHexes, pirateVictims, tradeRate
  };
})(typeof window !== 'undefined' ? window : globalThis);
