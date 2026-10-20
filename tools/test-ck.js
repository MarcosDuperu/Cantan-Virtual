// Pruebas de reglas puntuales de Ciudades y Caballeros. Uso: node tools/test-ck.js
['board', 'rules', 'ck', 'ai', 'names'].forEach(f => require('../src/js/engine/' + f + '.js'));
const C = globalThis.Catan;
let fails = 0;
const check = (cond, msg) => { if (!cond) { fails++; console.log('FALLO:', msg); } else console.log('ok  ', msg); };

function game() {
  const s = C.createGame({ mode: 'cities', players: ['Ana', 'Beto', 'Caro'].map((name, i) => ({ name, color: 'c' + i })) });
  // colocación automática con la IA
  const mem = s.players.map(() => ({}));
  while (s.phase === 'setup' || s.phase === 'gold') {
    const pid = s.phase === 'gold' ? +Object.keys(s.pendingGold)[0] : s.current;
    C.apply(s, pid, C.AI.decide(s, pid, mem[pid]));
  }
  return s;
}
const give = (P, r) => Object.entries(r).forEach(([k, v]) => { P.resources[k] += v; });
const myRoadVertex = (s, pid) => {
  for (const [e, r] of Object.entries(s.roads)) if (r.owner === pid) for (const v of s.board.edges[e].v) if (!s.buildings[v] && !s.knights[v]) return v;
};

// --- segunda colocación es ciudad ---
let s = game();
check(Object.values(s.buildings).filter(b => b.type === 'city').length === 3, 'cada jugador coloca una ciudad en la segunda ronda');

// --- Alquimista fija los dados ---
s = game();
let p = s.current, P = s.players[p];
P.progress.push({ type: 'alchemist', area: 'science', turn: 0 });
check(!C.apply(s, p, { type: 'playProgress', card: 'alchemist', red: 2, yellow: 3 }).error, 'Alquimista se juega antes de tirar');
C.apply(s, p, { type: 'roll', forcedEvent: 'ship' });
check(s.dice[0] === 2 && s.dice[1] === 3, 'Alquimista: los dados salen 2 y 3');

// --- Inventor intercambia fichas válidas y rechaza 6/8 ---
s = game(); p = s.current; P = s.players[p];
C.apply(s, p, { type: 'roll', forced: [1, 2], forcedEvent: 'ship' });
const inv = C.CK.inventorHexes(s);
const n0 = s.board.hexes[inv[0]].number, n1 = s.board.hexes[inv[1]].number;
P.progress.push({ type: 'inventor', area: 'science', turn: 0 });
check(!C.apply(s, p, { type: 'playProgress', card: 'inventor', hexes: [inv[0], inv[1]] }).error, 'Inventor se juega');
check(s.board.hexes[inv[0]].number === n1 && s.board.hexes[inv[1]].number === n0, 'Inventor intercambia los números');
const six = s.board.hexes.find(h => h.number === 6);
P.progress.push({ type: 'inventor', area: 'science', turn: 0 });
check(!!C.apply(s, p, { type: 'playProgress', card: 'inventor', hexes: [six.id, inv[2]] }).error, 'Inventor no puede mover un 6');

// --- Caballeros: construir, activar, mover, desalojar ---
s = game(); p = s.current; P = s.players[p];
C.apply(s, p, { type: 'roll', forced: [1, 2], forcedEvent: 'ship' });
give(P, { sheep: 5, ore: 5, wheat: 5, wood: 5, brick: 5 });
const kv = myRoadVertex(s, p);
check(!C.apply(s, p, { type: 'buildKnight', vertex: kv }).error, 'construir caballero junto a tu carretera');
check(!C.apply(s, p, { type: 'activateKnight', vertex: kv }).error, 'activar caballero');
check(!!C.apply(s, p, { type: 'moveKnight', from: kv, to: kv }).error, 'un caballero activado este turno no puede actuar');
s.turn++; s.knights[kv].actTurn = -1;
// ampliar carreteras para tener destino
const roadsFrom = v => s.board.vertices[v].edges.filter(e => C.canPlaceRoute(s, p, e, 'road'));
const e1 = roadsFrom(kv).find(e => { const o = s.board.edges[e].v.find(v => v !== kv); return !s.buildings[o] && !s.knights[o]; });
if (e1 !== undefined) {
  C.apply(s, p, { type: 'buildRoad', edge: e1 });
  const dest = s.board.edges[e1].v.find(v => v !== kv);
  const tg = C.CK.knightTargets(s, p, kv);
  check(tg.empty.includes(dest), 'el caballero puede moverse por tus carreteras');
  // un rival débil en el destino es desalojado
  const q = (p + 1) % 3;
  s.knights[dest] = { owner: q, level: 1, active: false, actTurn: -1, promTurn: -1 };
  s.players[q].knightPieces[1]--;
  s.knights[kv].level = 2;
  check(!C.apply(s, p, { type: 'moveKnight', from: kv, to: dest }).error, 'desalojar a un caballero más débil');
  check(s.knights[dest].owner === p && !s.knights[dest].active, 'el caballero queda en el destino e inactivo');
}

