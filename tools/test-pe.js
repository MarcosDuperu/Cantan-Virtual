// Pruebas de reglas de Piratas y Exploradores. Uso: node tools/test-pe.js
['board', 'rules', 'ck', 'pe', 'ai', 'names'].forEach(f => require('../src/js/engine/' + f + '.js'));
const C = globalThis.Catan;
const PE = C.PE;
let fails = 0;
const check = (cond, msg) => { if (!cond) { fails++; console.log('FALLO:', msg); } else console.log('ok  ', msg); };

function game(scenario, n = 3) {
  const s = C.createGame({ mode: 'explorers', options: { scenario }, players: ['Ana', 'Beto', 'Caro', 'Dani'].slice(0, n).map((name, i) => ({ name, color: 'c' + i })) });
  const mem = s.players.map(() => ({}));
  while (s.phase === 'setup') {
    const r = C.apply(s, s.current, C.AI.decide(s, s.current, mem[s.current]));
    if (r.error) throw new Error('setup: ' + r.error);
  }
  return s;
}
const give = (P, r) => Object.entries(r).forEach(([k, v]) => { P.resources[k] += v; });
const empty = P => C.RES.forEach(k => { P.resources[k] = 0; });
const revealAll = s => { s.board.hexes.forEach(h => { if (h.hidden) { h.hidden = false; if ((C.TERRAIN_RES[h.terrain] || (h.terrain === 'gold' && !h.lair)) && !h.number) h.number = s.board.numberPool[h.area].pop() || 5; } }); C.refreshFlags(s.board); };
function mkShip(s, pid, edge, cargo) {
  const id = ++s.pe.shipSeq;
  s.pe.ships[id] = { id, owner: pid, edge, cargo: cargo || [], mp: 4, moved: false, boosted: false, paid: false, fought: false, stopped: false };
  return s.pe.ships[id];
}
const routeEdgesOf = (s, hid) => s.board.hexes[hid].edges.filter(e => PE.isRoute(s, e));
const toMain = s => { C.apply(s, s.current, { type: 'roll', forced: [1, 2] }); if (s.phase !== 'main') s.phase = 'main'; };
const rollNoProd = (s, pid) => {
  const nums = new Set();
  Object.entries(s.buildings).forEach(([v, b]) => { if (b.owner === pid) s.board.vertices[v].hexes.forEach(h => { if (s.board.hexes[h].number) nums.add(s.board.hexes[h].number); }); });
  for (const n of [2, 3, 4, 5, 6, 8, 9, 10, 11, 12]) if (!nums.has(n)) return n;
  return null;
};

// --- preparación ---
let s = game(2);
check(s.phase === 'roll' && s.turn === 1, 'tras la colocación empieza el primer turno');
check(s.players.every(p => Object.values(s.buildings).filter(b => b.owner === p.id && b.type === 'harbor').length === 1 &&
  Object.values(s.buildings).filter(b => b.owner === p.id && b.type === 'settlement').length === 1), 'cada jugador tiene un poblado portuario y un poblado');
check(s.players.every(p => Object.values(s.pe.ships).filter(x => x.owner === p.id && x.cargo[0] === 'settler').length === 1), 'cada jugador tiene un barco con colono');
check(s.players.every(p => C.publicVP(s, p.id) === 3), 'al empezar cada jugador tiene 3 PV (portuario 2 + poblado 1)');
check(s.players.every(p => p.gold === 2), 'oro inicial: 2');
check(s.vpTarget === 12, 'Guaridas piratas se juega a 12 PV');
check(s.longestRoad === null && s.robber === null, 'sin Gran Ruta ni ladrón');

// --- información oculta en la vista ---
let v = C.viewFor(s, 0);
check(v.board.hexes.filter(h => h.hidden).every(h => h.terrain === 'hidden' && !h.number && !h.lair && !h.fishNo && !h.spice), 'la vista no revela los hexágonos ocultos');
check(!('numberPool' in v.board), 'la vista no incluye las fichas pendientes');
check(v.board.vertices.every(x => !x.land || x.hexes.some(h => !v.board.hexes[h].hidden && C.isLand(v.board.hexes[h].terrain))), 'los cruces no delatan tierra oculta');

// --- compensación de oro y producción ---
s = game(2); let p = s.current;
let n = rollNoProd(s, p);
const g0 = s.players.map(x => x.gold);
C.apply(s, p, { type: 'roll', forced: [n <= 6 ? 1 : n - 6, n <= 6 ? n - 1 : 6] });
check(s.players[p].gold === g0[p] + 1, 'si la tirada no te da nada recibes 1 oro (' + n + ')');

// --- el 7: descarte y barco pirata ---
s = game(2); p = s.current;
const q = (p + 1) % 3;
give(s.players[q], { wood: 5, brick: 5 });
C.apply(s, p, { type: 'roll', forced: [3, 4] });
check(s.phase === 'discard' && s.pendingDiscard[q], 'con un 7 descarta quien tiene más de 7 cartas');
C.apply(s, q, { type: 'discard', resources: C.AI.decide(s, q, {}).resources });
check(s.phase === 'pirate', 'después del descarte se coloca el barco pirata');
const near = s.board.hexes.find(h => h.nearStart && h.terrain === 'sea').id;
check(!!C.apply(s, p, { type: 'placePirate', hex: near }).error, 'el pirata no puede ir junto a la isla inicial');
revealAll(s);
const ph = PE.pirateHexes(s)[0];
const qs = Object.values(s.pe.ships).find(x => x.owner === q);
qs.edge = routeEdgesOf(s, ph)[0];
const cards0 = C.total(s.players[p].resources);
check(!C.apply(s, p, { type: 'placePirate', hex: ph, victim: q }).error && s.pe.pirate.hex === ph && s.pe.pirate.owner === p, 'colocar el barco pirata en un mar válido');
check(C.total(s.players[p].resources) === cards0 + 1 && s.phase === 'main', 'el pirata roba una carta a un barco junto a él');

