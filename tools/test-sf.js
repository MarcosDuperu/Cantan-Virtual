// Pruebas de reglas de Navegantes (escenarios 1-9 y ampliación 5-6). Uso: node tools/test-sf.js
['board', 'rules', 'ck', 'pe', 'tb', 'sf', 'ai', 'names'].forEach(f => require('../src/js/engine/' + f + '.js'));
const C = globalThis.Catan;
const SF = C.SF;
let fails = 0;
const check = (cond, msg) => { if (!cond) { fails++; console.log('FALLO:', msg); } else console.log('ok  ', msg); };

const NAMES = ['Ana', 'Beto', 'Caro', 'Dani', 'Eva', 'Fede'];
function game(scenario, n = 4, opts = {}) {
  const s = C.createGame({ mode: C.resolveMode('seafarers', n), options: Object.assign({ scenario }, opts), players: NAMES.slice(0, n).map((name, i) => ({ name, color: 'c' + i })) });
  const mem = s.players.map(() => ({}));
  for (let i = 0; i < 500 && s.phase !== 'roll'; i++) {
    const pid = s.phase === 'gold' ? +Object.keys(s.pendingGold)[0] : C.actor(s);
    const r = C.apply(s, pid, C.AI.decide(s, pid, mem[pid]));
    if (r.error) throw new Error('preparación: ' + r.error);
  }
  return s;
}
const fresh = (scenario, n = 4) => C.createGame({ mode: C.resolveMode('seafarers', n), options: { scenario }, players: NAMES.slice(0, n).map((name, i) => ({ name, color: 'c' + i })) });
const give = (P, r) => Object.entries(r).forEach(([k, v]) => { P.resources[k] += v; });
const empty = P => C.RES.forEach(k => { P.resources[k] = 0; });
const toMain = s => { s.phase = 'main'; s.dice = [1, 2]; };
const ownVerts = (s, pid) => Object.keys(s.buildings).map(Number).filter(v => s.buildings[v].owner === pid);
const areaOf = (s, v) => SF.areaOf(s, v);

// ================= menú y modos =================
check(C.EXPANSIONS.seafarers.min === 3 && C.EXPANSIONS.seafarers.max === 6, 'Navegantes admite de 3 a 6 jugadores');
check(C.resolveMode('seafarers', 4) === 'seafarers' && C.resolveMode('seafarers', 5) === 'seafarers56', 'con 5-6 jugadores se usa la ampliación');
check(Object.keys(SF.SCENARIOS).length === 9, 'hay 9 escenarios');
check(SF.scName(2, true) === 'Las seis islas' && SF.scName(2, false) === 'Las cuatro islas', 'en 5-6 «Las cuatro islas» es «Las seis islas»');
{
  const vps = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => fresh(i).vpTarget).join(',');
  check(vps === '14,13,12,14,13,14,10,10,12', 'PV de cada escenario: ' + vps);
}

