// Mercaderes y Bárbaros: variantes (cartas de evento, señor del puerto, Catan para dos) y los cinco
// escenarios de campaña (Pescadores, Ríos, Caravanas, Ataque bárbaro y Mercaderes y Bárbaros).
(function (root) {
  const C = root.Catan;
  const R = () => C._R;
  const { RES, shuffle } = C;

  const SCENARIOS = {
    0: { id: 0, name: 'Sin escenario', vp: 10 },
    1: { id: 1, name: 'Los pescadores de Catan', vp: 10, two: true, desc: 'Lago y caladeros: el pescado sirve para acciones; cuidado con la bota vieja.' },
    2: { id: 2, name: 'Los ríos de Catan', vp: 10, two: true, desc: 'Puentes y monedas junto a los ríos; el más rico gana 1 PV y el más pobre pierde 2.' },
    3: { id: 3, name: 'Las caravanas', vp: 12, desc: 'Se vota con lana y cereal dónde avanzan los camellos desde el oasis.' },
    4: { id: 4, name: 'Ataque bárbaro', vp: 12, desc: 'Los bárbaros desembarcan y conquistan la costa; tus caballeros los expulsan.' },
    5: { id: 5, name: 'Mercaderes y bárbaros', vp: 13, desc: 'Lleva mercancías en carreta entre el castillo, la cantera y la vidriería.' }
  };
  const EVENT_NAME = {
    robberAttacks: '¡El ladrón ataca!', epidemic: 'Epidemia', earthquake: 'Terremoto', goodNeighbors: 'Buenos vecinos', tournament: 'Torneo',
    tradeAdvantage: 'Ventaja comercial', calmSea: 'Mar en calma', robberFlees: 'Huye el ladrón', neighborlyAssistance: 'Ayuda vecinal',
    conflict: 'Conflicto', plentifulYear: 'Año de abundancia', none: 'Catan prospera', newYear: 'Año nuevo'
  };
  const EVENT_HELP = {
    robberAttacks: 'Quien tenga más de 7 cartas descarta la mitad y se mueve el ladrón.',
    epidemic: 'Cada ciudad produce solo 1 recurso este turno.',
    earthquake: 'Cada jugador gira 1 carretera: no puede construir carreteras hasta repararla (madera + arcilla) ni poblados junto a ella.',
    goodNeighbors: 'Cada jugador da 1 recurso de su elección al jugador de su izquierda.',
    tournament: 'Quien más caballeros haya jugado toma 1 recurso del banco.',
    tradeAdvantage: 'Quien tiene la Gran Ruta (o el único con más carreteras) roba 1 carta a quien elija.',
    calmSea: 'Quien tenga más puertos toma 1 recurso del banco.',
    robberFlees: 'El ladrón vuelve al desierto (sin robar).',
    neighborlyAssistance: 'Quien tenga más PV da 1 recurso a un jugador con menos PV.',
    conflict: 'Quien tiene el Gran Ejército (o el único con más caballeros) roba 1 carta a quien elija.',
    plentifulYear: 'Cada jugador toma 1 recurso del banco.',
    none: 'Sin evento.'
  };
  const EVENT_DECK = [
    ['robberAttacks', 7], ['robberAttacks', 7], ['robberAttacks', 7], ['robberAttacks', 7], ['robberAttacks', 7], ['robberAttacks', 7],
    ['epidemic', 6], ['epidemic', 8], ['earthquake', 6], ['goodNeighbors', 6], ['tournament', 5], ['tradeAdvantage', 5],
    ['calmSea', 9], ['calmSea', 12], ['robberFlees', 4], ['robberFlees', 4], ['neighborlyAssistance', 10], ['neighborlyAssistance', 11],
    ['conflict', 3], ['plentifulYear', 2]
  ].concat([3, 4, 5, 5, 6, 6, 8, 8, 8, 8, 9, 9, 9, 10, 10, 11].map(n => ['none', n]));

  const COST = {
    bridge: { brick: 2, wood: 1 },
    repair: { wood: 1, brick: 1 },
    knightBoost: { wheat: 1 },
    wagonBoost: { wheat: 1 }
  };
  const FISH_COST = { robberOff: 2, steal: 3, resource: 4, road: 5, dev: 7 };
  const FISH_NAME = { robberOff: 'Sacar al ladrón', steal: 'Robar 1 recurso', resource: '1 recurso del banco', road: 'Carretera gratis', dev: 'Carta de desarrollo' };

  const err = m => ({ result: { error: m } });
  const ok = () => ({ result: undefined });
  const name = (s, pid) => s.players[pid].name;
  const die = () => 1 + Math.floor(Math.random() * 6);
  const real = s => s.players.filter(p => !p.neutral);
  const sc = s => s.tb.scenario;
  const big = s => !!C.MODES[s.mode].pairs;
  const cardsOf = p => p.resources ? C.total(p.resources) : (p.resCount || 0);
  const randomCard = P => { const pool = []; RES.forEach(k => { for (let i = 0; i < P.resources[k]; i++) pool.push(k); }); return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null; };
  const usesGold = s => [2, 4, 5].includes(sc(s));
  const hasMove = s => [4, 5].includes(sc(s));

  // ================= preparación =================
  function init(s, mode, config) {
    const o = config.options || {};
    const scen = mode.tb ? (SCENARIOS[o.scenario] && +o.scenario ? +o.scenario : 1) : 0;
    s.tb = {
      scenario: scen, events: !!o.events, harbormaster: !!o.harbormaster, two: s.players.length === 2,
      pairs: !!mode.pairs, p2: null, setupCity: scen === 4 || scen === 5, noLongestRoad: scen === 5,
      eventDeck: [], lastEvent: null, epidemic: false, rolls: 0, firstRoll: null,
      harborHolder: null, goldBuys: 0, pending: null, pendingReturn: null, neutralReturn: null,
      builtThisPart: false
    };
    if (!o.vpTarget) s.vpTarget = SCENARIOS[scen].vp;
    if (s.tb.harbormaster) s.vpTarget += 1;
    s.players.forEach(P => {
      P.gold = 0; P.fish = []; P.tokens = 0; P.prisoners = 0; P.damaged = null;
      P.pieces.bridge = 3; P.pieces.knight = 6;
    });
    if (s.tb.events) buildEventDeck(s);
    if (scen === 1) initFish(s);
    if (scen === 3) {
      s.tb.caravans = [];
      s.tb.camels = {};
      s.tb.camelsLeft = big(s) ? 33 : 22;
    }
    if (scen === 4) initBarbarians(s);
    if (scen === 5) initTraders(s);
    if (s.tb.two) initTwo(s, config);
  }

  // Catan para dos: dos jugadores neutrales con 1 poblado cada uno y fichas de comercio
  function initTwo(s, config) {
    const used = new Set(s.players.map(p => p.color));
    const colors = (C.COLORS || [{ id: 'white' }, { id: 'orange' }, { id: 'green' }, { id: 'brown' }]).map(c => c.id).filter(c => !used.has(c));
    for (let i = 0; i < 2; i++) {
      const id = s.players.length;
      s.players.push({ id, name: 'Neutral ' + (i + 1), color: colors[i] || 'white', bot: false, neutral: true, difficulty: 'normal', avatar: '⚑',
        resources: C.emptyRes(), devCards: [], knights: 0, pieces: { road: 15, settlement: 5, city: 0, ship: 0, bridge: 0, knight: 0 },
        islands: [], routeLength: 0, gold: 0, fish: [], tokens: 0, prisoners: 0, damaged: null });
    }
    // poblados neutrales en cruces bien separados de la isla
    const neutrals = s.players.filter(p => p.neutral);
    const spots = shuffle(s.board.vertices.filter(v => C.canSettle(s, neutrals[0].id, v.id, true) &&
      v.hexes.filter(h => C.isLand(s.board.hexes[h].terrain)).length === 3).map(v => v.id));
    neutrals.forEach((N, i) => {
      const v = spots.find(x => C.canSettle(s, N.id, x, true) && (i === 0 || Math.hypot(s.board.vertices[x].x - s.board.vertices[spots[0]].x, s.board.vertices[x].y - s.board.vertices[spots[0]].y) > 2.5)) ||
        spots.find(x => C.canSettle(s, N.id, x, true));
      if (v === undefined) return;
      s.buildings[v] = { owner: N.id, type: 'settlement' };
      N.pieces.settlement--;
    });
    if (sc(s) === 1) real(s).forEach(P => { [1, 1, 2, 2, 3].forEach(n => P.fish.push(takeFishValue(s, n))); });
    else real(s).forEach(P => { P.tokens = 5; });
  }

  // ================= consultas =================
  function target(s, pid) {
    return s.vpTarget + (s.tb.boot === pid ? 1 : 0);
  }
  const ownBuildings = (s, pid) => Object.keys(s.buildings).map(Number).filter(v => s.buildings[v].owner === pid);
  function harborPoints(s, pid) {
    return ownBuildings(s, pid).reduce((a, v) => {
      const b = s.buildings[v];
      return a + (s.board.vertices[v].port && !b.conquered ? (b.type === 'city' ? 2 : 1) : 0);
    }, 0);
  }
  function updateHarbormaster(s) {
    if (!s.tb.harbormaster) return;
    const pts = s.players.map(p => p.neutral ? -1 : harborPoints(s, p.id));
    const H = s.tb.harborHolder;
    const max = Math.max(...pts);
    let next = H;
    if (H !== null && pts[H] < 3) next = null;
    if (max >= 3) {
      const top = pts.map((x, i) => x === max ? i : -1).filter(i => i >= 0);
      if (next === null) next = top.length === 1 ? top[0] : (top.includes(H) ? H : null);
      else if (!top.includes(next) && top.length === 1) next = top[0];
    }
    if (next !== H) {
      s.tb.harborHolder = next;
      R().log(s, next === null ? 'Nadie es Señor del puerto.' : name(s, next) + ' es Señor del puerto (+2 PV).', next === null ? undefined : next);
      if (next !== null) R().event(s, { type: 'harbormaster', pid: next });
    }
  }
  const riverHex = (s, h) => s.board.hexes[h].river !== undefined;
  function camelBonus(s, v) {
    if (!s.tb.camels) return 0;
    return s.board.vertices[v].edges.filter(e => s.tb.camels[e] !== undefined).length >= 2 ? 1 : 0;
  }
  function coinRanks(s) {
    const ps = real(s);
    const coins = ps.map(p => p.gold);
    const max = Math.max(...coins), min = Math.min(...coins);
    const rich = coins.filter(c => c === max).length === 1 ? ps[coins.indexOf(max)].id : null;
    const poor = ps.filter(p => p.gold === min).map(p => p.id);
    return { rich, poor };
  }
  function extraVP(s, pid) {
    const P = s.players[pid];
    let vp = 0;
    if (s.tb.harborHolder === pid) vp += 2;
    if (sc(s) === 2) { const r = coinRanks(s); if (r.rich === pid) vp += 1; if (r.poor.includes(pid)) vp -= 2; }
    if (sc(s) === 3) ownBuildings(s, pid).forEach(v => { vp += camelBonus(s, v); });
    if (sc(s) === 4) {
      vp += Math.floor(P.prisoners / 2);
      ownBuildings(s, pid).forEach(v => { const b = s.buildings[v]; if (b.conquered) vp -= b.type === 'city' ? 2 : 1; });
    }
    if (sc(s) === 5) vp += P.delivered + (P.wagon && P.wagon.level >= 5 ? 1 : 0);
    return vp;
  }
  function edgeWeight(s, e) {
    return s.tb.camels && s.tb.camels[e] !== undefined ? 2 : 1;
  }

  // reglas extra de construcción
  function settleOk(s, pid, v, setup) {
    const vx = s.board.vertices[v];
    if (vx.plaza !== undefined) return false;
    if (vx.hexes.some(h => s.board.hexes[h].conquered)) return false;
    // no se puede poblar junto a una carretera propia dañada por el terremoto
    const P = s.players[pid];
    if (!setup && P && P.damaged !== null && P.damaged !== undefined && s.board.edges[P.damaged].v.includes(v)) return false;
    return true;
  }
  function roadOk(s, pid, e, setup) {
    const ed = s.board.edges[e];
    if (sc(s) === 2 && s.board.bridgeSites.includes(e)) return false;
    if (ed.hexes.some(h => s.board.hexes[h].conquered)) return false;
    // caminos costeros de los hexágonos comerciales (diseño del juego 3-4)
    if (ed.interior === undefined && ed.hexes.some(h => C.TRADE_HEXES.includes(s.board.hexes[h].terrain) && !s.board.hexes[h].tradeCoastBuild) &&
      ed.hexes.some(h => s.board.hexes[h].terrain === 'sea')) return false;
    if (!setup && s.players[pid] && s.players[pid].damaged !== null && !s.players[pid].neutral) return false;
    return true;
  }
  function robberHexes(s, pid) {
    if (sc(s) === 0) return null;
    if (sc(s) === 4 || sc(s) === 5) return [];
    const out = [];
    for (const h of s.board.hexes) {
      if (!C.isLand(h.terrain) || h.id === s.robber) continue;
      if (h.terrain === 'lake' || h.terrain === 'oasis') continue;
      if (s.friendlyRobber && h.vertices.some(v => s.buildings[v] && s.buildings[v].owner !== pid && !s.players[s.buildings[v].owner].neutral && C.publicVP(s, s.buildings[v].owner) <= 2)) continue;
      out.push(h.id);
    }
    return out;
  }

  // ================= cartas de evento =================
  function buildEventDeck(s) {
    const d = shuffle(EVENT_DECK.slice());
    // 5 cartas quedan fuera bajo "Año nuevo"
    s.tb.eventDeck = d.slice(0, 31).concat([['newYear', 0]]).concat(d.slice(31));
    s.tb.eventDeck.reverse();
  }
  function drawEvent(s) {
    let c = s.tb.eventDeck.pop();
    if (!c || c[0] === 'newYear') {
      R().log(s, 'Año nuevo: se baraja de nuevo el mazo de eventos.');
      buildEventDeck(s);
      c = s.tb.eventDeck.pop();
    }
    return { type: c[0], n: c[1] };
  }
  const leftOf = (s, pid) => { let q = pid; do { q = (q + 1) % s.players.length; } while (s.players[q].neutral); return q; };
  function mostBy(s, f, min) {
    const ps = real(s);
    const vals = ps.map(f);
    const max = Math.max(...vals);
    if (max < (min || 1)) return [];
    return ps.filter((p, i) => vals[i] === max).map(p => p.id);
  }
  function knightsOnBoard(s, pid) { return s.tb.knights ? Object.values(s.tb.knights).filter(k => k.owner === pid).length : 0; }
  function earthquake(s) {
    real(s).forEach(P => {
      if (P.damaged !== null) return;
      const own = Object.keys(s.roads).map(Number).filter(e => s.roads[e].owner === P.id && s.roads[e].type === 'road' && !s.roads[e].bridge);
      if (!own.length) return;
      // se gira la carretera que menos estorba: preferentemente una del extremo
      const open = own.filter(e => s.board.edges[e].v.some(v => !(s.buildings[v] && s.buildings[v].owner === P.id) &&
        !s.board.vertices[v].edges.some(o => o !== e && s.roads[o] && s.roads[o].owner === P.id)));
      const e = (open.length ? open : own)[0];
      P.damaged = e;
      s.roads[e].damaged = true;
    });
    R().log(s, 'Terremoto: cada jugador tiene una carretera dañada.');
  }
  // Aplica el evento antes de producir; devuelve las interacciones pendientes para después
  function applyEvent(s, ev, pid) {
    const post = [];
    switch (ev.type) {
      case 'epidemic': s.tb.epidemic = true; break;
      case 'earthquake': earthquake(s); break;
      case 'robberFlees':
        if (sc(s) === 4 || sc(s) === 5) break;
        if (sc(s) === 1 || sc(s) === 3) s.robber = null;
        else { const d = s.board.hexes.find(h => h.terrain === 'desert' || h.terrain === 'swamp'); s.robber = d ? d.id : null; }
        R().log(s, s.robber === null ? 'El ladrón huye del tablero.' : 'El ladrón vuelve al ' + (s.board.hexes[s.robber].terrain === 'swamp' ? 'pantano.' : 'desierto.'));
        break;
      case 'plentifulYear': post.push({ kind: 'gold', who: real(s).map(p => p.id) }); break;
      case 'tournament': {
        const who = sc(s) === 4 ? mostBy(s, p => knightsOnBoard(s, p.id)) : mostBy(s, p => p.knights);
        if (who.length) post.push({ kind: 'gold', who });
        break;
      }
      case 'calmSea': {
        const who = mostBy(s, p => ownBuildings(s, p.id).filter(v => s.board.vertices[v].port && !s.buildings[v].conquered).length);
        if (who.length) post.push({ kind: 'gold', who });
        break;
      }
      case 'tradeAdvantage': {
        let by = s.tb.noLongestRoad ? null : s.longestRoad;
        if (by === null || s.players[by].neutral) { const m = mostBy(s, p => Object.values(s.roads).filter(r => r.owner === p.id).length); by = m.length === 1 ? m[0] : null; }
        if (by !== null) post.push({ kind: 'steal', by });
        break;
      }
      case 'conflict': {
        let by = sc(s) === 4 || sc(s) === 5 ? null : s.largestArmy;
        if (by === null) { const m = mostBy(s, p => sc(s) === 4 ? knightsOnBoard(s, p.id) : p.knights); by = m.length === 1 ? m[0] : null; }
        if (by !== null) post.push({ kind: 'steal', by });
        break;
      }
      case 'goodNeighbors': post.push({ kind: 'give', pairs: real(s).filter(p => C.total(p.resources) > 0).map(p => ({ from: p.id, to: leftOf(s, p.id) })) }); break;
      case 'neighborlyAssistance': {
        const vps = real(s).map(p => C.publicVP(s, p.id));
        const max = Math.max(...vps);
        const givers = real(s).filter((p, i) => vps[i] === max && C.total(p.resources) > 0);
        if (vps.some(x => x < max)) post.push({ kind: 'give', pairs: givers.map(p => ({ from: p.id, to: null })) });
        break;
      }
    }
    return post;
  }

  // ================= tirada =================
  function rollDice(s, a) {
    let d1, d2;
    for (let k = 0; k < 100; k++) {
      d1 = a.forced ? a.forced[0] : die();
      d2 = a.forced ? a.forced[1] : die();
      const sum = d1 + d2;
      if (a.forced) break;
      if (s.tb.two && s.tb.rolls === 1 && sum === s.tb.firstRoll && !s.tb.events) continue; // las dos tiradas deben ser distintas
      if (sc(s) === 5 && !big(s) && (sum === 2 || sum === 12)) continue; // se repite el 2 y el 12
      break;
    }
    return [d1, d2];
  }
  function roll(s, pid, a) {
    s.tb.epidemic = false;
    let sum, ev = null;
    if (s.tb.events && !a.forced) {
      ev = drawEvent(s);
      if (sc(s) === 5 && !big(s) && (ev.n === 2 || ev.n === 12)) { R().log(s, 'Evento ' + ev.n + ': se roba otra carta (el 2 y el 12 se repiten).'); ev = drawEvent(s); }
      sum = ev.n;
      const d1 = Math.max(1, Math.min(6, sum - 1)), d2 = sum - d1;
      s.dice = [d1, d2];
      s.tb.lastEvent = ev;
      R().log(s, name(s, pid) + ' saca la carta ' + sum + (ev.type !== 'none' && ev.type !== 'robberAttacks' ? ' — ' + EVENT_NAME[ev.type] : '') + '.', pid);
      R().event(s, { type: 'roll', dice: s.dice, pid, card: ev });
    } else {
      const d = rollDice(s, a);
      s.dice = d;
      sum = d[0] + d[1];
      R().log(s, name(s, pid) + ' tira ' + sum + ' (' + d[0] + '+' + d[1] + ').', pid);
      R().event(s, { type: 'roll', dice: d, pid });
    }
    s.rollSeq++;
    s.tb.rolls++;
    if (s.tb.rolls === 1) s.tb.firstRoll = sum;
    // con Catan para dos se tira dos veces por turno
    const after = s.tb.two && s.tb.rolls < 2 ? 'roll' : 'main';
    const post = ev ? applyEvent(s, ev, pid) : [];
    if (sum === 7) {
      const pend = {};
      real(s).forEach(p => { const t = C.total(p.resources); if (t > 7) pend[p.id] = Math.floor(t / 2); });
      const next = sc(s) === 4 ? 'tbSteal' : sc(s) === 5 ? 'tbBarbarian' : 'robber';
      s.robberReturn = after;
      s.tb.barbReturn = after;
      s.tb.pendingReturn = after;
      if (sc(s) === 4) s.tb.pending = { kind: 'steal', by: pid };
      if (Object.keys(pend).length) {
        s.pendingDiscard = pend;
        s.discardReturn = next;
        s.phase = 'discard';
        R().log(s, 'Deben descartar: ' + Object.keys(pend).map(p => name(s, p) + ' (' + pend[p] + ')').join(', ') + '.');
      } else s.phase = next;
      if (sc(s) === 4 && !stealVictims(s, pid).length) { if (s.phase === 'tbSteal') s.phase = after; else s.discardReturn = after; s.tb.pending = null; }
      return;
    }
    const gold = R().produce(s, sum);
    s.tb.epidemic = false;
    s.phase = after;
    queuePost(s, post, after);
    if (s.phase === after) R().startGold(s, gold, after);
  }

  // interacciones de los eventos después de producir
  function queuePost(s, post, ret) {
    s.tb.postQueue = post;
    s.tb.pendingReturn = ret;
    nextPost(s);
  }
  function nextPost(s) {
    const ret = s.tb.pendingReturn;
    while (s.tb.postQueue && s.tb.postQueue.length) {
      const p = s.tb.postQueue.shift();
      if (p.kind === 'gold') {
        const g = {};
        p.who.forEach(x => { g[x] = 1; });
        if (R().startGold(s, g, 'tbPost')) return;
      } else if (p.kind === 'steal') {
        if (!stealVictims(s, p.by).length) continue;
        s.tb.pending = { kind: 'steal', by: p.by };
        s.phase = 'tbSteal';
        return;
      } else if (p.kind === 'give') {
        if (!p.pairs.length) continue;
        s.tb.pending = { kind: 'give', pairs: p.pairs };
        s.phase = 'tbGive';
        return;
      }
    }
    s.tb.postQueue = null;
    s.phase = ret;
    s.tb.pending = null;
  }
  const stealVictims = (s, pid) => real(s).filter(p => p.id !== pid && cardsOf(p) > 0).map(p => p.id);
  function giveTargets(s, from) {
    const myVP = C.publicVP(s, from);
    return real(s).filter(p => p.id !== from && C.publicVP(s, p.id) < myVP).map(p => p.id);
  }

  // ================= construcción =================
  function addGold(s, pid, n, why) {
    if (!n) return;
    s.players[pid].gold += n;
    if (why) R().log(s, name(s, pid) + ' recibe ' + n + (n === 1 ? ' moneda' : ' monedas') + ' (' + why + ').', pid);
  }
  function tokensFor(s, v) {
    const vx = s.board.vertices[v];
    const desert = vx.hexes.some(h => ['desert', 'swamp'].includes(s.board.hexes[h].terrain));
    const coast = vx.hexes.some(h => s.board.hexes[h].terrain === 'sea');
    return desert && coast ? 3 : desert ? 2 : coast ? 1 : 0;
  }
  function afterSettlementCommon(s, pid, v, setup) {
    const P = s.players[pid];
    if (sc(s) === 2 && s.board.vertices[v].hexes.some(h => riverHex(s, h))) addGold(s, pid, 1, 'poblado junto al río');
    if (s.tb.two && !P.neutral && sc(s) !== 1) { const t = tokensFor(s, v); if (t) { P.tokens += t; R().log(s, name(s, pid) + ' recibe ' + t + ' ficha(s) de comercio.', pid); } }
    if (!setup && sc(s) === 3 && !P.neutral) s.tb.builtThisPart = true;
    updateHarbormaster(s);
  }
  function afterSetupSettlement(s, pid, v) {
    afterSettlementCommon(s, pid, v, true);
    const st = s.setup;
    const second = st.index >= st.order.length / 2;
    if (sc(s) === 1 && second && s.board.fishing.some(f => f.vertices.includes(v))) giveFish(s, { [pid]: 1 }, 'colocación');
    if (sc(s) === 5 && s.buildings[v].type === 'city') s.players[pid].wagon.v = v;
  }
  function afterSetupRoad(s, pid, e) {
    if (sc(s) === 2 && s.board.edges[e].hexes.some(h => riverHex(s, h))) addGold(s, pid, 1, 'carretera junto al río');
  }
  function afterSetup(s) {
    updateHarbormaster(s);
    if (sc(s) === 5) real(s).forEach(P => { P.gold += 5; });
    if (s.tb.pairs) s.tb.p2 = null;
  }
  function afterBuild(s, pid, what, at, free) {
    const P = s.players[pid];
    if (what === 'road') {
      if (sc(s) === 2 && s.board.edges[at].hexes.some(h => riverHex(s, h))) addGold(s, pid, 1, 'carretera junto al río');
      if (s.tb.two && !P.neutral && !free && s.phase !== 'tbNeutral') startNeutral(s, 'road');
    } else if (what === 'settlement') {
      afterSettlementCommon(s, pid, at, false);
      if (sc(s) === 4) barbarianLanding(s, pid);
      if (s.tb.two && !P.neutral && s.phase !== 'tbNeutral') startNeutral(s, 'settlement');
    } else if (what === 'city') {
      if (sc(s) === 3) s.tb.builtThisPart = true;
      if (sc(s) === 4) barbarianLanding(s, pid);
      updateHarbormaster(s);
    }
  }

  // ----- Catan para dos: construir gratis para un jugador neutral -----
  function neutralOptions(s, kind) {
    const out = [];
    s.players.filter(p => p.neutral).forEach(N => {
      if (kind === 'settlement' && N.pieces.settlement > 0) C.validSettlements(s, N.id, false).forEach(v => out.push({ pid: N.id, kind: 'settlement', at: v }));
      if (kind === 'road' && N.pieces.road > 0) C.validRoutes(s, N.id, 'road').forEach(e => out.push({ pid: N.id, kind: 'road', at: e }));
    });
    return out;
  }
  function startNeutral(s, kind) {
    let opts = neutralOptions(s, kind);
    if (!opts.length && kind === 'settlement') { kind = 'road'; opts = neutralOptions(s, 'road'); }
    if (!opts.length) return;
    s.tb.neutralBuild = { kind, ret: s.phase };
    s.phase = 'tbNeutral';
  }

  // ================= Pescadores =================
  function initFish(s) {
    const bag = [];
    const add = (n, c) => { for (let i = 0; i < c; i++) bag.push(n); };
    add(1, 11); add(2, 10); add(3, 8);
    if (big(s)) { add(1, 4); add(2, 5); add(3, 5); }
    bag.push('boot');
    s.tb.fishBag = shuffle(bag);
    s.tb.fishUsed = [];
    s.tb.boot = null;
  }
  function takeFishValue(s, n) {
    const i = s.tb.fishBag.indexOf(n);
    if (i >= 0) s.tb.fishBag.splice(i, 1);
    return n;
  }
  function drawFish(s) {
    if (!s.tb.fishBag.length) { s.tb.fishBag = shuffle(s.tb.fishUsed); s.tb.fishUsed = []; }
    return s.tb.fishBag.pop();
  }
  function giveFish(s, want, why) {
    const need = Object.values(want).reduce((a, b) => a + b, 0);
    if (!need) return;
    if (need > s.tb.fishBag.length + s.tb.fishUsed.length) { R().log(s, 'No hay fichas de pescado suficientes: nadie pesca.'); return; }
    const got = {};
    Object.entries(want).forEach(([p, n]) => {
      const P = s.players[p];
      for (let i = 0; i < n; i++) {
        const f = drawFish(s);
        if (f === undefined) break;
        if (f === 'boot') {
          s.tb.boot = +p;
          R().log(s, name(s, p) + ' pesca la bota vieja: necesita 1 PV más para ganar.', +p);
          R().event(s, { type: 'boot', pid: +p });
          continue;
        }
        if (P.fish.length >= 7) {
          const lo = Math.min(...P.fish);
          if (f > lo) { P.fish.splice(P.fish.indexOf(lo), 1); s.tb.fishUsed.push(lo); P.fish.push(f); } else s.tb.fishUsed.push(f);
        } else P.fish.push(f);
        got[p] = (got[p] || 0) + 1;
      }
    });
    Object.entries(got).forEach(([p, n]) => R().log(s, name(s, p) + ' pesca ' + n + (n === 1 ? ' ficha' : ' fichas') + ' de pescado' + (why ? ' (' + why + ')' : '') + '.', +p));
    R().event(s, { type: 'fish', got });
  }
  function afterProduce(s, roll) {
    if (sc(s) !== 1) return;
    const want = {};
    const add = (v, mult) => { const b = s.buildings[v]; if (b && !s.players[b.owner].neutral) want[b.owner] = (want[b.owner] || 0) + (b.type === 'city' ? 2 : 1) * mult; };
    s.board.fishing.forEach(f => { if (f.number === roll) f.vertices.forEach(v => add(v, 1)); });
    if ([2, 3, 11, 12].includes(roll)) s.board.hexes.filter(h => h.terrain === 'lake' && h.id !== s.robber).forEach(h => h.vertices.forEach(v => add(v, 1)));
    giveFish(s, want);
  }
  function fishCost(s, pid, action) {
    let c = FISH_COST[action];
    if (s.tb.two) { const o = real(s).find(p => p.id !== pid); if (o && C.publicVP(s, pid) < C.publicVP(s, o.id)) c--; }
    return c;
  }

  // ================= Caravanas =================
  function camelOptions(s) {
    const out = [];
    const E = s.board.edges, V = s.board.vertices;
    const free = e => s.tb.camels[e] === undefined && E[e].land;
    s.board.oases.forEach((o, oi) => {
      o.arrows.forEach((v, ai) => {
        if (s.tb.caravans.some(c => c.oasis === oi && c.arrow === ai)) return;
        const e = V[v].edges.find(x => !E[x].hexes.includes(o.hex));
        if (e !== undefined && free(e)) out.push({ edge: e, start: { oasis: oi, arrow: ai, from: v } });
      });
    });
    s.tb.caravans.forEach((c, ci) => {
      if (c.dead) return;
      V[c.head].edges.forEach(e => { if (free(e)) out.push({ edge: e, caravan: ci }); });
    });
    return out;
  }
  function placeCamel(s, opt) {
    const E = s.board.edges;
    let ci = opt.caravan;
    let from;
    if (opt.start) {
      s.tb.caravans.push({ oasis: opt.start.oasis, arrow: opt.start.arrow, head: opt.start.from, dead: false, n: 0 });
      ci = s.tb.caravans.length - 1;
      from = opt.start.from;
    } else from = s.tb.caravans[ci].head;
    const c = s.tb.caravans[ci];
    const head = E[opt.edge].v[0] === from ? E[opt.edge].v[1] : E[opt.edge].v[0];
    s.tb.camels[opt.edge] = ci;
    c.head = head;
    c.n++;
    s.tb.camelsLeft--;
    // dos caravanas que se encuentran en un cruce siguen como una sola
    s.tb.caravans.forEach((o, oi) => { if (oi !== ci && !o.dead && o.head === head) o.dead = true; });
    R().updateLongestRoad(s);
    R().event(s, { type: 'camel', edge: opt.edge });
  }
  function startVote(s, finisher, cont) {
    const opts = camelOptions(s);
    if (!opts.length || s.tb.camelsLeft <= 0) { cont(); return false; }
    const order = [];
    let p = finisher;
    for (let i = 0; i < s.players.length; i++) { if (!s.players[p].neutral) order.push(p); p = (p + 1) % s.players.length; }
    s.tb.vote = { finisher, order, idx: 0, bids: {}, prefs: {}, cont: s.tb.p2 ? 'p2end' : 'p1end' };
    s.phase = 'tbVote';
    R().log(s, 'Votación: ¿dónde avanza el próximo camello? (se vota con lana y cereal)');
    return true;
  }
  function resolveVote(s) {
    const V = s.tb.vote;
    const opts = camelOptions(s);
    const votes = p => (V.bids[p] ? (V.bids[p].sheep || 0) + (V.bids[p].wheat || 0) : 0);
    const T = V.order.reduce((a, p) => a + votes(p), 0);
    const pref = p => (opts[V.prefs[p]] ? V.prefs[p] : 0);
    let choice = null, how;
    const abs = V.order.find(p => votes(p) > T - votes(p) && votes(p) > 0);
    if (abs !== undefined) { choice = pref(abs); how = name(s, abs) + ' tiene la mayoría absoluta'; }
    if (choice === null) {
      const sums = {};
      V.order.forEach(p => { sums[pref(p)] = (sums[pref(p)] || 0) + votes(p); });
      const k = Object.keys(sums).find(x => sums[x] > T / 2 && sums[x] > 0);
      if (k !== undefined) { choice = +k; how = 'una mayoría está de acuerdo'; }
    }
    if (choice === null) {
      const max = Math.max(...V.order.map(votes));
      const top = V.order.filter(p => votes(p) === max);
      if (max > 0 && top.length === 1) { choice = pref(top[0]); how = name(s, top[0]) + ' tiene más votos'; }
    }
    if (choice === null) { choice = pref(V.finisher); how = 'decide ' + name(s, V.finisher); }
    V.order.forEach(p => { if (V.bids[p]) R().pay(s, p, V.bids[p]); });
    placeCamel(s, opts[choice]);
    R().log(s, 'Se coloca un camello (' + how + '; ' + T + ' votos en total).');
    s.tb.vote = null;
  }

  // ================= Ataque bárbaro (escenario 4) =================
  const BA_DECK = { knighthood: 14, swiftKnight: 4, treason: 4, intrigue: 4 };
  const BA_NAME = { knighthood: 'Caballería', swiftKnight: 'Caballero veloz', treason: 'Traición', intrigue: 'Intriga' };
  const BA_HELP = {
    knighthood: 'Coloca 1 caballero en uno de los caminos del castillo.',
    swiftKnight: 'Coloca 1 caballero en cualquier camino libre.',
    treason: 'Recibes 2 de oro y mueves 2 bárbaros de 2 hexágonos a otros 2 hexágonos costeros sin conquistar.',
    intrigue: 'Quitas 1 bárbaro de un hexágono y lo haces prisionero.'
  };
  function initBarbarians(s) {
    s.robber = null;
    s.tb.knights = {};
    s.tb.barbSupply = big(s) ? 42 : 30;
    s.board.hexes.forEach(h => { if (h.coastal) h.barbs = 0; });
    s.board.hexes.filter(h => h.coastal && (h.number === 2 || h.number === 12)).forEach(h => { h.barbs = 1; s.tb.barbSupply--; });
    const deck = [];
    Object.entries(BA_DECK).forEach(([k, n]) => { for (let i = 0; i < n; i++) deck.push(k); });
    s.devDeck = shuffle(deck);
    s.tb.devDiscard = [];
    s.tb.ownDeck = true;
    s.players.forEach(P => { P.knightsLeft = 6; });
  }
  const castleEdges = s => { const set = new Set(); (s.board.castles || []).forEach(c => s.board.hexes[c].edges.forEach(e => set.add(e))); return set; };
  const edgeClass = e => { let a = ((e.angle % 180) + 180) % 180; return a < 60 ? 0 : a < 120 ? 1 : 2; };
  function setConquered(s, h, on) {
    if (!!h.conquered === on) return;
    h.conquered = on;
    R().log(s, on ? 'Los bárbaros conquistan un hexágono de la costa (' + h.number + ').' : 'Se recupera el hexágono costero ' + h.number + '.');
    // edificios rodeados solo por hexágonos conquistados o el mar
    Object.entries(s.buildings).forEach(([v, b]) => {
      const hs = s.board.vertices[v].hexes.map(x => s.board.hexes[x]).filter(x => C.isLand(x.terrain));
      const conq = hs.length > 0 && hs.every(x => x.conquered);
      if (!!b.conquered !== conq) {
        b.conquered = conq;
        if (!s.players[b.owner].neutral) R().log(s, 'Un edificio de ' + name(s, b.owner) + (conq ? ' queda conquistado (sin puntos).' : ' vuelve a funcionar.'), b.owner);
      }
    });
    updateHarbormaster(s);
    R().updateLongestRoad(s);
  }
  function addBarbarian(s, h) {
    if (s.tb.barbSupply <= 0 || h.barbs >= 3) return false;
    h.barbs++;
    s.tb.barbSupply--;
    if (h.barbs >= 3) setConquered(s, h, true);
    return true;
  }
  function removeBarbarian(s, h, toSupply) {
    if (!h.barbs) return false;
    const was = h.barbs;
    h.barbs--;
    if (toSupply) s.tb.barbSupply++;
    if (was === 3) setConquered(s, h, false);
    return true;
  }
  function barbarianLanding(s, pid) {
    if (s.tb.barbSupply <= 0) return;
    const rolled = [];
    const landed = [];
    for (let i = 0; i < 3; i++) {
      let n;
      for (let k = 0; k < 200; k++) { n = die() + die(); if (n !== 7 && !rolled.includes(n)) break; }
      rolled.push(n);
      s.board.hexes.filter(h => h.coastal && h.number === n && !h.conquered).forEach(h => { if (addBarbarian(s, h)) landed.push(h.id); });
    }
    R().log(s, 'Los bárbaros desembarcan (' + rolled.join(', ') + '): ' + landed.length + ' bárbaro(s).', pid);
    R().event(s, { type: 'barbLand', rolled, landed });
  }
  function knightReach(s, from, steps) {
    const E = s.board.edges, V = s.board.vertices;
    const dist = new Map([[from, 0]]);
    const q = [from];
    while (q.length) {
      const e = q.shift();
      const d = dist.get(e);
      if (d >= steps) continue;
      for (const v of E[e].v) for (const n of V[v].edges) {
        if (dist.has(n) || !E[n].land) continue;
        dist.set(n, d + 1);
        q.push(n);
      }
    }
    dist.delete(from);
    return dist;
  }
  function knightTargets(s, from) {
    const k = s.tb.knights[from];
    if (!k) return [];
    const left = (k.boost ? 5 : 3) - k.used;
    if (left <= 0) return [];
    return [...knightReach(s, from, left)].filter(([e]) => !s.tb.knights[e]).map(([e, d]) => ({ edge: e, cost: d }));
  }
  function distributePrisoners(s, h, involved, cnt) {
    let n = h.barbs;
    const got = {};
    const give = p => { s.players[p].prisoners++; got[p] = (got[p] || 0) + 1; };
    const comp = p => { s.players[p].gold += 3; };
    const rollOff = list => { let top = list; for (let t = 0; t < 30 && top.length > 1; t++) { const r = {}; top.forEach(p => { r[p] = die() + die(); }); const m = Math.max(...top.map(p => r[p])); top = top.filter(p => r[p] === m); } return top[0]; };
    if (involved.length === 1) { for (let i = 0; i < n; i++) give(involved[0]); n = 0; }
    else if (n < involved.length) {
      let pool = involved.slice();
      for (let i = 0; i < n; i++) { const w = rollOff(pool); give(w); pool = pool.filter(p => p !== w); }
      pool.forEach(comp);
      n = 0;
    } else {
      involved.forEach(give);
      n -= involved.length;
      while (n > 0) {
        const m = Math.max(...involved.map(p => cnt[p]));
        const top = involved.filter(p => cnt[p] === m);
        const w = top.length === 1 ? top[0] : rollOff(top);
        give(w);
        top.filter(p => p !== w).forEach(comp);
        n--;
      }
    }
    return got;
  }
  function expel(s) {
    const results = [];
    for (const hid of s.board.coastOrder) {
      const h = s.board.hexes[hid];
      if (!h.barbs) continue;
      const ks = h.edges.filter(e => s.tb.knights[e]);
      if (ks.length <= h.barbs) continue;
      const cnt = {};
      ks.forEach(e => { const o = s.tb.knights[e].owner; cnt[o] = (cnt[o] || 0) + 1; });
      const involved = Object.keys(cnt).map(Number);
      const was = h.barbs;
      const got = distributePrisoners(s, h, involved, cnt);
      while (h.barbs) removeBarbarian(s, h, false);
      // bajas: el dado elige una orientación de caminos
      const d = die();
      const cls = (d - 1) % 3;
      const lost = [];
      ks.forEach(e => {
        if (edgeClass(s.board.edges[e]) !== cls) return;
        const k = s.tb.knights[e];
        delete s.tb.knights[e];
        s.players[k.owner].knightsLeft++;
        s.players[k.owner].gold += 3;
        lost.push(k.owner);
      });
      R().log(s, '¡Victoria en el hexágono ' + h.number + '! ' + was + ' bárbaro(s) prisionero(s): ' +
        Object.entries(got).map(([p, n]) => name(s, p) + ' ' + n).join(', ') + '. Dado de bajas: ' + d + (lost.length ? ' (' + lost.length + ' caballero(s) caen, +3 oro cada uno)' : '') + '.');
      results.push({ hex: hid, got, d, lost });
    }
    if (results.length) R().event(s, { type: 'expel', results });
  }

  // ================= Mercaderes y Bárbaros (escenario 5) =================
  const TR_DECK = { knight: 15, roadBuilding: 3, swiftJourney: 3, vp: 3 };
  const TR_DECK_BIG = { knight: 21, roadBuilding: 6, swiftJourney: 6, vp: 3 };
  const TR_VP = ['toolmaking', 'glassmaking', 'quarry'];
  const TRAIN = [
    null,
    { mp: 4, gold: 1, drive: [], cost: null },
    { mp: 5, gold: 2, drive: [6], cost: { wood: 1, wheat: 1 } },
    { mp: 5, gold: 3, drive: [5, 6], cost: { sheep: 1, wheat: 1, ore: 1 } },
    { mp: 6, gold: 4, drive: [5, 6], cost: { wood: 1, wheat: 1, ore: 2 } },
    { mp: 6, gold: 5, drive: [4, 5, 6], cost: { sheep: 1, wheat: 2, ore: 2 } }
  ];
  const GOOD_NAME = { glass: 'vidrio', marble: 'mármol', sand: 'arena', tools: 'herramientas' };
  const GOOD_DEST = { glass: 'castle', marble: 'castle', tools: 'quarry', sand: 'glassworks' };
  const PLAZA_NAME = { castle: 'el castillo', quarry: 'la cantera', glassworks: 'la vidriería' };
  function initTraders(s) {
    s.robber = null;
    const d = [];
    Object.entries(big(s) ? TR_DECK_BIG : TR_DECK).forEach(([k, n]) => { for (let i = 0; i < n; i++) d.push(k); });
    s.devDeck = shuffle(d);
    s.tb.vpDealt = 0;
    const mk = (a, b, n) => shuffle(Array.from({ length: n }, (_, i) => (i % 2 ? a : b)));
    const m = big(s) ? 1.5 : 1;
    s.tb.stacks = { castle: mk('tools', 'sand', 12), quarry: mk('marble', 'sand', Math.round(12 * m)), glassworks: mk('glass', 'tools', Math.round(12 * m)) };
    // 3 bárbaros en caminos repartidos por la isla
    const cand = shuffle(s.board.edges.filter(e => e.land && e.interior === undefined && e.hexes.length === 2 && e.hexes.every(h => C.isLand(s.board.hexes[h].terrain))).map(e => e.id));
    s.tb.barbs = [];
    for (const e of cand) {
      if (s.tb.barbs.length >= 3) break;
      const E = s.board.edges[e];
      if (s.tb.barbs.every(o => Math.hypot(s.board.edges[o].x - E.x, s.board.edges[o].y - E.y) > 2.2)) s.tb.barbs.push(e);
    }
    s.players.forEach(P => { P.wagon = { v: null, level: 1, mp: 4, moved: false, boosted: false, stopped: false, tried: [] }; P.cargo = null; P.delivered = 0; });
  }
  const plazaHex = (s, v) => s.board.vertices[v].plaza;
  function wagonEdgeCost(s, pid, e) {
    const r = s.roads[e];
    let mp = 2, gold = 0, payTo = null;
    if (r && !r.damaged) {
      mp = 1;
      if (r.owner !== pid) { gold = 1; payTo = r.owner; }
    }
    if (s.tb.barbs.includes(e)) mp += 2;
    return { mp, gold, payTo };
  }
  // Vértices alcanzables por la carreta: Map v -> {mp, gold, path:[edges]}
  function wagonReach(s, pid) {
    const P = s.players[pid], W = P.wagon;
    const out = new Map();
    if (!W || W.v === null || W.stopped || W.mp <= 0) return out;
    const V = s.board.vertices, E = s.board.edges;
    const best = new Map([[W.v, { mp: 0, gold: 0, path: [] }]]);
    const q = [W.v];
    while (q.length) {
      q.sort((a, b) => best.get(a).mp - best.get(b).mp || best.get(a).gold - best.get(b).gold);
      const v = q.shift();
      const cur = best.get(v);
      if (v !== W.v && plazaHex(s, v) !== undefined) continue; // en una plaza hay que detenerse
      for (const e of V[v].edges) {
        if (!E[e].land) continue;
        const o = E[e].v[0] === v ? E[e].v[1] : E[e].v[0];
        const c = wagonEdgeCost(s, pid, e);
        const nm = cur.mp + c.mp, ng = cur.gold + c.gold;
        if (nm > W.mp || ng > P.gold) continue;
        const b = best.get(o);
        if (!b || nm < b.mp || (nm === b.mp && ng < b.gold)) { best.set(o, { mp: nm, gold: ng, path: cur.path.concat([e]) }); if (!q.includes(o)) q.push(o); }
      }
    }
    best.forEach((x, v) => { if (v !== W.v) out.set(v, x); });
    return out;
  }
  function arriveAtPlaza(s, pid, v) {
    const P = s.players[pid];
    const kind = s.board.hexes[plazaHex(s, v)].terrain;
    if (P.cargo && GOOD_DEST[P.cargo] === kind) {
      const g = TRAIN[P.wagon.level].gold;
      P.delivered++;
      P.gold += g;
      R().log(s, name(s, pid) + ' entrega ' + GOOD_NAME[P.cargo] + ' en ' + PLAZA_NAME[kind] + ': +1 PV y ' + g + ' oro.', pid);
      R().event(s, { type: 'deliver', pid, good: P.cargo, gold: g });
      P.cargo = null;
    }
    if (!P.cargo) {
      const st = s.tb.stacks[kind];
      if (st && st.length) {
        P.cargo = st.pop();
        R().log(s, name(s, pid) + ' carga ' + GOOD_NAME[P.cargo] + ' para llevar a ' + PLAZA_NAME[GOOD_DEST[P.cargo]] + '.', pid);
        R().event(s, { type: 'cargo', pid, good: P.cargo });
      }
    }
  }
  const barbFreeEdges = s => s.board.edges.filter(e => e.land && !s.tb.barbs.includes(e.id)).map(e => e.id);
  function moveBarbarian(s, pid, from, to, steal) {
    const i = s.tb.barbs.indexOf(from);
    if (i < 0) return 'Elige uno de los bárbaros';
    if (!barbFreeEdges(s).includes(to)) return 'Elige un camino libre de bárbaros';
    s.tb.barbs[i] = to;
    R().log(s, name(s, pid) + ' mueve un bárbaro.', pid);
    R().event(s, { type: 'barbMove', from, to });
    const r = s.roads[to];
    if (steal && r && r.owner !== pid && !s.players[r.owner].neutral) {
      const V = s.players[r.owner];
      const c = randomCard(V);
      if (c) { V.resources[c]--; s.players[pid].resources[c]++; R().log(s, name(s, pid) + ' roba una carta a ' + V.name + '.', pid); R().event(s, { type: 'steal', from: r.owner, to: pid, res: c }); }
    }
    return null;
  }

  // ================= jugadores en pareja (5-6) =================
  function startP2(s) {
    const p1 = s.current;
    let p2 = p1;
    for (let i = 0; i < 3; i++) p2 = (p2 + 1) % s.players.length;
    s.tb.p2 = { p1, p2 };
    s.current = p2;
    s.phase = 'main';
    s.devPlayed = false;
    s.tb.goldBuys = 0;
    s.tb.builtThisPart = false;
    s.trade = null;
    startPartFor(s, p2);
    R().log(s, name(s, p2) + ' juega como jugador 2 (solo comercia con el banco).', p2);
    R().event(s, { type: 'pair', p1, p2 });
    R().checkWin(s, p2);
  }
  function startPartFor(s, pid) {
    const P = s.players[pid];
    if (s.tb.knights) Object.values(s.tb.knights).forEach(k => { if (k.owner === pid) { k.used = 0; k.boost = false; } });
    if (P.wagon) Object.assign(P.wagon, { mp: TRAIN[P.wagon.level].mp, moved: false, boosted: false, stopped: false, tried: [] });
  }
  function onTurnStart(s) {
    s.tb.rolls = 0;
    s.tb.firstRoll = null;
    s.tb.goldBuys = 0;
    s.tb.p2 = null;
    s.tb.builtThisPart = false;
    s.tb.knightSwap = false;
    startPartFor(s, s.current);
  }
  // fin de la parte de un jugador: votación de camellos, expulsión de bárbaros, pareja
  function endTurn(s, pid) {
    if (C.MODES[s.mode].specialBuild) return null;
    if (s.phase !== 'main' && s.phase !== 'tbMove') return R().err('Ahora no puedes terminar el turno');
    if (sc(s) === 4 && Object.keys(s.tb.knights).some(e => s.tb.knights[e].owner === pid && castleEdges(s).has(+e) && knightTargets(s, +e).some(t => !castleEdges(s).has(t.edge))))
      return R().err('Antes de terminar, mueve tus caballeros fuera de los caminos del castillo');
    s.trade = null;
    if (sc(s) === 4) expel(s);
    const cont = () => finishPart(s);
    if (sc(s) === 3 && s.tb.builtThisPart) { s.tb.builtThisPart = false; if (startVote(s, pid, cont)) return true; return true; }
    cont();
    return true;
  }
  function finishPart(s) {
    if (s.phase === 'ended') return;
    if (s.tb.pairs && !s.tb.p2) { startP2(s); return; }
    if (s.tb.p2) { s.current = s.tb.p2.p1; s.tb.p2 = null; }
    R().nextTurn(s);
  }

  // ================= acciones =================
  function handle(s, pid, a) {
    const t = a.type;
    const P = s.players[pid];
    if (P && P.neutral) return err('Los neutrales no juegan');

    // fases de varios jugadores
    if (s.phase === 'tbGive') {
      if (t !== 'tbGive') return err('Esperando la entrega de recursos');
      const pend = s.tb.pending;
      const pair = pend.pairs.find(x => x.from === pid);
      if (!pair) return err('No tienes que entregar nada');
      const to = pair.to !== null ? pair.to : a.to;
      if (pair.to === null && !giveTargets(s, pid).includes(to)) return err('Elige un jugador con menos puntos');
      const r = a.resources || {};
      if (C.total(r) !== 1 || !C.hasRes(P.resources, r) || RES.some(k => (r[k] || 0) < 0)) return err('Elige 1 recurso de tu mano');
      R().addRes(P.resources, r, -1);
      R().addRes(s.players[to].resources, r, 1);
      R().log(s, name(s, pid) + ' da 1 recurso a ' + name(s, to) + '.', pid);
      pend.pairs = pend.pairs.filter(x => x !== pair);
      if (!pend.pairs.length) nextPost(s);
      return ok();
    }
    if (s.phase === 'tbVote') {
      const V = s.tb.vote;
      if (t !== 'vote') return err('Votación en curso');
      if (V.order[V.idx] !== pid) return err('Espera tu turno para votar');
      const bid = { sheep: Math.max(0, a.sheep | 0), wheat: Math.max(0, a.wheat | 0) };
      if (!C.hasRes(P.resources, bid)) return err('No tienes esas cartas');
      const opts = camelOptions(s);
      V.bids[pid] = bid;
      V.prefs[pid] = opts[a.option] ? a.option | 0 : 0;
      R().log(s, name(s, pid) + ' vota con ' + (bid.sheep + bid.wheat) + ' carta(s).', pid);
      V.idx++;
      if (V.idx >= V.order.length) {
        const cont = V.cont;
        resolveVote(s);
        s.phase = 'main';
        if (cont) finishPart(s);
      }
      return ok();
    }
    if (pid !== s.current) {
      if (['tbSteal', 'tbNeutral', 'tbKnight', 'tbTreason', 'tbBarbarian', 'tbMove'].includes(s.phase)) return err('No es tu turno');
      if (s.tb.p2 && (t === 'respondTrade')) return err('El jugador 2 solo comercia con el banco');
      return null;
    }

    if (s.phase === 'tbSteal') {
      if (t !== 'tbSteal') return err('Elige a quién robar');
      const by = s.tb.pending ? s.tb.pending.by : pid;
      const vs = stealVictims(s, by);
      const v = vs.includes(a.victim) ? a.victim : vs[0];
      if (v !== undefined) {
        const c = randomCard(s.players[v]);
        s.players[v].resources[c]--; P.resources[c]++;
        R().log(s, name(s, pid) + ' roba una carta a ' + name(s, v) + '.', pid);
        R().event(s, { type: 'steal', from: v, to: pid, res: c });
      }
      s.tb.pending = null;
      if (s.tb.postQueue) nextPost(s); else s.phase = s.tb.pendingReturn || 'main';
      return ok();
    }
    if (s.phase === 'tbNeutral') {
      const nb = s.tb.neutralBuild;
      if (t !== 'neutralBuild') return err('Construye gratis para un jugador neutral');
      const opts = neutralOptions(s, nb.kind);
      const o = opts.find(x => x.pid === a.pid && x.at === a.at);
      if (!o) return err('Lugar no válido para el neutral');
      const N = s.players[o.pid];
      if (o.kind === 'road') { s.roads[o.at] = { owner: N.id, type: 'road', turn: s.turn }; N.pieces.road--; }
      else { s.buildings[o.at] = { owner: N.id, type: 'settlement' }; N.pieces.settlement--; }
      R().log(s, name(s, pid) + ' construye ' + (o.kind === 'road' ? 'una carretera' : 'un poblado') + ' para ' + N.name + '.', pid);
      R().event(s, { type: 'build', what: o.kind, pid: N.id, at: o.at });
      R().updateLongestRoad(s);
      s.phase = nb.ret;
      s.tb.neutralBuild = null;
      updateHarbormaster(s);
      R().checkWin(s, pid);
      return ok();
    }
    if (s.phase === 'tbKnight') {
      if (t !== 'placeKnight') return err('Coloca tu caballero');
      const ks = s.tb.knightPlace;
      const spots = knightSpots(s, ks.any);
      if (!spots.includes(a.edge)) return err('Lugar no válido para el caballero');
      s.tb.knights[a.edge] = { owner: pid, used: 0, boost: false };
      P.knightsLeft--;
      R().log(s, name(s, pid) + ' coloca un caballero.', pid);
      R().event(s, { type: 'knightPlace', pid, edge: a.edge });
      s.phase = 'main';
      s.tb.knightPlace = null;
      return ok();
    }
    if (s.phase === 'tbTreason') {
      if (t !== 'treason') return err('Mueve los bárbaros');
      const moves = (a.moves || []).slice(0, 2);
      const froms = new Set();
      for (const m of moves) {
        const h1 = m.from === null || m.from === undefined ? null : s.board.hexes[m.from];
        const h2 = s.board.hexes[m.to];
        if (!h2 || !h2.coastal || h2.conquered || h2.barbs >= 3 || (h1 && (!h1.coastal || !h1.barbs || froms.has(h1.id) || h1.id === h2.id))) return err('Movimiento de bárbaros no válido');
        if (h1) { froms.add(h1.id); removeBarbarian(s, h1, false); } else if (s.tb.barbSupply > 0) s.tb.barbSupply--; else continue;
        h2.barbs++;
        if (h2.barbs >= 3) setConquered(s, h2, true);
      }
      R().log(s, name(s, pid) + ' mueve ' + moves.length + ' bárbaro(s) con la Traición.', pid);
      s.phase = 'main';
      return ok();
    }
    if (s.phase === 'tbBarbarian') {
      if (t !== 'moveBarbarian') return err('Mueve un bárbaro');
      const e = moveBarbarian(s, pid, a.from, a.to, true);
      if (e) return err(e);
      s.phase = s.tb.barbReturn || 'main';
      s.tb.barbReturn = null;
      return ok();
    }

    if (s.phase === 'roll') {
      if (t === 'roll') return { result: roll(s, pid, a) };
      if (t === 'playDev' && sc(s) === 5 && a.card === 'knight') return playTraderKnight(s, pid);
      if (t === 'fishAction' || t === 'tokenAction') return err('Primero tira los dados');
      return null;
    }

    if (s.phase === 'main') {
      if (s.tb.p2 && ['offerTrade', 'confirmTrade'].includes(t)) return err('El jugador 2 solo comercia con el banco');
      switch (t) {
        case 'bankTrade':
          if (a.give === 'gold' || a.get === 'gold') return goldTrade(s, pid, a);
          return null;
        case 'buildRoad':
          if (P.damaged !== null) return err('Tienes una carretera dañada por el terremoto: repárala primero');
          return null;
        case 'repairRoad': {
          if (P.damaged === null) return err('No tienes carreteras dañadas');
          if (!C.hasRes(P.resources, COST.repair)) return err('Necesitas 1 madera y 1 arcilla');
          R().pay(s, pid, COST.repair);
          if (s.roads[P.damaged]) delete s.roads[P.damaged].damaged;
          P.damaged = null;
          R().log(s, name(s, pid) + ' repara su carretera.', pid);
          return ok();
        }
        case 'buildBridge': return buildBridge(s, pid, a);
        case 'fishAction': return fishAction(s, pid, a);
        case 'giveBoot': {
          if (s.tb.boot !== pid) return err('No tienes la bota vieja');
          const T = s.players[a.to];
          if (!T || T.neutral || T.id === pid || C.publicVP(s, T.id) < C.publicVP(s, pid)) return err('Solo puedes darla a quien tenga tantos o más puntos que tú');
          s.tb.boot = T.id;
          R().log(s, name(s, pid) + ' le pasa la bota vieja a ' + T.name + '.', pid);
          R().event(s, { type: 'boot', pid: T.id });
          return ok();
        }
        case 'tokenAction': return tokenAction(s, pid, a);
        case 'discardKnight': {
          if (!s.tb.two) return err('Solo en Catan para dos');
          if (s.tb.knightSwap) return err('Solo una vez por turno');
          if (P.knights <= 0) return err('No tienes caballeros jugados');
          P.knights--;
          P.tokens += 2;
          s.tb.knightSwap = true;
          if (s.largestArmy === pid) {
            const o = real(s).find(p => p.id !== pid);
            if (P.knights < 3 || (o && o.knights >= P.knights)) { s.largestArmy = o && o.knights >= 3 && o.knights > P.knights ? o.id : null; R().log(s, name(s, pid) + ' deja el Gran Ejército.'); }
          }
          R().log(s, name(s, pid) + ' descarta un caballero y toma 2 fichas de comercio.', pid);
          return ok();
        }
        case 'buyDev': if (sc(s) === 4) return buyBarbarianDev(s, pid); if (sc(s) === 5) return buyTraderDev(s, pid); return null;
        case 'playDev':
          if (sc(s) === 5 && a.card === 'knight') return playTraderKnight(s, pid);
          if (sc(s) === 5 && a.card === 'swiftJourney') return swiftJourney(s, pid);
          return null;
        case 'upgradeWagon': {
          if (sc(s) !== 5) return err('Acción no disponible');
          const W = P.wagon;
          if (W.level >= 5) return err('Tu tren de equipaje ya está al máximo');
          const cost = TRAIN[W.level + 1].cost;
          if (!C.hasRes(P.resources, cost)) return err('Recursos insuficientes');
          R().pay(s, pid, cost);
          W.level++;
          W.mp += TRAIN[W.level].mp - TRAIN[W.level - 1].mp;
          R().log(s, name(s, pid) + ' mejora su tren de equipaje al nivel ' + W.level + (W.level === 5 ? ' (+1 PV)' : '') + '.', pid);
          R().event(s, { type: 'train', pid, level: W.level });
          R().checkWin(s, pid);
          return ok();
        }
        case 'startMove':
          if (!hasMove(s)) return err('Acción no disponible');
          s.trade = null;
          s.phase = 'tbMove';
          return ok();
        case 'moveKnight': case 'boostKnight': case 'moveWagon': case 'boostWagon': case 'driveBarbarian':
          return err('Primero pasa a la fase de movimiento');
        case 'endTurn': { if (C.MODES[s.mode].specialBuild) return null; const r = endTurn(s, pid); return { result: r === true ? undefined : r }; }
      }
      return null;
    }

    if (s.phase === 'tbMove') {
      switch (t) {
        case 'moveKnight': {
          const k = s.tb.knights[a.from];
          if (!k || k.owner !== pid) return err('Elige uno de tus caballeros');
          if (a.boost && !k.boost) {
            if (!C.hasRes(P.resources, COST.knightBoost)) return err('Necesitas 1 cereal para mover 5 caminos');
            R().pay(s, pid, COST.knightBoost);
            k.boost = true;
          }
          const tg = knightTargets(s, a.from).find(x => x.edge === a.to);
          if (!tg) return err('Ese caballero no llega ahí');
          k.used += tg.cost;
          delete s.tb.knights[a.from];
          s.tb.knights[a.to] = k;
          R().event(s, { type: 'knightMove', pid, from: a.from, to: a.to });
          return ok();
        }
        case 'boostKnight': {
          const k = s.tb.knights[a.from];
          if (!k || k.owner !== pid || k.boost) return err('Elige uno de tus caballeros');
          if (!C.hasRes(P.resources, COST.knightBoost)) return err('Necesitas 1 cereal');
          R().pay(s, pid, COST.knightBoost);
          k.boost = true;
          return ok();
        }
        case 'moveWagon': {
          const r = wagonReach(s, pid).get(a.to);
          if (!r) return err('La carreta no llega ahí');
          const W = P.wagon;
          r.path.forEach(e => { const c = wagonEdgeCost(s, pid, e); if (c.gold) { P.gold -= c.gold; s.players[c.payTo].gold += c.gold; } });
          W.mp -= r.mp;
          W.v = a.to;
          W.moved = true;
          if (r.gold) R().log(s, name(s, pid) + ' paga ' + r.gold + ' oro por usar carreteras ajenas.', pid);
          R().event(s, { type: 'wagonMove', pid, to: a.to });
          if (plazaHex(s, a.to) !== undefined) { W.stopped = true; W.mp = 0; arriveAtPlaza(s, pid, a.to); }
          R().checkWin(s, pid);
          return ok();
        }
        case 'boostWagon': {
          const W = P.wagon;
          if (W.boosted) return err('Solo una vez por turno');
          if (W.stopped) return err('La carreta se detuvo en una plaza');
          if (!C.hasRes(P.resources, COST.wagonBoost)) return err('Necesitas 1 cereal');
          R().pay(s, pid, COST.wagonBoost);
          W.boosted = true;
          W.mp += 2;
          return ok();
        }
        case 'driveBarbarian': {
          const W = P.wagon;
          if (W.level < 2) return err('Necesitas mejorar el tren de equipaje para ahuyentar bárbaros');
          if (!s.tb.barbs.includes(a.edge) || !s.board.edges[a.edge].v.includes(W.v)) return err('La carreta debe estar junto a ese bárbaro');
          if (W.tried.includes(a.edge)) return err('Ya lo intentaste este turno');
          if (!barbFreeEdges(s).includes(a.to)) return err('Elige a dónde mandarlo');
          W.tried.push(a.edge);
          const d = a.forced || die();
          const win = TRAIN[W.level].drive.includes(d);
          R().log(s, name(s, pid) + ' intenta ahuyentar a un bárbaro: sale ' + d + (win ? '. ¡Lo consigue!' : '. No lo consigue.'), pid);
          R().event(s, { type: 'drive', pid, d, win });
          if (win) { const i = s.tb.barbs.indexOf(a.edge); W.tried.push(a.to); s.tb.barbs[i] = a.to; }
          return ok();
        }
        case 'endTurn': { const r = endTurn(s, pid); return { result: r === true ? undefined : r }; }
        case 'playDev':
          if (sc(s) === 5 && a.card === 'swiftJourney') return swiftJourney(s, pid);
          return err('En la fase de movimiento no se juegan cartas');
      }
      return err('En la fase de movimiento ya no se comercia ni se construye');
    }
    return null;
  }

  function goldTrade(s, pid, a) {
    const P = s.players[pid];
    if (!usesGold(s)) return err('En este escenario no hay oro');
    if (a.give === 'gold') {
      if (!RES.includes(a.get)) return err('Comercio inválido');
      if (s.tb.p2 && sc(s) === 5) return err('El jugador 2 no puede comprar con oro en este escenario');
      if (s.tb.goldBuys >= 2) return err('Solo puedes comprar con oro 2 veces por turno');
      if (P.gold < 2) return err('Necesitas 2 de oro');
      if (s.bank[a.get] < 1) return err('El banco no tiene ese recurso');
      P.gold -= 2; s.bank[a.get]--; P.resources[a.get]++;
      s.tb.goldBuys++;
      R().log(s, name(s, pid) + ' cambia 2 de oro por 1 ' + C.RES_NAME[a.get] + '.', pid);
    } else {
      if (!RES.includes(a.give)) return err('Comercio inválido');
      const ratio = Math.min(4, ...Object.entries(s.buildings).filter(([v, b]) => b.owner === pid && !b.conquered && s.board.vertices[v].port === 'any').map(() => 3));
      if (P.resources[a.give] < ratio) return err('Necesitas ' + ratio + ' ' + C.RES_NAME[a.give]);
      R().pay(s, pid, { [a.give]: ratio });
      P.gold++;
      R().log(s, name(s, pid) + ' cambia ' + ratio + ' ' + C.RES_NAME[a.give] + ' por 1 de oro.', pid);
    }
    R().event(s, { type: 'trade', a: pid, b: null });
    return ok();
  }

  function buildBridge(s, pid, a) {
    const P = s.players[pid];
    if (sc(s) !== 2) return err('Solo en Los ríos de Catan');
    if (P.pieces.bridge <= 0) return err('Ya construiste tus 3 puentes');
    if (!C.hasRes(P.resources, COST.bridge)) return err('Necesitas 2 arcilla y 1 madera');
    if (!bridgeSpots(s, pid).includes(a.edge)) return err('El puente va en un sitio de puente conectado a tu red');
    R().pay(s, pid, COST.bridge);
    s.roads[a.edge] = { owner: pid, type: 'road', bridge: true, turn: s.turn };
    P.pieces.bridge--;
    addGold(s, pid, 3, 'puente');
    R().log(s, name(s, pid) + ' construye un puente.', pid);
    R().event(s, { type: 'build', what: 'bridge', pid, at: a.edge });
    R().updateLongestRoad(s);
    R().checkWin(s, pid);
    return ok();
  }
  function bridgeSpots(s, pid) {
    if (sc(s) !== 2) return [];
    return s.board.bridgeSites.filter(e => !s.roads[e] && R().edgeConnected(s, pid, e, 'road'));
  }

  function fishAction(s, pid, a) {
    const P = s.players[pid];
    if (sc(s) !== 1) return err('Solo en Los pescadores de Catan');
    const cost = fishCost(s, pid, a.action);
    if (!cost && cost !== 0) return err('Acción no válida');
    const idx = [...new Set((a.tokens || []).map(Number))].filter(i => P.fish[i] !== undefined);
    const sum = idx.reduce((x, i) => x + P.fish[i], 0);
    if (sum < cost) return err('Necesitas ' + cost + ' peces');
    switch (a.action) {
      case 'robberOff': if (s.robber === null) return err('El ladrón no está en el tablero'); break;
      case 'steal': if (!stealVictims(s, pid).includes(a.victim)) return err('Elige un jugador con cartas'); break;
      case 'resource': if (!RES.includes(a.resource) || s.bank[a.resource] < 1) return err('Elige un recurso del banco'); break;
      case 'road': if (P.pieces.road <= 0 || P.damaged !== null || !C.validRoutes(s, pid, 'road').length) return err('No puedes construir carreteras'); break;
      case 'dev': if (!s.devDeck.length) return err('No quedan cartas de desarrollo'); break;
    }
    idx.sort((x, y) => y - x).forEach(i => { s.tb.fishUsed.push(P.fish[i]); P.fish.splice(i, 1); });
    R().log(s, name(s, pid) + ' usa ' + sum + ' peces: ' + FISH_NAME[a.action] + '.', pid);
    R().event(s, { type: 'fishAction', pid, action: a.action });
    switch (a.action) {
      case 'robberOff': s.robber = null; break;
      case 'steal': {
        const V = s.players[a.victim];
        const c = randomCard(V);
        V.resources[c]--; P.resources[c]++;
        R().event(s, { type: 'steal', from: a.victim, to: pid, res: c });
        break;
      }
      case 'resource': s.bank[a.resource]--; P.resources[a.resource]++; break;
      case 'road': s.freeRoads = 1; s.roadReturn = 'main'; s.phase = 'roadBuilding'; break;
      case 'dev': {
        const card = s.devDeck.pop();
        const dc = { type: card, turn: s.turn };
        if (card === 'vp') { dc.variant = ['university', 'market', 'library', 'chapel', 'hall'][(s.vpDealt || 0) % 5]; s.vpDealt = (s.vpDealt || 0) + 1; }
        P.devCards.push(dc);
        R().event(s, { type: 'dev', pid });
        break;
      }
    }
    R().checkWin(s, pid);
    return ok();
  }

  function tokenAction(s, pid, a) {
    const P = s.players[pid];
    if (!s.tb.two || sc(s) === 1) return err('Solo en Catan para dos');
    const opp = real(s).find(p => p.id !== pid);
    const cost = C.publicVP(s, pid) <= C.publicVP(s, opp.id) ? 1 : 2;
    if (P.tokens < cost) return err('Necesitas ' + cost + ' ficha(s) de comercio');
    if (a.action === 'forcedTrade') {
      const give = a.give || {};
      if (C.total(give) !== 2 || !C.hasRes(P.resources, give) || RES.some(k => (give[k] || 0) < 0)) return err('Elige 2 cartas de tu mano para dar');
      if (!C.total(opp.resources)) return err('Tu rival no tiene cartas');
      const took = [];
      for (let i = 0; i < 2; i++) { const c = randomCard(opp); if (!c) break; opp.resources[c]--; took.push(c); }
      R().addRes(P.resources, give, -1);
      R().addRes(opp.resources, give, 1);
      took.forEach(c => { P.resources[c]++; });
      R().log(s, name(s, pid) + ' hace un comercio forzoso con ' + opp.name + '.', pid);
    } else if (a.action === 'robberHome') {
      const home = s.board.hexes.find(h => h.terrain === 'desert' || h.terrain === 'swamp');
      if (!home || s.robber === home.id) return err('El ladrón ya está allí');
      s.robber = home.id;
      R().log(s, name(s, pid) + ' manda al ladrón al ' + (home.terrain === 'swamp' ? 'pantano.' : 'desierto.'), pid);
      R().event(s, { type: 'robber', pirate: false, pid, hex: home.id });
    } else return err('Acción no válida');
    P.tokens -= cost;
    return ok();
  }

  // ----- cartas del escenario 4 (se juegan al comprarlas) -----
  function knightSpots(s, any) {
    if (any) return s.board.edges.filter(e => e.land && !s.tb.knights[e.id]).map(e => e.id);
    return [...castleEdges(s)].filter(e => !s.tb.knights[e]);
  }
  function buyBarbarianDev(s, pid) {
    const P = s.players[pid];
    if (!C.hasRes(P.resources, C.COST.dev)) return err('Recursos insuficientes');
    if (!s.devDeck.length) { s.devDeck = shuffle(s.tb.devDiscard); s.tb.devDiscard = []; }
    R().pay(s, pid, C.COST.dev);
    let card;
    for (let k = 0; k < 30; k++) {
      card = s.devDeck.pop();
      if (!card) { s.devDeck = shuffle(s.tb.devDiscard); s.tb.devDiscard = []; card = s.devDeck.pop(); }
      s.tb.devDiscard.push(card);
      if (card !== 'intrigue' || s.board.hexes.some(h => h.coastal && h.barbs)) break;
    }
    R().log(s, name(s, pid) + ' compra y juega ' + BA_NAME[card] + '.', pid);
    R().event(s, { type: 'tbDev', pid, card });
    if (card === 'knighthood' || card === 'swiftKnight') {
      const any = card === 'swiftKnight';
      if (P.knightsLeft > 0 && knightSpots(s, any).length) { s.tb.knightPlace = { any }; s.phase = 'tbKnight'; }
    } else if (card === 'treason') {
      P.gold += 2;
      s.phase = 'tbTreason';
    } else if (card === 'intrigue') {
      const hs = s.board.hexes.filter(h => h.coastal && h.barbs);
      if (hs.length) {
        // se elige el hexágono que más amenaza tus edificios (y si no, el que más bárbaros tiene)
        const mine = h => h.vertices.some(v => s.buildings[v] && s.buildings[v].owner === pid) ? 10 : 0;
        const h = hs.sort((x, y) => (mine(y) + y.barbs) - (mine(x) + x.barbs))[0];
        removeBarbarian(s, h, false);
        P.prisoners++;
        R().log(s, name(s, pid) + ' hace prisionero a un bárbaro.', pid);
      }
    }
    R().checkWin(s, pid);
    return ok();
  }

  // ----- cartas del escenario 5 -----
  function buyTraderDev(s, pid) {
    const P = s.players[pid];
    if (!C.hasRes(P.resources, C.COST.dev)) return err('Recursos insuficientes');
    if (!s.devDeck.length) return err('No quedan cartas de desarrollo');
    R().pay(s, pid, C.COST.dev);
    const card = s.devDeck.pop();
    const dc = { type: card, turn: s.turn };
    if (card === 'vp') { dc.variant = TR_VP[s.tb.vpDealt % 3]; s.tb.vpDealt++; }
    P.devCards.push(dc);
    R().log(s, name(s, pid) + ' compra una carta de desarrollo.', pid);
    R().event(s, { type: 'dev', pid });
    R().checkWin(s, pid);
    return ok();
  }
  function swiftJourney(s, pid) {
    const P = s.players[pid], W = P.wagon;
    if (s.devPlayed) return err('Ya jugaste una carta este turno');
    const i = P.devCards.findIndex(c => c.type === 'swiftJourney' && c.turn !== s.turn);
    if (i < 0) return err('No puedes jugar esa carta');
    if (!W.moved) return err('Primero mueve tu carreta este turno');
    P.devCards.splice(i, 1);
    s.devPlayed = true;
    W.mp = TRAIN[W.level].mp;
    W.stopped = false;
    W.tried = [];
    R().log(s, name(s, pid) + ' juega Viaje rápido: su carreta puede moverse otra vez.', pid);
    R().event(s, { type: 'playDev', card: 'swiftJourney', pid });
    return ok();
  }
  function playTraderKnight(s, pid) {
    const P = s.players[pid];
    if (s.devPlayed) return err('Ya jugaste una carta este turno');
    const i = P.devCards.findIndex(c => c.type === 'knight' && c.turn !== s.turn);
    if (i < 0) return err('No puedes jugar esa carta');
    P.devCards.splice(i, 1);
    s.devPlayed = true;
    P.knights++;
    R().log(s, name(s, pid) + ' juega un Caballero: mueve un bárbaro.', pid);
    R().event(s, { type: 'playDev', card: 'knight', pid });
    s.tb.barbReturn = s.phase;
    s.phase = 'tbBarbarian';
    return ok();
  }

  // ================= vista =================
  function redact(s, v, pid) {
    v.players.forEach(p => {
      p.fishCount = (s.players[p.id].fish || []).length;
      if (p.id !== pid && s.phase !== 'ended') p.fish = null;
    });
    if (v.tb.eventDeck) v.tb.eventDeck = s.tb.eventDeck.length;
    if (v.tb.fishBag) v.tb.fishBag = s.tb.fishBag.length;
    if (v.tb.stacks) Object.keys(v.tb.stacks).forEach(k => { v.tb.stacks[k] = s.tb.stacks[k].length; });
    delete v.tb.devDiscard;
    delete v.tb.postQueue;
    if (s.tb.vote) v.tb.vote.bids = Object.fromEntries(Object.entries(s.tb.vote.bids));
  }

  // quién debe actuar en las fases de varios jugadores (para la máquina)
  function waiting(s) {
    if (s.phase === 'tbGive') return s.tb.pending.pairs.map(x => x.from);
    if (s.phase === 'tbVote') return [s.tb.vote.order[s.tb.vote.idx]];
    return null;
  }
  function actor(s) {
    const w = waiting(s);
    if (w) return w[0];
    return undefined;
  }

  C.TB = {
    SCENARIOS, EVENT_NAME, EVENT_HELP, COST, FISH_COST, FISH_NAME, BA_NAME, BA_HELP, TRAIN, GOOD_NAME, GOOD_DEST, PLAZA_NAME, TR_VP,
    init, handle, roll, target, nextPost, extraVP, edgeWeight, settleOk, roadOk, robberHexes, afterProduce, afterBuild, afterSetupSettlement,
    afterSetupRoad, afterSetup, onTurnStart, endTurn, redact, waiting, actor,
    harborPoints, coinRanks, camelOptions, camelBonus, castleEdges, knightTargets, knightSpots, wagonReach, wagonEdgeCost, barbFreeEdges,
    bridgeSpots, neutralOptions, stealVictims, giveTargets, fishCost, usesGold, hasMove, real, knightsOnBoard, edgeClass
  };
})(typeof window !== 'undefined' ? window : globalThis);