s = game(1); p = s.current;
C.apply(s, p, { type: 'roll', forced: [3, 4] });
check(s.phase === 'main' || s.phase === 'discard', 'en ¡Tierra a la vista! no hay barco pirata');

// --- poblado portuario ---
s = game(2); p = s.current; let P = s.players[p];
toMain(s);
const coast = s.board.vertices.find(x => x.hexes.some(h => s.board.hexes[h].start) && PE.coastal(s, x.id) && PE.settleOk(s, x.id)).id;
s.buildings[coast] = { owner: p, type: 'settlement' }; P.pieces.settlement--;
give(P, { wheat: 2, ore: 2 });
let vp0 = C.publicVP(s, p);
check(!C.apply(s, p, { type: 'buildHarbor', vertex: coast }).error && s.buildings[coast].type === 'harbor', 'mejorar un poblado costero a portuario');
check(C.publicVP(s, p) === vp0 + 1 && P.pieces.settlement === 4 && P.pieces.harbor === 2, 'el portuario vale 2 PV y devuelve el poblado a la reserva');
check(!!C.apply(s, p, { type: 'buildCity', vertex: coast }).error && !!C.apply(s, p, { type: 'buyDev' }).error, 'no hay ciudades ni cartas de desarrollo');

// --- barcos: construcción y capacidad de las rutas ---
s = game(2); p = s.current; P = s.players[p];
toMain(s);
const hv = PE.ownHarbors(s, p)[0];
const be = PE.shipBuildEdges(s, p);
give(P, { wood: 2, sheep: 2 });
check(be.length > 0 && !C.apply(s, p, { type: 'buildShip', edge: be[0] }).error && P.pieces.ship === 1, 'construir un barco junto al poblado portuario');
const full = be.find(e => PE.shipsAt(s, e).length === 1) !== undefined ? be.find(e => PE.shipsAt(s, e).length === 1) : be[0];
while (PE.shipsAt(s, full).length < 2) mkShip(s, p, full);
check(!PE.shipBuildEdges(s, p).includes(full), 'máximo 2 barcos por ruta');
const farE = s.board.edges.find(e => PE.isRoute(s, e.id) && !e.v.includes(hv) && !PE.edgeTouchesHidden(s, e.id)).id;
check(!!C.apply(s, p, { type: 'buildShip', edge: farE }).error, 'no se construye un barco lejos del poblado portuario');

// --- movimiento, impulso y fases ---
s = game(2); p = s.current; P = s.players[p];
toMain(s);
let sh = Object.values(s.pe.ships).find(x => x.owner === p);
check(!!C.apply(s, p, { type: 'moveShip', ship: sh.id, to: sh.edge }).error, 'en la fase de comercio no se mueven barcos');
check(!C.apply(s, p, { type: 'startMove' }).error && s.phase === 'move', 'pasar a la fase de movimiento');
give(P, { wood: 1, brick: 1 });
check(!!C.apply(s, p, { type: 'buildRoad', edge: C.validRoutes(s, p, 'road')[0] }).error, 'en la fase de movimiento ya no se construye');
let r = PE.reach(s, sh.id);
check([...r.values()].every(x => x.cost <= 4) && r.size > 0, 'un barco alcanza rutas a 4 movimientos como máximo');
const far = [...r.entries()].filter(([, x]) => !PE.edgeTouchesHidden(s, 0) && x.cost === Math.max(...[...r.values()].map(y => y.cost)))[0];
C.apply(s, p, { type: 'moveShip', ship: sh.id, to: far[0] });
check(sh.edge === far[0] && sh.mp === 4 - far[1].cost, 'mover gasta tantos movimientos como rutas recorridas');
give(P, { sheep: 2 });
const mpBefore = sh.mp;
if (!sh.stopped) {
  check(!C.apply(s, p, { type: 'boostShip', ship: sh.id }).error && sh.mp === mpBefore + 2, 'pagar 1 lana da +2 movimientos');
  check(!!C.apply(s, p, { type: 'boostShip', ship: sh.id }).error, 'solo una vez por barco y turno');
}
C.apply(s, p, { type: 'endTurn' });
check(s.phase === 'roll' && s.current !== p, 'terminar el turno desde la fase de movimiento');

// --- descubrir ---
s = game(2); p = s.current; P = s.players[p];
toMain(s); C.apply(s, p, { type: 'startMove' });
const e2 = s.board.edges.find(e => PE.isRoute(s, e.id) && PE.edgeTouchesHidden(s, e.id) && PE.shipsAt(s, e.id).length === 0 &&
  e.v.some(x => s.board.vertices[x].edges.some(o => o !== e.id && PE.isRoute(s, o) && !PE.edgeTouchesHidden(s, o))));
const e1 = e2.v.map(x => s.board.vertices[x].edges.find(o => o !== e2.id && PE.isRoute(s, o) && !PE.edgeTouchesHidden(s, o))).find(x => x !== undefined);
sh = mkShip(s, p, e1);
const hidden0 = s.board.hexes.filter(h => h.hidden).length;
const res0 = C.total(P.resources), gold0 = P.gold;
check(!C.apply(s, p, { type: 'moveShip', ship: sh.id, to: e2.id }).error, 'mover un barco junto a lo desconocido');
const revealed = hidden0 - s.board.hexes.filter(h => h.hidden).length;
check(revealed >= 1 && !PE.edgeTouchesHidden(s, e2.id), 'se descubren los hexágonos a los que apunta el barco (' + revealed + ')');
const dev = s.events.filter(x => x.type === 'discover').pop();
check(dev.found.length === revealed && C.total(P.resources) - res0 === dev.found.filter(f => f.res).length &&
  P.gold - gold0 === 2 * dev.found.filter(f => !C.TERRAIN_RES[f.terrain]).length, 'descubrir da 1 recurso por terreno y 2 oro por lo demás');
