// Ciudades y Caballeros: mercancías, dado de eventos, bárbaros, caballeros,
// murallas, mejoras de ciudad, metrópolis y cartas de progreso.
(function (root) {
  const C = root.Catan;
  const R = () => C._R;
  const { RES, TERRAIN_RES, isLand, shuffle } = C;
  const COMM = ['paper', 'cloth', 'coin'];
  const KEYS = RES.concat(COMM);

  const AREAS = ['trade', 'politics', 'science'];
  const AREA_COMM = { trade: 'cloth', politics: 'coin', science: 'paper' };
  const AREA_NAME = { trade: 'Comercio', politics: 'Política', science: 'Ciencia' };
  const AREA_COLOR = { trade: '#e9b92d', politics: '#2f6fd6', science: '#2f9a4a' };
  const IMPROVEMENTS = {
    trade: ['Mercado', 'Casa de comercio', 'Gremio de comerciantes', 'Banco', 'Gran bolsa'],
    politics: ['Ayuntamiento', 'Iglesia', 'Fortaleza', 'Catedral', 'Gran asamblea'],
    science: ['Abadía', 'Biblioteca', 'Acueducto', 'Teatro', 'Universidad']
  };
  const METRO_NAME = { trade: 'Metrópolis del Comercio', politics: 'Metrópolis de la Política', science: 'Metrópolis de la Ciencia' };

  const PROGRESS = {
    science: { alchemist: 2, inventor: 2, crane: 2, irrigation: 2, engineer: 1, medicine: 2, mining: 2, printer: 1, roadBuilding: 2, smith: 2 },
    politics: { bishop: 2, constitution: 1, deserter: 2, diplomat: 2, intrigue: 2, saboteur: 2, spy: 3, warlord: 2, wedding: 2 },
    trade: { commercialHarbor: 2, masterMerchant: 2, merchant: 6, merchantFleet: 2, resourceMonopoly: 4, tradeMonopoly: 2 }
  };
  const PROGRESS_AREA = {};
  Object.entries(PROGRESS).forEach(([a, cards]) => Object.keys(cards).forEach(k => { PROGRESS_AREA[k] = a; }));
  const PROGRESS_NAME = {
    alchemist: 'Alquimista', inventor: 'Inventor', crane: 'Grúa', irrigation: 'Irrigación', engineer: 'Ingeniero', medicine: 'Medicina',
    mining: 'Minería', printer: 'Imprenta', roadBuilding: 'Construcción de carreteras', smith: 'Herrero',
    bishop: 'Obispo', constitution: 'Constitución', deserter: 'Desertor', diplomat: 'Diplomático', intrigue: 'Intriga', saboteur: 'Saboteador',
    spy: 'Espía', warlord: 'Señor de la guerra', wedding: 'Boda',
    commercialHarbor: 'Puerto comercial', masterMerchant: 'Maestro mercader', merchant: 'Mercader', merchantFleet: 'Flota mercante',
    resourceMonopoly: 'Monopolio de recursos', tradeMonopoly: 'Monopolio comercial'
  };
  const PROGRESS_HELP = {
    alchemist: 'Antes de tirar: eliges el resultado del dado rojo y del amarillo. El dado de eventos se tira normalmente.',
    inventor: 'Intercambia dos fichas numéricas (no 2, 12, 6 ni 8).',
    crane: 'Tu próxima mejora de ciudad de este turno cuesta 1 mercancía menos.',
    irrigation: 'Recibes 2 de cereal por cada campo junto a tus poblados o ciudades.',
    engineer: 'Construye una muralla gratis en una de tus ciudades.',
    medicine: 'Mejora un poblado a ciudad por solo 2 de mineral y 1 de cereal.',
    mining: 'Recibes 2 de mineral por cada montaña junto a tus poblados o ciudades.',
    printer: '1 punto de victoria (se juega al instante).',
    roadBuilding: 'Construye 2 carreteras gratis.',
    smith: 'Asciende gratis hasta 2 de tus caballeros.',
    bishop: 'Mueve el ladrón y roba 1 carta a cada jugador con poblado o ciudad junto a él.',
    constitution: '1 punto de victoria (se juega al instante).',
    deserter: 'Un rival retira uno de sus caballeros; tú colocas uno tuyo de la misma fuerza.',
    diplomat: 'Retira una carretera abierta (con un extremo libre). Si es tuya, puedes recolocarla.',
    intrigue: 'Desaloja un caballero rival que esté en un cruce de tus carreteras.',
    saboteur: 'Cada jugador con tantos o más puntos que tú descarta la mitad de sus cartas.',
    spy: 'Mira las cartas de progreso de un rival y quédate con una.',
    warlord: 'Activa gratis todos tus caballeros.',
    wedding: 'Cada jugador con más puntos que tú te da 2 cartas a su elección.',
    commercialHarbor: 'Das 1 recurso a cada rival y cada uno te da 1 mercancía a cambio.',
    masterMerchant: 'Mira la mano de un jugador con más puntos que tú y toma 2 cartas.',
    merchant: 'Coloca al mercader junto a tu poblado/ciudad: cambias ese recurso 2:1 y vale 1 PV mientras lo tengas.',
    merchantFleet: 'Durante este turno cambias un recurso o mercancía de tu elección 2:1 con el banco.',
    resourceMonopoly: 'Elige un recurso: cada rival te da hasta 2 de él.',
    tradeMonopoly: 'Elige una mercancía: cada rival te da 1 de ella.'
  };
  const EVENT_FACES = ['ship', 'ship', 'ship', 'trade', 'politics', 'science'];
  const KNIGHT_COST = { sheep: 1, ore: 1 };
  const ACTIVATE_COST = { wheat: 1 };
  const WALL_COST = { brick: 2 };
  const KNIGHT_NAME = { 1: 'caballero básico', 2: 'caballero fuerte', 3: 'caballero poderoso' };

  const err = m => ({ result: { error: m } });
  const ok = () => ({ result: undefined });
  const P_ = (s, pid) => s.players[pid];
  const name = (s, pid) => s.players[pid].name;

  function init(s, mode) {
    s.knights = {};
    s.pendingGive = {};
    s.ck = {
      barbarian: 0, track: 7, attacks: 0, event: null, redDie: null,
      metropolis: { trade: null, politics: null, science: null },
      decks: {}, merchant: null, crane: null, fleet: null, alchemist: null,
      peek: null, freeKnight: null, giveTo: null, pendingProgressDiscard: {}, lastAttack: null
    };
    AREAS.forEach(a => {
      const d = [];
      Object.entries(PROGRESS[a]).forEach(([k, n]) => { for (let i = 0; i < n; i++) d.push(k); });
      s.ck.decks[a] = shuffle(d);
    });
    COMM.forEach(k => { s.bank[k] = mode.commodities; });
    s.players.forEach(P => {
      COMM.forEach(k => { P.resources[k] = 0; });
      P.improve = { trade: 0, politics: 0, science: 0 };
      P.knightPieces = { 1: 2, 2: 2, 3: 2 };
      P.walls = 0;
      P.progress = [];
      P.ckVP = { defender: 0, progress: 0 };
    });
  }

  // ---------- consultas ----------
  const citiesOf = (s, pid) => Object.keys(s.buildings).map(Number).filter(v => s.buildings[v].owner === pid && s.buildings[v].type === 'city');
  const handLimit = (s, pid) => 7 + 2 * P_(s, pid).walls;
  function activeStrength(s, pid) {
    let n = 0;
    Object.values(s.knights).forEach(k => { if (k.owner === pid && k.active) n += k.level; });
    return n;
  }
  function totalStrength(s, pid) {
    let n = 0;
    Object.values(s.knights).forEach(k => { if (k.owner === pid) n += k.level; });
    return n;
  }
  function barbarianStrength(s) {
    return Object.values(s.buildings).filter(b => b.type === 'city').length;
  }
  function defense(s) { return s.players.reduce((a, p) => a + activeStrength(s, p.id), 0); }

  function knightSpots(s, pid) {
    return s.board.vertices.filter(v => v.land && !s.buildings[v.id] && !s.knights[v.id] &&
      v.edges.some(e => s.roads[e] && s.roads[e].owner === pid)).map(v => v.id);
  }

  // Cruces alcanzables por las carreteras de pid desde "from"
  function reachable(s, pid, from) {
    const seen = new Set([from]);
    const q = [from];
    const empty = [], displace = [];
    while (q.length) {
      const v = q.shift();
      for (const e of s.board.vertices[v].edges) {
        const r = s.roads[e];
        if (!r || r.owner !== pid) continue;
        const ed = s.board.edges[e];
        const o = ed.v[0] === v ? ed.v[1] : ed.v[0];
        if (seen.has(o)) continue;
        seen.add(o);
        const b = s.buildings[o], k = s.knights[o];
        if ((b && b.owner !== pid)) continue;
        if (k && k.owner !== pid) { displace.push(o); continue; }
        if (!b && !k) empty.push(o);
        q.push(o);
      }
    }
    return { empty, displace };
  }

  function knightTargets(s, pid, from) {
    const k = s.knights[from];
    if (!k || k.owner !== pid || !k.active || k.actTurn === s.turn) return { empty: [], displace: [] };
    const r = reachable(s, pid, from);
    r.displace = r.displace.filter(v => s.knights[v].level < k.level);
    return r;
  }

  function canChase(s, pid, v) {
    const k = s.knights[v];
    return !!(k && k.owner === pid && k.active && k.actTurn !== s.turn && s.ck.attacks > 0 &&
      s.board.vertices[v].hexes.includes(s.robber));
  }

  function promotable(s, pid, v, free) {
    const k = s.knights[v];
    const P = P_(s, pid);
    if (!k || k.owner !== pid || k.level >= 3) return false;
    if (!free && k.promTurn === s.turn) return false;
    if (k.level === 2 && P.improve.politics < 3) return false;
    return P.knightPieces[k.level + 1] > 0;
  }

  function relocateKnight(s, from, knight) {
    const r = reachable(s, knight.owner, from);
    const spots = r.empty.filter(v => v !== from);
    if (spots.length) {
      s.knights[spots[0]] = knight;
      R().log(s, 'El caballero de ' + name(s, knight.owner) + ' se retira a otro cruce.', knight.owner);
    } else {
      P_(s, knight.owner).knightPieces[knight.level]++;
      R().log(s, 'El caballero de ' + name(s, knight.owner) + ' no tiene a dónde ir y vuelve a su reserva.', knight.owner);
    }
  }

  function isOpenRoad(s, e) {
    const r = s.roads[e];
    if (!r || r.type !== 'road') return false;
    return s.board.edges[e].v.some(v => !(s.buildings[v] && s.buildings[v].owner === r.owner) &&
      !s.board.vertices[v].edges.some(o => o !== e && s.roads[o] && s.roads[o].owner === r.owner));
  }

  function adjacentHexes(s, pid, terrain) {
    const set = new Set();
    Object.entries(s.buildings).forEach(([v, b]) => {
      if (b.owner !== pid) return;
      s.board.vertices[v].hexes.forEach(h => { if (s.board.hexes[h].terrain === terrain) set.add(h); });
    });
    return [...set];
  }

  function merchantHexes(s, pid) {
    return s.board.hexes.filter(h => TERRAIN_RES[h.terrain] && h.vertices.some(v => s.buildings[v] && s.buildings[v].owner === pid)).map(h => h.id);
  }

  function inventorHexes(s) {
    return s.board.hexes.filter(h => h.number && ![2, 12, 6, 8].includes(h.number)).map(h => h.id);
  }

  // ---------- puntos y comercio ----------
  function extraVP(s, pid) {
    const P = P_(s, pid);
    let vp = P.ckVP.defender + P.ckVP.progress;
    AREAS.forEach(a => { const m = s.ck.metropolis[a]; if (m && m.owner === pid) vp += 2; });
    if (s.ck.merchant && s.ck.merchant.owner === pid) vp += 1;
    return vp;
  }

  function adjustRatios(s, pid, r) {
    const P = P_(s, pid);
    if (P.improve.trade >= 3) COMM.forEach(k => { r[k] = Math.min(r[k], 2); });
    const m = s.ck.merchant;
    if (m && m.owner === pid) { const res = TERRAIN_RES[s.board.hexes[m.hex].terrain]; if (res) r[res] = 2; }
    const f = s.ck.fleet;
    if (f && f.pid === pid) r[f.key] = 2;
  }

  // ---------- cartas de progreso ----------
  function drawProgress(s, pid, area) {
    const deck = s.ck.decks[area];
    if (!deck.length) return;
    const card = deck.pop();
    const P = P_(s, pid);
    if (card === 'printer' || card === 'constitution') {
      P.ckVP.progress++;
      R().log(s, name(s, pid) + ' obtiene ' + PROGRESS_NAME[card] + ': +1 punto de victoria.', pid);
      R().event(s, { type: 'progressVP', pid, card });
      return;
    }
    P.progress.push({ type: card, area, turn: s.turn });
    R().log(s, name(s, pid) + ' recibe una carta de progreso de ' + AREA_NAME[area] + '.', pid);
    R().event(s, { type: 'progress', pid, area });
    if (P.progress.length > 4 && pid !== s.current) s.ck.pendingProgressDiscard[pid] = P.progress.length - 4;
  }

  // ---------- metrópolis ----------
  function bestCityFor(s, pid) {
    const cs = citiesOf(s, pid).filter(v => !s.buildings[v].metro);
    let best = null, bestVal = -1;
    cs.forEach(v => {
      const val = s.board.vertices[v].hexes.reduce((a, h) => a + (s.board.hexes[h].number ? C.PIPS[s.board.hexes[h].number] : 0), 0);
      if (val > bestVal) { best = v; bestVal = val; }
    });
    return best;
  }
  function claimMetropolis(s, pid, area) {
    const P = P_(s, pid);
    const lvl = P.improve[area];
    if (lvl < 4) return;
    const holder = s.ck.metropolis[area];
    if (holder && holder.owner === pid) return;
    if (holder && !(lvl === 5 && P_(s, holder.owner).improve[area] < 5)) return;
    const v = bestCityFor(s, pid);
    if (v === null) return;
    if (holder) {
      if (s.buildings[holder.vertex]) s.buildings[holder.vertex].metro = null;
      R().log(s, name(s, holder.owner) + ' pierde la ' + METRO_NAME[area] + '.', holder.owner);
    }
    s.buildings[v].metro = area;
    s.ck.metropolis[area] = { owner: pid, vertex: v };
    R().log(s, name(s, pid) + ' funda la ' + METRO_NAME[area] + ' (+2 PV).', pid);
    R().event(s, { type: 'metropolis', pid, area, at: v });
  }
  function afterCity(s, pid) { AREAS.forEach(a => claimMetropolis(s, pid, a)); }

  // ---------- dados y bárbaros ----------
  function produce(s, roll) {
    const demand = {};
    KEYS.forEach(k => { demand[k] = {}; });
    const add = (k, o, n) => { demand[k][o] = (demand[k][o] || 0) + n; };
    for (const h of s.board.hexes) {
      if (h.number !== roll || h.id === s.robber) continue;
      const res = TERRAIN_RES[h.terrain];
      if (!res) continue;
      for (const v of h.vertices) {
        const b = s.buildings[v];
        if (!b) continue;
        if (b.type === 'settlement') add(res, b.owner, 1);
        else if (h.terrain === 'forest') { add('wood', b.owner, 1); add('paper', b.owner, 1); }
        else if (h.terrain === 'pasture') { add('sheep', b.owner, 1); add('cloth', b.owner, 1); }
        else if (h.terrain === 'mountains') { add('ore', b.owner, 1); add('coin', b.owner, 1); }
        else add(res, b.owner, 2);
      }
    }
    const got = {};
    for (const k of KEYS) {
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
    Object.entries(got).forEach(([o, r]) => R().log(s, s.players[o].name + ' recibe ' + C.resText(r) + '.', +o));
    R().event(s, { type: 'produce', got });
    // Acueducto: quien no recibe nada elige 1 recurso
    const aq = {};
    s.players.forEach(p => { if (p.improve.science >= 3 && !got[p.id]) aq[p.id] = 1; });
    return aq;
  }

  function attack(s) {
    const strength = barbarianStrength(s);
    const def = defense(s);
    const strengths = s.players.map(p => activeStrength(s, p.id));
    R().log(s, '¡Los bárbaros atacan Catan! Fuerza bárbara ' + strength + ' contra defensa ' + def + '.');
    const result = { strength, defense: def, win: def >= strength, losers: [], defenders: [] };
    if (def < strength) {
      const exposed = s.players.filter(p => citiesOf(s, p.id).some(v => !s.buildings[v].metro)).map(p => p.id);
      if (exposed.length) {
        const min = Math.min(...exposed.map(p => strengths[p]));
        exposed.filter(p => strengths[p] === min).forEach(pid => {
          const cs = citiesOf(s, pid).filter(v => !s.buildings[v].metro);
          cs.sort((a, b) => s.board.vertices[a].hexes.reduce((x, h) => x + (s.board.hexes[h].number ? C.PIPS[s.board.hexes[h].number] : 0), 0) -
            s.board.vertices[b].hexes.reduce((x, h) => x + (s.board.hexes[h].number ? C.PIPS[s.board.hexes[h].number] : 0), 0));
          const v = cs[0];
          const b = s.buildings[v];
          const P = P_(s, pid);
          if (b.wall) { b.wall = false; P.walls--; }
          P.pieces.city++;
          if (P.pieces.settlement > 0) { b.type = 'settlement'; P.pieces.settlement--; } else delete s.buildings[v];
          result.losers.push(pid);
          R().log(s, 'Los bárbaros saquean una ciudad de ' + name(s, pid) + ': queda reducida a poblado.', pid);
        });
      }
      R().updateLongestRoad(s);
    } else {
      const max = Math.max(...strengths);
      const top = strengths.map((v, i) => v === max ? i : -1).filter(i => i >= 0);
      if (max > 0 && top.length === 1) {
        P_(s, top[0]).ckVP.defender++;
        result.defenders = top;
        R().log(s, '¡Catan resiste! ' + name(s, top[0]) + ' es nombrado Defensor de Catan (+1 PV).', top[0]);
      } else if (max > 0) {
        result.defenders = top;
        R().log(s, '¡Catan resiste! Empate entre los mejores defensores: cada uno recibe una carta de progreso.');
        top.forEach(pid => {
          const P = P_(s, pid);
          const area = AREAS.filter(a => s.ck.decks[a].length).sort((a, b) => P.improve[b] - P.improve[a])[0];
          if (area) drawProgress(s, pid, area);
        });
      } else R().log(s, '¡Catan resiste el ataque!');
    }
    Object.values(s.knights).forEach(k => { k.active = false; });
    s.ck.barbarian = 0;
    s.ck.attacks++;
    s.ck.lastAttack = result;
    R().event(s, Object.assign({ type: 'barbarians' }, result));
    if (s.ck.attacks === 1) R().log(s, 'Desde ahora el ladrón puede moverse.');
  }

  function roll(s, pid, a) {
    let red, yellow;
    if (s.ck.alchemist) { red = s.ck.alchemist.red; yellow = s.ck.alchemist.yellow; s.ck.alchemist = null; }
    else { red = 1 + Math.floor(Math.random() * 6); yellow = 1 + Math.floor(Math.random() * 6); }
    if (a.forced) { red = a.forced[0]; yellow = a.forced[1]; }
    const ev = a.forcedEvent || EVENT_FACES[Math.floor(Math.random() * 6)];
    s.dice = [red, yellow];
    s.ck.event = ev;
    s.ck.redDie = red;
    s.rollSeq++;
    const sum = red + yellow;
    R().log(s, name(s, pid) + ' tira ' + sum + ' (rojo ' + red + ', amarillo ' + yellow + ') — evento: ' + (ev === 'ship' ? 'barco bárbaro' : 'puerta de ' + AREA_NAME[ev]) + '.', pid);
    R().event(s, { type: 'roll', dice: [red, yellow], pid, eventDie: ev });
    if (ev === 'ship') {
      s.ck.barbarian++;
      R().event(s, { type: 'barbarianMove', pos: s.ck.barbarian });
      if (s.ck.barbarian >= s.ck.track) attack(s);
      else R().log(s, 'El barco bárbaro avanza (' + s.ck.barbarian + '/' + s.ck.track + ').');
    } else {
      for (let i = 0; i < s.players.length; i++) {
        const p = (pid + i) % s.players.length;
        const lvl = P_(s, p).improve[ev];
        if (lvl >= 1 && red <= lvl + 1) drawProgress(s, p, ev);
      }
    }
    R().checkWin(s, pid);
    if (s.phase === 'ended') return;
    if (sum === 7) {
      const pend = {};
      s.players.forEach(p => { const t = C.total(p.resources); if (t > handLimit(s, p.id)) pend[p.id] = Math.floor(t / 2); });
      s.discardReturn = s.ck.attacks > 0 ? 'robber' : 'main';
      s.robberReturn = 'main';
      if (s.ck.attacks === 0) R().log(s, 'Salió un 7, pero el ladrón no se mueve hasta el primer ataque bárbaro.');
      if (Object.keys(pend).length) {
        s.pendingDiscard = pend;
        s.phase = 'discard';
        R().log(s, 'Deben descartar: ' + Object.keys(pend).map(p => name(s, p) + ' (' + pend[p] + ')').join(', ') + '.');
      } else { s.phase = s.discardReturn; s.discardReturn = null; }
      return;
    }
    const aq = produce(s, sum);
    s.phase = 'main';
    if (Object.keys(aq).length) {
      R().log(s, 'Acueducto: ' + Object.keys(aq).map(p => name(s, p)).join(', ') + ' eligen 1 recurso.');
      R().startGold(s, aq, 'main');
    }
  }

  // ---------- acciones ----------
  function canBuildPhase(s, pid) {
    return (s.phase === 'main' && s.current === pid) || (s.phase === 'specialBuild' && s.specialBuilder === pid);
  }

  function handle(s, pid, a) {
    const P = P_(s, pid);
    const t = a.type;

    if (t === 'discardProgress') {
      const i = a.index | 0;
      if (!P.progress[i]) return err('Carta inválida');
      const c = P.progress.splice(i, 1)[0];
      s.ck.decks[c.area].unshift(c.type);
      if (s.ck.pendingProgressDiscard[pid]) {
        s.ck.pendingProgressDiscard[pid]--;
        if (s.ck.pendingProgressDiscard[pid] <= 0 || P.progress.length <= 4) delete s.ck.pendingProgressDiscard[pid];
      }
      R().log(s, name(s, pid) + ' descarta una carta de progreso.', pid);
      return ok();
    }

    if (s.phase === 'give') {
      if (t !== 'give') return null;
      const need = s.pendingGive[pid];
      if (!need) return err('No tienes que entregar cartas');
      const r = a.resources || {};
      if (KEYS.some(k => (r[k] || 0) < 0) || C.total(r) !== need) return err('Debes entregar exactamente ' + need + ' cartas');
      if (!C.hasRes(P.resources, r)) return err('No tienes esas cartas');
      R().addRes(P.resources, r, -1);
      R().addRes(P_(s, s.ck.giveTo).resources, r, 1);
      delete s.pendingGive[pid];
      R().log(s, name(s, pid) + ' entrega ' + need + ' cartas a ' + name(s, s.ck.giveTo) + '.', pid);
      if (!Object.keys(s.pendingGive).length) { s.phase = 'main'; s.ck.giveTo = null; }
      return ok();
    }

    if (s.phase === 'peek') {
      if (pid !== s.current) return err('Esperando a ' + name(s, s.current));
      const pk = s.ck.peek;
      if (t === 'peekCancel') { s.ck.peek = null; s.phase = 'main'; return ok(); }
      if (t !== 'peekTake') return err('Elige una carta');
      const T = P_(s, pk.target);
      if (pk.kind === 'spy') {
        const c = T.progress[a.index | 0];
        if (!c) return err('Carta inválida');
        T.progress.splice(a.index | 0, 1);
        P.progress.push(c);
        R().log(s, name(s, pid) + ' roba una carta de progreso a ' + T.name + '.', pid);
      } else {
        const r = a.resources || {};
        const n = Math.min(2, C.total(T.resources));
        if (KEYS.some(k => (r[k] || 0) < 0) || C.total(r) !== n || !C.hasRes(T.resources, r)) return err('Elige ' + n + ' cartas de su mano');
        R().addRes(T.resources, r, -1);
        R().addRes(P.resources, r, 1);
        R().log(s, name(s, pid) + ' toma ' + n + ' cartas de la mano de ' + T.name + '.', pid);
      }
      s.ck.peek = null;
      s.phase = 'main';
      return ok();
    }

    if (s.phase === 'placeKnight') {
      if (pid !== s.current) return err('Esperando a ' + name(s, s.current));
      const fk = s.ck.freeKnight;
      if (t === 'skipFreeKnight') { s.ck.freeKnight = null; s.phase = 'main'; return ok(); }
      if (t !== 'placeFreeKnight') return err('Coloca tu caballero');
      if (!knightSpots(s, pid).includes(a.vertex)) return err('Lugar no válido');
      s.knights[a.vertex] = { owner: pid, level: fk.level, active: fk.active, actTurn: s.turn, promTurn: -1 };
      P.knightPieces[fk.level]--;
      s.ck.freeKnight = null;
      s.phase = 'main';
      R().log(s, name(s, pid) + ' coloca un ' + KNIGHT_NAME[fk.level] + '.', pid);
      R().event(s, { type: 'build', what: 'knight', pid, at: a.vertex });
      R().updateLongestRoad(s);
      return ok();
    }

    if (t === 'buildKnight') {
      if (!canBuildPhase(s, pid)) return err('No puedes construir ahora');
      if (P.knightPieces[1] <= 0) return err('No te quedan caballeros básicos');
      if (!C.hasRes(P.resources, KNIGHT_COST)) return err('Necesitas 1 lana y 1 mineral');
      if (!knightSpots(s, pid).includes(a.vertex)) return err('El caballero debe ir en un cruce libre junto a tus carreteras');
      R().pay(s, pid, KNIGHT_COST);
      P.knightPieces[1]--;
      s.knights[a.vertex] = { owner: pid, level: 1, active: false, actTurn: -1, promTurn: -1 };
      R().log(s, name(s, pid) + ' recluta un caballero básico.', pid);
      R().event(s, { type: 'build', what: 'knight', pid, at: a.vertex });
      R().updateLongestRoad(s);
      return ok();
    }
    if (t === 'activateKnight') {
      if (!canBuildPhase(s, pid)) return err('No puedes activar ahora');
      const k = s.knights[a.vertex];
      if (!k || k.owner !== pid || k.active) return err('Elige uno de tus caballeros inactivos');
      if (!C.hasRes(P.resources, ACTIVATE_COST)) return err('Necesitas 1 cereal');
      R().pay(s, pid, ACTIVATE_COST);
      k.active = true;
      k.actTurn = s.turn;
      R().log(s, name(s, pid) + ' activa un ' + KNIGHT_NAME[k.level] + '.', pid);
      R().event(s, { type: 'build', what: 'activate', pid, at: a.vertex });
      return ok();
    }
    if (t === 'promoteKnight') {
      if (!canBuildPhase(s, pid)) return err('No puedes ascender ahora');
      const k = s.knights[a.vertex];
      if (!promotable(s, pid, a.vertex)) {
        if (k && k.level === 2 && P.improve.politics < 3) return err('Necesitas la Fortaleza (Política nivel 3) para caballeros poderosos');
        return err('Ese caballero no se puede ascender');
      }
      if (!C.hasRes(P.resources, KNIGHT_COST)) return err('Necesitas 1 lana y 1 mineral');
      R().pay(s, pid, KNIGHT_COST);
      P.knightPieces[k.level]++;
      k.level++;
      P.knightPieces[k.level]--;
      k.promTurn = s.turn;
      R().log(s, name(s, pid) + ' asciende un caballero a ' + KNIGHT_NAME[k.level] + '.', pid);
      R().event(s, { type: 'build', what: 'promote', pid, at: a.vertex });
      return ok();
    }
    if (t === 'buildWall') {
      if (!canBuildPhase(s, pid)) return err('No puedes construir ahora');
      const b = s.buildings[a.vertex];
      if (!b || b.owner !== pid || b.type !== 'city' || b.wall) return err('Elige una de tus ciudades sin muralla');
      if (P.walls >= 3) return err('Ya tienes 3 murallas');
      if (!C.hasRes(P.resources, WALL_COST)) return err('Necesitas 2 de arcilla');
      R().pay(s, pid, WALL_COST);
      b.wall = true;
      P.walls++;
      R().log(s, name(s, pid) + ' levanta una muralla.', pid);
      R().event(s, { type: 'build', what: 'wall', pid, at: a.vertex });
      return ok();
    }
    if (t === 'improve') {
      if (!canBuildPhase(s, pid)) return err('No puedes construir ahora');
      const area = a.area;
      if (!AREAS.includes(area)) return err('Área inválida');
      if (!citiesOf(s, pid).length) return err('Necesitas al menos una ciudad');
      const lvl = P.improve[area];
      if (lvl >= 5) return err('Ya tienes el nivel máximo');
      const crane = s.ck.crane === pid && s.phase === 'main';
      const cost = lvl + 1 - (crane ? 1 : 0);
      const comm = AREA_COMM[area];
      if (P.resources[comm] < cost) return err('Necesitas ' + cost + ' de ' + C.RES_NAME[comm]);
      R().pay(s, pid, { [comm]: cost });
      if (crane) s.ck.crane = null;
      P.improve[area]++;
      R().log(s, name(s, pid) + ' construye ' + IMPROVEMENTS[area][lvl] + ' (' + AREA_NAME[area] + ' nivel ' + (lvl + 1) + ').', pid);
      R().event(s, { type: 'improve', pid, area, level: lvl + 1 });
      claimMetropolis(s, pid, area);
      if (s.phase === 'main') R().checkWin(s, pid);
      return ok();
    }

    if (t === 'moveKnight') {
      if (s.phase !== 'main' || s.current !== pid) return err('Solo en tu turno');
      const k = s.knights[a.from];
      if (!k || k.owner !== pid) return err('Elige uno de tus caballeros');
      if (!k.active) return err('El caballero debe estar activo');
      if (k.actTurn === s.turn) return err('Un caballero activado este turno no puede actuar hasta el próximo');
      const tg = knightTargets(s, pid, a.from);
      if (tg.empty.includes(a.to)) {
        delete s.knights[a.from];
        s.knights[a.to] = k;
        k.active = false;
        R().log(s, name(s, pid) + ' mueve un caballero.', pid);
      } else if (tg.displace.includes(a.to)) {
        const other = s.knights[a.to];
        delete s.knights[a.from];
        s.knights[a.to] = k;
        k.active = false;
        R().log(s, name(s, pid) + ' desaloja al caballero de ' + name(s, other.owner) + '.', pid);
        relocateKnight(s, a.to, other);
      } else return err('Destino no válido');
      R().event(s, { type: 'build', what: 'knightMove', pid, at: a.to });
      R().updateLongestRoad(s);
      return ok();
    }
    if (t === 'chaseRobber') {
      if (s.phase !== 'main' || s.current !== pid) return err('Solo en tu turno');
      if (!canChase(s, pid, a.vertex)) return err(s.ck.attacks ? 'Necesitas un caballero activo junto al ladrón' : 'El ladrón no se mueve hasta el primer ataque bárbaro');
      s.knights[a.vertex].active = false;
      s.robberReturn = 'main';
      s.phase = 'robber';
      R().log(s, name(s, pid) + ' ahuyenta al ladrón con un caballero.', pid);
      return ok();
    }

    if (t === 'playProgress') return playProgress(s, pid, a);
    return null;
  }

  function takeFromEach(s, pid, key, n) {
    let got = 0;
    s.players.forEach(o => {
      if (o.id === pid) return;
      const k = Math.min(n, o.resources[key] || 0);
      o.resources[key] -= k;
      P_(s, pid).resources[key] += k;
      got += k;
    });
    return got;
  }

  function playProgress(s, pid, a) {
    const P = P_(s, pid);
    const card = a.card;
    const idx = P.progress.findIndex(c => c.type === card);
    if (idx < 0) return err('No tienes esa carta');
    if (s.current !== pid) return err('Solo puedes jugar cartas de progreso en tu turno');
    if (card === 'alchemist') { if (s.phase !== 'roll') return err('El Alquimista se juega antes de tirar los dados'); }
    else if (s.phase !== 'main') return err(s.phase === 'roll' ? 'Primero tira los dados' : 'Ahora no puedes jugar cartas');
    const opp = s.players.filter(o => o.id !== pid);
    const myVP = C.publicVP(s, pid);
    let after = null;

    switch (card) {
      case 'alchemist': {
        const r = a.red | 0, y = a.yellow | 0;
        if (r < 1 || r > 6 || y < 1 || y > 6) return err('Elige valores de 1 a 6');
        s.ck.alchemist = { red: r, yellow: y };
        break;
      }
      case 'inventor': {
        const [h1, h2] = a.hexes || [];
        const ok2 = inventorHexes(s);
        if (h1 === h2 || !ok2.includes(h1) || !ok2.includes(h2)) return err('Elige dos fichas válidas (no 2, 12, 6 ni 8)');
        const A = s.board.hexes[h1], B = s.board.hexes[h2];
        [A.number, B.number] = [B.number, A.number];
        after = () => R().log(s, 'Se intercambian las fichas ' + B.number + ' y ' + A.number + '.');
        break;
      }
      case 'crane': s.ck.crane = pid; break;
      case 'irrigation': case 'mining': {
        const terr = card === 'irrigation' ? 'fields' : 'mountains';
        const key = card === 'irrigation' ? 'wheat' : 'ore';
        const n = Math.min(2 * adjacentHexes(s, pid, terr).length, s.bank[key]);
        if (!n) return err('No tienes ' + (card === 'irrigation' ? 'campos' : 'montañas') + ' junto a tus poblados');
        s.bank[key] -= n; P.resources[key] += n;
        after = () => R().log(s, name(s, pid) + ' recibe ' + n + ' de ' + C.RES_NAME[key] + '.', pid);
        break;
      }
      case 'engineer': {
        const b = s.buildings[a.vertex];
        if (!b || b.owner !== pid || b.type !== 'city' || b.wall) return err('Elige una de tus ciudades sin muralla');
        if (P.walls >= 3) return err('Ya tienes 3 murallas');
        b.wall = true; P.walls++;
        R().event(s, { type: 'build', what: 'wall', pid, at: a.vertex });
        break;
      }
      case 'medicine': {
        const b = s.buildings[a.vertex];
        if (!b || b.owner !== pid || b.type !== 'settlement') return err('Elige uno de tus poblados');
        if (P.pieces.city <= 0) return err('No te quedan ciudades');
        if (!C.hasRes(P.resources, { ore: 2, wheat: 1 })) return err('Necesitas 2 de mineral y 1 de cereal');
        R().pay(s, pid, { ore: 2, wheat: 1 });
        b.type = 'city'; P.pieces.city--; P.pieces.settlement++;
        R().event(s, { type: 'build', what: 'city', pid, at: a.vertex });
        after = () => afterCity(s, pid);
        break;
      }
      case 'roadBuilding': {
        if (P.pieces.road <= 0 || !C.validRoutes(s, pid, 'road').length) return err('No puedes construir carreteras');
        after = () => { s.freeRoads = 2; s.roadReturn = 'main'; s.phase = 'roadBuilding'; };
        break;
      }
      case 'smith': {
        const vs = (a.vertices || []).slice(0, 2);
        if (!vs.length || new Set(vs).size !== vs.length || !vs.every(v => promotable(s, pid, v, true))) return err('Elige 1 o 2 caballeros que puedan ascender');
        vs.forEach(v => { const k = s.knights[v]; P.knightPieces[k.level]++; k.level++; P.knightPieces[k.level]--; k.promTurn = s.turn; });
        break;
      }
      case 'bishop': {
        if (!s.ck.attacks) return err('El ladrón no se mueve hasta el primer ataque bárbaro');
        const h = s.board.hexes[a.hex];
        if (!h || !isLand(h.terrain) || a.hex === s.robber) return err('Elige otro terreno');
        s.robber = a.hex;
        R().event(s, { type: 'robber', pirate: false, pid, hex: a.hex });
        after = () => {
          const victims = new Set();
          h.vertices.forEach(v => { const b = s.buildings[v]; if (b && b.owner !== pid) victims.add(b.owner); });
          victims.forEach(o => {
            const pool = [];
            KEYS.forEach(k => { for (let i = 0; i < (s.players[o].resources[k] || 0); i++) pool.push(k); });
            if (!pool.length) return;
            const c = pool[Math.floor(Math.random() * pool.length)];
            s.players[o].resources[c]--; P.resources[c]++;
            R().event(s, { type: 'steal', from: o, to: pid, res: c });
          });
          R().log(s, name(s, pid) + ' roba 1 carta a ' + (victims.size ? [...victims].map(o => name(s, o)).join(', ') : 'nadie') + '.', pid);
        };
        break;
      }
      case 'deserter': {
        const T = s.players[a.target];
        if (!T || T.id === pid) return err('Elige un rival');
        const ks = Object.keys(s.knights).map(Number).filter(v => s.knights[v].owner === T.id);
        if (!ks.length) return err('Ese jugador no tiene caballeros');
        ks.sort((x, y) => s.knights[x].level - s.knights[y].level);
        const v = ks[0], k = s.knights[v];
        delete s.knights[v];
        T.knightPieces[k.level]++;
        after = () => {
          R().log(s, T.name + ' pierde un ' + KNIGHT_NAME[k.level] + '.', T.id);
          R().updateLongestRoad(s);
          if (P.knightPieces[k.level] > 0 && knightSpots(s, pid).length) {
            s.ck.freeKnight = { level: k.level, active: k.active };
            s.phase = 'placeKnight';
          }
        };
        break;
      }
      case 'diplomat': {
        if (!isOpenRoad(s, a.edge)) return err('Elige una carretera abierta (con un extremo libre)');
        const r = s.roads[a.edge];
        delete s.roads[a.edge];
        P_(s, r.owner).pieces.road++;
        after = () => {
          R().log(s, 'Se retira una carretera de ' + name(s, r.owner) + '.', r.owner);
          R().updateLongestRoad(s);
          if (r.owner === pid) { s.freeRoads = 1; s.roadReturn = 'main'; s.phase = 'roadBuilding'; }
        };
        break;
      }
      case 'intrigue': {
        const k = s.knights[a.vertex];
        if (!k || k.owner === pid || !s.board.vertices[a.vertex].edges.some(e => s.roads[e] && s.roads[e].owner === pid)) return err('Elige un caballero rival en un cruce de tus carreteras');
        delete s.knights[a.vertex];
        after = () => { relocateKnight(s, a.vertex, k); R().updateLongestRoad(s); };
        break;
      }
      case 'saboteur': {
        const pend = {};
        opp.forEach(o => { const tt = C.total(o.resources); if (C.publicVP(s, o.id) >= myVP && tt >= 2) pend[o.id] = Math.floor(tt / 2); });
        after = () => {
          if (Object.keys(pend).length) { s.pendingDiscard = pend; s.discardReturn = 'main'; s.phase = 'discard'; }
          else R().log(s, 'Nadie se ve afectado por el Saboteador.');
        };
        break;
      }
      case 'spy': {
        const T = s.players[a.target];
        if (!T || T.id === pid || !T.progress.length) return err('Elige un rival con cartas de progreso');
        after = () => { s.ck.peek = { by: pid, target: T.id, kind: 'spy' }; s.phase = 'peek'; };
        break;
      }
      case 'warlord':
        Object.values(s.knights).forEach(k => { if (k.owner === pid && !k.active) { k.active = true; k.actTurn = s.turn; } });
        break;
      case 'wedding': {
        const pend = {};
        opp.forEach(o => { const tt = C.total(o.resources); if (C.publicVP(s, o.id) > myVP && tt > 0) pend[o.id] = Math.min(2, tt); });
        after = () => {
          if (Object.keys(pend).length) { s.pendingGive = pend; s.ck.giveTo = pid; s.phase = 'give'; }
          else R().log(s, 'Nadie tiene más puntos: la Boda no tiene efecto.');
        };
        break;
      }
      case 'commercialHarbor': {
        const swaps = [];
        opp.forEach(o => {
          const comm = COMM.filter(k => o.resources[k] > 0).sort((x, y) => o.resources[y] - o.resources[x])[0];
          const give = RES.filter(k => P.resources[k] > 0).sort((x, y) => P.resources[y] - P.resources[x])[0];
          if (!comm || !give) return;
          P.resources[give]--; o.resources[give]++;
          o.resources[comm]--; P.resources[comm]++;
          swaps.push(o.name);
        });
        after = () => R().log(s, swaps.length ? name(s, pid) + ' cambia recursos por mercancías con ' + swaps.join(', ') + '.' : 'Nadie tenía mercancías para cambiar.', pid);
        break;
      }
      case 'masterMerchant': {
        const T = s.players[a.target];
        if (!T || T.id === pid || C.publicVP(s, T.id) <= myVP || !C.total(T.resources)) return err('Elige un jugador con más puntos que tú y con cartas');
        after = () => { s.ck.peek = { by: pid, target: T.id, kind: 'merchant' }; s.phase = 'peek'; };
        break;
      }
      case 'merchant':
        if (!merchantHexes(s, pid).includes(a.hex)) return err('Coloca al mercader en un terreno junto a tu poblado o ciudad');
        s.ck.merchant = { hex: a.hex, owner: pid };
        R().event(s, { type: 'merchant', pid, hex: a.hex });
        break;
      case 'merchantFleet':
        if (!KEYS.includes(a.resource)) return err('Elige un recurso o mercancía');
        s.ck.fleet = { pid, key: a.resource };
        break;
      case 'resourceMonopoly': {
        if (!RES.includes(a.resource)) return err('Elige un recurso');
        const n = takeFromEach(s, pid, a.resource, 2);
        after = () => R().log(s, name(s, pid) + ' recibe ' + n + ' de ' + C.RES_NAME[a.resource] + '.', pid);
        break;
      }
      case 'tradeMonopoly': {
        if (!COMM.includes(a.resource)) return err('Elige una mercancía');
        const n = takeFromEach(s, pid, a.resource, 1);
        after = () => R().log(s, name(s, pid) + ' recibe ' + n + ' de ' + C.RES_NAME[a.resource] + '.', pid);
        break;
      }
      default: return err('Carta desconocida');
    }
    P.progress.splice(idx, 1);
    s.ck.decks[PROGRESS_AREA[card]].unshift(card);
    R().log(s, name(s, pid) + ' juega ' + PROGRESS_NAME[card] + '.', pid);
    R().event(s, { type: 'playProgress', card, pid });
    if (after) after();
    if (s.phase === 'main') R().checkWin(s, pid);
    return ok();
  }

  function canEndTurn(s, pid) {
    if (P_(s, pid).progress.length > 4) return 'Tienes más de 4 cartas de progreso: juega o descarta alguna';
    return null;
  }
  function onTurnStart(s) { s.ck.crane = null; s.ck.fleet = null; s.ck.alchemist = null; }

  function redact(s, v, pid) {
    v.players.forEach(p => {
      p.progressCount = s.players[p.id].progress.length;
      p.strength = activeStrength(s, p.id);
      p.strengthTotal = totalStrength(s, p.id);
      if (p.id !== pid) p.progress = null;
    });
    v.ck.decks = Object.fromEntries(AREAS.map(a => [a, s.ck.decks[a].length]));
    v.ck.barbarianStrength = barbarianStrength(s);
    v.ck.defense = defense(s);
    const pk = s.ck.peek;
    if (pk && pk.by === pid) {
      if (pk.kind === 'spy') v.ck.peekCards = s.players[pk.target].progress.map(c => ({ type: c.type, area: c.area }));
      else v.ck.peekHand = Object.assign({}, s.players[pk.target].resources);
    }
  }

  C.CK = {
    AREAS, AREA_COMM, AREA_NAME, AREA_COLOR, IMPROVEMENTS, METRO_NAME, PROGRESS, PROGRESS_AREA, PROGRESS_NAME, PROGRESS_HELP,
    KNIGHT_COST, ACTIVATE_COST, WALL_COST, KNIGHT_NAME,
    init, roll, handle, extraVP, adjustRatios, afterCity, canEndTurn, onTurnStart, redact,
    knightSpots, knightTargets, canChase, promotable, activeStrength, totalStrength, barbarianStrength, defense, citiesOf, handLimit,
    isOpenRoad, merchantHexes, inventorHexes, adjacentHexes
  };
})(typeof window !== 'undefined' ? window : globalThis);