// ================= mapas =================
{
  const sizes = { '1-3': [22, 37], '1-4': [28, 44], '2-3': [20, 37], '2-4': [23, 37], '4-3': [25, 37], '4-4': [30, 44] };
  Object.entries(sizes).forEach(([k, [land, cells]]) => {
    const [sc, n] = k.split('-').map(Number);
    const b = SF.generate({ scenario: sc, players: n }, false);
    check(b.hexes.filter(h => C.isLand(h.terrain)).length === land && b.hexes.filter(h => !h.frame).length === cells, `mapa ${k}: ${land} hexágonos de tierra en ${cells} casillas`);
  });
  const b1 = SF.generate({ scenario: 1, players: 3 }, false);
  check(b1.ports.length === 8 && b1.hexes[b1.robber].number === 12 && b1.hexes[b1.robber].terrain === 'hills', 'Hacia nuevas costas (3): 8 puertos y ladrón en las colinas del 12');
  check(b1.hexes.filter(h => h.terrain === 'gold').length === 2, 'Hacia nuevas costas (3): 2 ríos de oro en las islas pequeñas');
  const b4 = SF.generate({ scenario: 1, players: 4 }, false);
  check(b4.ports.length === 9 && b4.hexes[b4.robber].terrain === 'desert', 'Hacia nuevas costas (4): 9 puertos y ladrón en el desierto');
  check(b4.ports.every(p => b4.edges[p.edge].hexes.some(id => b4.hexes[id].area === b4.homeAreas[0])), 'Hacia nuevas costas (4): los puertos están en la isla principal');
  const sizes2 = Object.values(b4.hexes.reduce((a, h) => { if (h.area >= 0) a[h.area] = (a[h.area] || 0) + 1; return a; }, {})).sort((a, b) => b - a);
  check(sizes2.join(',') === '19,5,2,2', 'Hacia nuevas costas (4): isla de 19 e islas de 5, 2 y 2 hexágonos');
  const b56 = SF.generate({ scenario: 1, players: 6 }, true);
  check(b56.hexes.filter(h => h.main).length === 30 && b56.ports.length === 11, 'Hacia nuevas costas (5-6): isla principal al azar de 30 hexágonos y 11 puertos');
  const b2 = SF.generate({ scenario: 2, players: 6 }, true);
  check(b2.areaCount === 6, 'Las seis islas: 6 islas');
  const b4d = SF.generate({ scenario: 4, players: 3 }, false);
  check(b4d.areaCount === 5 && b4d.hexes.filter(h => h.terrain === 'desert').every(h => h.area === -1), 'A través del desierto: el desierto separa 5 zonas');
  const b9 = SF.generate({ scenario: 9, players: 4 }, false);
  check(b9.hexes.filter(h => C.isLand(h.terrain)).length === 23 && b9.robber === null && b9.pirate === null, 'Nuevo mundo: 23 hexágonos de tierra al azar y ladrón y pirata fuera del tablero');
  // todos los mapas: posiciones de piezas resueltas
  let ok = true;
  [1, 2, 3, 4, 5, 6, 7, 8].forEach(sc => [3, 4, 5, 6].forEach(n => {
    const b = SF.generate({ scenario: sc, players: n }, n >= 5);
    const X = b.sfData;
    if (X.gifts && X.gifts.some(g => g.edge === null || !b.edges[g.edge].sea)) ok = false;
    if (X.villages && X.villages.some(x => !b.vertices[x.v].hexes.some(h => b.hexes[h].tribe))) ok = false;
    if (X.seats && X.seats.some(st => st.fort === null || st.circle === null || !b.edges[st.ship].v.includes(st.settle))) ok = false;
    if (X.seats && X.seats.length !== n) ok = false;
    if (X.fleet && X.fleet.some(h => h === null || b.hexes[h].terrain !== 'sea')) ok = false;
  }));
  check(ok, 'regalos, aldeas, fortalezas y recorrido de la flota en su lugar en todos los mapas');
  // orientación del reglamento: hexágonos de lado plano, mismo grafo
  const bo = SF.generate({ scenario: 1, players: 4 }, false);
  const hx = bo.hexes.find(h => !h.frame);
  const nb = C.neighborsOf(bo, hx).map(n => Math.round(Math.hypot(n.x - hx.x, n.y - hx.y) * 100) / 100);
  check(bo.flat && hx.flat && nb.every(d => d === 1.73), 'el mapa se dibuja con hexágonos de lado plano y vecinos a la misma distancia');
  check(bo.vertices.every(v => v.hexes.every(h => Math.abs(Math.hypot(bo.hexes[h].x - v.x, bo.hexes[h].y - v.y) - 1) < 0.01)), 'los cruces siguen en las esquinas de sus hexágonos');
  const top = bo.hexes.filter(h => !h.frame).reduce((a, h) => (h.x < a.x ? h : a));
  check(top.terrain === 'fields' && top.number === 8, 'Hacia nuevas costas (4): el campo del 8 queda a la izquierda, como en el dibujo');
}

// ================= reglas generales =================
{
  const s = game(1, 4);
  const main = s.board.homeAreas[0];
  check(Object.keys(s.buildings).every(v => areaOf(s, +v) === main), 'Hacia nuevas costas: poblados iniciales en la isla grande');
  // bonificación de isla
  const p = s.current;
  toMain(s);
  const spot = s.board.vertices.find(v => v.land && areaOf(s, v.id) >= 0 && areaOf(s, v.id) !== main && C._R.distanceOk(s, v.id));
  const e = spot.edges.find(x => s.board.edges[x].sea);
  s.roads[e] = { owner: p, type: 'ship', turn: 0 };
  give(s.players[p], C.COST.settlement);
  const vp0 = C.publicVP(s, p);
  C.apply(s, p, { type: 'buildSettlement', vertex: spot.id });
  check(C.publicVP(s, p) === vp0 + 3, 'el primer poblado en una isla pequeña vale 1 + 2 PV');
  const spot2 = s.board.vertices.find(v => v.land && areaOf(s, v.id) === areaOf(s, spot.id) && C._R.distanceOk(s, v.id) && v.id !== spot.id);
  if (spot2) {
    const e2 = spot2.edges.find(x => s.board.edges[x].sea || s.board.edges[x].land);
    s.roads[e2] = { owner: p, type: 'road', turn: 0 };
    give(s.players[p], C.COST.settlement);
    const vp1 = C.publicVP(s, p);
    C.apply(s, p, { type: 'buildSettlement', vertex: spot2.id });
    check(C.publicVP(s, p) === vp1 + 1, 'el segundo poblado en la misma isla vale solo 1 PV');
  }
}
{
  // rutas cerradas y abiertas
  const s = game(1, 3);
  const p = s.current;
  toMain(s);
  const v = ownVerts(s, p)[0];
  const e = s.board.vertices[v].edges.find(x => s.board.edges[x].sea && !s.roads[x]);
  if (e !== undefined) {
    s.roads[e] = { owner: p, type: 'ship', turn: 0 };
    check(C.movableShips(s, p).includes(e), 'un barco con un extremo libre se puede mover');
    s.roads[e].turn = s.turn;
    check(!C.movableShips(s, p).includes(e), 'no se mueve un barco construido en este turno');
  }
}
{
  // pirata: no se construyen barcos junto a él
  const s = game(1, 4);
  const p = s.current;
  const e = C.validRoutes(s, p, 'ship')[0];
  if (e !== undefined) {
    const h = s.board.edges[e].hexes.find(id => s.board.hexes[id].terrain === 'sea' && !s.board.hexes[id].frame);
    if (h !== undefined) { s.pirate = h; check(!C.canPlaceRoute(s, p, e, 'ship'), 'no se puede construir un barco junto al pirata'); }
  }
  check(!C.robberHexes(s, p).some(h => s.board.hexes[h].frame), 'el ladrón y el pirata no van al marco');
}