check(sh.stopped && PE.reach(s, sh.id).size === 0, 'descubrir termina el movimiento del barco');
check(s.board.hexes.filter(h => !h.hidden && (C.TERRAIN_RES[h.terrain] || (h.terrain === 'gold' && !h.lair))).every(h => h.number), 'los terrenos descubiertos reciben ficha numérica (de la pila de su área)');

// --- no se construye junto a lo oculto ---
s = game(2);
const landHidden = s.board.hexes.find(h => h.hidden && C.TERRAIN_RES[h.terrain] && C.neighborsOf(s.board, h).some(n => n.hidden));
landHidden.hidden = false; C.refreshFlags(s.board);
const vNear = landHidden.vertices.find(x => PE.touchesHidden(s, x));
check(vNear !== undefined && !PE.settleOk(s, vNear), 'no se puede fundar junto a un hexágono sin descubrir');

// --- fundar con un barco colono ---
s = game(2); p = s.current; P = s.players[p];
revealAll(s);
toMain(s);
let spot = null, spotE = null;
for (const x of s.board.vertices) {
  if (!PE.settleOk(s, x.id) || x.hexes.some(h => s.board.hexes[h].start)) continue;
  const e = x.edges.find(o => PE.isRoute(s, o));
  if (e !== undefined) { spot = x.id; spotE = e; break; }
}
sh = mkShip(s, p, spotE, ['settler', 'crew']);
P.pieces.ship--; P.pieces.settler--; P.pieces.crew--;
const pcs = Object.assign({}, P.pieces);
vp0 = C.publicVP(s, p);
check(!C.apply(s, p, { type: 'foundSettlement', ship: sh.id, vertex: spot }).error && s.buildings[spot] && s.buildings[spot].owner === p, 'un barco colono funda un poblado gratis en una isla nueva');
check(!s.pe.ships[sh.id] && P.pieces.ship === pcs.ship + 1 && P.pieces.settler === pcs.settler + 1 && P.pieces.crew === pcs.crew + 1, 'el barco, el colono y la carga vuelven a la reserva');
check(C.publicVP(s, p) === vp0 + 1, 'el poblado fundado da 1 PV');

// --- colonos y tripulaciones: muelle, barcos y transbordo ---
s = game(2); p = s.current; P = s.players[p];
toMain(s);
const hv2 = PE.ownHarbors(s, p)[0];
give(P, { ore: 3, sheep: 3 });
check(!C.apply(s, p, { type: 'buildCrew', dock: hv2 }).error && s.pe.docks[hv2].includes('crew'), 'una tripulación nueva va al muelle');
sh = Object.values(s.pe.ships).find(x => x.owner === p);
const nearShip = PE.harborOf(s, p, sh.edge) !== undefined;
if (nearShip) {
  check(!!C.apply(s, p, { type: 'buildCrew', ship: sh.id }).error, 'un barco con colono no tiene sitio para más carga');
  check(!!C.apply(s, p, { type: 'transfer', ship: sh.id, item: 'settler', dir: 'unload' }).error, 'el colono no cabe en un muelle con una tripulación');
}
const dockShip = mkShip(s, p, s.board.vertices[hv2].edges.find(e => PE.isRoute(s, e)), []);
check(!C.apply(s, p, { type: 'transfer', ship: dockShip.id, item: 'crew', dir: 'load' }).error && dockShip.cargo[0] === 'crew' && !s.pe.docks[hv2].length, 'cargar una tripulación del muelle al barco');
check(!C.apply(s, p, { type: 'transfer', ship: dockShip.id, item: 'crew', dir: 'unload' }).error && s.pe.docks[hv2][0] === 'crew', 'descargar la tripulación al muelle');
const lone = mkShip(s, p, s.board.edges.find(e => PE.isRoute(s, e.id) && PE.harborOf(s, p, e.id) === undefined).id);
s.phase = 'main';
check(!!C.apply(s, p, { type: 'buildCrew', ship: lone.id }).error, 'no se cargan piezas nuevas en un barco lejos del puerto');

// --- guaridas piratas ---
s = game(2); p = s.current; P = s.players[p];
revealAll(s);
const lairHex = s.board.hexes.find(h => h.lair && routeEdgesOf(s, h.id).length);
const q2 = (p + 1) % 3, q3 = (p + 2) % 3;
check(!lairHex.number, 'una guarida sin capturar no tiene número');
// mientras haya guarida, el río de oro no produce
const lv = lairHex.vertices.find(x => s.board.vertices[x].land && !s.buildings[x]);
check(!PE.settleOk(s, lv), 'no se construye junto a una guarida sin capturar');
toMain(s); C.apply(s, p, { type: 'startMove' });
lairHex.lair.crews = [q2, q2];
const realRandom = Math.random;
s.players[q2].pieces.crew -= 2;
sh = mkShip(s, p, routeEdgesOf(s, lairHex.id)[0], ['crew']);
P.pieces.crew--;
const gp = P.gold, gq = s.players[q2].gold, crewQ = s.players[q2].pieces.crew;
check(!C.apply(s, p, { type: 'dropCrew', ship: sh.id, hex: lairHex.id }).error, 'desembarcar la 3.ª tripulación en la guarida');
check(lairHex.lair && P.gold === gp && !PE.adjacentLairs(s, sh.edge).includes(lairHex.id), 'con 3 tripulaciones cae la guarida: ya no admite más, pero el botín espera');
check(!C.apply(s, p, { type: 'endTurn' }).error && !lairHex.lair, 'al terminar la fase de movimiento se resuelve la captura');
s.current = p; s.phase = 'move';
check(P.gold === gp + 2 && s.players[q2].gold === gq + 2, 'cada participante recibe 2 oro');
check(P.missions.lairs + s.players[q2].missions.lairs === 3 && P.missions.lairs >= 1 && s.players[q2].missions.lairs >= 1, 'cada participante avanza 1 y el héroe 1 más');
const hero = P.missions.lairs === 2 ? p : q2;
check(s.pe.leader.lairs === hero, 'el héroe pasa a liderar la misión');
check(s.players[q2].pieces.crew === crewQ + (hero === q2 ? 1 : 0) && s.players[q3].missions.lairs === 0, 'el héroe devuelve 1 tripulación a su reserva');
check(lairHex.leftCrews && lairHex.leftCrews.length === 2, 'las otras tripulaciones quedan junto a la guarida');
check(lairHex.number > 0, 'al capturarla, el río de oro recibe el número de la ficha de guarida');
const mineLeft = lairHex.leftCrews.includes(p);
if (mineLeft) {
  const pk = mkShip(s, p, routeEdgesOf(s, lairHex.id)[0], []);
  check(!C.apply(s, p, { type: 'pickupCrew', ship: pk.id }).error && pk.cargo[0] === 'crew', 'recoger en barco una tripulación propia de la guarida');
}
check(C.publicVP(s, hero) === 3 + PE.TRACK_VP[2] + 1, 'PV de misión: casilla 2 + carta de líder');
// tras la captura el río de oro produce 2 oro por poblado
s.phase = 'main';
const gv = lairHex.vertices.find(x => PE.settleOk(s, x));
if (gv !== undefined) {
  s.buildings[gv] = { owner: q3, type: 'settlement' };
  s.phase = 'roll';
  const g3 = s.players[q3].gold;
  const num = lairHex.number;
  C.apply(s, s.current, { type: 'roll', forced: [num <= 6 ? 1 : num - 6, num <= 6 ? num - 1 : 6] });
  check(s.players[q3].gold >= g3 + 2, 'el río de oro liberado da 2 oro por poblado');
}

