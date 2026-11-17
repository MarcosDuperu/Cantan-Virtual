// Inteligencia artificial para los jugadores de la máquina.
(function (root) {
  const C = root.Catan || (root.Catan = {});
  const { RES, TERRAIN_RES, PIPS, COST, total, hasRes } = C;

  const NOISE = { easy: 4, normal: 1.2, hard: 0.2 };

  function noise(p) { return (Math.random() - 0.5) * (NOISE[p.difficulty] || 1); }

  function production(s, pid) {
    const prod = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0, gold: 0 };
    for (const [v, b] of Object.entries(s.buildings)) {
      if (b.owner !== pid) continue;
      for (const h of s.board.vertices[v].hexes) {
        const hx = s.board.hexes[h];
        if (!hx.number) continue;
        const k = TERRAIN_RES[hx.terrain] || (hx.terrain === 'gold' ? 'gold' : null);
        if (k) prod[k] += PIPS[hx.number] * (b.type === 'city' ? 2 : 1);
      }
    }
    return prod;
  }

  function vertexValue(s, pid, v, prod) {
    const vx = s.board.vertices[v];
    let val = 0;
    const seen = new Set();
    for (const h of vx.hexes) {
      const hx = s.board.hexes[h];
      if (!hx.number) continue;
      const p = PIPS[hx.number] * (h === s.robber ? 0.4 : 1);
      if (hx.terrain === 'gold') { val += p * 1.3; continue; }
      const k = TERRAIN_RES[hx.terrain];
      if (!k) continue;
      val += p;
      if (!seen.has(k)) { seen.add(k); if (prod && prod[k] === 0) val += 2; }
      if (k === 'brick' || k === 'wood') val += p * 0.15;
    }
    if (vx.port) {
      if (vx.port === 'any') val += 1.5;
      else if (prod && prod[vx.port] >= 5) val += 2.5;
      else val += 0.5;
    }
    if (C.MODES[s.mode].ships) {
      const isl = vx.hexes.map(h => s.board.hexes[h].island).find(i => i >= 0);
      if (isl !== undefined && !s.board.homeIslands.includes(isl) && !s.players[pid].islands.includes(isl)) val += 9;
    }
    return val;
  }

  function freeSpot(s, v) {
    const vx = s.board.vertices[v];
    return vx.land && !s.buildings[v] && vx.adj.every(a => !s.buildings[a]);
  }

  // Valor de expandir la red por la arista e: el mejor cruce libre cercano a su extremo lejano
  function edgeScore(s, pid, e, prod, ship) {
    const P = s.players[pid];
    const ed = s.board.edges[e];
    const far = ed.v.find(v => !s.buildings[v] || s.buildings[v].owner !== pid);
    if (far === undefined) return null;
    const seen = new Map([[far, 0]]);
    const q = [far];
    let score = 0;
    while (q.length) {
      const v = q.shift();
      const d = seen.get(v);
      if (freeSpot(s, v)) score = Math.max(score, vertexValue(s, pid, v, prod) / (1 + d * 0.9));
      if (d >= 3 || (s.buildings[v] && s.buildings[v].owner !== pid)) continue;
      for (const x of s.board.vertices[v].edges) {
        if (s.roads[x]) continue;
        const E = s.board.edges[x];
        if (!(E.land || (E.sea && (ship || P.pieces.ship > 0)))) continue;
        const o = E.v[0] === v ? E.v[1] : E.v[0];
        if (!seen.has(o)) { seen.set(o, d + 1); q.push(o); }
      }
    }
    return score;
  }

  // Navegantes: mover el barco del extremo de una línea si en otro lugar acerca más a un buen poblado
  function shipMove(s, pid, prod) {
    const ms = C.movableShips(s, pid);
    let best = null;
    for (const from of ms) {
      const saved = s.roads[from];
      delete s.roads[from];
      const cur = edgeScore(s, pid, from, prod, true) || 0;
      C.validRoutes(s, pid, 'ship').forEach(to => {
        if (to === from) return;
        const sc = edgeScore(s, pid, to, prod, true);
        if (sc !== null && sc > cur + 2 && (!best || sc - cur > best.gain)) best = { from, to, gain: sc - cur };
      });
      s.roads[from] = saved;
    }
    return best ? { type: 'moveShip', from: best.from, to: best.to } : null;
  }

  // Mejor primera arista para expandir la red hacia un buen lugar
  function routeTarget(s, pid, prod) {
    const P = s.players[pid];
    const cands = [];
    if (P.pieces.road > 0) C.validRoutes(s, pid, 'road').forEach(e => cands.push({ e, kind: 'road' }));
    if (P.pieces.ship > 0) C.validRoutes(s, pid, 'ship').forEach(e => cands.push({ e, kind: 'ship' }));
    let best = null;
    for (const c of cands) {
      let score = edgeScore(s, pid, c.e, prod, c.kind === 'ship');
      if (score === null) continue;
      score += noise(P);
      if (c.kind === 'ship') score -= 0.3;
      if (!best || score > best.score) best = Object.assign({ score }, c);
    }
    return best;
  }

  function missing(have, cost) {
    const m = {};
    let n = 0;
    RES.forEach(k => { const d = (cost[k] || 0) - (have[k] || 0); if (d > 0) { m[k] = d; n += d; } });
    return { m, n };
  }

  function bestSettlementSpot(s, pid, prod) {
    const spots = C.validSettlements(s, pid, false);
    let best = null;
    for (const v of spots) {
      const val = vertexValue(s, pid, v, prod) + noise(s.players[pid]);
      if (!best || val > best.val) best = { v, val };
    }
    return best;
  }

  function bestCity(s, pid) {
    const c = C.validCities(s, pid);
    let best = null;
    for (const v of c) {
      const val = vertexValue(s, pid, v, null);
      if (!best || val > best.val) best = { v, val };
    }
    return best;
  }

  // Objetivo de construcción actual
  function goal(s, pid, prod) {
    const P = s.players[pid];
    const spot = P.pieces.settlement > 0 ? bestSettlementSpot(s, pid, prod) : null;
    const city = P.pieces.city > 0 ? bestCity(s, pid) : null;
    if (spot && city) {
      return (prod.ore + prod.wheat > prod.wood + prod.brick + 2) ? { what: 'city', at: city.v } : { what: 'settlement', at: spot.v };
    }
    if (spot) return { what: 'settlement', at: spot.v };
    if (city && (P.resources.ore >= 1 || prod.ore > 0)) return { what: 'city', at: city.v };
    if (P.pieces.settlement > 0 && (P.pieces.road > 0 || P.pieces.ship > 0)) {
      const rt = routeTarget(s, pid, prod);
      if (rt && rt.score > 1.5) return { what: rt.kind, at: rt.e };
    }
    if (city) return { what: 'city', at: city.v };
    if (s.devDeck.length) return { what: 'dev' };
    return null;
  }

  const ACTION_FOR = { road: 'buildRoad', ship: 'buildShip', settlement: 'buildSettlement', city: 'buildCity', dev: 'buyDev' };
  function actionFor(g) {
    const a = { type: ACTION_FOR[g.what] };
    if (g.what === 'road' || g.what === 'ship') a.edge = g.at;
    if (g.what === 'settlement' || g.what === 'city') a.vertex = g.at;
    return a;
  }

  function bankTradeFor(s, pid, cost) {
    const P = s.players[pid];
    const { m } = missing(P.resources, cost);
    const want = Object.keys(m);
    if (!want.length) return null;
    const ratios = C.tradeRatios(s, pid);
    // ¿podemos cubrir todo lo que falta?
    const hand = Object.assign({}, P.resources);
    const trades = [];
    for (const k of want) {
      for (let i = 0; i < m[k]; i++) {
        const give = RES.filter(g => g !== k && hand[g] - (cost[g] || 0) >= ratios[g])
          .sort((a, b) => (hand[b] - (cost[b] || 0)) / ratios[b] - (hand[a] - (cost[a] || 0)) / ratios[a])[0];
        if (!give || s.bank[k] < 1) return null;
        hand[give] -= ratios[give];
        hand[k] += 1;
        trades.push({ type: 'bankTrade', give, get: k, count: 1 });
      }
    }
    return trades[0] || null;
  }

  function robberChoice(s, pid) {
    const hexes = C.robberHexes(s, pid);
    let best = null;
    const leaderVP = Math.max(...s.players.map(p => p.id === pid ? 0 : C.publicVP(s, p.id)));
    for (const h of hexes) {
      const hx = s.board.hexes[h];
      let score = 0;
      if (hx.terrain === 'sea') {
        score = C.stealCandidates(s, pid, h).length * 1.5 - 1;
      } else {
        const pips = hx.number ? PIPS[hx.number] : 0;
        for (const v of hx.vertices) {
          const b = s.buildings[v];
          if (!b) continue;
          const mult = b.type === 'city' ? 2 : 1;
          if (b.owner === pid) score -= 10 * mult;
          else {
            const vp = C.publicVP(s, b.owner);
            score += mult * pips * (1 + vp / 4) + (vp === leaderVP ? 2 : 0) + (total(s.players[b.owner].resources) > 0 ? 1 : 0);
          }
        }
      }
      score += noise(s.players[pid]);
      if (!best || score > best.score) best = { h, score };
    }
    if (!best) return null;
    const cands = C.stealCandidates(s, pid, best.h);
    cands.sort((a, b) => (C.publicVP(s, b) * 3 + total(s.players[b].resources)) - (C.publicVP(s, a) * 3 + total(s.players[a].resources)));
    return { type: 'moveRobber', hex: best.h, victim: cands.length ? cands[0] : null };
  }

  function discardChoice(s, pid) {
    const P = s.players[pid];
    const need = s.pendingDiscard[pid];
    const prod = production(s, pid);
    const g = goal(s, pid, prod);
    const keep = g ? (COST[g.what] || {}) : {};
    const hand = Object.assign({}, P.resources);
    const out = C.emptyRes();
    for (let i = 0; i < need; i++) {
      const k = RES.filter(r => hand[r] > 0).sort((a, b) => (hand[b] - (keep[b] || 0) * 1.5) - (hand[a] - (keep[a] || 0) * 1.5))[0];
      hand[k]--; out[k]++;
    }
    return { type: 'discard', resources: out };
  }

  function goldChoice(s, pid) {
    const need = s.pendingGold[pid];
    const P = s.players[pid];
    const prod = production(s, pid);
    const g = goal(s, pid, prod);
    const hand = Object.assign({}, P.resources);
    const out = C.emptyRes();
    const bank = Object.assign({}, s.bank);
    for (let i = 0; i < need; i++) {
      let k = null;
      if (g && COST[g.what]) {
        const { m } = missing(hand, COST[g.what]);
        k = Object.keys(m).find(r => bank[r] > 0) || null;
      }
      if (!k) k = RES.filter(r => bank[r] > 0).sort((a, b) => prod[a] - prod[b])[0];
      out[k]++; hand[k]++; bank[k]--;
    }
    return { type: 'chooseGold', resources: out };
  }

  function respondTrade(s, pid) {
    const t = s.trade;
    const P = s.players[pid];
    if (!hasRes(P.resources, t.get)) return { type: 'respondTrade', id: t.id, accept: false };
    if (C.publicVP(s, t.from) >= s.vpTarget - 2) return { type: 'respondTrade', id: t.id, accept: false };
    const prod = production(s, pid);
    const g = goal(s, pid, prod);
    const cost = g && COST[g.what] ? COST[g.what] : {};
    const before = missing(P.resources, cost).n;
    const after = Object.assign({}, P.resources);
    RES.forEach(k => { after[k] += (t.give[k] || 0) - (t.get[k] || 0); });
    const aft = missing(after, cost).n;
    const gain = total(t.give) - total(t.get);
    const accept = aft < before || (aft === before && gain > 0) || (aft === before && gain === 0 && Math.random() < 0.15);
    return { type: 'respondTrade', id: t.id, accept };
  }

  function chooseDev(s, pid, prod) {
    const cards = C.playableDev(s, pid);
    if (!cards.length) return null;
    const P = s.players[pid];
    const robberHex = s.robber !== null && s.robber !== undefined ? s.board.hexes[s.robber] : null;
    const blocked = robberHex && robberHex.vertices.some(v => s.buildings[v] && s.buildings[v].owner === pid) && robberHex.number;
    if (cards.includes('knight')) {
      const cur = s.largestArmy;
      const wouldTake = P.knights + 1 >= 3 && (cur === null || (cur !== pid && P.knights + 1 > s.players[cur].knights));
      if (blocked || wouldTake || (s.phase === 'main' && Math.random() < 0.25)) return { type: 'playDev', card: 'knight' };
    }
    if (s.phase !== 'main') return null;
    if (cards.includes('monopoly')) {
      let best = null;
      RES.forEach(k => {
        const n = s.players.reduce((a, o) => a + (o.id === pid ? 0 : o.resources[k]), 0);
        if (!best || n > best.n) best = { k, n };
      });
      if (best && best.n >= 4) return { type: 'playDev', card: 'monopoly', resource: best.k };
    }
    const g = goal(s, pid, prod);
    if (cards.includes('yearOfPlenty') && g && COST[g.what]) {
      const { m, n } = missing(P.resources, COST[g.what]);
      if (n > 0 && n <= 2) {
        const r = C.emptyRes();
        Object.entries(m).forEach(([k, c]) => { r[k] += c; });
        if (n === 1) { const extra = RES.slice().sort((a, b) => prod[a] - prod[b])[0]; r[extra]++; }
        if (hasRes(s.bank, r)) return { type: 'playDev', card: 'yearOfPlenty', resources: r };
      }
    }
    if (cards.includes('roadBuilding') && P.pieces.road + P.pieces.ship >= 2) {
      const rt = routeTarget(s, pid, prod);
      if (rt && rt.score > 2) return { type: 'playDev', card: 'roadBuilding' };
    }
    return null;
  }

  // ================= Ciudades y Caballeros =================
  const KEYS = () => C.KEYS;
  function ckPickMost(hand, n, preferComm) {
    const h = Object.assign({}, hand);
    const out = {};
    for (let i = 0; i < n; i++) {
      const k = KEYS().filter(x => (h[x] || 0) > 0).sort((a, b) => {
        const wa = (h[a] || 0) + (preferComm && C.COMM.includes(a) ? 10 : 0);
        const wb = (h[b] || 0) + (preferComm && C.COMM.includes(b) ? 10 : 0);
        return wb - wa;
      })[0];
      if (!k) break;
      h[k]--; out[k] = (out[k] || 0) + 1;
    }
    return out;
  }
  const LOW_PROGRESS = ['inventor', 'alchemist', 'diplomat', 'intrigue', 'merchantFleet', 'commercialHarbor', 'deserter'];
  function worstProgress(P) {
    const i = P.progress.findIndex(c => LOW_PROGRESS.includes(c.type));
    return i >= 0 ? i : 0;
  }
  function ckDanger(s, pid) {
    const CK = C.CK;
    if (s.ck.barbarian < 4) return false;
    const exposed = s.players.filter(p => CK.citiesOf(s, p.id).some(v => !s.buildings[v].metro)).map(p => p.id);
    if (!exposed.includes(pid)) return false;
    const def = CK.defense(s), str = CK.barbarianStrength(s);
    const mine = CK.activeStrength(s, pid);
    if (def >= str + 1) return mine === 0 && s.ck.barbarian >= 5;
    const others = exposed.filter(p => p !== pid).map(p => CK.activeStrength(s, p));
    return !others.length || mine <= Math.min(...others);
  }
  function ckKnightSpot(s, pid, spots) {
    let best = spots[0], bv = -1;
    spots.forEach(v => {
      const vx = s.board.vertices[v];
      let val = vx.hexes.includes(s.robber) ? 3 : 0;
      vx.adj.forEach(a => { const b = s.buildings[a]; if (b && b.owner === pid) val += b.type === 'city' ? 2 : 1; });
      val += freeSpot(s, v) ? 0 : 0.5;
      if (val > bv) { bv = val; best = v; }
    });
    return best;
  }
  function ckChooseProgress(s, pid, mem, prod) {
    const CK = C.CK, P = s.players[pid];
    if (mem.progTried === undefined || mem.progTurn !== s.turn) { mem.progTurn = s.turn; mem.progTried = {}; }
    const myVP = C.publicVP(s, pid);
    const opp = s.players.filter(o => o.id !== pid);
    for (const c of P.progress) {
      const t = c.type;
      if (mem.progTried[t]) continue;
      let a = null;
      switch (t) {
        case 'irrigation': if (CK.adjacentHexes(s, pid, 'fields').length) a = {}; break;
        case 'mining': if (CK.adjacentHexes(s, pid, 'mountains').length) a = {}; break;
        case 'resourceMonopoly': {
          const best = RES.map(k => [k, opp.reduce((x, o) => x + Math.min(2, o.resources[k]), 0)]).sort((x, y) => y[1] - x[1])[0];
          if (best[1] >= 2) a = { resource: best[0] };
          break;
        }
        case 'tradeMonopoly': {
          const best = C.COMM.map(k => [k, opp.reduce((x, o) => x + Math.min(1, o.resources[k]), 0)]).sort((x, y) => y[1] - x[1])[0];
          if (best[1] >= 1) a = { resource: best[0] };
          break;
        }
        case 'warlord': {
          const inact = Object.values(s.knights).filter(k => k.owner === pid && !k.active).length;
          if (inact >= 2 || (inact >= 1 && s.ck.barbarian >= 4)) a = {};
          break;
        }
        case 'crane':
          if (CK.citiesOf(s, pid).length && CK.AREAS.some(ar => P.improve[ar] < 5 && P.resources[CK.AREA_COMM[ar]] >= P.improve[ar])) a = {};
          break;
        case 'engineer': {
          const c2 = CK.citiesOf(s, pid).find(v => !s.buildings[v].wall);
          if (c2 !== undefined && P.walls < 3) a = { vertex: c2 };
          break;
        }
        case 'medicine': {
          const st = C.validCities(s, pid)[0];
          if (st !== undefined && P.pieces.city > 0 && hasRes(P.resources, { ore: 2, wheat: 1 })) a = { vertex: st };
          break;
        }
        case 'roadBuilding': {
          const rt = routeTarget(s, pid, prod);
          if (rt && rt.kind === 'road' && rt.score > 1.5) a = {};
          break;
        }
        case 'smith': {
          const ks = Object.keys(s.knights).map(Number).filter(v => CK.promotable(s, pid, v)).slice(0, 2);
          if (ks.length) a = { vertices: ks };
          break;
        }
        case 'bishop':
          if (s.ck.attacks) { const rc = robberChoice(s, pid); if (rc) a = { hex: rc.hex }; }
          break;
        case 'saboteur':
          if (opp.some(o => C.publicVP(s, o.id) >= myVP && total(o.resources) >= 4)) a = {};
          break;
        case 'wedding':
          if (opp.some(o => C.publicVP(s, o.id) > myVP && total(o.resources) > 0)) a = {};
          break;
        case 'spy': {
          const T = opp.filter(o => o.progress.length).sort((x, y) => y.progress.length - x.progress.length)[0];
          if (T) a = { target: T.id };
          break;
        }
        case 'masterMerchant': {
          const T = opp.filter(o => C.publicVP(s, o.id) > myVP && total(o.resources) >= 2).sort((x, y) => total(y.resources) - total(x.resources))[0];
          if (T) a = { target: T.id };
          break;
        }
        case 'merchant': {
          if (s.ck.merchant && s.ck.merchant.owner === pid) break;
          const hs = CK.merchantHexes(s, pid).filter(h => s.board.hexes[h].number);
          hs.sort((x, y) => PIPS[s.board.hexes[y].number] - PIPS[s.board.hexes[x].number]);
          if (hs.length) a = { hex: hs[0] };
          break;
        }
        case 'commercialHarbor':
          if (opp.filter(o => C.COMM.some(k => o.resources[k] > 0)).length >= 2 && RES.reduce((x, k) => x + P.resources[k], 0) >= 3) a = {};
          break;
        case 'deserter': {
          const T = opp.filter(o => Object.values(s.knights).some(k => k.owner === o.id)).sort((x, y) => CK.totalStrength(s, y.id) - CK.totalStrength(s, x.id))[0];
          if (T) a = { target: T.id };
          break;
        }
        case 'intrigue': {
          const v = Object.keys(s.knights).map(Number).find(x => s.knights[x].owner !== pid && s.board.vertices[x].edges.some(e => s.roads[e] && s.roads[e].owner === pid));
          if (v !== undefined) a = { vertex: v };
          break;
        }
        case 'merchantFleet': {
          const k = KEYS().find(x => (P.resources[x] || 0) >= 4);
          if (k) a = { resource: k };
          break;
        }
      }
      if (a) { mem.progTried[t] = true; return Object.assign({ type: 'playProgress', card: t }, a); }
    }
    return null;
  }

  function ckBuildStep(s, pid, mem, special) {
    const CK = C.CK, P = s.players[pid];
    const prod = production(s, pid);
    // defensa contra los bárbaros
    if (ckDanger(s, pid)) {
      const inact = Object.keys(s.knights).map(Number).find(v => s.knights[v].owner === pid && !s.knights[v].active);
      if (inact !== undefined && hasRes(P.resources, CK.ACTIVATE_COST)) return { type: 'activateKnight', vertex: inact };
      const spots = CK.knightSpots(s, pid);
      if (P.knightPieces[1] > 0 && spots.length && hasRes(P.resources, CK.KNIGHT_COST)) return { type: 'buildKnight', vertex: ckKnightSpot(s, pid, spots) };
      if (!special) {
        const need = inact !== undefined ? CK.ACTIVATE_COST : CK.KNIGHT_COST;
        const bt = bankTradeFor(s, pid, need);
        if (bt) return bt;
      }
    }
    // mejoras de ciudad
    if (CK.citiesOf(s, pid).length) {
      const crane = s.ck.crane === pid && !special;
      const areas = CK.AREAS.filter(ar => P.improve[ar] < 5).sort((x, y) => (P.resources[CK.AREA_COMM[y]] - P.improve[y]) - (P.resources[CK.AREA_COMM[x]] - P.improve[x]));
      for (const ar of areas) if (P.resources[CK.AREA_COMM[ar]] >= P.improve[ar] + 1 - (crane ? 1 : 0)) return { type: 'improve', area: ar };
    }
    // objetivo de construcción normal (ciudad, poblado, carretera)
    const g = goal(s, pid, prod);
    if (g && C.COST[g.what] && g.what !== 'dev') {
      if (hasRes(P.resources, C.COST[g.what])) return actionFor(g);
      if (!special) { const bt = bankTradeFor(s, pid, C.COST[g.what]); if (bt) return bt; }
    }
    // caballeros
    const myK = Object.values(s.knights).filter(k => k.owner === pid);
    const spots = CK.knightSpots(s, pid);
    if (P.knightPieces[1] > 0 && spots.length && myK.length < CK.citiesOf(s, pid).length + 1 && hasRes(P.resources, CK.KNIGHT_COST) &&
      (P.resources.ore >= 2 || P.resources.sheep >= 2 || total(P.resources) > 6)) return { type: 'buildKnight', vertex: ckKnightSpot(s, pid, spots) };
    const inact = myK.length ? Object.keys(s.knights).map(Number).find(v => s.knights[v].owner === pid && !s.knights[v].active) : undefined;
    if (inact !== undefined && P.resources.wheat >= 2 && s.ck.barbarian >= 3) return { type: 'activateKnight', vertex: inact };
    const prom = Object.keys(s.knights).map(Number).find(v => CK.promotable(s, pid, v));
    if (prom !== undefined && P.resources.sheep >= 2 && P.resources.ore >= 2 && hasRes(P.resources, CK.KNIGHT_COST)) return { type: 'promoteKnight', vertex: prom };
    // murallas si tenemos muchas cartas
    const wallCity = CK.citiesOf(s, pid).find(v => !s.buildings[v].wall);
    if (wallCity !== undefined && P.walls < 3 && P.resources.brick >= 2 && total(P.resources) >= CK.handLimit(s, pid) - 1) return { type: 'buildWall', vertex: wallCity };
    return null;
  }

  function ckMain(s, pid, mem) {
    const CK = C.CK, P = s.players[pid];
    const prod = production(s, pid);
    if (mem.ckTurn !== s.turn) { mem.ckTurn = s.turn; mem.ckActions = 0; mem.dumps = 0; }
    if (++mem.ckActions > 45) return P.progress.length > 4 ? { type: 'discardProgress', index: worstProgress(P) } : { type: 'endTurn' };
    const pc = ckChooseProgress(s, pid, mem, prod);
    if (pc) return pc;
    // ahuyentar al ladrón de nuestros terrenos
    if (s.ck.attacks) {
      const rh = s.board.hexes[s.robber];
      if (rh.number && rh.vertices.some(v => s.buildings[v] && s.buildings[v].owner === pid)) {
        const kv = Object.keys(s.knights).map(Number).find(v => CK.canChase(s, pid, v));
        if (kv !== undefined) return { type: 'chaseRobber', vertex: kv };
      }
    }
    const b = ckBuildStep(s, pid, mem, false);
    if (b) return b;
    // demasiadas cartas: cambiar hacia mercancías de la mejora más cercana
    if (total(P.resources) > CK.handLimit(s, pid) && (mem.dumps || 0) < 3) {
      const ratios = C.tradeRatios(s, pid);
      const give = KEYS().filter(k => (P.resources[k] || 0) >= ratios[k]).sort((x, y) => (P.resources[y] - ratios[y]) - (P.resources[x] - ratios[x]))[0];
      const ar = CK.AREAS.filter(a2 => P.improve[a2] < 5).sort((x, y) => P.improve[x] - P.improve[y])[0];
      const get = ar ? CK.AREA_COMM[ar] : 'ore';
      if (give && give !== get && s.bank[get] > 0) { mem.dumps = (mem.dumps || 0) + 1; return { type: 'bankTrade', give, get, count: 1 }; }
    }
    if (P.progress.length > 4) return { type: 'discardProgress', index: worstProgress(P) };
    return { type: 'endTurn' };
  }

  function ckDecide(s, pid, mem) {
    const P = s.players[pid];
    if (s.ck.pendingProgressDiscard[pid]) return { type: 'discardProgress', index: worstProgress(P) };
    if (s.phase === 'discard') return s.pendingDiscard[pid] ? { type: 'discard', resources: ckPickMost(P.resources, s.pendingDiscard[pid], false) } : null;
    if (s.phase === 'give') return s.pendingGive[pid] ? { type: 'give', resources: ckPickMost(P.resources, s.pendingGive[pid], false) } : null;
    if (s.phase === 'peek') {
      if (s.current !== pid) return null;
      const pk = s.ck.peek;
      if (pk.kind === 'spy') return { type: 'peekTake', index: 0 };
      const T = s.players[pk.target];
      return { type: 'peekTake', resources: ckPickMost(T.resources, Math.min(2, total(T.resources)), true) };
    }
    if (s.phase === 'placeKnight') {
      if (s.current !== pid) return null;
      const sp = C.CK.knightSpots(s, pid);
      return sp.length ? { type: 'placeFreeKnight', vertex: ckKnightSpot(s, pid, sp) } : { type: 'skipFreeKnight' };
    }
    if (s.phase === 'roll') return s.current === pid ? { type: 'roll' } : null;
    if (s.phase === 'specialBuild') {
      if (s.specialBuilder !== pid) return null;
      if (mem.spTurn !== s.turn) { mem.spTurn = s.turn; mem.spActions = 0; }
      if (++mem.spActions > 10) return { type: 'endTurn' };
      return ckBuildStep(s, pid, mem, true) || { type: 'endTurn' };
    }
    if (s.phase === 'main' && s.current === pid && !s.trade) return ckMain(s, pid, mem);
    return undefined;
  }

  // ================= Piratas y Exploradores =================
  function peBest(list, val) {
    let best, bv = -Infinity;
    list.forEach(x => { const v = val(x); if (v > bv) { bv = v; best = x; } });
    return best;
  }
  function peInPlay(s, pid, item) {
    const PE = C.PE;
    return Object.values(s.pe.ships).filter(x => x.owner === pid).reduce((a, x) => a + x.cargo.filter(c => c === item).length, 0) +
      PE.ownHarbors(s, pid).reduce((a, v) => a + (s.pe.docks[v] || []).filter(c => c === item).length, 0);
  }
  // Esquinas de tierra donde un barco colono podría fundar un buen poblado
  function peFoundSpots(s, pid) {
    const PE = C.PE;
    return s.board.vertices.filter(v => PE.coastal(s, v.id) && PE.settleOk(s, v.id) && PE.spiceOk(s, pid, v.id) && vertexValue(s, pid, v.id, null) >= 3).map(v => v.id);
  }
  function peCrewUseful(s, pid) {
    const sc = C.PE.SCENARIOS[s.pe.scenario];
    const lair = sc.lairs && s.board.hexes.some(h => h.lair && !h.hidden && h.lair.crews.length < 3);
    const spice = sc.spice && s.board.hexes.some(h => h.terrain === 'spice' && !h.hidden && h.spice.left > 0 && !h.spice.crews.includes(pid));
    return lair || spice;
  }
  function peGoal(s, pid, prod) {
    const PE = C.PE, P = s.players[pid];
    if (P.pieces.harbor > 0) {
      const hs = PE.harborSpots(s, pid);
      if (hs.length) return { what: 'harbor', cost: PE.COST.harbor, at: peBest(hs, v => vertexValue(s, pid, v, prod)) };
    }
    if (P.pieces.settlement > 0) {
      const sp = PE.settleSpots(s, pid);
      if (sp.length) return { what: 'settlement', cost: PE.COST.settlement, at: peBest(sp, v => vertexValue(s, pid, v, prod) + noise(P)) };
    }
    const myShips = Object.values(s.pe.ships).filter(x => x.owner === pid);
    const shipEdges = P.pieces.ship > 0 ? PE.shipBuildEdges(s, pid) : [];
    if (!myShips.length && shipEdges.length) return { what: 'ship', cost: PE.COST.ship, at: shipEdges[0] };
    const target = item => { const t = PE.cargoTargets(s, pid, item); return t.ships.length || t.docks.length ? t : null; };
    const hiddenLeft = s.board.hexes.some(h => h.hidden);
    if (P.pieces.settler > 0 && P.pieces.settlement > peInPlay(s, pid, 'settler') && peInPlay(s, pid, 'settler') === 0 &&
      (hiddenLeft || peFoundSpots(s, pid).length) && target('settler')) return { what: 'settler', cost: PE.COST.settler };
    if (P.pieces.crew > 0 && peCrewUseful(s, pid) && peInPlay(s, pid, 'crew') < 2 && target('crew')) return { what: 'crew', cost: PE.COST.crew };
    if (myShips.length < 2 && shipEdges.length) return { what: 'ship', cost: PE.COST.ship, at: shipEdges[0] };
    if (P.pieces.settlement > 0 && P.pieces.road > 0) {
      const rt = routeTarget(s, pid, prod);
      if (rt && rt.kind === 'road' && rt.score > 1.5) return { what: 'road', cost: PE.COST.road, at: rt.e };
    }
    return null;
  }
  function peBuildAction(s, pid, g) {
    const PE = C.PE;
    if (g.what === 'harbor') return { type: 'buildHarbor', vertex: g.at };
    if (g.what === 'settlement') return { type: 'buildSettlement', vertex: g.at };
    if (g.what === 'ship') return { type: 'buildShip', edge: g.at };
    if (g.what === 'road') return { type: 'buildRoad', edge: g.at };
    const t = PE.cargoTargets(s, pid, g.what);
    const a = { type: g.what === 'settler' ? 'buildSettler' : 'buildCrew' };
    const empty = t.ships.find(id => !s.pe.ships[id].cargo.length);
    if (empty !== undefined) a.ship = empty;
    else if (t.ships.length) a.ship = t.ships[0];
    else a.dock = t.docks[0];
    return a;
  }
  function peTradeFor(s, pid, cost) {
    const P = s.players[pid];
    const { m } = missing(P.resources, cost);
    const want = Object.keys(m).find(k => s.bank[k] > 0);
    if (!want) return null;
    if (P.gold >= 2 && s.pe.goldBuys < 2) return { type: 'bankTrade', give: 'gold', get: want };
    const give = RES.filter(g => g !== want && P.resources[g] - (cost[g] || 0) >= 3).sort((a, b) => P.resources[b] - P.resources[a])[0];
    return give ? { type: 'bankTrade', give, get: want, count: 1 } : null;
  }
  function peSetup(s, pid) {
    const PE = C.PE, P = s.players[pid];
    const prod = production(s, pid);
    const sp = PE.setupSpots(s, pid);
    const st = s.setup.step;
    if (st === 'harbor' || st === 'settlement' || st === 'nharbor' || st === 'nsettlement') {
      // las piezas neutrales (2 jugadores) se usan para tapar el mejor sitio que queda
      const v = peBest(sp.vertices, x => vertexValue(s, pid, x, st[0] === 'n' ? null : prod) + noise(P));
      return { type: st === 'harbor' || st === 'nharbor' ? 'buildHarbor' : 'buildSettlement', vertex: v };
    }
    if (st === 'road') {
      const e = peBest(sp.edges, x => {
        const o = s.board.edges[x].v.find(v => !s.buildings[v]);
        let val = 0;
        if (o !== undefined) s.board.vertices[o].adj.forEach(n => { if (freeSpot(s, n)) val = Math.max(val, vertexValue(s, pid, n, prod)); });
        return val + noise(P);
      });
      return { type: 'buildRoad', edge: e };
    }
    return { type: 'buildShip', edge: sp.edges[Math.floor(Math.random() * sp.edges.length)] };
  }
  function pePirate(s, pid) {
    const PE = C.PE;
    const leader = Math.max(...s.players.map(p => p.id === pid ? 0 : C.publicVP(s, p.id)));
    const hx = peBest(PE.pirateHexes(s), h => {
      let v = 0;
      Object.values(s.pe.ships).forEach(x => { if (PE.edgeTouchesHex(s, x.edge, h)) v += x.owner === pid ? -2 : 2 + (C.publicVP(s, x.owner) === leader ? 1 : 0); });
      if (s.board.hexes[h].fish) v += 1;
      return v + Math.random() * 0.5;
    });
    const cands = PE.pirateVictims(s, pid, hx).sort((a, b) => total(s.players[b].resources) - total(s.players[a].resources));
    return { type: 'placePirate', hex: hx, victim: cands.length ? cands[0] : null };
  }
  function peMain(s, pid, mem) {
    const P = s.players[pid];
    if (mem.peTurn !== s.turn) { mem.peTurn = s.turn; mem.peActs = 0; mem.peTrades = 0; mem.peMoves = 0; mem.peSkip = {}; }
    if (++mem.peActs > 40) return { type: 'startMove' };
    const prod = production(s, pid);
    const g = peGoal(s, pid, prod);
    if (g) {
      if (hasRes(P.resources, g.cost)) return peBuildAction(s, pid, g);
      if (mem.peTrades < 5) { const t = peTradeFor(s, pid, g.cost); if (t) { mem.peTrades++; return t; } }
    }
    if (total(P.resources) > 7 && mem.peTrades < 8) {
      const k = RES.filter(x => P.resources[x] >= 3).sort((a, b) => P.resources[b] - P.resources[a])[0];
      if (k) { mem.peTrades++; return { type: 'bankTrade', give: k, get: 'gold' }; }
    }
    return { type: 'startMove' };
  }
  function peShipAction(s, pid, sh) {
    const PE = C.PE, P = s.players[pid];
    const sc = PE.SCENARIOS[s.pe.scenario];
    const has = it => sh.cargo.includes(it);
    const council = PE.councilHex(s);
    // acciones en el sitio
    const fv = PE.foundable(s, sh);
    if (fv.length) return { type: 'foundSettlement', ship: sh.id, vertex: peBest(fv, v => vertexValue(s, pid, v, null)) };
    if ((has('fish') || has('spice')) && council !== null && PE.edgeTouchesHex(s, sh.edge, council)) return { type: 'deliver', ship: sh.id };
    if (has('crew')) {
      const l = sc.lairs ? PE.adjacentLairs(s, sh.edge)[0] : undefined;
      if (l !== undefined) return { type: 'dropCrew', ship: sh.id, hex: l };
      const sp = sc.spice ? PE.adjacentSpices(s, sh.edge, pid)[0] : undefined;
      if (sp !== undefined && !has('settler')) return { type: 'tradeSpice', ship: sh.id, hex: sp };
    }
    if (PE.space(sh.cargo) >= 1 && !has('fish') && !has('settler')) { const ph = PE.pickupHexes(s, sh)[0]; if (ph !== undefined) return { type: 'pickupCrew', ship: sh.id, hex: ph }; }
    if (!sh.cargo.length && sc.fish) { const f = PE.adjacentFish(s, sh.edge)[0]; if (f !== undefined) return { type: 'loadFish', ship: sh.id, hex: f }; }
    const hv = PE.harborOf(s, pid, sh.edge);
    if (hv !== undefined && !has('fish') && !has('spice')) {
      const it = (s.pe.docks[hv] || []).find(x => (x === 'settler' || (x === 'crew' && peCrewUseful(s, pid))) && PE.space(sh.cargo) >= PE.SIZE[x]);
      if (it) return { type: 'transfer', ship: sh.id, item: it, dir: 'load' };
    }
    if (!sh.cargo.length && PE.canFight(s, pid, sh)) return { type: 'fightPirate', ship: sh.id };
    if (sh.stopped || sh.mp <= 0) return null;
    // destino
    const E = s.board.edges;
    const targets = new Set();
    const addHex = pred => s.board.hexes.forEach(h => { if (pred(h)) h.edges.forEach(e => { if (PE.isRoute(s, e)) targets.add(e); }); });
    const addVertex = v => s.board.vertices[v].edges.forEach(e => { if (PE.isRoute(s, e)) targets.add(e); });
    const explore = () => E.forEach(e => { if (PE.isRoute(s, e.id) && PE.edgeTouchesHidden(s, e.id)) targets.add(e.id); });
    if (has('settler')) {
      peFoundSpots(s, pid).forEach(addVertex);
      if (!targets.size) explore();
    } else if (has('fish') || has('spice')) {
      if (council !== null) s.board.hexes[council].vertices.forEach(addVertex);
    } else if (has('crew')) {
      if (sc.lairs) addHex(h => h.lair && !h.hidden && h.lair.crews.length < 3);
      if (sc.spice) addHex(h => h.terrain === 'spice' && !h.hidden && h.spice.left > 0 && !h.spice.crews.includes(pid));
      if (!targets.size) explore();
    } else {
      if (sc.fish) addHex(h => h.terrain === 'fish' && !h.hidden && h.fish);
      PE.ownHarbors(s, pid).forEach(v => {
        if ((s.pe.docks[v] || []).some(x => x === 'settler' || (x === 'crew' && peCrewUseful(s, pid)))) addVertex(v);
      });
      if (!targets.size) explore();
    }
    const path = targets.size ? PE.pathTo(s, sh, targets) : null;
    if (!path || !path.length) return null;
    if (!sh.boosted && path.length > sh.mp && P.resources.sheep > 1) return { type: 'boostShip', ship: sh.id };
    const rc = PE.reach(s, sh.id);
    for (let i = path.length - 1; i >= 0; i--) {
      const r = rc.get(path[i]);
      if (r && (!r.tribute || P.gold >= 2)) return { type: 'moveShip', ship: sh.id, to: path[i] };
    }
    return null;
  }
  function peMove(s, pid, mem) {
    if (mem.peTurn !== s.turn) { mem.peTurn = s.turn; mem.peActs = 0; mem.peTrades = 0; mem.peMoves = 0; mem.peSkip = {}; }
    if (++mem.peMoves > 60) return { type: 'endTurn' };
    const ships = Object.values(s.pe.ships).filter(x => x.owner === pid).sort((a, b) => a.id - b.id);
    for (const sh of ships) {
      if (mem.peSkip[sh.id]) continue;
      const a = peShipAction(s, pid, sh);
      if (a) return a;
      mem.peSkip[sh.id] = true;
    }
    return { type: 'endTurn' };
  }
  function peRespond(s, pid) {
    const t = s.trade, P = s.players[pid];
    if (!hasRes(P.resources, t.get) || C.publicVP(s, t.from) >= s.vpTarget - 2) return { type: 'respondTrade', id: t.id, accept: false };
    const g = peGoal(s, pid, production(s, pid));
    const cost = g ? g.cost : {};
    const after = Object.assign({}, P.resources);
    RES.forEach(k => { after[k] += (t.give[k] || 0) - (t.get[k] || 0); });
    const before = missing(P.resources, cost).n, aft = missing(after, cost).n;
    return { type: 'respondTrade', id: t.id, accept: aft < before || (aft === before && total(t.give) > total(t.get)) };
  }
  function peDecide(s, pid, mem) {
    const P = s.players[pid];
    if (s.phase === 'discard') return s.pendingDiscard[pid] ? { type: 'discard', resources: ckPickMost(P.resources, s.pendingDiscard[pid], false) } : null;
    if (s.phase === 'main' && s.trade && s.trade.from !== pid && s.trade.responses[pid] === undefined &&
      (s.trade.to === null || s.trade.to === pid)) return peRespond(s, pid);
    if (s.current !== pid) return null;
    if (s.phase === 'setup') return peSetup(s, pid);
    if (s.phase === 'roll') return { type: 'roll' };
    if (s.phase === 'pirate') return pePirate(s, pid);
    if (s.phase === 'main') {
      if (s.trade && s.trade.from === pid) return { type: 'cancelTrade' };
      return peMain(s, pid, mem);
    }
    if (s.phase === 'move') return peMove(s, pid, mem);
    return null;
  }

  // ================= Mercaderes y Bárbaros =================
  const vdist = (s, a, b) => { const A = s.board.vertices[a], B = s.board.vertices[b]; return Math.hypot(A.x - B.x, A.y - B.y); };
  const edist = (s, a, b) => { const A = s.board.edges[a], B = s.board.edges[b]; return Math.hypot(A.x - B.x, A.y - B.y); };
  function tbLeader(s, pid) {
    const ps = C.TB.real(s).filter(p => p.id !== pid);
    return ps.sort((a, b) => C.publicVP(s, b.id) - C.publicVP(s, a.id))[0];
  }
  function tbSpare(P) { return RES.slice().sort((a, b) => P.resources[b] - P.resources[a]).find(k => P.resources[k] > 0); }
  function tbVote(s, pid) {
    const opts = C.TB.camelOptions(s), P = s.players[pid];
    let best = 0, bv = -Infinity;
    opts.forEach((o, i) => {
      let val = Math.random() * 0.3;
      const E = s.board.edges[o.edge];
      if (s.roads[o.edge] && s.roads[o.edge].owner === pid) val += 1.5;
      E.v.forEach(v => {
        const b = s.buildings[v];
        if (!b) return;
        const has = s.board.vertices[v].edges.filter(e => s.tb.camels[e] !== undefined).length;
        if (has >= 1) val += b.owner === pid ? 3 : -1.5;
        else if (b.owner === pid) val += 0.5;
      });
      if (val > bv) { bv = val; best = i; }
    });
    const bid = { sheep: 0, wheat: 0 };
    if (bv >= 3) { if (P.resources.sheep >= 1) bid.sheep = Math.min(2, P.resources.sheep); else if (P.resources.wheat >= 2) bid.wheat = 1; }
    else if (bv >= 1.5 && P.resources.sheep >= 2) bid.sheep = 1;
    return { type: 'vote', option: best, sheep: bid.sheep, wheat: bid.wheat };
  }
  function tbKnightMoves(s, pid, mem) {
    const TB = C.TB;
    const castle = TB.castleEdges(s);
    const mine = Object.keys(s.tb.knights).map(Number).filter(e => s.tb.knights[e].owner === pid);
    const myHex = h => h.vertices.some(v => s.buildings[v] && s.buildings[v].owner === pid);
    const targets = s.board.hexes.filter(h => h.coastal && h.barbs).sort((a, b) => (myHex(b) ? 10 : 0) + b.barbs - ((myHex(a) ? 10 : 0) + a.barbs));
    for (const e of mine) {
      if (mem.knMoved && mem.knMoved[e]) continue;
      const tg = TB.knightTargets(s, e).filter(t => !castle.has(t.edge));
      if (!tg.length) continue;
      const onCastle = castle.has(e);
      let best = null, bv = -Infinity;
      for (const t of tg) {
        let val = -t.cost * 0.1;
        const E = s.board.edges[t.edge];
        targets.forEach((h, i) => {
          if (E.hexes.includes(h.id)) {
            const kn = h.edges.filter(x => s.tb.knights[x] && x !== e).length;
            val += (kn + 1 > h.barbs ? 12 : 5) + (myHex(h) ? 4 : 0) - i * 0.3;
          } else val += Math.max(0, 3 - Math.hypot(E.x - h.x, E.y - h.y)) * (myHex(h) ? 0.8 : 0.4);
        });
        if (val > bv) { bv = val; best = t; }
      }
      const here = s.board.edges[e];
      const stayVal = targets.some(h => here.hexes.includes(h.id)) ? 6 : 0;
      if (best && (onCastle || bv > stayVal + 0.5)) {
        (mem.knMoved = mem.knMoved || {})[best.edge] = true;
        return { type: 'moveKnight', from: e, to: best.edge };
      }
    }
    return null;
  }
  function tbWagon(s, pid, mem) {
    const TB = C.TB, P = s.players[pid], W = P.wagon;
    if (!W || W.v === null || W.stopped) return null;
    const plazas = s.board.vertices.filter(v => v.plaza !== undefined);
    const dest = plazas.filter(v => {
      const k = s.board.hexes[v.plaza].terrain;
      return P.cargo ? TB.GOOD_DEST[P.cargo] === k : (typeof s.tb.stacks[k] === 'number' ? s.tb.stacks[k] : s.tb.stacks[k].length) > 0;
    }).map(v => v.id);
    if (!dest.length) return null;
    // distancias por caminos hasta el destino más cercano
    const dist = new Map(dest.map(v => [v, 0]));
    const q = dest.slice();
    while (q.length) {
      const v = q.shift();
      for (const e of s.board.vertices[v].edges) {
        if (!s.board.edges[e].land) continue;
        const o = s.board.edges[e].v[0] === v ? s.board.edges[e].v[1] : s.board.edges[e].v[0];
        const c = TB.wagonEdgeCost(s, pid, e).mp;
        if (!dist.has(o) || dist.get(o) > dist.get(v) + c) { dist.set(o, dist.get(v) + c); q.push(o); }
      }
    }
    const reach = TB.wagonReach(s, pid);
    const here = dist.has(W.v) ? dist.get(W.v) : 99;
    let best = null, bv = here;
    reach.forEach((r, v) => {
      const d = dist.has(v) ? dist.get(v) : 99;
      const val = d + r.gold * 0.3;
      if (d < here && val < bv) { bv = val; best = v; }
    });
    if (best !== null && dest.includes(best)) return { type: 'moveWagon', to: best };
    if (!W.boosted && P.resources.wheat >= 2 && here > W.mp && here <= W.mp + 2) return { type: 'boostWagon' };
    if (best !== null) return { type: 'moveWagon', to: best };
    return null;
  }
  function tbMain(s, pid, mem) {
    const TB = C.TB, P = s.players[pid], scn = s.tb.scenario;
    if (mem.tbTurn !== s.turn + ':' + (s.tb.p2 ? 2 : 1)) { mem.tbTurn = s.turn + ':' + (s.tb.p2 ? 2 : 1); mem.tbActs = 0; mem.knMoved = {}; }
    if (++mem.tbActs > 25) return undefined;
    if (P.damaged !== null && hasRes(P.resources, TB.COST.repair) && total(P.resources) >= 4) return { type: 'repairRoad' };
    if (s.tb.boot === pid) {
      const t = TB.real(s).filter(p => p.id !== pid && C.publicVP(s, p.id) >= C.publicVP(s, pid)).sort((a, b) => C.publicVP(s, b.id) - C.publicVP(s, a.id))[0];
      if (t) return { type: 'giveBoot', to: t.id };
    }
    if (scn === 1 && P.fish.length) {
      const sum = P.fish.reduce((a, b) => a + b, 0);
      const pick = cost => { const idx = P.fish.map((f, i) => [f, i]).sort((a, b) => a[0] - b[0]); const out = []; let t = 0; for (const [f, i] of idx) { if (t >= cost) break; out.push(i); t += f; } return out; };
      const rh = s.robber !== null ? s.board.hexes[s.robber] : null;
      if (rh && rh.number && rh.vertices.some(v => s.buildings[v] && s.buildings[v].owner === pid) && sum >= TB.fishCost(s, pid, 'robberOff'))
        return { type: 'fishAction', action: 'robberOff', tokens: pick(TB.fishCost(s, pid, 'robberOff')) };
      if (sum >= TB.fishCost(s, pid, 'dev') && s.devDeck.length) return { type: 'fishAction', action: 'dev', tokens: pick(TB.fishCost(s, pid, 'dev')) };
      if (sum >= TB.fishCost(s, pid, 'resource') && P.fish.length >= 4) {
        const g = goal(s, pid, production(s, pid));
        const need = g && COST[g.what] ? Object.keys(missing(P.resources, COST[g.what]).m).find(k => s.bank[k] > 0) : null;
        const k = need || RES.slice().sort((a, b) => P.resources[a] - P.resources[b])[0];
        if (s.bank[k] > 0) return { type: 'fishAction', action: 'resource', resource: k, tokens: pick(TB.fishCost(s, pid, 'resource')) };
      }
    }
    if (scn === 2 && hasRes(P.resources, TB.COST.bridge) && P.pieces.bridge > 0) {
      const b = TB.bridgeSpots(s, pid)[0];
      if (b !== undefined) return { type: 'buildBridge', edge: b };
    }
    if (scn === 5 && P.wagon.level < 5 && hasRes(P.resources, TB.TRAIN[P.wagon.level + 1].cost) && (P.wagon.level < 3 || total(P.resources) >= 6))
      return { type: 'upgradeWagon' };
    if (TB.usesGold(s) && P.gold >= 2 && s.tb.goldBuys < 2 && !(s.tb.p2 && scn === 5)) {
      const rich = scn !== 2 || P.gold > Math.min(...TB.real(s).map(p => p.gold)) + 3;
      const g = goal(s, pid, production(s, pid));
      if (rich && g && COST[g.what]) {
        const m = missing(P.resources, COST[g.what]);
        const k = Object.keys(m.m).find(x => s.bank[x] > 0);
        if (k && m.n <= 2) return { type: 'bankTrade', give: 'gold', get: k };
      }
    }
    if (s.tb.two && s.tb.scenario !== 1 && P.tokens > 0) {
      const opp = TB.real(s).find(p => p.id !== pid);
      const cost = C.publicVP(s, pid) <= C.publicVP(s, opp.id) ? 1 : 2;
      const home = s.board.hexes.find(h => h.terrain === 'desert' || h.terrain === 'swamp');
      const rh = s.robber !== null ? s.board.hexes[s.robber] : null;
      if (P.tokens >= cost && home && rh && rh.id !== home.id && rh.vertices.some(v => s.buildings[v] && s.buildings[v].owner === pid)) return { type: 'tokenAction', action: 'robberHome' };
      if (P.tokens >= cost + 2 && total(opp.resources) >= 5 && total(P.resources) >= 4 && mem.forced !== s.turn) {
        mem.forced = s.turn;
        const give = {};
        const h = Object.assign({}, P.resources);
        for (let i = 0; i < 2; i++) { const k = RES.slice().sort((a, b) => h[b] - h[a])[0]; h[k]--; give[k] = (give[k] || 0) + 1; }
        return { type: 'tokenAction', action: 'forcedTrade', give };
      }
    }
    return undefined;
  }
  function tbDecide(s, pid, mem) {
    const TB = C.TB, P = s.players[pid];
    if (P.neutral) return null;
    if (s.phase === 'tbGive') {
      const pair = s.tb.pending.pairs.find(x => x.from === pid);
      if (!pair) return null;
      const k = tbSpare(P);
      const to = pair.to !== null ? pair.to : TB.giveTargets(s, pid).sort((a, b) => C.publicVP(s, a) - C.publicVP(s, b))[0];
      return { type: 'tbGive', resources: { [k]: 1 }, to };
    }
    if (s.phase === 'tbVote') return s.tb.vote.order[s.tb.vote.idx] === pid ? tbVote(s, pid) : null;
    if (s.current !== pid) return undefined;
    switch (s.phase) {
      case 'tbSteal': {
        const vs = TB.stealVictims(s, s.tb.pending ? s.tb.pending.by : pid).sort((a, b) => total(s.players[b].resources) + C.publicVP(s, b) - total(s.players[a].resources) - C.publicVP(s, a));
        return { type: 'tbSteal', victim: vs[0] };
      }
      case 'tbNeutral': {
        const opts = TB.neutralOptions(s, s.tb.neutralBuild.kind);
        const opp = TB.real(s).find(p => p.id !== pid);
        const val = o => o.kind === 'settlement' ? vertexValue(s, opp.id, o.at, null) : Math.max(...s.board.edges[o.at].v.map(v => freeSpot(s, v) ? vertexValue(s, opp.id, v, null) : 0));
        const o = opts.sort((a, b) => val(b) - val(a))[0];
        return { type: 'neutralBuild', pid: o.pid, at: o.at };
      }
      case 'tbKnight': {
        const spots = TB.knightSpots(s, s.tb.knightPlace.any);
        const myHex = h => h.vertices.some(v => s.buildings[v] && s.buildings[v].owner === pid);
        const hot = s.board.hexes.filter(h => h.coastal && h.barbs);
        const val = e => { const E = s.board.edges[e]; return hot.reduce((a, h) => a + (E.hexes.includes(h.id) ? (myHex(h) ? 6 : 3) : Math.max(0, 2 - Math.hypot(E.x - h.x, E.y - h.y))), 0) + Math.random() * 0.2; };
        return { type: 'placeKnight', edge: spots.sort((a, b) => val(b) - val(a))[0] };
      }
      case 'tbTreason': {
        const leader = tbLeader(s, pid);
        const near = (h, p) => h.vertices.some(v => s.buildings[v] && s.buildings[v].owner === p);
        const from = s.board.hexes.filter(h => h.coastal && h.barbs).sort((a, b) => (near(b, pid) ? 5 : 0) + b.barbs - (near(a, pid) ? 5 : 0) - a.barbs).slice(0, 2);
        const to = s.board.hexes.filter(h => h.coastal && !h.conquered && h.barbs < 3 && !near(h, pid)).sort((a, b) => (near(b, leader.id) ? 5 : 0) - (near(a, leader.id) ? 5 : 0));
        const moves = [];
        from.forEach(f => { const t = to.find(x => x.id !== f.id && !moves.some(m => m.to === x.id)); if (t) moves.push({ from: f.id, to: t.id }); });
        return { type: 'treason', moves };
      }
      case 'tbBarbarian': {
        const leader = tbLeader(s, pid);
        const W = P.wagon;
        const from = s.tb.barbs.slice().sort((a, b) => {
          const sc2 = e => (s.roads[e] && s.roads[e].owner === pid ? 5 : 0) + (W && W.v !== null ? Math.max(0, 4 - s.board.edges[e].v.reduce((m, v) => Math.min(m, vdist(s, v, W.v)), 9)) : 0);
          return sc2(b) - sc2(a);
        })[0];
        const free = TB.barbFreeEdges(s);
        const to = free.filter(e => s.roads[e] && s.roads[e].owner === leader.id && total(leader.resources) > 0)[0] ||
          free.filter(e => !(s.roads[e] && s.roads[e].owner === pid)).sort((a, b) => edist(s, b, from) - edist(s, a, from))[0];
        return { type: 'moveBarbarian', from, to };
      }
      case 'tbMove': {
        if (mem.tbMoveTurn !== s.turn + ':' + (s.tb.p2 ? 2 : 1)) { mem.tbMoveTurn = s.turn + ':' + (s.tb.p2 ? 2 : 1); mem.mvActs = 0; mem.knMoved = {}; }
        if (++mem.mvActs > 30) return { type: 'endTurn' };
        if (s.tb.scenario === 4) { const m = tbKnightMoves(s, pid, mem); if (m) return m; }
        if (s.tb.scenario === 5) { const m = tbWagon(s, pid, mem); if (m) return m; }
        return { type: 'endTurn' };
      }
      case 'main': return tbMain(s, pid, mem);
    }
    return undefined;
  }

  // Decide la próxima acción. mem: memoria por bot (persistente entre llamadas)
  function decide(s, pid, mem) {
    mem = mem || {};
    if (s.phase !== 'ended' && s.tb && s.phase !== 'setup') {
      const r = tbDecide(s, pid, mem);
      if (r !== undefined) return r;
    }
    const a = decideBase(s, pid, mem);
    if (a && s.tb && s.phase === 'main' && s.current === pid) {
      if (a.type === 'offerTrade' && s.tb.p2) return C.TB.hasMove(s) ? { type: 'startMove' } : { type: 'endTurn' };
      if (a.type === 'endTurn' && C.TB.hasMove(s)) return { type: 'startMove' };
      if (a.type === 'buildRoad' && s.players[pid].damaged !== null) return C.TB.hasMove(s) ? { type: 'startMove' } : { type: 'endTurn' };
    }
    return a;
  }

  function decideBase(s, pid, mem) {
    mem = mem || {};
    const P = s.players[pid];
    if (s.phase === 'ended') return null;
    if (C.isPE && C.isPE(s)) return peDecide(s, pid, mem);
    if (C.isCK && C.isCK(s) && s.phase !== 'setup') {
      const r = ckDecide(s, pid, mem);
      if (r !== undefined) return r;
    }
    if (s.phase === 'discard') return s.pendingDiscard[pid] ? discardChoice(s, pid) : null;
    if (s.phase === 'gold') return s.pendingGold[pid] ? goldChoice(s, pid) : null;

    if (s.phase === 'main' && s.trade && s.trade.from !== pid && s.trade.responses[pid] === undefined &&
      (s.trade.to === null || s.trade.to === pid)) return respondTrade(s, pid);

    const prod = production(s, pid);

    if (s.phase === 'setup') {
      if (s.current !== pid) return null;
      if (s.setup.step === 'settlement') {
        const spots = C.validSettlements(s, pid, true);
        let best = null;
        for (const v of spots) {
          const val = vertexValue(s, pid, v, prod) + noise(P);
          if (!best || val > best.val) best = { v, val };
        }
        return { type: 'buildSettlement', vertex: best.v };
      }
      const sv = s.setup.vertex;
      let best = null;
      for (const kind of ['road', 'ship']) {
        if (P.pieces[kind] <= 0) continue;
        for (const e of C.validRoutes(s, pid, kind, sv)) {
          const ed = s.board.edges[e];
          const o = ed.v[0] === sv ? ed.v[1] : ed.v[0];
          let val = 0;
          for (const n of s.board.vertices[o].adj) if (n !== sv && freeSpot(s, n)) val = Math.max(val, vertexValue(s, pid, n, prod));
          val += noise(P) - (kind === 'ship' ? 1 : 0);
          if (!best || val > best.val) best = { e, kind, val };
        }
      }
      return { type: best.kind === 'ship' ? 'buildShip' : 'buildRoad', edge: best.e };
    }

    if (s.phase === 'specialBuild') {
      if (s.specialBuilder !== pid) return null;
      const g = goal(s, pid, prod);
      if (g && COST[g.what] && hasRes(P.resources, COST[g.what])) return actionFor(g);
      if (total(P.resources) > 7 && hasRes(P.resources, COST.dev) && s.devDeck.length) return { type: 'buyDev' };
      return { type: 'endTurn' };
    }

    if (s.current !== pid) return null;

    if (s.phase === 'robber') return robberChoice(s, pid);
    if (s.phase === 'roadBuilding') {
      const rt = routeTarget(s, pid, prod);
      if (!rt) return { type: 'endRoadBuilding' };
      return { type: rt.kind === 'ship' ? 'buildShip' : 'buildRoad', edge: rt.e };
    }
    if (s.phase === 'roll') {
      const d = chooseDev(s, pid, prod);
      if (d && d.card === 'knight') return d;
      return { type: 'roll' };
    }
    if (s.phase !== 'main') return null;

    // Oferta propia en curso
    if (s.trade && s.trade.from === pid) {
      const acc = Object.keys(s.trade.responses).filter(k => s.trade.responses[k] === 'accept').map(Number);
      if (acc.length) return { type: 'confirmTrade', with: acc[0] };
      const others = s.players.filter(p => p.id !== pid && !p.neutral).length;
      if (Object.keys(s.trade.responses).length >= others || mem.tradeExpired) { mem.tradeExpired = false; return { type: 'cancelTrade' }; }
      return { type: 'wait' };
    }

    const dev = chooseDev(s, pid, prod);
    if (dev) return dev;

    const g = goal(s, pid, prod);
    if (g && COST[g.what]) {
      if (hasRes(P.resources, COST[g.what])) return actionFor(g);
      const bt = bankTradeFor(s, pid, COST[g.what]);
      if (bt) return bt;
      // oferta a jugadores: una por turno
      const { m, n } = missing(P.resources, COST[g.what]);
      if (n === 1 && mem.offerTurn !== s.turn && P.difficulty !== 'easy' && !s.pair) {
        const want = Object.keys(m)[0];
        const give = RES.filter(k => k !== want && P.resources[k] - (COST[g.what][k] || 0) >= 1)
          .sort((a, b) => P.resources[b] - P.resources[a])[0];
        if (give) {
          mem.offerTurn = s.turn;
          const gv = C.emptyRes(); gv[give] = 1;
          const gt = C.emptyRes(); gt[want] = 1;
          return { type: 'offerTrade', give: gv, get: gt };
        }
      }
    }
    // construir lo que se pueda si no hay objetivo alcanzable
    const city = bestCity(s, pid);
    if (city && P.pieces.city > 0 && hasRes(P.resources, COST.city)) return { type: 'buildCity', vertex: city.v };
    const spot = P.pieces.settlement > 0 ? bestSettlementSpot(s, pid, prod) : null;
    if (spot && hasRes(P.resources, COST.settlement)) return { type: 'buildSettlement', vertex: spot.v };
    if (hasRes(P.resources, COST.dev) && s.devDeck.length && (total(P.resources) >= 6 || !g || g.what === 'dev')) return { type: 'buyDev' };
    if (total(P.resources) > 7) {
      const rt = routeTarget(s, pid, prod);
      if (rt && hasRes(P.resources, COST[rt.kind])) return { type: rt.kind === 'ship' ? 'buildShip' : 'buildRoad', edge: rt.e };
      // demasiadas cartas: cambiar el recurso sobrante por el que más falta
      const ratios = C.tradeRatios(s, pid);
      const give = RES.filter(k => P.resources[k] >= ratios[k]).sort((a, b) => (P.resources[b] - ratios[b]) - (P.resources[a] - ratios[a]))[0];
      const want = g && COST[g.what] ? Object.keys(missing(P.resources, COST[g.what]).m) : [];
      const get = want.concat(RES.slice().sort((a, b) => P.resources[a] - P.resources[b])).find(k => k !== give && s.bank[k] > 0);
      if (give && get && (mem.dumpTurn !== s.turn || (mem.dumps || 0) < 3)) {
        if (mem.dumpTurn !== s.turn) { mem.dumpTurn = s.turn; mem.dumps = 0; }
        mem.dumps++;
        return { type: 'bankTrade', give, get, count: 1 };
      }
    }
    if (C.MODES[s.mode].ships && P.difficulty !== 'easy') {
      const mv = shipMove(s, pid, prod);
      if (mv) return mv;
    }
    return { type: 'endTurn' };
  }

  C.AI = { decide, production };
})(typeof window !== 'undefined' ? window : globalThis);