// ================= 2: Las cuatro islas =================
{
  const s = game(2, 4);
  const P = s.players[s.current];
  check(s.players.every(x => x.home && x.home.length >= 1 && x.home.length <= 2), 'cada jugador tiene 1 o 2 islas propias');
  const home = P.home;
  const foreign = s.board.vertices.find(v => v.land && areaOf(s, v.id) >= 0 && !home.includes(areaOf(s, v.id)) && C._R.distanceOk(s, v.id));
  toMain(s);
  const e = foreign.edges.find(x => s.board.edges[x].sea);
  s.roads[e] = { owner: P.id, type: 'ship', turn: 0 };
  give(P, C.COST.settlement);
  const vp0 = C.publicVP(s, P.id);
  C.apply(s, P.id, { type: 'buildSettlement', vertex: foreign.id });
  check(C.publicVP(s, P.id) === vp0 + 3, 'poblado en isla ajena: +2 PV aunque otro jugador la tenga como propia');
}

// ================= 3: La isla de la niebla =================
{
  const s = game(3, 4);
  const p = s.current;
  toMain(s);
  const hidden0 = s.board.hexes.filter(h => h.hidden).length;
  check(hidden0 === 12 && s.sf.fog.t.length === 12, 'la niebla oculta 12 hexágonos');
  const v = C.viewFor(s, p);
  check(v.board.hexes.filter(h => h.terrain === 'hidden').length === 12 && v.sf.fog.left === 12 && !v.sf.fog.t, 'la vista no muestra lo que hay bajo la niebla');
  // lado de mar junto a un hexágono oculto
  const e = s.board.edges.find(E => E.sea && E.v.some(x => s.board.vertices[x].hexes.some(h => s.board.hexes[h].hidden)));
  const before = C.total(s.players[p].resources);
  s.sf.fog.t.push('forest'); s.sf.fog.n.push(9);
  const nHid = new Set(); e.v.forEach(x => s.board.vertices[x].hexes.forEach(h => { if (s.board.hexes[h].hidden) nHid.add(h); }));
  SF.afterRoute(s, p, 'ship', e.id);
  const first = [...nHid].map(h => s.board.hexes[h]);
  check(first.every(h => !h.hidden) && s.board.hexes.filter(h => h.hidden).length === hidden0 - nHid.size, 'construir junto a la niebla descubre los hexágonos');
  check(first.some(h => h.terrain === 'forest' && h.number === 9), 'el hexágono descubierto toma terreno y número de las pilas');
  check(C.total(s.players[p].resources) >= before + 1, 'descubrir tierra da 1 recurso de ese terreno');
  check(C.validSettlements(s, p, true).every(x => !s.board.vertices[x].hexes.some(h => s.board.hexes[h].hidden)), 'no se coloca junto a la niebla');
  // oro descubierto: se elige
  const e2 = s.board.edges.find(E => E.sea && E.v.some(x => s.board.vertices[x].hexes.some(h => s.board.hexes[h].hidden)));
  if (e2) {
    const cnt = new Set(); e2.v.forEach(x => s.board.vertices[x].hexes.forEach(h => { if (s.board.hexes[h].hidden) cnt.add(h); }));
    for (let i = 0; i < cnt.size; i++) { s.sf.fog.t.push('gold'); s.sf.fog.n.push(5); }
    SF.afterRoute(s, p, 'ship', e2.id);
    check(s.phase === 'gold' && s.pendingGold[p] === 1 && s.goldReturn === 'main', 'descubrir oro permite elegir 1 recurso');
  }
}

// ================= 4: A través del desierto =================
{
  const s = game(4, 3);
  const main = s.board.homeAreas[0];
  check(Object.keys(s.buildings).every(v => areaOf(s, +v) === main), 'A través del desierto: poblados iniciales en la isla principal');
  const strip = s.board.hexes.find(h => h.terrain === 'gold' && C.neighborsOf(s.board, h).some(n => n.terrain === 'desert'));
  check(strip && strip.area !== main, 'la franja tras el desierto es una zona ajena');
  const vs = C.validSettlements(s, 0, true);
  check(vs.every(v => areaOf(s, v) === main), 'no se coloca al inicio en la franja');
}