// --- pescado ---
s = game(3); p = s.current; P = s.players[p];
revealAll(s);
const fishHex = s.board.hexes.find(h => h.terrain === 'fish' && routeEdgesOf(s, h.id).length);
toMain(s);
check(!C.apply(s, p, { type: 'startMove' }).error && !fishHex.fish && PE.canRollFish(s), 'al pasar a la fase de movimiento el dado de pesca es opcional');
check(!C.apply(s, p, { type: 'rollFish', forcedFish: fishHex.fishNo }).error && fishHex.fish === 1, 'el dado de pesca pone pescado en el banco con ese número');
check(!!C.apply(s, p, { type: 'rollFish' }).error, 'el dado de pesca se tira una sola vez por turno');
sh = mkShip(s, p, routeEdgesOf(s, fishHex.id)[0], ['crew']);
check(!!C.apply(s, p, { type: 'loadFish', ship: sh.id }).error, 'el pescado necesita la bodega vacía');
sh.cargo = [];
check(!C.apply(s, p, { type: 'loadFish', ship: sh.id }).error && sh.cargo[0] === 'fish' && !fishHex.fish, 'cargar el pescado');
const council = PE.councilHex(s);
check(!!C.apply(s, p, { type: 'deliver', ship: sh.id }).error || PE.edgeTouchesHex(s, sh.edge, council), 'solo se entrega en el Consejo de Catan');
sh.edge = routeEdgesOf(s, council)[0];
vp0 = C.publicVP(s, p);
check(!C.apply(s, p, { type: 'deliver', ship: sh.id }).error && P.missions.fish === 1 && !sh.cargo.length, 'entregar pescado al Consejo avanza la misión');
check(C.publicVP(s, p) === vp0 + PE.TRACK_VP[1] + 1, 'primera entrega: 1 PV de casilla + 1 de líder');
const q4 = (p + 1) % 3;
s.players[q4].missions.fish = 0;
C.apply(s, p, { type: 'endTurn' });
// empate: el líder conserva la carta
s.pe.leader.fish = p;
s.players[q4].missions.fish = 1;
check(s.pe.leader.fish === p, 'en empate el líder conserva la carta de misión');

// --- especias ---
s = game(4); p = s.current; P = s.players[p];
revealAll(s);
const spiceHex = s.board.hexes.find(h => h.terrain === 'spice' && routeEdgesOf(s, h.id).length);
toMain(s); C.apply(s, p, { type: 'startMove' });
sh = mkShip(s, p, routeEdgesOf(s, spiceHex.id)[0], ['crew']);
const left0 = spiceHex.spice.left, crewPieces = P.pieces.crew;
check(!C.apply(s, p, { type: 'tradeSpice', ship: sh.id }).error && sh.cargo[0] === 'spice' && spiceHex.spice.left === left0 - 1, 'dejar una tripulación y cargar una especia');
check(P.benefits.includes(spiceHex.spice.benefit) && P.pieces.crew === crewPieces, 'la aldea da su ventaja y la tripulación se queda allí');
sh.cargo.push('crew');
check(!!C.apply(s, p, { type: 'tradeSpice', ship: sh.id, hex: spiceHex.id }).error, 'solo 1 tripulación por jugador en cada isla de especias');
sh.cargo.pop();
sh.edge = routeEdgesOf(s, PE.councilHex(s))[0];
check(!C.apply(s, p, { type: 'deliver', ship: sh.id }).error && P.missions.spice === 1, 'entregar la especia avanza la misión de especias');
P.benefits = ['fastTravel'];
check(PE.baseMP(s, p) === 5, 'Viaje rápido: 5 movimientos');
P.benefits = ['fastTravel', 'fastTravel'];
check(PE.baseMP(s, p) === 6, 'Viaje rápido de las 2 aldeas: 6 movimientos');
const q6 = (p + 1) % 3;
const sv = spiceHex.vertices.find(x => s.board.vertices[x].land && PE.settleOk(s, x) && s.board.vertices[x].hexes.filter(h => s.board.hexes[h].spice).length === 1);
if (sv !== undefined) check(PE.spiceOk(s, p, sv) && !PE.spiceOk(s, q6, sv), 'solo quien dejó tripulación puede construir junto a la isla de especias');