// --- Diplomático retira una carretera abierta del rival ---
s = game(); p = s.current; P = s.players[p];
C.apply(s, p, { type: 'roll', forced: [1, 2], forcedEvent: 'ship' });
const q = (p + 1) % 3;
const openE = Object.keys(s.roads).map(Number).find(e => s.roads[e].owner === q && C.CK.isOpenRoad(s, e));
if (openE !== undefined) {
  P.progress.push({ type: 'diplomat', area: 'politics', turn: 0 });
  const before = s.players[q].pieces.road;
  check(!C.apply(s, p, { type: 'playProgress', card: 'diplomat', edge: openE }).error && !s.roads[openE], 'Diplomático retira la carretera abierta del rival');
  check(s.players[q].pieces.road === before + 1, 'la carretera vuelve a la reserva del rival');
} else {
  P.progress.push({ type: 'diplomat', area: 'politics', turn: 0 });
  check(!!C.apply(s, p, { type: 'playProgress', card: 'diplomat', edge: Object.keys(s.roads).map(Number).find(e => s.roads[e].owner === q) }).error, 'Diplomático no puede quitar una carretera cerrada');
  P.progress.pop();
}
const own = Object.keys(s.roads).map(Number).find(e => s.roads[e].owner === p && C.CK.isOpenRoad(s, e));
if (own !== undefined) {
  P.progress.push({ type: 'diplomat', area: 'politics', turn: 0 });
  C.apply(s, p, { type: 'playProgress', card: 'diplomat', edge: own });
  check(s.phase === 'roadBuilding' && s.freeRoads === 1, 'si la carretera es tuya, puedes recolocarla');
}

// --- Ladrón bloqueado hasta el primer ataque ---
s = game(); p = s.current;
C.apply(s, p, { type: 'roll', forced: [3, 4], forcedEvent: 'ship' });
check(s.phase === 'main' || s.phase === 'discard', 'un 7 antes del primer ataque no mueve el ladrón');
check(C.robberHexes(s, p).length === 0, 'no hay hexágonos válidos para el ladrón antes del ataque');

// --- Ataque bárbaro: Catan pierde y el más débil pierde una ciudad ---
s = game(); p = s.current;
s.ck.barbarian = 6;
const q2 = (p + 1) % 3, q3 = (p + 2) % 3;
const kq = myRoadVertex(s, q2);
s.knights[kq] = { owner: q2, level: 1, active: true, actTurn: -1, promTurn: -1 };
C.apply(s, p, { type: 'roll', forced: [1, 2], forcedEvent: 'ship' });
check(s.ck.attacks === 1 && s.ck.barbarian === 0, 'el barco bárbaro llega y ataca');
check(s.ck.lastAttack && !s.ck.lastAttack.win, 'con 3 ciudades y defensa 1, Catan pierde');
check(s.ck.lastAttack.losers.includes(p) && s.ck.lastAttack.losers.includes(q3) && !s.ck.lastAttack.losers.includes(q2), 'pierden ciudad quienes menos defendieron');
check(!Object.values(s.knights).some(k => k.active), 'tras el ataque todos los caballeros quedan inactivos');

// --- Catan gana: defensor único recibe 1 PV ---
s = game(); p = s.current;
s.ck.barbarian = 6;
const kp = myRoadVertex(s, p);
s.knights[kp] = { owner: p, level: 3, active: true, actTurn: -1, promTurn: -1 };
const vp0 = C.totalVP(s, p);
C.apply(s, p, { type: 'roll', forced: [1, 2], forcedEvent: 'ship' });
check(s.ck.lastAttack.win && C.totalVP(s, p) === vp0 + 1, 'el defensor de Catan gana 1 PV');

// --- Mejoras de ciudad y metrópolis ---
s = game(); p = s.current; P = s.players[p];
C.apply(s, p, { type: 'roll', forced: [1, 2], forcedEvent: 'ship' });
give(P, { coin: 15 });
const vpm = C.publicVP(s, p);
for (let i = 0; i < 4; i++) C.apply(s, p, { type: 'improve', area: 'politics' });
check(P.improve.politics === 4 && s.ck.metropolis.politics && s.ck.metropolis.politics.owner === p, 'nivel 4 de Política da la metrópolis');
check(C.publicVP(s, p) === vpm + 2, 'la metrópolis vale 2 PV extra');
const q4 = (p + 1) % 3;
s.players[q4].improve.politics = 4;
s.players[q4].resources.coin = 5;
s.phase = 'main'; s.current = q4;
C.apply(s, q4, { type: 'improve', area: 'politics' });
check(s.ck.metropolis.politics.owner === q4, 'quien llega primero al nivel 5 se lleva la metrópolis');

// --- Muralla aumenta el límite de mano ---
s = game(); p = s.current; P = s.players[p];
C.apply(s, p, { type: 'roll', forced: [1, 2], forcedEvent: 'ship' });
give(P, { brick: 2 });
const city = C.CK.citiesOf(s, p)[0];
check(!C.apply(s, p, { type: 'buildWall', vertex: city }).error && C.CK.handLimit(s, p) === 9, 'una muralla sube el límite de cartas a 9');

// --- Producción de ciudades: mercancías ---
s = game(); p = s.current; P = s.players[p];
const cv = C.CK.citiesOf(s, p)[0];
const hx = s.board.vertices[cv].hexes.map(h => s.board.hexes[h]).find(h => ['forest', 'pasture', 'mountains'].includes(h.terrain) && h.number && h.number !== 7 && h.id !== s.robber);
if (hx) {
  const comm = { forest: 'paper', pasture: 'cloth', mountains: 'coin' }[hx.terrain];
  const c0 = P.resources[comm];
  const d1 = Math.max(1, hx.number - 6), d2 = hx.number - d1;
  C.apply(s, p, { type: 'roll', forced: [d1, d2], forcedEvent: 'ship' });
  check(P.resources[comm] >= c0 + 1, 'una ciudad en ' + hx.terrain + ' produce ' + comm);
}

console.log(fails ? fails + ' fallos' : 'Todas las pruebas pasaron');
process.exit(fails ? 1 : 0);