// ================= 5: La tribu olvidada =================
{
  const s = game(5, 4);
  const p = s.current;
  const main = s.board.homeAreas[0];
  check(s.sf.gifts.filter(g => g.kind === 'vp').length === 8 && s.sf.gifts.filter(g => g.kind === 'dev').length === 4 && s.sf.gifts.filter(g => g.kind === 'harbor').length === 6, 'regalos: 8 PV, 4 cartas y 6 puertos');
  const small = s.board.vertices.find(v => v.land && areaOf(s, v.id) >= 0 && areaOf(s, v.id) !== main);
  check(!SF.settleOk(s, p, small.id, false), 'no se puede poblar en las islas pequeñas');
  check(C.robberHexes(s, p).every(h => !C.isLand(s.board.hexes[h].terrain) || (s.board.hexes[h].area === main && h !== s.sf.robberStart)), 'el ladrón no va a las islas pequeñas ni vuelve a su desierto');
  toMain(s);
  const g = s.sf.gifts.find(x => x.kind === 'vp');
  const vp0 = C.publicVP(s, p);
  s.roads[g.edge] = { owner: p, type: 'ship', turn: s.turn };
  SF.afterRoute(s, p, 'ship', g.edge);
  check(g.taken === p && C.publicVP(s, p) === vp0 + 1, 'un barco en el lado con ficha da 1 PV');
  const d = s.sf.gifts.find(x => x.kind === 'dev');
  const nd = s.players[p].devCards.length;
  SF.afterRoute(s, p, 'ship', d.edge);
  check(s.players[p].devCards.length === nd + 1 && s.players[p].devCards[nd].turn === s.turn, 'la carta de regalo va a la mano y no se juega este turno');
  const h = s.sf.gifts.find(x => x.kind === 'harbor');
  const ports0 = s.board.ports.length;
  const spots = SF.harborSpots(s, p).length;
  SF.afterRoute(s, p, 'ship', h.edge);
  if (spots) {
    check(s.phase === 'sfHarbor' && s.sf.hp.kind === 'gift' && s.sf.hp.pid === p, 'el jugador elige dónde va el puerto regalado');
    const opts = SF.harborEdges(s);
    const bad = s.board.edges.find(E => !opts.includes(E.id));
    check(C.apply(s, p, { type: 'sfPlaceHarbor', edge: bad.id }).error, 'no se puede poner el puerto lejos de sus poblados');
    check(opts.every(e => s.board.edges[e].v.some(v => s.buildings[v] && s.buildings[v].owner === p)), 'los lados ofrecidos tocan un poblado propio');
    C.apply(s, p, { type: 'sfPlaceHarbor', edge: opts[opts.length - 1] });
    check(s.board.ports.length === ports0 + 1 && s.board.ports[ports0].edge === opts[opts.length - 1] && s.phase === 'main', 'el puerto queda donde lo eligió y sigue el turno');
  } else check(s.players[p].harborsHeld.length === 1, 'sin poblado costero, el puerto queda guardado');
  {
    // la máquina lo coloca sola
    const b = (p + 1) % 4;
    s.players[b].bot = true;
    const g2 = s.sf.gifts.find(x => x.kind === 'harbor' && x.taken === null);
    const n0 = s.board.ports.length;
    const sp2 = SF.harborSpots(s, b).length;
    SF.afterRoute(s, b, 'ship', g2.edge);
    check(s.phase === 'main' && (sp2 ? s.board.ports.length === n0 + 1 : s.players[b].harborsHeld.length === 1), 'la máquina coloca su puerto regalado sin preguntar');
  }
  check(s.board.ports.every((a, i) => s.board.ports.every((b, j) => i === j || !s.board.edges[a.edge].v.some(x => s.board.edges[b.edge].v.includes(x)))), 'los puertos nunca quedan en lados vecinos');
  const v = C.viewFor(s, (p + 1) % 4);
  check(v.sf.gifts.every(x => x.card === undefined), 'las cartas de regalo están ocultas');
}