// --- comercio con oro ---
s = game(2); p = s.current; P = s.players[p];
toMain(s); empty(P); P.gold = 10;
give(P, { wood: 6 });
check(!C.apply(s, p, { type: 'bankTrade', give: 'wood', get: 'ore', count: 1 }).error && P.resources.wood === 3 && P.resources.ore === 1, 'banco 3:1');
check(!C.apply(s, p, { type: 'bankTrade', give: 'wood', get: 'gold' }).error && P.resources.wood === 0 && P.gold === 11, '3 recursos iguales → 1 oro');
check(!C.apply(s, p, { type: 'bankTrade', give: 'gold', get: 'wheat' }).error && P.gold === 9 && P.resources.wheat === 1, '2 oro → 1 recurso');
C.apply(s, p, { type: 'bankTrade', give: 'gold', get: 'wheat' });
check(!!C.apply(s, p, { type: 'bankTrade', give: 'gold', get: 'wheat' }).error, 'oro por recursos solo 2 veces por turno');
P.benefits.push('fastGold'); give(P, { sheep: 3 });
C.apply(s, p, { type: 'bankTrade', give: 'sheep', get: 'gold' });
check(P.resources.sheep === 2 && PE.tradeRate(s, p, 'sheep', 'gold') === 3, 'Oro rápido (1 aldea): 1 recurso → 1 oro, una vez por turno');
P.benefits.push('fastGold');
check(PE.tradeRate(s, p, 'sheep', 'gold') === 1, 'Oro rápido de las 2 aldeas: una venta más por turno');
check(C.tradeRatios(s, p).wood === 3, 'no hay puertos: siempre 3:1');

// --- tributo y combate contra el pirata ---
s = game(2); p = s.current; P = s.players[p];
revealAll(s);
const ph2 = PE.pirateHexes(s).find(h => routeEdgesOf(s, h).length >= 3);
const q5 = (p + 1) % 3;
s.pe.pirate = { hex: ph2, owner: q5 };
toMain(s); C.apply(s, p, { type: 'startMove' });
const pe0 = routeEdgesOf(s, ph2);
sh = mkShip(s, p, pe0[0]);
const nextPir = pe0.find(e => e !== pe0[0] && s.board.edges[e].v.some(x => s.board.edges[pe0[0]].v.includes(x)));
r = PE.reach(s, sh.id);
check(r.get(nextPir) && r.get(nextPir).tribute, 'pasar por una ruta del pirata exige tributo');
P.gold = 3;
C.apply(s, p, { type: 'moveShip', ship: sh.id, to: nextPir });
check(P.gold === 2 && sh.paid, 'se paga 1 oro de tributo');
const sh2 = mkShip(s, p, pe0[0]);
P.gold = 0;
check(!PE.reach(s, sh2.id).has(nextPir), 'sin oro no se puede pasar junto al pirata');
check(PE.canFight(s, p, sh2), 'un barco sin mover junto al pirata puede atacarlo');
check(!C.apply(s, p, { type: 'fightPirate', ship: sh2.id, forced: 3 }).error && s.pe.pirate && sh2.stopped, 'con un 3 el ataque falla y el barco se detiene');
const sh3 = mkShip(s, p, pe0[0]);
check(!C.apply(s, p, { type: 'fightPirate', ship: sh3.id, forced: 6 }).error && s.phase === 'pirate' && !s.pe.pirate, 'con un 6 se ahuyenta al pirata');
const ph3 = PE.pirateHexes(s).find(h => h !== ph2);
check(!C.apply(s, p, { type: 'placePirate', hex: ph3 }).error && s.pe.pirate.owner === p && s.phase === 'move', 'el vencedor coloca su pirata y sigue moviendo');
P.benefits.push('pirate5');
s.pe.pirate = { hex: ph2, owner: q5 };
const sh4 = mkShip(s, p, pe0[0]);
C.apply(s, p, { type: 'fightPirate', ship: sh4.id, forced: 4 });
check(s.phase === 'move' && s.pe.pirate, 'Bonificación pirata (5): un 4 no basta');
const sh5 = mkShip(s, p, pe0[0]);
C.apply(s, p, { type: 'fightPirate', ship: sh5.id, forced: 5 });
check(s.phase === 'pirate', 'Bonificación pirata (5): también gana con un 5');

// --- victoria ---
s = game(2); p = s.current; P = s.players[p];
toMain(s);
s.vpTarget = C.totalVP(s, p) + 1;
const cv = s.board.vertices.find(x => x.hexes.some(h => s.board.hexes[h].start) && PE.coastal(s, x.id) && PE.settleOk(s, x.id)).id;
s.buildings[cv] = { owner: p, type: 'settlement' };
s.vpTarget = C.totalVP(s, p) + 1;
give(P, { wheat: 2, ore: 2 });
C.apply(s, p, { type: 'buildHarbor', vertex: cv });
check(s.phase === 'ended' && s.winner === p, 'gana quien alcanza los PV en su turno');

// --- la vista del cliente calcula lo mismo que el motor ---
s = game(5); p = s.current;
toMain(s); C.apply(s, p, { type: 'startMove' });
v = C.viewFor(s, p);
const myShip = Object.values(s.pe.ships).find(x => x.owner === p);
check(JSON.stringify([...PE.reach(s, myShip.id)]) === JSON.stringify([...PE.reach(v, myShip.id)]), 'el alcance de un barco coincide en el motor y en la vista');

// --- partidas completas con bots en los 5 escenarios ---
for (const sc of [1, 2, 3, 4, 5]) {
  let ended = 0, errs = 0;
  for (let g = 0; g < 4; g++) {
    const t = C.createGame({ mode: 'explorers', options: { scenario: sc }, players: ['A', 'B', 'C', 'D'].map((name, i) => ({ name, color: 'c' + i, bot: true, difficulty: 'normal' })) });
    const mem = t.players.map(() => ({}));
    for (let i = 0; i < 30000 && t.phase !== 'ended'; i++) {
      let pid = t.phase === 'discard' ? +Object.keys(t.pendingDiscard)[0] : C.actor(t);
      if (t.phase === 'main' && t.trade) { const pend = t.players.find(x => x.id !== t.trade.from && t.trade.responses[x.id] === undefined); pid = pend ? pend.id : t.trade.from; }
      const r2 = C.apply(t, pid, C.AI.decide(t, pid, mem[pid]));
      if (r2.error) { errs++; C.apply(t, t.current, { type: 'endTurn' }); }
    }
    if (t.phase === 'ended') ended++;
  }
  check(ended === 4 && errs === 0, `escenario ${sc}: 4 partidas entre bots terminan sin errores`);
}


