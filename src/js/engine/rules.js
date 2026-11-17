// Motor de reglas de Catan. Estado serializable, acciones validadas.
(function (root) {
  const C = root.Catan || (root.Catan = {});
  const { RES, TERRAIN_RES, isLand, shuffle } = C;
  const COMM = ['paper', 'cloth', 'coin'];
  const KEYS = RES.concat(COMM);
  const isCK = s => !!MODES[s.mode].ck;
  const isPE = s => !!MODES[s.mode].pe;
  // Mercaderes y Bárbaros (escenarios y variantes): s.tb existe cuando se usa alguna de sus reglas
  const TB = s => (s.tb ? C.TB : null);

  const COST = {
    road: { wood: 1, brick: 1 },
    ship: { wood: 1, sheep: 1 },
    settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
    city: { wheat: 2, ore: 3 },
    dev: { sheep: 1, wheat: 1, ore: 1 }
  };

  const MODES = {
    classic: { id: 'classic', name: 'Clásico', min: 3, max: 4, vp: 10, bank: 19, ships: false, specialBuild: false,
      deck: { knight: 14, vp: 5, roadBuilding: 2, yearOfPlenty: 2, monopoly: 2 } },
    extended: { id: 'extended', name: 'Ampliación 5-6 jugadores', min: 5, max: 6, vp: 10, bank: 24, ships: false, specialBuild: true, pairs: true,
      deck: { knight: 20, vp: 5, roadBuilding: 3, yearOfPlenty: 3, monopoly: 3 } },
    seafarers: { id: 'seafarers', name: 'Navegantes', min: 3, max: 4, vp: 14, bank: 19, ships: true, specialBuild: false, sf: true,
      deck: { knight: 14, vp: 5, roadBuilding: 2, yearOfPlenty: 2, monopoly: 2 } },
    seafarers56: { id: 'seafarers56', name: 'Navegantes 5-6', min: 5, max: 6, vp: 14, bank: 24, ships: true, specialBuild: false, sf: true, pairs: true,
      deck: { knight: 20, vp: 5, roadBuilding: 3, yearOfPlenty: 3, monopoly: 3 } },
    cities: { id: 'cities', name: 'Ciudades y Caballeros', min: 3, max: 4, vp: 13, bank: 19, commodities: 12, ships: false, specialBuild: false, ck: true, board: 'classic', deck: {} },
    cities56: { id: 'cities56', name: 'Ciudades y Caballeros 5-6', min: 5, max: 6, vp: 13, bank: 24, commodities: 18, ships: false, specialBuild: true, pairs: true, ck: true, board: 'extended', deck: {} },
    explorers: { id: 'explorers', name: 'Piratas y Exploradores', min: 2, max: 4, vp: 12, bank: 19, ships: false, specialBuild: false, pe: true, deck: {} },
    explorers56: { id: 'explorers56', name: 'Piratas y Exploradores 5-6', min: 5, max: 6, vp: 12, bank: 24, ships: false, specialBuild: false, pe: true, pairs: true, deck: {} },
    traders: { id: 'traders', name: 'Mercaderes y Bárbaros', min: 2, max: 4, vp: 10, bank: 19, ships: false, specialBuild: false, tb: true,
      deck: { knight: 14, vp: 5, roadBuilding: 2, yearOfPlenty: 2, monopoly: 2 } },
    traders56: { id: 'traders56', name: 'Mercaderes y Bárbaros 5-6', min: 5, max: 6, vp: 10, bank: 24, ships: false, specialBuild: false, tb: true, pairs: true,
      deck: { knight: 20, vp: 5, roadBuilding: 3, yearOfPlenty: 3, monopoly: 3 } }
  };

  // Expansiones del menú: el número de jugadores decide si se usa la ampliación 5-6
  const EXPANSIONS = {
    classic: { id: 'classic', name: 'Clásico', vp: 10, min: 2, max: 6, modes: ['classic', 'extended'] },
    seafarers: { id: 'seafarers', name: 'Navegantes', vp: 14, min: 3, max: 6, modes: ['seafarers', 'seafarers56'] },
    cities: { id: 'cities', name: 'Ciudades y Caballeros', vp: 13, min: 3, max: 6, modes: ['cities', 'cities56'] },
    explorers: { id: 'explorers', name: 'Piratas y Exploradores', vp: 12, min: 2, max: 6, modes: ['explorers', 'explorers56'] },
    traders: { id: 'traders', name: 'Mercaderes y Bárbaros', vp: 10, min: 2, max: 6, modes: ['traders', 'traders56'] }
  };
  function resolveMode(exp, n) {
    const e = EXPANSIONS[exp];
    if (!e) return MODES[exp] ? exp : 'classic';
    return (n >= 5 && e.modes[1]) ? e.modes[1] : e.modes[0];
  }

  const PIECES = { road: 15, settlement: 5, city: 4, ship: 15 };
  const VP_VARIANTS = ['university', 'market', 'library', 'chapel', 'hall'];

  const RES_NAME = { wood: 'Madera', brick: 'Arcilla', sheep: 'Lana', wheat: 'Cereal', ore: 'Mineral', paper: 'Papel', cloth: 'Tela', coin: 'Moneda' };
  const DEV_NAME = { knight: 'Caballero', vp: 'Punto de Victoria', roadBuilding: 'Construcción de Carreteras', yearOfPlenty: 'Descubrimiento', monopoly: 'Monopolio', swiftJourney: 'Viaje rápido' };

  const emptyRes = () => ({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });
  const total = r => KEYS.reduce((s, k) => s + (r[k] || 0), 0);
  const hasRes = (have, need) => KEYS.every(k => (have[k] || 0) >= (need[k] || 0));
  const addRes = (a, b, sign = 1) => { KEYS.forEach(k => { if (a[k] !== undefined || b[k]) a[k] = (a[k] || 0) + sign * (b[k] || 0); }); };
  const resText = r => KEYS.filter(k => r[k] > 0).map(k => r[k] + ' ' + RES_NAME[k]).concat(r.gold > 0 ? [r.gold + ' oro'] : []).join(', ') || 'nada';

  function createGame(config) {
    const mode = MODES[config.mode] || MODES.classic;
    const n = config.players.length;
    const board = C.generateBoard(mode.board || mode.id, Object.assign({}, config.options, { players: n }));
    const deck = [];
    Object.entries(mode.deck).forEach(([k, c]) => { for (let i = 0; i < c; i++) deck.push(k); });
    shuffle(deck);
    const players = config.players.map((p, i) => ({
      id: i, name: p.name, color: p.color, bot: !!p.bot, difficulty: p.difficulty || 'normal', avatar: p.avatar || null,
      resources: emptyRes(), devCards: [], knights: 0,
      pieces: { road: PIECES.road, settlement: PIECES.settlement, city: PIECES.city, ship: mode.ships ? PIECES.ship : 0 },
      islands: [], routeLength: 0
    }));
    // empieza quien saca más con los dos dados; los empatados vuelven a tirar
    const d6 = () => 1 + Math.floor(Math.random() * 6);
    const firstRolls = [];
    let cands = players.map(p => p.id);
    while (cands.length > 1) {
      const r = cands.map(id => [id, d6() + d6()]);
      firstRolls.push(r);
      const max = Math.max(...r.map(x => x[1]));
      cands = r.filter(x => x[1] === max).map(x => x[0]);
    }
    const first = cands[0];
    const order = [];
    for (let i = 0; i < n; i++) order.push((first + i) % n);
    for (let i = n - 1; i >= 0; i--) order.push((first + i) % n);
    const bank = emptyRes();
    RES.forEach(k => { bank[k] = mode.bank; });
    const o0 = config.options || {};
    // 5-6: jugadores en pareja (regla de 2022) o, si se elige, la antigua fase de construcción especial
    const special = !!(mode.specialBuild && o0.specialBuild);
    const s = {
      mode: mode.id,
      pairs: !!mode.pairs && !special, specialBuild: special, pair: null,
      vpTarget: (config.options && config.options.vpTarget) || mode.vp,
      friendlyRobber: !!(config.options && config.options.friendlyRobber),
      board, players, bank, devDeck: deck,
      buildings: {}, roads: {},
      robber: board.robber, pirate: board.pirate,
      phase: 'setup', setup: { order, index: 0, step: 'settlement', vertex: null, round: 1 },
      current: order[0], first, turn: 0, dice: null, rollSeq: 0,
      pendingDiscard: {}, pendingGold: {}, goldReturn: null,
      robberReturn: null, roadReturn: null, freeRoads: 0,
      devPlayed: false, shipMoved: false,
      specialQueue: [], specialBuilder: null,
      longestRoad: null, largestArmy: null,
      trade: null, tradeSeq: 0,
      log: [], logSeq: 0, winner: null, events: []
    };
    if (mode.ck) C.CK.init(s, mode);
    if (mode.pe) C.PE.init(s, mode, config);
    const o = config.options || {};
    if (mode.sf) C.SF.init(s, mode, config);
    if (C.TB && !mode.ck && !mode.pe && !mode.sf && (mode.tb || o.events || o.harbormaster || n === 2)) C.TB.init(s, mode, config);
    firstRolls.forEach((r, i) => log(s, (i ? 'Desempate: ' : 'Tiradas para empezar: ') + r.map(([id, v]) => players[id].name + ' ' + v).join(', ') + '.'));
    log(s, 'Comienza la partida. ' + players[s.current].name + (s.phase === 'setup' ? ' coloca primero.' : ' empieza.'));
    return s;
  }

  function log(s, msg, pid) {
    s.logSeq++;
    s.log.push({ id: s.logSeq, msg, pid: pid === undefined ? null : pid });
    if (s.log.length > 150) s.log.shift();
  }
  function event(s, ev) {
    s.events.push(Object.assign({ seq: ++s.logSeq }, ev));
    if (s.events.length > 20) s.events.shift();
  }

  // ---------- consultas ----------
  const bAt = (s, v) => s.buildings[v];
  const ownsAt = (s, pid, v) => s.buildings[v] && s.buildings[v].owner === pid;
  const oppAt = (s, pid, v) => (s.buildings[v] && s.buildings[v].owner !== pid) || (s.knights && s.knights[v] && s.knights[v].owner !== pid);
  const hexOf = (s, id) => s.board.hexes[id];

  function actor(s) {
    if (s.tb && C.TB.actor) { const a = C.TB.actor(s); if (a !== undefined) return a; }
    if (s.phase === 'ckChoice' && s.ck.choices.length) return s.ck.choices[0].pid;
    return s.phase === 'specialBuild' ? s.specialBuilder : s.current;
  }

  function distanceOk(s, v) {
    return !bAt(s, v) && !(s.knights && s.knights[v]) && s.board.vertices[v].adj.every(a => !bAt(s, a));
  }

  function onHomeIsland(s, v) {
    return s.board.vertices[v].hexes.some(h => s.board.homeIslands.includes(hexOf(s, h).island));
  }

  function canSettle(s, pid, v, setup) {
    const vx = s.board.vertices[v];
    if (!vx || !vx.land || !distanceOk(s, v)) return false;
    if (s.tb && !C.TB.settleOk(s, pid, v, setup)) return false;
    if (s.sf && !C.SF.settleOk(s, pid, v, setup)) return false;
    if (setup) return onHomeIsland(s, v);
    return vx.edges.some(e => s.roads[e] && s.roads[e].owner === pid);
  }

  function edgeConnected(s, pid, e, kind) {
    const ed = s.board.edges[e];
    return ed.v.some(v => {
      if (ownsAt(s, pid, v)) return true;
      if (oppAt(s, pid, v)) return false;
      return s.board.vertices[v].edges.some(o => o !== e && s.roads[o] && s.roads[o].owner === pid && s.roads[o].type === kind);
    });
  }

  function canPlaceRoute(s, pid, e, kind, setupVertex) {
    const ed = s.board.edges[e];
    if (!ed || s.roads[e]) return false;
    if (kind === 'road' && !ed.land) return false;
    if (kind === 'road' && s.tb && !C.TB.roadOk(s, pid, e, setupVertex !== undefined && setupVertex !== null)) return false;
    if (kind === 'ship') {
      if (!MODES[s.mode].ships || !ed.sea) return false;
      if (s.pirate !== null && ed.hexes.includes(s.pirate)) return false;
      if (s.sf && !C.SF.routeOk(s, pid, e, kind, setupVertex)) return false;
    }
    if (setupVertex !== undefined && setupVertex !== null) return ed.v.includes(setupVertex);
    return edgeConnected(s, pid, e, kind);
  }

  function validSettlements(s, pid, setup) {
    return s.board.vertices.filter(v => canSettle(s, pid, v.id, setup)).map(v => v.id);
  }
  function validRoutes(s, pid, kind, setupVertex) {
    return s.board.edges.filter(e => canPlaceRoute(s, pid, e.id, kind, setupVertex)).map(e => e.id);
  }
  function validCities(s, pid) {
    return Object.keys(s.buildings).map(Number).filter(v => s.buildings[v].owner === pid && s.buildings[v].type === 'settlement');
  }

  function isShipOpen(s, pid, e) {
    const r = s.roads[e];
    if (!r || r.owner !== pid || r.type !== 'ship') return false;
    return s.board.edges[e].v.some(v => !ownsAt(s, pid, v) && !(s.sf && C.SF.anchor(s, pid, v)) &&
      !s.board.vertices[v].edges.some(o => o !== e && s.roads[o] && s.roads[o].owner === pid && s.roads[o].type === 'ship'));
  }
  function movableShips(s, pid) {
    if (!MODES[s.mode].ships || s.shipMoved || s.phase !== 'main' || s.current !== pid || (s.sf && s.sf.noShipMove)) return [];
    const list = Object.keys(s.roads).map(Number).filter(e => isShipOpen(s, pid, e) && s.roads[e].turn !== s.turn &&
      !(s.pirate !== null && s.board.edges[e].hexes.includes(s.pirate)));
    // Las islas piratas: solo si la ruta tiene otro lado igual de corto donde ponerlo
    return s.sf && s.sf.routes ? list.filter(e => shipTargets(s, pid, e).length) : list;
  }
  function shipTargets(s, pid, from) {
    const saved = s.roads[from];
    delete s.roads[from];
    const out = validRoutes(s, pid, 'ship').filter(e => e !== from);
    s.roads[from] = saved;
    return out;
  }

  function tradeRatios(s, pid) {
    const r = { wood: 4, brick: 4, sheep: 4, wheat: 4, ore: 4 };
    if (isPE(s)) { RES.forEach(k => { r[k] = 3; }); return r; }
    if (isCK(s)) COMM.forEach(k => { r[k] = 4; });
    for (const [v, b] of Object.entries(s.buildings)) {
      if (b.owner !== pid || b.conquered) continue;
      const port = s.board.vertices[v].port;
      if (!port) continue;
      if (port === 'any') Object.keys(r).forEach(k => { r[k] = Math.min(r[k], 3); });
      else r[port] = 2;
    }
    if (isCK(s)) C.CK.adjustRatios(s, pid, r);
    return r;
  }

  function robberHexes(s, pid) {
    const out = [];
    if ((isCK(s) && !s.ck.attacks) || isPE(s)) return out;
    if (s.tb) { const r = C.TB.robberHexes(s, pid); if (r) return r; }
    for (const h of s.board.hexes) {
      if (h.hidden || h.frame) continue;
      if (isLand(h.terrain)) {
        if (h.id === s.robber) continue;
        if (s.friendlyRobber && h.vertices.some(v => s.buildings[v] && s.buildings[v].owner !== pid && publicVP(s, s.buildings[v].owner) <= 2)) continue;
        out.push(h.id);
      } else if (MODES[s.mode].ships && h.terrain === 'sea' && s.pirate !== null && h.id !== s.pirate) {
        out.push(h.id);
      }
    }
    return s.sf ? C.SF.robberFilter(s, pid, out) : out;
  }

  function stealCandidates(s, pid, hexId) {
    const h = hexOf(s, hexId);
    const set = new Set();
    if (isLand(h.terrain)) {
      h.vertices.forEach(v => { if (s.buildings[v] && s.buildings[v].owner !== pid) set.add(s.buildings[v].owner); });
    } else {
      h.edges.forEach(e => { if (s.roads[e] && s.roads[e].owner !== pid && s.roads[e].type === 'ship') set.add(s.roads[e].owner); });
    }
    return [...set].filter(p => !s.players[p].neutral && ((s.players[p].resources ? total(s.players[p].resources) : s.players[p].resCount) > 0 || (s.sf && !isLand(h.terrain) && s.players[p].cloth > 0)) && !(s.friendlyRobber && publicVP(s, p) <= 2));
  }

  // ---------- puntos ----------
  function publicVP(s, pid) {
    let vp = 0;
    for (const b of Object.values(s.buildings)) if (b.owner === pid) vp += b.type === 'city' || b.type === 'harbor' ? 2 : 1;
    if (s.longestRoad === pid) vp += 2;
    if (s.largestArmy === pid) vp += 2;
    if (!s.sf) vp += 2 * s.players[pid].islands.length;
    if (isCK(s)) vp += C.CK.extraVP(s, pid);
    if (isPE(s)) vp += C.PE.extraVP(s, pid);
    if (s.tb) vp += C.TB.extraVP(s, pid);
    if (s.sf) vp += C.SF.extraVP(s, pid);
    return vp;
  }
  function totalVP(s, pid) {
    return publicVP(s, pid) + s.players[pid].devCards.filter(c => c.type === 'vp').length;
  }

  // ---------- ruta más larga ----------
  function longestRouteFor(s, pid) {
    const own = Object.keys(s.roads).map(Number).filter(e => s.roads[e].owner === pid);
    if (!own.length) return 0;
    const ownSet = new Set(own);
    let best = 0;
    const used = new Set();
    const E = s.board.edges, V = s.board.vertices;
    function dfs(v, lastType, len) {
      if (len > best) best = len;
      if (len > 0 && oppAt(s, pid, v)) return;
      for (const e of V[v].edges) {
        if (!ownSet.has(e) || used.has(e)) continue;
        const t = s.roads[e].type;
        if (lastType && t !== lastType && !ownsAt(s, pid, v)) continue;
        used.add(e);
        const o = E[e].v[0] === v ? E[e].v[1] : E[e].v[0];
        dfs(o, t, len + (s.tb ? C.TB.edgeWeight(s, e) : 1));
        used.delete(e);
      }
    }
    const starts = new Set();
    own.forEach(e => E[e].v.forEach(v => starts.add(v)));
    starts.forEach(v => dfs(v, null, 0));
    return best;
  }

  function updateLongestRoad(s) {
    if (isPE(s) || (s.tb && s.tb.noLongestRoad) || (s.sf && s.sf.noLongestRoad)) return; // sin Gran Ruta Comercial
    const lens = s.players.map(p => longestRouteFor(s, p.id));
    s.players.forEach((p, i) => { p.routeLength = lens[i]; });
    const max = Math.max(...lens);
    const prev = s.longestRoad;
    if (max < 5) s.longestRoad = null;
    else if (prev !== null && lens[prev] === max) { /* mantiene */ }
    else {
      const top = lens.map((l, i) => l === max ? i : -1).filter(i => i >= 0);
      s.longestRoad = top.length === 1 ? top[0] : null;
    }
    if (s.longestRoad !== prev) {
      if (s.longestRoad !== null) log(s, s.players[s.longestRoad].name + ' obtiene la Gran Ruta Comercial (' + max + ').', s.longestRoad);
      else log(s, 'Nadie tiene la Gran Ruta Comercial.');
    }
  }

  function updateLargestArmy(s, pid) {
    const k = s.players[pid].knights;
    if (k < 3 || (s.sf && s.sf.noArmy)) return;
    const cur = s.largestArmy;
    if (cur === pid) return;
    if (cur === null || k > s.players[cur].knights) {
      s.largestArmy = pid;
      log(s, s.players[pid].name + ' obtiene el Gran Ejército (' + k + ' caballeros).', pid);
    }
  }

  function checkWin(s, pid) {
    if (s.winner !== null || pid !== s.current || s.players[pid].neutral) return;
    if (s.sf ? C.SF.winCheck(s, pid) : totalVP(s, pid) >= (s.tb ? C.TB.target(s, pid) : s.vpTarget)) {
      s.winner = pid;
      s.phase = 'ended';
      log(s, '¡' + s.players[pid].name + ' gana la partida con ' + totalVP(s, pid) + ' puntos!', pid);
      event(s, { type: 'win', pid });
    }
  }

  // ---------- producción ----------
  function produce(s, roll) {
    const demand = {};
    const gold = {};
    RES.forEach(k => { demand[k] = {}; });
    for (const h of s.board.hexes) {
      if ((h.number !== roll && h.number2 !== roll) || h.id === s.robber || h.conquered) continue;
      for (const v of h.vertices) {
        const b = s.buildings[v];
        if (!b || b.conquered || s.players[b.owner].neutral) continue;
        const amt = b.type === 'city' ? (s.tb && s.tb.epidemic ? 1 : 2) : 1;
        if (h.terrain === 'gold') gold[b.owner] = (gold[b.owner] || 0) + amt;
        const res = TERRAIN_RES[h.terrain];
        if (res) demand[res][b.owner] = (demand[res][b.owner] || 0) + amt;
      }
    }
    const got = {};
    for (const k of RES) {
      const owners = Object.keys(demand[k]);
      if (!owners.length) continue;
      const need = owners.reduce((a, o) => a + demand[k][o], 0);
      if (need > s.bank[k] && owners.length > 1) {
        log(s, 'El banco no tiene suficiente ' + RES_NAME[k] + ': nadie lo recibe.');
        continue;
      }
      for (const o of owners) {
        const amt = Math.min(demand[k][o], s.bank[k]);
        s.bank[k] -= amt;
        s.players[o].resources[k] += amt;
        (got[o] || (got[o] = emptyRes()))[k] += amt;
      }
    }
    Object.entries(got).forEach(([o, r]) => log(s, s.players[o].name + ' recibe ' + resText(r) + '.', +o));
    event(s, { type: 'produce', got });
    if (s.tb) C.TB.afterProduce(s, roll);
    if (s.sf) C.SF.afterProduce(s, roll);
    return gold;
  }

  function startGold(s, gold, ret) {
    const pend = {};
    Object.entries(gold).forEach(([p, c]) => {
      const avail = total(s.bank);
      if (c > 0 && avail > 0) pend[p] = Math.min(c, avail);
    });
    if (!Object.keys(pend).length) return false;
    s.pendingGold = pend;
    s.goldReturn = ret;
    s.phase = 'gold';
    log(s, ((s.sf && s.sf.goldWhy) || 'Río de oro') + ': ' + Object.keys(pend).map(p => s.players[p].name).join(', ') + ' elige(n) recursos.');
    return true;
  }

  function nextTurn(s) {
    do { s.current = (s.current + 1) % s.players.length; } while (s.players[s.current].neutral);
    s.pair = null;
    s.turn++;
    s.phase = 'roll';
    s.devPlayed = false;
    s.shipMoved = false;
    s.trade = null;
    s.dice = null;
    if (isCK(s)) C.CK.onTurnStart(s);
    if (isPE(s)) C.PE.onTurnStart(s);
    if (s.tb) C.TB.onTurnStart(s);
    if (s.sf) C.SF.onTurnStart(s);
    log(s, 'Turno de ' + s.players[s.current].name + '.', s.current);
    checkWin(s, s.current);
  }

  function pay(s, pid, cost) {
    addRes(s.players[pid].resources, cost, -1);
    addRes(s.bank, cost, 1);
  }

  // ---------- acciones ----------
  function apply(s, pid, a) {
    try {
      const r = applyInner(s, pid, a);
      if (r && r.error) return r;
      return { ok: true };
    } catch (err) {
      return { error: 'Error interno: ' + err.message };
    }
  }

  function err(m) { return { error: m }; }

  function applyInner(s, pid, a) {
    if (!a || !a.type) return err('Acción inválida');
    if (s.phase === 'ended') return err('La partida terminó');
    const P = s.players[pid];
    if (!P) return err('Jugador inválido');

    // acciones que no dependen del turno
    if (a.type === 'discard') return doDiscard(s, pid, a);
    if (a.type === 'chooseGold') return doGold(s, pid, a);
    if (a.type === 'respondTrade') return doRespondTrade(s, pid, a);

    if (isCK(s) && s.phase !== 'setup') {
      const h = C.CK.handle(s, pid, a);
      if (h) return h.result;
    }
    if (isPE(s)) {
      const h = C.PE.handle(s, pid, a);
      if (h) return h.result;
    }

    if (s.tb) {
      const h = C.TB.handle(s, pid, a);
      if (h) return h.result;
    }
    if (s.sf) {
      const h = C.SF.handle(s, pid, a);
      if (h) return h.result;
    }

    if (s.phase === 'setup') return doSetup(s, pid, a);

    if (s.phase === 'specialBuild') {
      if (pid !== s.specialBuilder) return err('No es tu fase de construcción');
      if (a.type === 'endTurn') { advanceSpecial(s); return; }
      if (['buildRoad', 'buildShip', 'buildSettlement', 'buildCity'].includes(a.type) || (a.type === 'buyDev' && !isCK(s))) return doBuild(s, pid, a);
      return err('Solo puedes construir en la fase especial');
    }

    if (pid !== s.current) return err('No es tu turno');

    switch (s.phase) {
      case 'roll':
        if (a.type === 'roll') return isCK(s) ? C.CK.roll(s, pid, a) : doRoll(s, pid, a);
        if (a.type === 'playDev') return doPlayDev(s, pid, a);
        return err('Primero tira los dados');
      case 'discard':
        return err('Esperando a que los jugadores descarten');
      case 'gold':
        return err('Esperando la elección del oro');
      case 'robber':
        if (a.type === 'moveRobber') return doRobber(s, pid, a);
        return err('Mueve el ladrón');
      case 'roadBuilding':
        if (a.type === 'buildRoad' || a.type === 'buildShip') return doBuild(s, pid, a, true);
        if (a.type === 'endRoadBuilding') { s.freeRoads = 0; s.phase = s.roadReturn; return; }
        return err('Coloca tus carreteras gratuitas');
      case 'main':
        switch (a.type) {
          case 'buildRoad': case 'buildShip': case 'buildSettlement': case 'buildCity':
            return doBuild(s, pid, a);
          case 'buyDev': if (isCK(s)) return err('En Ciudades y Caballeros no hay cartas de desarrollo'); return doBuild(s, pid, a);
          case 'moveShip': return doMoveShip(s, pid, a);
          case 'playDev': return doPlayDev(s, pid, a);
          case 'bankTrade': return doBankTrade(s, pid, a);
          case 'offerTrade': if (s.pair) return err('El jugador 2 solo comercia con el banco'); return doOfferTrade(s, pid, a);
          case 'confirmTrade': return doConfirmTrade(s, pid, a);
          case 'cancelTrade': s.trade = null; return;
          case 'endTurn': return doEndTurn(s, pid);
        }
        return err('Acción no disponible');
    }
    return err('Acción no disponible');
  }

  function doSetup(s, pid, a) {
    const st = s.setup;
    if (pid !== s.current) return err('No es tu turno');
    if (st.step === 'settlement') {
      if (a.type !== 'buildSettlement') return err('Coloca un poblado');
      if (!canSettle(s, pid, a.vertex, true)) return err('Lugar no válido');
      const asCity = (isCK(s) || (s.tb && s.tb.setupCity)) && st.index >= st.order.length / 2;
      s.buildings[a.vertex] = { owner: pid, type: asCity ? 'city' : 'settlement' };
      s.players[pid].pieces[asCity ? 'city' : 'settlement']--;
      st.vertex = a.vertex;
      st.step = 'road';
      log(s, s.players[pid].name + (asCity ? ' coloca una ciudad.' : ' coloca un poblado.'), pid);
      event(s, { type: 'build', what: asCity ? 'city' : 'settlement', pid, at: a.vertex });
      if (s.tb) C.TB.afterSetupSettlement(s, pid, a.vertex);
      if (s.sf) C.SF.afterSettlement(s, pid, a.vertex, true);
      if (st.index >= (st.resFrom !== undefined ? st.resFrom : st.order.length / 2)) {
        // segundo poblado: recursos iniciales
        const gold = {};
        const got = emptyRes();
        for (const h of s.board.vertices[a.vertex].hexes) {
          const hx = hexOf(s, h);
          const res = TERRAIN_RES[hx.terrain];
          if (res && s.bank[res] > 0) { got[res]++; s.bank[res]--; s.players[pid].resources[res]++; }
          if (hx.terrain === 'gold') gold[pid] = (gold[pid] || 0) + 1;
        }
        log(s, s.players[pid].name + ' recibe ' + resText(got) + '.', pid);
        startGold(s, gold, 'setup');
      }
      return;
    }
    if (a.type !== 'buildRoad' && a.type !== 'buildShip') return err('Coloca una carretera');
    const kind = a.type === 'buildShip' ? 'ship' : 'road';
    if (!canPlaceRoute(s, pid, a.edge, kind, st.vertex)) return err('Lugar no válido');
    s.roads[a.edge] = { owner: pid, type: kind, turn: -1 };
    s.players[pid].pieces[kind]--;
    event(s, { type: 'build', what: kind, pid, at: a.edge });
    if (s.tb) C.TB.afterSetupRoad(s, pid, a.edge);
    st.index++;
    if (s.sf) C.SF.afterRoute(s, pid, kind, a.edge, { setup: true });
    st.step = 'settlement';
    st.vertex = null;
    if (st.index >= st.order.length) {
      s.phase = 'roll';
      s.current = s.first;
      s.turn = 1;
      updateLongestRoad(s);
      log(s, 'Fase de colocación terminada. Turno de ' + s.players[s.current].name + '.', s.current);
      if (s.tb) C.TB.afterSetup(s);
    } else {
      if (st.resFrom !== undefined) st.round = 1 + Math.floor(st.index / s.players.length);
      else if (st.index === st.order.length / 2) st.round = 2;
      s.current = st.order[st.index];
    }
  }

  function doRoll(s, pid, a) {
    if (s.tb) return C.TB.roll(s, pid, a);
    const d1 = a.forced ? a.forced[0] : 1 + Math.floor(Math.random() * 6);
    const d2 = a.forced ? a.forced[1] : 1 + Math.floor(Math.random() * 6);
    s.dice = [d1, d2];
    s.rollSeq++;
    const sum = d1 + d2;
    log(s, s.players[pid].name + ' tira ' + sum + ' (' + d1 + '+' + d2 + ').', pid);
    event(s, { type: 'roll', dice: [d1, d2], pid });
    const bonus = s.sf ? C.SF.onRoll(s, pid, d1, d2) : null;
    if (sum === 7) {
      const pend = {};
      s.players.forEach(p => { const t = total(p.resources); if (t > 7) pend[p.id] = Math.floor(t / 2); });
      s.robberReturn = 'main';
      // Las islas piratas: no hay ladrón; quien tira roba una carta a quien elija
      const next = s.sf && s.sf.scenario === 7 ? (C.SF.stealVictims(s, pid).length ? 'sfSteal' : 'main') : 'robber';
      if (Object.keys(pend).length) {
        s.pendingDiscard = pend;
        s.phase = 'discard';
        if (next !== 'robber') s.discardReturn = next;
        log(s, 'Deben descartar: ' + Object.keys(pend).map(p => s.players[p].name + ' (' + pend[p] + ')').join(', ') + '.');
      } else {
        s.phase = next;
      }
      if (bonus) startGold(s, { [pid]: bonus }, s.phase);
      return;
    }
    const gold = produce(s, sum);
    if (bonus) gold[pid] = (gold[pid] || 0) + bonus;
    s.phase = 'main';
    if (s.winner !== null) { s.phase = 'ended'; return; }
    startGold(s, gold, 'main');
  }

  function doDiscard(s, pid, a) {
    if (s.phase !== 'discard' || !s.pendingDiscard[pid]) return err('No tienes que descartar');
    const need = s.pendingDiscard[pid];
    const r = a.resources || {};
    if (KEYS.some(k => (r[k] || 0) < 0) || total(r) !== need) return err('Debes descartar exactamente ' + need + ' cartas');
    if (!hasRes(s.players[pid].resources, r)) return err('No tienes esas cartas');
    pay(s, pid, r);
    delete s.pendingDiscard[pid];
    log(s, s.players[pid].name + ' descarta ' + need + ' cartas.', pid);
    if (!Object.keys(s.pendingDiscard).length) { s.phase = s.discardReturn || 'robber'; s.discardReturn = null; }
  }

  function doGold(s, pid, a) {
    if (s.phase !== 'gold' || !s.pendingGold[pid]) return err('No tienes oro que elegir');
    const need = s.pendingGold[pid];
    const r = a.resources || {};
    if (RES.some(k => (r[k] || 0) < 0) || COMM.some(k => r[k]) || total(r) !== need) return err('Elige exactamente ' + need + ' recursos');
    if (!hasRes(s.bank, r)) return err('El banco no tiene esos recursos');
    addRes(s.players[pid].resources, r, 1);
    addRes(s.bank, r, -1);
    delete s.pendingGold[pid];
    log(s, s.players[pid].name + (s.sf && s.sf.goldWhy ? ' elige: ' : ' toma del oro: ') + resText(r) + '.', pid);
    if (!Object.keys(s.pendingGold).length) {
      s.phase = s.goldReturn === 'setup' ? 'setup' : s.goldReturn;
      s.goldReturn = null;
      if (s.phase === 'tbPost' && s.tb) C.TB.nextPost(s);
    }
  }

  function doRobber(s, pid, a) {
    if (!robberHexes(s, pid).includes(a.hex)) return err('Hexágono no válido');
    const h = hexOf(s, a.hex);
    const pirate = h.terrain === 'sea';
    if (pirate) s.pirate = a.hex; else s.robber = a.hex;
    log(s, s.players[pid].name + ' mueve ' + (pirate ? 'el pirata.' : 'el ladrón.'), pid);
    event(s, { type: 'robber', pirate, pid, hex: a.hex });
    const cands = stealCandidates(s, pid, a.hex);
    if (cands.length) {
      let victim = a.victim;
      if (!cands.includes(victim)) victim = cands[0];
      const v = s.players[victim];
      if (s.sf && pirate && v.cloth > 0 && (a.cloth || !total(v.resources))) {
        // Tela para Catan: el pirata puede robar una tela en lugar de un recurso
        v.cloth--;
        s.players[pid].cloth++;
        log(s, s.players[pid].name + ' roba una tela a ' + v.name + '.', pid);
        event(s, { type: 'steal', from: victim, to: pid, res: 'cloth' });
      } else {
        const pool = [];
        KEYS.forEach(k => { for (let i = 0; i < (v.resources[k] || 0); i++) pool.push(k); });
        const card = pool[Math.floor(Math.random() * pool.length)];
        v.resources[card]--;
        s.players[pid].resources[card] = (s.players[pid].resources[card] || 0) + 1;
        log(s, s.players[pid].name + ' roba una carta a ' + v.name + '.', pid);
        event(s, { type: 'steal', from: victim, to: pid, res: card });
      }
    }
    s.phase = s.robberReturn || 'main';
    s.robberReturn = null;
  }

  function doBuild(s, pid, a, free) {
    const P = s.players[pid];
    const special = s.phase === 'specialBuild';
    if (a.type === 'buildRoad' || a.type === 'buildShip') {
      const kind = a.type === 'buildShip' ? 'ship' : 'road';
      if (P.pieces[kind] <= 0) return err('No te quedan piezas');
      if (!free && !hasRes(P.resources, COST[kind])) return err('Recursos insuficientes');
      if (!canPlaceRoute(s, pid, a.edge, kind)) return err('Lugar no válido');
      if (!free) pay(s, pid, COST[kind]);
      s.roads[a.edge] = { owner: pid, type: kind, turn: s.turn };
      P.pieces[kind]--;
      log(s, P.name + ' construye ' + (kind === 'ship' ? 'un barco.' : 'una carretera.'), pid);
      event(s, { type: 'build', what: kind, pid, at: a.edge });
      updateLongestRoad(s);
      if (s.tb) C.TB.afterBuild(s, pid, kind, a.edge, free);
      if (free) {
        s.freeRoads--;
        const canMore = (P.pieces.road > 0 && validRoutes(s, pid, 'road').length) || (P.pieces.ship > 0 && validRoutes(s, pid, 'ship').length);
        if (s.freeRoads <= 0 || !canMore) { s.freeRoads = 0; s.phase = s.roadReturn; s.roadReturn = null; }
      }
      if (s.sf) C.SF.afterRoute(s, pid, kind, a.edge);
    } else if (a.type === 'buildSettlement') {
      if (P.pieces.settlement <= 0) return err('No te quedan poblados');
      if (!hasRes(P.resources, COST.settlement)) return err('Recursos insuficientes');
      if (!canSettle(s, pid, a.vertex)) return err('Lugar no válido');
      pay(s, pid, COST.settlement);
      s.buildings[a.vertex] = { owner: pid, type: 'settlement' };
      P.pieces.settlement--;
      log(s, P.name + ' construye un poblado.', pid);
      event(s, { type: 'build', what: 'settlement', pid, at: a.vertex });
      // bonificación de isla (Navegantes)
      if (s.sf) C.SF.afterSettlement(s, pid, a.vertex, false);
      else if (MODES[s.mode].ships) {
        const isl = s.board.vertices[a.vertex].hexes.map(h => hexOf(s, h).island).find(i => i >= 0);
        if (isl !== undefined && !s.board.homeIslands.includes(isl) && !P.islands.includes(isl)) {
          P.islands.push(isl);
          log(s, P.name + ' coloniza una nueva isla: +2 puntos.', pid);
        }
      }
      updateLongestRoad(s);
      if (s.tb) C.TB.afterBuild(s, pid, 'settlement', a.vertex);
    } else if (a.type === 'buildCity') {
      if (P.pieces.city <= 0) return err('No te quedan ciudades');
      if (!hasRes(P.resources, COST.city)) return err('Recursos insuficientes');
      const b = s.buildings[a.vertex];
      if (!b || b.owner !== pid || b.type !== 'settlement') return err('Debes mejorar uno de tus poblados');
      pay(s, pid, COST.city);
      b.type = 'city';
      P.pieces.city--;
      P.pieces.settlement++;
      log(s, P.name + ' construye una ciudad.', pid);
      event(s, { type: 'build', what: 'city', pid, at: a.vertex });
      if (isCK(s)) C.CK.afterCity(s, pid);
      if (s.tb) C.TB.afterBuild(s, pid, 'city', a.vertex);
    } else if (a.type === 'buyDev') {
      if (!s.devDeck.length) return err('No quedan cartas de desarrollo');
      if (!hasRes(P.resources, COST.dev)) return err('Recursos insuficientes');
      pay(s, pid, COST.dev);
      const card = s.devDeck.pop();
      const dc = { type: card, turn: s.turn, special };
      if (card === 'vp') { dc.variant = VP_VARIANTS[(s.vpDealt || 0) % VP_VARIANTS.length]; s.vpDealt = (s.vpDealt || 0) + 1; }
      P.devCards.push(dc);
      log(s, P.name + ' compra una carta de desarrollo.', pid);
      event(s, { type: 'dev', pid });
    }
    if (!special) checkWin(s, pid);
  }

  function doMoveShip(s, pid, a) {
    if (!movableShips(s, pid).includes(a.from)) return err('Ese barco no se puede mover');
    if (!shipTargets(s, pid, a.from).includes(a.to)) return err('Destino no válido');
    const r = s.roads[a.from];
    delete s.roads[a.from];
    s.roads[a.to] = { owner: pid, type: 'ship', turn: s.turn };
    if (r.war) s.roads[a.to].war = true;
    s.shipMoved = true;
    log(s, s.players[pid].name + ' mueve un barco.', pid);
    if (s.sf) C.SF.afterRoute(s, pid, 'ship', a.to, { moved: true });
    updateLongestRoad(s);
    checkWin(s, pid);
  }

  function playableDev(s, pid) {
    if (s.devPlayed || s.current !== pid || !['roll', 'main', 'tbMove'].includes(s.phase)) return [];
    const list = s.players[pid].devCards.filter(c => c.type !== 'vp' && c.turn !== s.turn && (s.phase !== 'tbMove' || c.type === 'swiftJourney') &&
      !(c.type === 'swiftJourney' && s.phase === 'roll')).map(c => c.type);
    return s.sf ? C.SF.filterDev(s, pid, list) : list;
  }

  function doPlayDev(s, pid, a) {
    const P = s.players[pid];
    if (s.devPlayed) return err('Ya jugaste una carta este turno');
    const idx = P.devCards.findIndex(c => c.type === a.card && c.type !== 'vp' && c.turn !== s.turn);
    if (idx < 0) return err('No puedes jugar esa carta');
    if (s.sf && !C.SF.filterDev(s, pid, [a.card]).length) return err('No tienes barcos para convertir en barcos de guerra');
    if (a.card === 'yearOfPlenty') {
      const r = a.resources || {};
      if (total(r) !== 2 || RES.some(k => (r[k] || 0) < 0)) return err('Elige 2 recursos');
      if (!hasRes(s.bank, r)) return err('El banco no tiene esos recursos');
    }
    if (a.card === 'monopoly' && !RES.includes(a.resource)) return err('Elige un recurso');
    P.devCards.splice(idx, 1);
    s.devPlayed = true;
    log(s, P.name + ' juega ' + DEV_NAME[a.card] + '.', pid);
    event(s, { type: 'playDev', card: a.card, pid });
    const ret = s.phase;
    if (a.card === 'knight' && s.sf && C.SF.knight(s, pid)) {
      P.knights++;
    } else if (a.card === 'knight') {
      P.knights++;
      updateLargestArmy(s, pid);
      s.robberReturn = ret;
      s.phase = 'robber';
    } else if (a.card === 'roadBuilding') {
      s.freeRoads = 2;
      s.roadReturn = ret;
      const canAny = (P.pieces.road > 0 && validRoutes(s, pid, 'road').length) || (P.pieces.ship > 0 && validRoutes(s, pid, 'ship').length);
      if (canAny) s.phase = 'roadBuilding'; else s.freeRoads = 0;
    } else if (a.card === 'yearOfPlenty') {
      addRes(P.resources, a.resources, 1);
      addRes(s.bank, a.resources, -1);
      log(s, P.name + ' toma ' + resText(a.resources) + '.', pid);
    } else if (a.card === 'monopoly') {
      let n = 0;
      s.players.forEach(o => {
        if (o.id === pid) return;
        n += o.resources[a.resource];
        P.resources[a.resource] += o.resources[a.resource];
        o.resources[a.resource] = 0;
      });
      log(s, P.name + ' monopoliza ' + RES_NAME[a.resource] + ' y recibe ' + n + '.', pid);
    }
    checkWin(s, pid);
  }

  function doBankTrade(s, pid, a) {
    const P = s.players[pid];
    const ratios = tradeRatios(s, pid);
    const keys = isCK(s) ? KEYS : RES;
    if (!keys.includes(a.give) || !keys.includes(a.get) || a.give === a.get) return err('Comercio inválido');
    const n = Math.max(1, a.count | 0);
    const cost = ratios[a.give] * n;
    if ((P.resources[a.give] || 0) < cost) return err('No tienes suficientes cartas');
    if (s.bank[a.get] < n) return err('El banco no tiene ese recurso');
    P.resources[a.give] -= cost; s.bank[a.give] += cost;
    P.resources[a.get] = (P.resources[a.get] || 0) + n; s.bank[a.get] -= n;
    log(s, P.name + ' cambia ' + cost + ' ' + RES_NAME[a.give] + ' por ' + n + ' ' + RES_NAME[a.get] + ' con el banco.', pid);
  }

  // En Piratas y Exploradores el oro se comercia entre jugadores como una carta más
  const tradeKeys = s => isPE(s) ? KEYS.concat('gold') : KEYS;
  const tradeHand = (s, pid) => isPE(s) ? Object.assign({}, s.players[pid].resources, { gold: s.players[pid].gold }) : s.players[pid].resources;
  const hasTrade = (s, pid, need) => tradeKeys(s).every(k => (tradeHand(s, pid)[k] || 0) >= (need[k] || 0));
  const tradeTotal = (s, r) => tradeKeys(s).reduce((a, k) => a + (r[k] || 0), 0);
  function moveTrade(s, from, to, r) {
    addRes(s.players[from].resources, r, -1); addRes(s.players[to].resources, r, 1);
    if (r.gold) { s.players[from].gold -= r.gold; s.players[to].gold += r.gold; }
  }

  function doOfferTrade(s, pid, a) {
    const keys = tradeKeys(s);
    const give = Object.assign(emptyRes(), a.give), get = Object.assign(emptyRes(), a.get);
    if (Object.keys(give).concat(Object.keys(get)).some(k => !keys.includes(k) && ((give[k] || 0) || (get[k] || 0)))) return err('Oferta inválida');
    if (keys.some(k => (give[k] || 0) < 0 || (get[k] || 0) < 0) || !tradeTotal(s, give) || !tradeTotal(s, get)) return err('Oferta inválida');
    if (keys.some(k => give[k] && get[k])) return err('No puedes dar y pedir lo mismo');
    if (!hasTrade(s, pid, give)) return err('No tienes esas cartas');
    s.trade = { id: ++s.tradeSeq, from: pid, give, get, responses: {}, to: a.to === undefined ? null : a.to };
    log(s, s.players[pid].name + ' ofrece ' + resText(give) + ' por ' + resText(get) + '.', pid);
  }

  function doRespondTrade(s, pid, a) {
    const t = s.trade;
    if (!t || pid === t.from || s.phase !== 'main' || s.players[pid].neutral) return err('No hay oferta');
    if (t.to !== null && t.to !== pid) return err('La oferta no es para ti');
    if (a.id !== undefined && a.id !== t.id) return err('Oferta expirada');
    if (a.accept && !hasTrade(s, pid, t.get)) return err('No tienes esas cartas');
    t.responses[pid] = a.accept ? 'accept' : 'reject';
  }

  function doConfirmTrade(s, pid, a) {
    const t = s.trade;
    if (!t || t.from !== pid) return err('No hay oferta');
    const o = a.with;
    if (t.responses[o] !== 'accept') return err('Ese jugador no aceptó');
    const A = s.players[pid], B = s.players[o];
    if (!hasTrade(s, pid, t.give) || !hasTrade(s, o, t.get)) { s.trade = null; return err('Ya no tienen las cartas'); }
    moveTrade(s, pid, o, t.give);
    moveTrade(s, o, pid, t.get);
    log(s, A.name + ' comercia con ' + B.name + ': ' + resText(t.give) + ' por ' + resText(t.get) + '.', pid);
    event(s, { type: 'trade', a: pid, b: o });
    s.trade = null;
  }

  function doEndTurn(s, pid) {
    if (isCK(s)) { const e = C.CK.canEndTurn(s, pid); if (e) return err(e); }
    if (s.tb) { const r = C.TB.endTurn(s, pid); if (r) return r === true ? undefined : r; }
    s.trade = null;
    if (s.pairs && !isPE(s) && !s.tb) {
      if (!s.pair) { startPair(s); return; }
      s.current = s.pair.p1;
      s.pair = null;
    }
    if (s.specialBuild) {
      const q = [];
      for (let i = 1; i < s.players.length; i++) q.push((pid + i) % s.players.length);
      s.specialQueue = q;
      s.phase = 'specialBuild';
      s.specialBuilder = q.shift();
      return;
    }
    nextTurn(s);
  }

  // Jugadores en pareja: tras el jugador 1 juega el jugador 2 (el tercero a su izquierda), que solo comercia con el banco
  function startPair(s) {
    const p1 = s.current;
    const p2 = (p1 + 3) % s.players.length;
    s.pair = { p1, p2 };
    s.current = p2;
    s.phase = 'main';
    s.devPlayed = false;
    s.shipMoved = false;
    s.trade = null;
    if (isCK(s)) C.CK.onTurnStart(s);
    log(s, s.players[p2].name + ' juega como jugador 2 (solo comercia con el banco).', p2);
    event(s, { type: 'pair', p1, p2 });
    checkWin(s, p2);
  }

  function advanceSpecial(s) {
    if (s.specialQueue.length) { s.specialBuilder = s.specialQueue.shift(); return; }
    s.specialBuilder = null;
    nextTurn(s);
  }

  // Vista para un jugador: oculta cartas de los demás
  function viewFor(s, pid) {
    const v = JSON.parse(JSON.stringify(s));
    v.devDeck = s.devDeck.length;
    v.players.forEach(p => {
      p.vp = publicVP(s, p.id);
      p.resCount = total(p.resources);
      p.devCount = p.devCards.length;
      if (p.id !== pid) {
        p.resources = null;
        p.devCards = null;
      } else {
        p.vpTotal = totalVP(s, p.id);
      }
    });
    if (s.phase === 'ended') v.players.forEach(p => { p.vpTotal = totalVP(s, p.id); });
    if (isCK(s)) C.CK.redact(s, v, pid);
    if (isPE(s)) C.PE.redact(s, v, pid);
    if (s.tb) C.TB.redact(s, v, pid);
    if (s.sf) C.SF.redact(s, v, pid);
    v.me = pid;
    return v;
  }

  C._R = { log, event, err, pay, addRes, updateLongestRoad, checkWin, nextTurn, startGold, doBuild, advanceSpecial, ownsAt, oppAt, hexOf, distanceOk,
    produce, doRoll: null, doRobber, doDiscard, edgeConnected, doEndTurn };

  Object.assign(C, {
    COMM, KEYS, EXPANSIONS, resolveMode, isCK, isPE,
    COST, MODES, PIECES, RES_NAME, DEV_NAME, emptyRes, total, hasRes, resText,
    createGame, apply, viewFor, actor,
    canSettle, canPlaceRoute, validSettlements, validRoutes, validCities, movableShips, shipTargets,
    tradeRatios, robberHexes, stealCandidates, publicVP, totalVP, playableDev, longestRouteFor
  });
})(typeof window !== 'undefined' ? window : globalThis);