// ================= 6: Tela para Catan =================
{
  const s0 = fresh(6, 3);
  check(s0.setup.order.length === 9 && s0.setup.resFrom === 6, 'Tela para Catan: tres rondas de colocación; recursos con el tercer poblado');
  const s = game(6, 3);
  check(s.players.every(p => ownVerts(s, p.id).length === 3), 'cada jugador tiene 3 poblados');
  check(s.sf.villages.length === 8 && s.sf.villages.every(x => x.cloth === 5), '8 aldeas con 5 telas');
  check(!C.MODES[s.mode].deck.none && s.sf.noLongestRoad, 'sin Gran Ruta Comercial');
  const p = s.current;
  toMain(s);
  check(!C.robberHexes(s, p).some(h => s.board.hexes[h].terrain === 'sea'), 'sin ruta a una aldea no se mueve el pirata');
  check(!C.robberHexes(s, p).some(h => s.board.hexes[h].tribe), 'el ladrón no va a las islas de la tribu');
  const vil = s.sf.villages[0];
  const e = s.board.vertices[vil.v].edges.find(x => s.board.edges[x].sea);
  s.roads[e] = { owner: p, type: 'ship', turn: 0 };
  SF.afterRoute(s, p, 'ship', e);
  check(vil.conn.includes(p) && s.players[p].cloth === 1 && vil.cloth === 4, 'llegar a una aldea da 1 tela');
  check(C.movableShips(s, p).includes(e), 'un barco suelto junto a la aldea todavía se puede mover');
  const far = s.board.edges[e].v.find(x => x !== vil.v);
  s.buildings[far] = { owner: p, type: 'settlement' };
  check(!C.movableShips(s, p).includes(e), 'la ruta entre un poblado y la aldea queda cerrada');
  delete s.buildings[far];
  check(C.robberHexes(s, p).some(h => s.board.hexes[h].terrain === 'sea'), 'con ruta a una aldea ya se puede mover el pirata');
  s.players[p].cloth = 4;
  const vp = C.publicVP(s, p);
  check(SF.extraVP(s, p) >= 2, '2 telas = 1 PV (4 telas = 2 PV, total ' + vp + ')');
  C._R.produce(s, vil.number);
  check(s.players[p].cloth === 5, 'cuando sale el número de la aldea se recibe 1 tela');
  // fin al agotarse las aldeas
  s.sf.villages.forEach((x, i) => { if (i > 0) x.cloth = i < 4 ? 1 : 0; });
  vil.cloth = 1;
  C._R.produce(s, vil.number);
  check(s.phase === 'ended' && s.winner !== null, 'con 3 aldeas o menos con tela termina la partida');
  // robar tela con el pirata
  const t = game(6, 3);
  const a = t.current, b = (a + 1) % 3;
  t.sf.villages[0].conn.push(a);
  const sea = t.board.hexes.find(h => h.terrain === 'sea' && !h.frame && h.id !== t.pirate);
  const se = sea.edges.find(x => t.board.edges[x].sea && !t.roads[x]);
  t.roads[se] = { owner: b, type: 'ship', turn: 0 };
  t.players[b].cloth = 2;
  t.phase = 'robber'; t.robberReturn = 'main';
  C.apply(t, a, { type: 'moveRobber', hex: sea.id, victim: b, cloth: true });
  check(t.players[b].cloth === 1 && t.players[a].cloth === 1, 'el pirata puede robar una tela');
}