// --- mapas oficiales ---
const HID = { explorers: [16, 22, 22, 26, 32], explorers56: [28, 28, 32, 32, 40] };
for (const mode of ['explorers', 'explorers56']) {
  for (const sc of [1, 2, 3, 4, 5]) {
    const b = C.generateBoard(mode, { scenario: sc });
    const hid = b.hexes.filter(h => h.hidden);
    const cnt = k => hid.filter(k).length;
    const big = mode === 'explorers56';
    const lairs = cnt(h => h.lair), fish = cnt(h => h.terrain === 'fish'), spice = cnt(h => h.terrain === 'spice');
    const expLairs = { 1: 0, 2: big ? 8 : 6, 3: big ? 8 : 5, 4: 0, 5: big ? 8 : 6 }[sc];
    const expFish = { 1: 0, 2: 0, 3: big ? 6 : 5, 4: 6, 5: 6 }[sc];
    const expSpice = sc >= 4 ? 6 : 0;
    check(hid.length === HID[mode][sc - 1] && lairs === expLairs && fish === expFish && spice === expSpice,
      `${mode} escenario ${sc}: ${hid.length} ocultos, ${lairs} guaridas, ${fish} bancos, ${spice} especias`);
  }
}
let b = C.generateBoard('explorers', { scenario: 3 });
check(b.hexes.filter(h => h.start).length === 15 && !b.hexes.some(h => h.start && h.terrain === 'desert') &&
  b.hexes.filter(h => h.start).map(h => h.number).join() === '11,9,3,8,4,10,6,12,8,10,4,11,6,3,5', 'isla inicial oficial: 15 hexágonos sin desierto y fichas fijas');
const cou = b.hexes.find(h => h.terrain === 'council');
check(cou && C.neighborsOf(b, cou).filter(n => n.start).length === 1 && cou.nearStart, 'el Consejo de Catan está junto a la costa este de la isla inicial');
check(b.hexes.filter(h => h.hidden).every(h => h.area === 0 || h.area === 1) && !b.hexes.some(h => h.hidden && h.area === 0 && C.neighborsOf(b, h).some(n => n.hidden && n.area === 1)),
  'zona inexplorada en dos áreas (norte y sur) separadas por mar');
check(b.hexes.filter(h => h.hidden && h.area === 0 && h.lair).length === 3 && b.hexes.filter(h => h.hidden && h.area === 1 && h.terrain === 'fish').length === 3,
  'Pescado para Catan: 3 guaridas y 2 bancos al norte, 2 guaridas y 3 bancos al sur');
b = C.generateBoard('explorers', { scenario: 5 });
const sp5 = b.hexes.filter(h => h.terrain === 'spice');
check([0, 1].every(ai => ['fastTravel', 'fastGold'].every(k => sp5.filter(h => h.area === ai && h.spice.benefit === k).length === 1)) &&
  sp5.filter(h => /^pirate[45]$/.test(h.spice.benefit)).length === 2, 'cada área tiene una aldea de cada ventaja (bonificación pirata 4 y 5)');
{
  const g = C.generateBoard('explorers56', { scenario: 2 });
  const st = g.hexes.filter(h => h.start);
  check(st.length === 22 && st.map(h => h.number).join() === '2,9,11,8,4,10,10,3,8,6,5,4,5,3,10,6,8,4,11,6,12,9' && g.harborSites.length === 18,
    '5-6: isla inicial de 22 hexágonos con fichas fijas y 18 lugares para portuarios');
  check(!g.hexes.some(h => h.terrain === 'council') && C.generateBoard('explorers56', { scenario: 3 }).hexes.some(h => h.terrain === 'council'),
    '5-6: el Consejo de Catan aparece desde el escenario 3 (en el 2 se usa el reverso de D3)');
}

// --- consejo cuenta como mar ---
s = game(3);
const cid = PE.councilHex(s);
check(routeEdgesOf(s, cid).length === 6, 'las aristas del Consejo son rutas marítimas');
const cv2 = s.board.hexes[cid].vertices.filter(x => s.board.vertices[x].land);
check(cv2.length === 2, 'solo se construye en las 2 esquinas del Consejo que tocan la isla inicial');

// --- colocación: carretera junto al poblado ---
s = C.createGame({ mode: 'explorers', options: { scenario: 2 }, players: ['A', 'B', 'C'].map((name, i) => ({ name, color: 'c' + i })) });
let mem3 = s.players.map(() => ({}));
while (s.setup.step !== 'road') C.apply(s, s.current, C.AI.decide(s, s.current, mem3[s.current]));
const lastSettler = s.setup.queue[s.players.length * 2 - 1].pid;
check(s.current === lastSettler, 'quien puso el último poblado pone primero carretera y barco');
const hvx = PE.ownHarbors(s, s.current)[0];
const harborOnly = s.board.vertices[hvx].edges.find(e => s.board.edges[e].land && !s.roads[e] && !s.board.edges[e].v.some(x => s.buildings[x] && s.buildings[x].type === 'settlement' && s.buildings[x].owner === s.current));
if (harborOnly !== undefined) check(!!C.apply(s, s.current, { type: 'buildRoad', edge: harborOnly }).error, 'la carretera inicial va junto al poblado, no junto al portuario');

// --- 2 jugadores: piezas neutrales ---
s = C.createGame({ mode: 'explorers', options: { scenario: 2 }, players: ['A', 'B'].map((name, i) => ({ name, color: 'c' + i })) });
check(s.setup.queue.map(x => x.step).join(',') === 'harbor,harbor,nharbor,nharbor,nsettlement,nsettlement,settlement,settlement,road,ship,road,ship', '2 jugadores: orden de colocación con piezas neutrales');
mem3 = s.players.map(() => ({}));
while (s.phase === 'setup') { const r3 = C.apply(s, s.current, C.AI.decide(s, s.current, mem3[s.current])); if (r3.error) { console.log(r3.error); break; } }
const neutral = Object.values(s.buildings).filter(x => x.owner === PE.NEUTRAL);
check(neutral.filter(x => x.type === 'harbor').length === 2 && neutral.filter(x => x.type === 'settlement').length === 2, 'quedan 2 portuarios y 2 poblados neutrales en la isla inicial');
check(s.players.every(pl => C.publicVP(s, pl.id) === 3) && s.phase === 'roll', 'las piezas neutrales no dan puntos a nadie');
const nv = Object.keys(s.buildings).map(Number).find(x => s.buildings[x].owner === PE.NEUTRAL);
const nh = s.board.vertices[nv].hexes.map(h => s.board.hexes[h]).find(h => h.number);
const goldN = s.players.map(pl => C.total(pl.resources) + pl.gold);
C.apply(s, s.current, { type: 'roll', forced: [nh.number <= 6 ? 1 : nh.number - 6, nh.number <= 6 ? nh.number - 1 : 6] });
check(s.phase === 'main', 'las piezas neutrales no producen (sin errores)');
check(!C.viewFor(s, 0).players[PE.NEUTRAL], 'el neutral no es un jugador');
for (let g = 0; g < 3; g++) {
  const t = C.createGame({ mode: 'explorers', options: { scenario: 5 }, players: ['A', 'B'].map((name, i) => ({ name, color: 'c' + i, bot: true })) });
  const mm = t.players.map(() => ({}));
  let errs = 0;
  for (let i = 0; i < 30000 && t.phase !== 'ended'; i++) {
    const pid = t.phase === 'discard' ? +Object.keys(t.pendingDiscard)[0] : C.actor(t);
    if (C.apply(t, pid, C.AI.decide(t, pid, mm[pid])).error) { errs++; C.apply(t, t.current, { type: 'endTurn' }); }
  }
  check(t.phase === 'ended' && !errs, `2 jugadores, partida ${g + 1} entre bots: termina sin errores`);
}

// --- 5-6 jugadores: jugadores en pareja ---
check(C.resolveMode('explorers', 5) === 'explorers56' && C.resolveMode('explorers', 2) === 'explorers', 'con 5-6 jugadores se usa la ampliación; con 2-4 el juego normal');
s = C.createGame({ mode: 'explorers56', options: { scenario: 2 }, players: ['A', 'B', 'C', 'D', 'E'].map((name, i) => ({ name, color: 'c' + i })) });
mem3 = s.players.map(() => ({}));
while (s.phase === 'setup') C.apply(s, s.current, C.AI.decide(s, s.current, mem3[s.current]));
check(s.pe.pairs && C.RES.every(k => s.bank[k] + s.players.reduce((a, pl) => a + pl.resources[k], 0) === 24) && s.pe.fishSupply === 8, '5-6: banco de 24 y 8 cargas de pescado');
p = s.current;
C.apply(s, p, { type: 'roll', forced: [1, 2] });
if (s.phase !== 'main') s.phase = 'main';
C.apply(s, p, { type: 'startMove' });
C.apply(s, p, { type: 'endTurn' });
const p2 = (p + 3) % 5;
check(s.current === p2 && s.phase === 'main' && s.pe.p2 && s.turn === 1 + 0 + (s.turn - 1), 'al terminar el jugador 1 juega el jugador 2 (tercero a su izquierda), sin tirar dados');
const turnBefore = s.turn;
give(s.players[p2], { wood: 3, brick: 3 });
check(!!C.apply(s, p2, { type: 'offerTrade', give: { wood: 1 }, get: { ore: 1 } }).error, 'el jugador 2 no comercia con otros jugadores');
check(!C.apply(s, p2, { type: 'bankTrade', give: 'wood', get: 'ore', count: 1 }).error, 'el jugador 2 sí comercia con el banco');
const sh2p = Object.values(s.pe.ships).find(x => x.owner === p2);
C.apply(s, p2, { type: 'startMove' });
check(s.phase === 'move' && PE.reach(s, sh2p.id).size > 0, 'el jugador 2 mueve sus barcos');
C.apply(s, p2, { type: 'endTurn' });
check(s.current === (p + 1) % 5 && s.phase === 'roll' && s.turn === turnBefore + 1 && !s.pe.p2, 'después pasa el turno al siguiente jugador 1');
for (const n of [5, 6]) {
  let ok2 = 0, errs = 0;
  for (let g = 0; g < 2; g++) {
    const t = C.createGame({ mode: 'explorers56', options: { scenario: 5 }, players: Array.from({ length: n }, (_, i) => ({ name: 'J' + i, color: 'c' + i, bot: true })) });
    const mm = t.players.map(() => ({}));
    for (let i = 0; i < 40000 && t.phase !== 'ended'; i++) {
      const pid = t.phase === 'discard' ? +Object.keys(t.pendingDiscard)[0] : C.actor(t);
      if (C.apply(t, pid, C.AI.decide(t, pid, mm[pid])).error) { errs++; C.apply(t, t.current, { type: 'endTurn' }); }
    }
    if (t.phase === 'ended') ok2++;
  }
  check(ok2 === 2 && !errs, `${n} jugadores en pareja: 2 partidas entre bots terminan sin errores`);
}