// ================= 7: Las islas piratas =================
{
  const s = game(7, 4);
  check(s.players.every(p => ownVerts(s, p.id).length === 3), 'Las islas piratas: cada jugador tiene 3 poblados en la isla del este');
  check(s.robber === null && s.pirate === s.sf.fleet.path[0], 'sin ladrón; la flota empieza en su casilla');
  check(s.devDeck.every(c => c !== 'vp') && s.devDeck.filter(c => c === 'knight').length === 19, 'con 4 jugadores las cartas de PV son caballeros');
  check(fresh(7, 3).devDeck.filter(c => c === 'knight').length === 14 && fresh(7, 3).sf.forts.length === 3, 'con 3 jugadores no hay cartas de PV ni posición blanca');
  const p = s.current;
  toMain(s);
  const fleetHex = s.pirate;
  s.pirate = null;
  const opts = SF.pirateRouteEdges(s, p);
  check(opts.length >= 1 && opts.every(e => C.canPlaceRoute(s, p, e, 'ship') || s.board.edges[e].hexes.includes(s.pirate)), 'solo se puede alargar la ruta propia');
  const other = s.board.edges.find(E => E.sea && !s.roads[E.id] && !opts.includes(E.id) && E.v.some(v => s.buildings[v] && s.buildings[v].owner === p));
  if (other) check(!C.canPlaceRoute(s, p, other.id, 'ship'), 'no se puede empezar otra ruta de barcos');
  // mover barcos: solo el del extremo y solo a otro lado que mantenga la ruta más corta
  {
    const first = SF.routeOf(s, p)[0];
    const tg = C.shipTargets(s, p, first);
    check(C.movableShips(s, p).includes(first) === tg.length > 0 && C.movableShips(s, p).every(e => e === first), 'solo se ofrece mover el barco del extremo, y si tiene otro lugar en la ruta');
    check(tg.every(e => !s.roads[e]), 'al moverlo va a un lado libre de la ruta más corta');
    give(s.players[p], C.COST.ship);
    C.apply(s, p, { type: 'buildShip', edge: opts[0] });
    check(!C.movableShips(s, p).includes(first) && SF.routeOf(s, p).length === 2, 'los barcos de atrás de la ruta no se mueven');
    const alt = C.shipTargets(s, p, opts[0]);
    s.roads[opts[0]].turn = -1;
    if (alt.length) {
      s.roads[opts[0]].war = true;
      C.apply(s, p, { type: 'moveShip', from: opts[0], to: alt[0] });
      check(s.roads[alt[0]] && s.roads[alt[0]].war && SF.routeOf(s, p).slice(-1)[0] === alt[0] && SF.routeOf(s, p).length === 2,
        'el barco movido sigue siendo el extremo de la ruta (y de guerra si lo era)');
      s.roads[alt[0]].war = false;
    }
    s.shipMoved = false;
  }
  void fleetHex;
  // completar la ruta
  s.pirate = null;
  let guard = 0;
  while (!SF.routeDone(s, p) && guard++ < 40) {
    const e = SF.pirateRouteEdges(s, p)[0];
    give(s.players[p], C.COST.ship);
    const r = C.apply(s, p, { type: 'buildShip', edge: e });
    if (r.error) break;
  }
  check(SF.routeDone(s, p) && SF.reachedCircle(s, p), 'la ruta pasa por el cruce de su color y llega a la fortaleza');
  check(SF.pirateRouteEdges(s, p).length === 0, 'la ruta no sigue más allá de la fortaleza');
  // poblado en el cruce de su color
  const circle = SF.fortOf(s, p).circle;
  check(SF.settleOk(s, p, circle, false) && !SF.settleOk(s, (p + 1) % 4, circle, false), 'solo el dueño puebla su cruce de destino');
  // barcos de guerra
  s.players[p].devCards.push({ type: 'knight', turn: -1 });
  s.devPlayed = false;
  C.apply(s, p, { type: 'playDev', card: 'knight' });
  check(SF.warships(s, p) === 1 && s.roads[SF.routeOf(s, p)[0]].war && s.phase === 'main', 'un caballero convierte el barco más atrasado en barco de guerra');
  check(s.largestArmy === null, 'no hay Gran Ejército');
  // ataque: derrota
  const len = SF.routeOf(s, p).length;
  C.apply(s, p, { type: 'sfAttack', forced: 6 });
  check(SF.routeOf(s, p).length === len - 2 && SF.fortOf(s, p).hp === 3 && s.current !== p, 'si pierde el ataque pierde los 2 barcos más cercanos y termina el turno');
  // victoria
  s.current = p; s.phase = 'main'; s.sf.attacked = null;
  while (!SF.routeDone(s, p)) { const e = SF.pirateRouteEdges(s, p)[0]; s.roads[e] = { owner: p, type: 'ship', turn: 0 }; SF.routeOf(s, p).push(e); }
  SF.routeOf(s, p).forEach(e => { s.roads[e].war = true; });
  C.apply(s, p, { type: 'sfAttack', forced: 1 });
  check(SF.fortOf(s, p).hp === 2, 'con más barcos de guerra que el dado le quita 1 defensa');
  s.current = p; s.phase = 'main';
  check(C.apply(s, p, { type: 'sfAttack', forced: 1 }).ok && SF.fortOf(s, p).hp === 1, 'se puede volver a atacar en otro turno');
  s.current = p; s.phase = 'main'; s.sf.attacked = null;
  C.apply(s, p, { type: 'sfAttack', forced: 1 });
  const F = SF.fortOf(s, p);
  check(F.hp === 0 && s.buildings[F.v] && s.buildings[F.v].owner === p, 'sin defensas la fortaleza pasa a ser su poblado');
  // victoria: 10 PV y fortaleza
  s.current = p; s.phase = 'main';
  s.players[p].chits = 20;
  C._R.checkWin(s, p);
  check(s.winner === p, 'gana con 10 PV y su fortaleza conquistada');
  const t = game(7, 4);
  t.players[t.current].chits = 20;
  C._R.checkWin(t, t.current);
  check(t.winner === null, 'sin la fortaleza no gana aunque tenga los PV');
}
{
  // flota pirata: movimiento y ataque
  const s = game(7, 4);
  const p = s.current;
  const F = s.sf.fleet;
  const target = F.path.findIndex(h => s.board.hexes[h].vertices.some(v => s.buildings[v] && s.buildings[v].owner === p));
  if (target >= 0) {
    const steps = (target - F.idx + F.path.length) % F.path.length;
    if (steps >= 1 && steps <= 6) {
      F.idx = (target - steps + F.path.length) % F.path.length;
      s.pirate = F.path[F.idx];
      empty(s.players[p]); give(s.players[p], { wood: 3 });
      C.apply(s, p, { type: 'roll', forced: [steps, 6] });
      check(s.pirate === F.path[target], 'la flota avanza tantos hexágonos como el dado menor');
      check(C.total(s.players[p].resources) < 3 || steps + 6 === 7, 'la flota más fuerte quita cartas al jugador que tiró');
    }
  }
  // 7: robo sin ladrón
  const t = game(7, 3);
  const a = t.current;
  t.players.forEach(P => { empty(P); give(P, { wheat: 2 }); });
  t.sf.fleet.idx = 0; t.pirate = t.sf.fleet.path[0];
  C.apply(t, a, { type: 'roll', forced: [3, 4] });
  if (t.phase === 'gold') C.apply(t, a, { type: 'chooseGold', resources: { ore: 1 } });
  check(t.phase === 'sfSteal', 'con un 7 quien tiró elige a quién robar');
  const v = (a + 1) % 3;
  C.apply(t, a, { type: 'sfSteal', victim: v });
  check(t.phase === 'main' && C.total(t.players[v].resources) === 1, 'roba 1 carta al jugador elegido');
}
{
  // 5-6: el hexágono «!» no ataca
  const s = game(7, 6);
  check(s.sf.forts.length === 6 && s.sf.fleet.noAttack !== null, '5-6: seis fortalezas y casilla sin ataque');
  check(game(7, 5).sf.forts.every(f => f.color !== 'brown'), 'con 5 jugadores no se usa el marrón');
}