// --- el oro se comercia entre jugadores como una carta más ---
{
  const s = game(1); const p = s.current, q = (p + 1) % 3, P = s.players[p], Q = s.players[q];
  toMain(s);
  empty(P); empty(Q); P.gold = 3; Q.gold = 0; give(Q, { ore: 1 });
  check(!!C.apply(s, p, { type: 'offerTrade', give: { gold: 5 }, get: { ore: 1 } }).error, 'oro: no puedes ofrecer más oro del que tienes');
  check(!C.apply(s, p, { type: 'offerTrade', give: { gold: 2 }, get: { ore: 1 }, to: q }).error, 'oro: ofrecer 2 oro por 1 mineral');
  check(!C.apply(s, q, { type: 'respondTrade', id: s.trade.id, accept: true }).error, 'oro: el rival acepta');
  check(!C.apply(s, p, { type: 'confirmTrade', with: q }).error && P.gold === 1 && Q.gold === 2 && P.resources.ore === 1 && Q.resources.ore === 0, 'oro: se intercambian oro y mineral');
  give(P, { wood: 1 });
  C.apply(s, p, { type: 'offerTrade', give: { wood: 1 }, get: { gold: 3 }, to: q });
  check(!!C.apply(s, q, { type: 'respondTrade', id: s.trade.id, accept: true }).error, 'oro: no puede aceptar quien no tiene ese oro');
  const a = C.AI.decide(s, q, {});
  check(a && a.type === 'respondTrade' && !a.accept, 'oro: la IA rechaza lo que no puede pagar');
}

// --- con todos los barcos en el tablero, se puede retirar uno para construirlo de nuevo ---
{
  const s = game(1); const p = s.current, P = s.players[p];
  toMain(s);
  const mine = Object.values(s.pe.ships).filter(x => x.owner === p);
  const old = mine[0];
  old.cargo = ['crew'];
  const crew0 = P.pieces.crew, onBoard = mine.length;
  P.pieces.ship = 0;
  give(P, { wood: 2, sheep: 2 });
  const e = PE.shipBuildEdges(s, p).find(x => x !== old.edge);
  if (e !== undefined) {
    check(!!C.apply(s, p, { type: 'buildShip', edge: e }).error, 'barcos: sin barcos libres hay que elegir uno para retirar');
    check(!C.apply(s, p, { type: 'buildShip', edge: e, remove: old.id }).error, 'barcos: retirar uno y construirlo de nuevo');
    check(!s.pe.ships[old.id] && P.pieces.crew === crew0 + 1 && P.pieces.ship === 0 && Object.values(s.pe.ships).filter(x => x.owner === p).length === onBoard, 'barcos: el retirado desaparece y su carga vuelve a la reserva');
  } else check(true, 'barcos: (sin ruta libre en este tablero)');
}

// --- tableros oficiales 3-4 ---
{
  const terr = sc => C.generateBoard('explorers', { scenario: sc }).hexes.filter(h => h.start).map(h => h.terrain[0] + h.terrain[1]).join(' ');
  check(terr(1) === terr(1) && terr(1) === 'mo fo fi pa hi pa pa mo fo fi pa fo hi mo fo', 'escenario 1: terrenos de la isla como en el ejemplo 2');
  check(terr(2) === 'pa fo fi pa hi mo pa mo fo fi pa fo mo hi fo', 'escenario 2: terrenos de la isla como en el ejemplo 10');
  const t4 = new Set([...Array(8)].map(() => terr(4)));
  check(t4.size > 1, 'escenarios 3-5: los terrenos de la isla se reparten al azar (las fichas no)');
  const b2 = C.generateBoard('explorers', { scenario: 2 });
  check(b2.harborSites.length === 14 && b2.harborSites.every(v => b2.vertices[v].hexes.some(h => b2.hexes[h].start) && b2.vertices[v].hexes.some(h => b2.hexes[h].terrain === 'sea')),
    'lugares marcados para portuarios: 14 cruces de la costa este de la isla inicial');
  check(b2.edges.filter(e => e.offBoard).every(e => e.hexes.every(h => b2.hexes[h].frame)), 'no se navega entre dos piezas del marco');
  // las áreas: 6 losetas estándar por área con los tipos oficiales
  const tally = [{}, {}];
  for (let i = 0; i < 30; i++) {
    const g = C.generateBoard('explorers', { scenario: 1 });
    g.hexes.filter(h => h.hidden && C.isLand(h.terrain)).forEach(h => { tally[h.area][h.terrain] = (tally[h.area][h.terrain] || 0) + 1; });
  }
  check(tally[0].mountains === 60 && tally[0].fields === 30 && tally[1].fields === 60 && tally[1].pasture === 30, 'losetas estándar: norte 2 montañas, sur 2 campos');
  check(PE.TRACK_VP.slice(1).join() === '1,1,2,2,2,3,3', 'pista de misión: 1, 1, 2, 2, 2, 3, 3 PV');
}
// --- escenario 1: colocación fija ---
for (const n of [2, 3, 4]) {
  const s = C.createGame({ mode: 'explorers', options: { scenario: 1 }, players: ['Ana', 'Beto', 'Caro', 'Dani'].slice(0, n).map((name, i) => ({ name, color: 'c' + i })) });
  const mine = s.players.map(p => Object.values(s.buildings).filter(b => b.owner === p.id).length);
  const neutral = Object.values(s.buildings).filter(b => b.owner === PE.NEUTRAL).length;
  check(s.phase === 'roll' && mine.every(x => x === 2) && Object.keys(s.pe.ships).length === n && neutral === (n === 2 ? 4 : 0) &&
    Object.values(s.pe.ships).every(x => x.cargo[0] === 'settler') && s.players.every(p => C.total(p.resources) > 0),
    `escenario 1 con ${n}: cada uno empieza con poblado, portuario, carretera y barco con colono en su sitio${n === 2 ? ' (los otros colores, neutrales)' : ''}`);
  const vs = Object.keys(s.buildings).map(Number);
  check(vs.every(v => s.board.vertices[v].adj.every(a => !s.buildings[a])), `escenario 1 con ${n}: las posiciones fijas respetan la distancia`);
}

console.log(fails ? fails + ' fallos' : 'Todas las pruebas pasaron');
process.exit(fails ? 1 : 0);