// ================= 8: Las maravillas =================
{
  const s = game(8, 3);
  const marked = [].concat(s.sf.purple, s.sf.brown, s.sf.excl);
  check(Object.keys(s.buildings).every(v => !marked.includes(+v) && areaOf(s, +v) === s.board.homeAreas[0]), 'Las maravillas: nadie empieza en cruces marcados ni en islas pequeñas');
  check(s.pirate === null && s.sf.wonders.length === 5, 'sin pirata y con 5 maravillas');
  check(game(8, 6).sf.wonders.length === 7, '5-6: 7 maravillas');
  const p = s.current;
  toMain(s);
  check(SF.wonderOptions(s, p).length === 0 || !SF.wonderOptions(s, p).includes(4), 'sin 2 ciudades no se empieza el Teatro');
  ownVerts(s, p).forEach(v => { s.buildings[v].type = 'city'; });
  const theater = s.sf.wonders.find(w => w.kind === 'theater').id;
  check(SF.wonderOptions(s, p).includes(theater), 'con 2 ciudades se puede empezar el Teatro');
  const ships = s.players[p].pieces.ship;
  C.apply(s, p, { type: 'sfWonderStart', wonder: theater });
  check(s.sf.wonders[theater].owner === p && s.players[p].pieces.ship === ships - 1, 'empezar una maravilla usa un barco');
  check(!SF.wonderOptions((p + 1) % 3 === p ? s : s, (p + 1) % 3).includes(theater), 'otro jugador ya no puede elegir esa maravilla');
  check(SF.wonderOptions(s, p).length === 0, 'cada jugador construye una sola maravilla');
  empty(s.players[p]);
  check(C.apply(s, p, { type: 'sfWonderBuild' }).error, 'sin recursos no se construye un nivel');
  give(s.players[p], { wood: 3, brick: 3, sheep: 9 });
  C.apply(s, p, { type: 'sfWonderBuild' }); C.apply(s, p, { type: 'sfWonderBuild' }); C.apply(s, p, { type: 'sfWonderBuild' });
  check(s.sf.wonders[theater].level === 3 && s.winner === null, 'se pueden construir varios niveles en un turno');
  give(s.players[p], { wood: 1, brick: 1, sheep: 3 });
  C.apply(s, p, { type: 'sfWonderBuild' });
  check(s.winner === p, 'gana al terminar el 4.º nivel');
  // 10 PV y la maravilla más alta
  const t = game(8, 3);
  const a = t.current, b = (a + 1) % 3;
  t.sf.wonders[0].owner = a; t.sf.wonders[0].level = 1;
  t.sf.wonders[1].owner = b; t.sf.wonders[1].level = 1;
  t.players[a].chits = 10;
  C._R.checkWin(t, a);
  check(t.winner === null, 'con 10 PV pero empatado en niveles no gana');
  t.sf.wonders[0].level = 2;
  C._R.checkWin(t, a);
  check(t.winner === a, 'con 10 PV y la maravilla más alta gana');
  // requisitos
  const u = game(8, 3);
  const q = u.current;
  check(SF.wonderReqOk(u, q, 'bridge') === ownVerts(u, q).some(v => u.sf.purple.includes(v)), 'el Gran Puente pide un poblado en el estrecho');
  const pv = u.sf.purple[0];
  u.buildings[pv] = { owner: q, type: 'settlement' };
  check(SF.wonderReqOk(u, q, 'bridge'), 'con un poblado en el cruce violeta se cumple el Gran Puente');
  check(SF.straightRoute(u, q) >= 1, 'se mide el tramo de ruta sin ramificar');
}

// ================= 9: Nuevo mundo =================
{
  const s = game(9, 4);
  check(s.robber === null && s.pirate === null, 'Nuevo mundo: ladrón y pirata empiezan fuera');
  check(s.board.ports.length === 9 && new Set(s.board.ports.map(x => x.owner)).size === 4, 'Nuevo mundo: los 4 jugadores colocan entre todos los 9 puertos');
  const f = fresh(9, 3);
  check(f.phase === 'sfHarbor' && f.current === f.first && f.sf.hp.kind === 'nw' && f.board.ports.length === 0, 'Nuevo mundo: antes de los poblados, el primer jugador coloca un puerto');
  const e0 = SF.harborEdges(f)[0];
  check(SF.harborEdges(f).every(e => f.board.edges[e].hexes.some(id => C.isLand(f.board.hexes[id].terrain)) && f.board.edges[e].hexes.some(id => f.board.hexes[id].terrain === 'sea')), 'los puertos van entre tierra y mar');
  const t0 = f.sf.hp.type;
  C.apply(f, f.first, { type: 'sfPlaceHarbor', edge: e0 });
  check(f.board.ports[0].type === t0 && f.current === (f.first + 1) % 3 && !SF.harborEdges(f).some(e => f.board.edges[e].v.some(v => f.board.edges[e0].v.includes(v))), 'luego coloca el siguiente, sin tocar puertos ya puestos');
  check(C.apply(f, f.first, { type: 'sfPlaceHarbor', edge: SF.harborEdges(f)[0] }).error, 'no se coloca fuera de turno');
  for (let i = 0; i < 20 && f.phase === 'sfHarbor'; i++) C.apply(f, f.current, { type: 'sfPlaceHarbor', edge: SF.harborEdges(f)[0] });
  check(f.phase === 'setup' && f.board.ports.length === 9 && f.current === f.setup.order[0], 'con todos los puertos puestos empieza la colocación');
  check(s.players.every(p => p.home && p.home.length >= 1), 'cada jugador tiene sus islas propias');
  check(s.sf.islandVP === 1, '1 PV por isla ajena');
}

// ================= 5-6: jugadores en pareja =================
{
  const s = game(1, 5);
  check(s.mode === 'seafarers56' && s.pairs && s.bank.wood >= 19, '5-6: jugadores en pareja y banco de 24');
  const p1 = s.current;
  toMain(s);
  C.apply(s, p1, { type: 'endTurn' });
  check(s.pair && s.pair.p2 === (p1 + 3) % 5 && s.current === s.pair.p2 && s.phase === 'main', 'tras el jugador 1 juega el jugador 2 (tercero a su izquierda)');
  check(C.apply(s, s.current, { type: 'offerTrade', give: { wood: 1 }, get: { ore: 1 } }).error, 'el jugador 2 solo comercia con el banco');
  C.apply(s, s.current, { type: 'endTurn' });
  check(s.current === (p1 + 1) % 5 && s.phase === 'roll', 'luego tira el siguiente jugador');
}

// ================= partidas completas =================
{
  let ended = 0;
  [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(sc => {
    const n = 3 + (sc % 4);
    const s = C.createGame({ mode: C.resolveMode('seafarers', n), options: { scenario: sc }, players: NAMES.slice(0, n).map((name, i) => ({ name, color: 'c' + i, bot: true })) });
    const mem = s.players.map(() => ({}));
    for (let i = 0; i < 30000 && s.phase !== 'ended'; i++) {
      let pid;
      if (s.phase === 'discard') pid = +Object.keys(s.pendingDiscard)[0];
      else if (s.phase === 'gold') pid = +Object.keys(s.pendingGold)[0];
      else if (s.phase === 'main' && s.trade) { const t = s.trade; const pend = s.players.find(p => p.id !== t.from && t.responses[p.id] === undefined); pid = pend ? pend.id : t.from; }
      else pid = C.actor(s);
      let a = C.AI.decide(s, pid, mem[pid]);
      if (!a || a.type === 'wait') a = { type: 'endTurn' };
      const r = C.apply(s, pid, a);
      if (r.error && C.apply(s, C.actor(s), { type: 'endTurn' }).error && s.phase === 'roadBuilding') C.apply(s, C.actor(s), { type: 'endRoadBuilding' });
    }
    if (s.phase === 'ended') ended++;
  });
  check(ended === 9, 'los 9 escenarios se juegan hasta el final entre bots (' + ended + '/9)');
}

// ================= reglas 2025 =================
{
  const s = game(1, 4, { rules2025: true });
  toMain(s);
  const p = s.current;
  check(s.rules2025 && s.pirate !== null, 'reglas 2025: la opción llega a la partida');
  s.phase = 'robber'; s.robberReturn = 'main';
  check(C.canPirateFrame(s, p) && !C.apply(s, p, { type: 'moveRobber', frame: true }).error && s.pirate === null && s.pirateOff && s.phase === 'main', 'reglas 2025: el pirata puede ir al marco');
  s.phase = 'robber'; s.robberReturn = 'main';
  const seaHex = C.robberHexes(s, p).find(h => s.board.hexes[h].terrain === 'sea');
  check(seaHex !== undefined && !C.apply(s, p, { type: 'moveRobber', hex: seaHex }).error && s.pirate === seaHex && !s.pirateOff, 'reglas 2025: desde el marco el pirata vuelve al mar');
  const s0 = game(1, 4);
  toMain(s0); s0.phase = 'robber'; s0.robberReturn = 'main';
  check(!C.canPirateFrame(s0, s0.current) && !!C.apply(s0, s0.current, { type: 'moveRobber', frame: true }).error, 'sin la opción el pirata no va al marco');
  // Gran Muralla: un edificio en el páramo basta con las reglas 2025
  const w = game(8, 4, { rules2025: true }), w0 = game(8, 4);
  [w, w0].forEach(t => { const v = t.sf.brown.find(x => !t.buildings[x] && t.board.vertices[x].adj.every(a => !t.buildings[a])); t.buildings[v] = { owner: t.current, type: 'settlement' }; });
  check(SF.wonderReqOk(w, w.current, 'wall') && !SF.wonderReqOk(w0, w0.current, 'wall'), 'reglas 2025: la Gran Muralla pide un solo edificio (antes, dos poblados)');
}

console.log(fails ? fails + ' prueba(s) fallaron' : 'Todas las pruebas pasaron');
process.exit(fails ? 1 : 0);
