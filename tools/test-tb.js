// Pruebas de reglas de Mercaderes y Bárbaros (variantes y escenarios). Uso: node tools/test-tb.js
['board', 'rules', 'ck', 'pe', 'tb', 'sf', 'ai', 'names'].forEach(f => require('../src/js/engine/' + f + '.js'));
const C = globalThis.Catan;
const TB = C.TB;
let fails = 0;
const check = (cond, msg) => { if (!cond) { fails++; console.log('FALLO:', msg); } else console.log('ok  ', msg); };

const NAMES = ['Ana', 'Beto', 'Caro', 'Dani', 'Eva', 'Fede'];
function game(mode, options = {}, n = 3) {
  const s = C.createGame({ mode, options, players: NAMES.slice(0, n).map((name, i) => ({ name, color: 'c' + i })) });
  const mem = s.players.map(() => ({}));
  for (let i = 0; i < 500 && s.phase !== 'roll'; i++) {
    const pid = s.phase === 'gold' ? +Object.keys(s.pendingGold)[0] : C.actor(s);
    const r = C.apply(s, pid, C.AI.decide(s, pid, mem[pid]));
    if (r.error) throw new Error('preparación: ' + r.error);
  }
  return s;
}
const give = (P, r) => Object.entries(r).forEach(([k, v]) => { P.resources[k] += v; });
const empty = P => C.RES.forEach(k => { P.resources[k] = 0; });
const dice = n => [Math.max(1, n - 6), n - Math.max(1, n - 6)];
const roll = (s, n) => C.apply(s, s.current, { type: 'roll', forced: dice(n) });
// tirada que no produce nada a nadie (para llegar a la fase principal sin efectos)
function quietNumber(s) {
  for (const n of [2, 3, 4, 5, 6, 8, 9, 10, 11, 12]) {
    const prod = s.board.hexes.some(h => (h.number === n || h.number2 === n) && h.vertices.some(v => s.buildings[v]));
    const fish = s.board.fishing && (s.board.fishing.some(f => f.number === n) || ([2, 3, 11, 12].includes(n) && s.board.hexes.some(h => h.terrain === 'lake')));
    if (!prod && !fish) return n;
  }
  return null;
}
function toMain(s) {
  const n = quietNumber(s);
  if (n) roll(s, n); else { s.tb.rolls = s.tb.two ? 2 : 1; s.phase = 'main'; }
  if (s.tb.two && s.phase === 'roll') { const m = quietNumber(s); if (m) roll(s, m); }
  if (s.phase !== 'main') s.phase = 'main';
}
const ownEdges = (s, pid) => Object.keys(s.roads).map(Number).filter(e => s.roads[e].owner === pid);
const ownVerts = (s, pid) => Object.keys(s.buildings).map(Number).filter(v => s.buildings[v].owner === pid);
// borra todas las piezas del tablero (para montar situaciones a mano)
function clearBoard(s) {
  s.buildings = {}; s.roads = {};
  s.players.forEach(P => { P.pieces.road = 15; P.pieces.settlement = 5; P.pieces.city = 4; });
}

// ================= cartas de evento =================
{
  const t = game('classic', { events: true }, 3);
  check(t.tb && t.tb.events && t.tb.scenario === 0, 'cartas de evento en el Clásico');
  const deck = t.tb.eventDeck;
  check(deck.length === 37 && deck.filter(c => c[0] === 'newYear').length === 1, 'el mazo tiene 36 cartas más «Año nuevo»');
  check(deck.findIndex(c => c[0] === 'newYear') === 5, '«Año nuevo» queda con 5 cartas debajo');
  const nums = {};
  deck.filter(c => c[0] !== 'newYear').forEach(c => { nums[c[1]] = (nums[c[1]] || 0) + 1; });
  check(nums[7] === 6 && nums[2] === 1 && nums[12] === 1 && nums[6] === 5 && nums[8] === 5, 'distribución de números del mazo (2:1, 6:5, 7:6, 8:5, 12:1)');
  // robar una carta
  const p = t.current;
  t.tb.eventDeck.push(['none', 5]);
  C.apply(t, p, { type: 'roll' });
  check(t.tb.lastEvent && t.tb.lastEvent.n === 5 && t.dice[0] + t.dice[1] === 5, 'tirar roba una carta de evento y usa su número');
  // Año nuevo: se rearma el mazo
  t.phase = 'roll';
  t.tb.eventDeck = [['newYear', 0]];
  C.apply(t, t.current, { type: 'roll' });
  check(t.tb.eventDeck.length === 36, 'con «Año nuevo» se baraja otra vez el mazo');
}
{
  // Epidemia: las ciudades producen 1
  const t = game('classic', { events: true }, 3);
  const p = t.current;
  const v = ownVerts(t, p)[0];
  t.buildings[v].type = 'city';
  const h = t.board.hexes.find(x => x.vertices.includes(v) && x.number && C.TERRAIN_RES[x.terrain]);
  t.robber = null;
  const res = C.TERRAIN_RES[h.terrain];
  const before = t.players[p].resources[res];
  const others = t.board.hexes.filter(x => x.number === h.number && x.id !== h.id).flatMap(x => x.vertices).filter(x => t.buildings[x] && t.buildings[x].owner === p).length;
  t.tb.eventDeck.push(['epidemic', h.number]);
  C.apply(t, p, { type: 'roll' });
  const got = t.players[p].resources[res] - before;
  check(got >= 1 && got <= 1 + others && t.tb.lastEvent.type === 'epidemic', 'Epidemia: la ciudad produce solo 1 recurso');
}
{
  // Terremoto
  const t = game('classic', { events: true }, 3);
  const p = t.current;
  t.tb.eventDeck.push(['earthquake', quietNumber(t) || 3]);
  C.apply(t, p, { type: 'roll' });
  if (t.phase !== 'main') t.phase = 'main';
  const P = t.players[p];
  check(P.damaged !== null && t.roads[P.damaged].damaged, 'Terremoto: cada jugador tiene una carretera dañada');
  give(P, { wood: 3, brick: 3 });
  const e = C.validRoutes(t, p, 'road')[0];
  check(!!C.apply(t, p, { type: 'buildRoad', edge: e }).error, 'con una carretera dañada no se pueden construir carreteras');
  check(!C.apply(t, p, { type: 'repairRoad' }).error && P.damaged === null, 'reparar cuesta madera + arcilla');
  check(!C.apply(t, p, { type: 'buildRoad', edge: C.validRoutes(t, p, 'road')[0] }).error, 'después de reparar se vuelve a construir');
}
{
  // Buenos vecinos: cada uno da 1 recurso al de su izquierda
  const t = game('classic', { events: true }, 3);
  t.players.forEach(P => { empty(P); give(P, { ore: 1 }); });
  t.tb.eventDeck.push(['goodNeighbors', quietNumber(t) || 6]);
  C.apply(t, t.current, { type: 'roll' });
  check(t.phase === 'tbGive' && TB.waiting(t).length === 3, 'Buenos vecinos: todos deben entregar 1 recurso');
  t.players.forEach(P => C.apply(t, P.id, { type: 'tbGive', resources: { ore: 1 } }));
  check(t.phase === 'main' && t.players.every(P => P.resources.ore === 1), 'Buenos vecinos: cada uno recibe 1 de su derecha');
}
{
  // Año de abundancia, Huye el ladrón
  const t = game('classic', { events: true }, 3);
  t.tb.eventDeck.push(['plentifulYear', quietNumber(t) || 2]);
  C.apply(t, t.current, { type: 'roll' });
  check(t.phase === 'gold' && Object.keys(t.pendingGold).length === 3, 'Año de abundancia: todos eligen 1 recurso');
  const t2 = game('classic', { events: true }, 3);
  t2.robber = t2.board.hexes.find(h => h.number).id;
  t2.tb.eventDeck.push(['robberFlees', 4]);
  C.apply(t2, t2.current, { type: 'roll' });
  check(t2.board.hexes[t2.robber].terrain === 'desert', 'Huye el ladrón: vuelve al desierto');
  // El ladrón ataca: el 7
  const t3 = game('classic', { events: true }, 3);
  t3.tb.eventDeck.push(['robberAttacks', 7]);
  C.apply(t3, t3.current, { type: 'roll' });
  check(t3.phase === 'robber' || t3.phase === 'discard', '¡El ladrón ataca!: funciona como un 7');
}

// ================= Señor del puerto =================
{
  const t = game('classic', { harbormaster: true }, 3);
  check(t.vpTarget === 11, 'Señor del puerto: se gana con 1 PV más');
  clearBoard(t);
  const ports = t.board.vertices.filter(v => v.port).map(v => v.id);
  const p = 0, q = 1;
  const place = (pid, n, type) => {
    let k = 0;
    for (const v of ports) { if (k >= n) break; if (C.canSettle(t, pid, v, true)) { t.buildings[v] = { owner: pid, type }; k++; } }
  };
  place(p, 1, 'city');
  TB.afterBuild(t, p, 'city', 0);
  check(t.tb.harborHolder === null, 'con 2 puntos de puerto todavía no hay Señor del puerto');
  place(p, 1, 'settlement');
  TB.afterBuild(t, p, 'city', 0);
  const base = C.totalVP(t, p);
  check(t.tb.harborHolder === p, 'con 3 puntos de puerto se recibe la carta');
  check(TB.extraVP(t, p) === 2, 'el Señor del puerto vale 2 PV (' + base + ' en total)');
  place(q, 2, 'city');
  TB.afterBuild(t, q, 'city', 0);
  check(t.tb.harborHolder === q, 'otro jugador con más puntos de puerto se la quita');
}

// ================= Catan para dos =================
{
  const t = game('classic', {}, 2);
  const neutrals = t.players.filter(p => p.neutral);
  check(neutrals.length === 2 && neutrals.every(N => ownVerts(t, N.id).length === 1), 'Catan para dos: 2 neutrales con 1 poblado cada uno');
  check(TB.real(t).every(P => P.tokens >= 5), 'cada jugador empieza con al menos 5 fichas de comercio');
  const p = t.current;
  const n1 = quietNumber(t);
  roll(t, n1);
  check(t.phase === 'roll' && t.tb.rolls === 1, 'se tira dos veces por turno');
  // la segunda tirada no puede repetir el número (sin forzar)
  let same = false;
  for (let i = 0; i < 30; i++) {
    const u = JSON.parse(JSON.stringify(t));
    C.apply(u, p, { type: 'roll' });
    if (u.dice[0] + u.dice[1] === n1) same = true;
  }
  check(!same, 'la segunda tirada da otro número');
  t.phase = 'main';
  const P = t.players[p];
  give(P, { wood: 2, brick: 2 });
  C.apply(t, p, { type: 'buildRoad', edge: C.validRoutes(t, p, 'road')[0] });
  check(t.phase === 'tbNeutral' && t.tb.neutralBuild.kind === 'road', 'al construir una carretera se construye otra para un neutral');
  const o = TB.neutralOptions(t, 'road')[0];
  check(!C.apply(t, p, { type: 'neutralBuild', pid: o.pid, at: o.at }).error && t.roads[o.at].owner === o.pid && t.phase === 'main', 'la carretera neutral se coloca');
  // fichas de comercio
  const opp = TB.real(t).find(x => x.id !== p);
  give(opp, { ore: 3 });
  give(P, { sheep: 2 });
  P.tokens = 5;
  const cost = C.publicVP(t, p) <= C.publicVP(t, opp.id) ? 1 : 2;
  const c0 = C.total(P.resources);
  check(!C.apply(t, p, { type: 'tokenAction', action: 'forcedTrade', give: { sheep: 2 } }).error && P.tokens === 5 - cost && C.total(P.resources) === c0,
    'comercio forzoso: das 2 y robas 2, cuesta ' + cost + ' ficha(s)');
  t.robber = t.board.hexes.find(h => h.number).id;
  C.apply(t, p, { type: 'tokenAction', action: 'robberHome' });
  check(t.board.hexes[t.robber].terrain === 'desert', 'con fichas se manda al ladrón al desierto');
  P.knights = 1;
  const tk = P.tokens;
  check(!C.apply(t, p, { type: 'discardKnight' }).error && P.tokens === tk + 2 && P.knights === 0, 'descartar un caballero jugado da 2 fichas');
  check(!!C.apply(t, p, { type: 'discardKnight' }).error, 'solo una vez por turno');
  const view = C.viewFor(t, p);
  check(view.players.filter(x => x.neutral).length === 2, 'la vista incluye a los neutrales');
}

// ================= Escenario 1: Pescadores =================
{
  const t = game('traders', { scenario: 1 }, 3);
  check(t.vpTarget === 10 && t.robber === null, 'Pescadores: 10 PV y el ladrón empieza fuera del tablero');
  check(t.board.hexes.some(h => h.terrain === 'lake' && !h.number) && t.board.fishing.length === 6, 'hay un lago y 6 caladeros');
  check(t.board.fishing.every(f => f.vertices.length === 3), 'cada caladero toca 3 cruces');
  check(t.tb.fishBag.length + t.players.reduce((a, P) => a + P.fish.length, 0) === 30, '29 fichas de pescado más la bota');
  clearBoard(t);
  const p = t.current;
  const f = t.board.fishing[0];
  t.buildings[f.vertices[0]] = { owner: p, type: 'city' };
  t.players.forEach(P => { P.fish = []; });
  t.tb.boot = null;
  t.tb.fishBag = t.tb.fishBag.filter(x => x !== 'boot');
  roll(t, f.number);
  check(t.players[p].fish.length === 2, 'una ciudad junto al caladero pesca 2 fichas');
  // lago con 2, 3, 11 y 12
  clearBoard(t);
  const lake = t.board.hexes.find(h => h.terrain === 'lake');
  t.buildings[lake.vertices[0]] = { owner: p, type: 'settlement' };
  t.players[p].fish = [];
  t.phase = 'roll'; t.robber = null;
  const lakeNo = [2, 3, 11, 12].find(n => !t.board.fishing.some(x => x.number === n));
  roll(t, lakeNo);
  check(t.players[p].fish.length === 1, 'el lago da pescado con ' + lakeNo);
  // máximo 7 fichas
  t.players[p].fish = [1, 1, 1, 1, 1, 1, 1];
  t.phase = 'roll';
  roll(t, lakeNo);
  check(t.players[p].fish.length === 7, 'como máximo 7 fichas de pescado');
  // acciones
  t.phase = 'main';
  const P = t.players[p];
  P.fish = [1, 1];
  t.robber = t.board.hexes.find(h => h.number).id;
  check(!!C.apply(t, p, { type: 'fishAction', action: 'resource', resource: 'ore', tokens: [0, 1] }).error, 'con 2 peces no alcanza para 1 recurso (4)');
  check(!C.apply(t, p, { type: 'fishAction', action: 'robberOff', tokens: [0, 1] }).error && t.robber === null && P.fish.length === 0, '2 peces sacan al ladrón del tablero');
  P.fish = [3, 1];
  const ore0 = P.resources.ore;
  check(!C.apply(t, p, { type: 'fishAction', action: 'resource', resource: 'ore', tokens: [0, 1] }).error && P.resources.ore === ore0 + 1, '4 peces dan 1 recurso del banco');
  P.fish = [3, 3, 1];
  const d0 = P.devCards.length;
  check(!C.apply(t, p, { type: 'fishAction', action: 'dev', tokens: [0, 1, 2] }).error && P.devCards.length === d0 + 1, '7 peces dan una carta de desarrollo');
  // los peces no se roban ni se descartan
  const q = (p + 1) % 3;
  empty(t.players[q]); t.players[q].fish = [3];
  check(!TB.stealVictims(t, p).includes(q), 'el pescado no se puede robar');
  // bota vieja
  t.tb.boot = p;
  check(TB.target(t, p) === t.vpTarget + 1, 'con la bota vieja se necesita 1 PV más');
  const others = TB.real(t).filter(x => x.id !== p);
  const lower = others.find(x => C.publicVP(t, x.id) < C.publicVP(t, p));
  const higher = others.find(x => C.publicVP(t, x.id) >= C.publicVP(t, p));
  if (lower) check(!!C.apply(t, p, { type: 'giveBoot', to: lower.id }).error, 'no se puede dar la bota a quien tiene menos PV');
  if (higher) check(!C.apply(t, p, { type: 'giveBoot', to: higher.id }).error && t.tb.boot === higher.id, 'la bota se da a quien tiene igual o más PV');
}

// ================= Escenario 2: Ríos =================
{
  const t = game('traders', { scenario: 2 }, 3);
  check(t.board.hexes.filter(h => h.terrain === 'swamp').length === 2 && t.board.hexes[t.robber].terrain === 'swamp', 'Ríos: 2 pantanos y el ladrón empieza en uno');
  check(t.board.bridgeSites.length === 7, '7 sitios de puente');
  const h12 = t.board.hexes.find(h => h.number === 12);
  check(h12 && h12.number2 === 2, 'el hexágono con 12 también produce con 2');
  const p = t.current;
  toMain(t);
  const P = t.players[p];
  // carretera junto al río: +1 moneda
  const riverEdge = C.validRoutes(t, p, 'road').find(e => t.board.edges[e].hexes.some(h => t.board.hexes[h].river !== undefined));
  if (riverEdge !== undefined) {
    give(P, { wood: 1, brick: 1 });
    const g0 = P.gold;
    C.apply(t, p, { type: 'buildRoad', edge: riverEdge });
    check(P.gold === g0 + 1, 'una carretera junto al río da 1 moneda');
  }
  check(!C.canPlaceRoute(t, p, t.board.bridgeSites[0], 'road'), 'en un sitio de puente no se construyen carreteras');
  // puente
  clearBoard(t);
  const site = t.board.bridgeSites[0];
  const vEnd = t.board.edges[site].v[0];
  t.buildings[vEnd] = { owner: p, type: 'settlement' };
  give(P, { brick: 2, wood: 1 });
  const g1 = P.gold;
  check(TB.bridgeSpots(t, p).includes(site), 'el sitio de puente conectado a tu red está disponible');
  check(!C.apply(t, p, { type: 'buildBridge', edge: site }).error && t.roads[site].bridge && P.gold === g1 + 3 && P.pieces.bridge === 2, 'el puente cuesta 2 arcilla + 1 madera y da 3 monedas');
  // oro → recursos (2 veces por turno)
  P.gold = 10;
  check(!C.apply(t, p, { type: 'bankTrade', give: 'gold', get: 'ore' }).error && P.gold === 8, '2 monedas = 1 recurso');
  C.apply(t, p, { type: 'bankTrade', give: 'gold', get: 'ore' });
  check(!!C.apply(t, p, { type: 'bankTrade', give: 'gold', get: 'ore' }).error, 'solo 2 compras con oro por turno');
  // el más rico y los más pobres
  t.players.forEach((x, i) => { x.gold = [9, 3, 3][i]; });
  check(TB.coinRanks(t).rich === 0 && TB.coinRanks(t).poor.join() === '1,2', 'el más rico (único) y los más pobres');
  check(TB.extraVP(t, 0) === 1 && TB.extraVP(t, 1) === -2, 'el más rico gana 1 PV y los más pobres pierden 2');
  t.players.forEach(x => { x.gold = 4; });
  check(TB.coinRanks(t).rich === null && TB.extraVP(t, 0) === -2, 'si todos empatan nadie es el más rico y todos son los más pobres');
}

// ================= Escenario 3: Caravanas =================
{
  const t = game('traders', { scenario: 3 }, 3);
  check(t.vpTarget === 12 && t.board.oases.length === 1 && t.board.oases[0].arrows.length === 3, 'Caravanas: 12 PV y oasis con 3 flechas');
  check(t.tb.camelsLeft === 22, '22 camellos');
  const p = t.current;
  toMain(t);
  check(C.apply(t, p, { type: 'endTurn' }) && t.phase === 'roll', 'sin construir un poblado no hay votación');
  toMain(t);
  const p2 = t.current;
  t.tb.builtThisPart = true;
  C.apply(t, p2, { type: 'endTurn' });
  check(t.phase === 'tbVote' && t.tb.vote.order[0] === p2, 'después de un turno con poblado nuevo se vota (empieza quien terminó)');
  const order = t.tb.vote.order;
  const opts = TB.camelOptions(t);
  const voter = order[1];
  give(t.players[voter], { sheep: 3 });
  const s0 = t.players[voter].resources.sheep;
  C.apply(t, order[0], { type: 'vote', option: 0, sheep: 0, wheat: 0 });
  C.apply(t, voter, { type: 'vote', option: 1, sheep: 3, wheat: 0 });
  const vw2 = C.viewFor(t, order[2]);
  check(!vw2.tb.vote.bids[voter], 'los votos de los demás son secretos');
  C.apply(t, order[2], { type: 'vote', option: 0, sheep: 0, wheat: 0 });
  check(t.tb.camels[opts[1].edge] !== undefined, 'gana la opción con mayoría absoluta');
  check(t.players[voter].resources.sheep === s0 - 3, 'los votos se pagan');
  check(t.phase === 'roll' && t.current !== p2, 'tras la votación sigue el turno siguiente');
  // +1 PV entre 2 camellos, carreteras con camello cuentan doble
  clearBoard(t);
  t.tb.camels = {};
  const v = t.board.vertices.find(x => x.land && x.edges.filter(e => t.board.edges[e].land).length >= 2);
  const [e1, e2] = v.edges.filter(e => t.board.edges[e].land);
  t.tb.camels[e1] = 0; t.tb.camels[e2] = 0;
  t.buildings[v.id] = { owner: p, type: 'settlement' };
  check(TB.extraVP(t, p) === 1, 'un poblado entre 2 camellos vale 1 PV más');
  check(TB.edgeWeight(t, e1) === 2, 'una carretera con camello cuenta doble para la Gran Ruta');
}

// ================= Escenario 4: Ataque bárbaro =================
{
  const t = game('traders', { scenario: 4 }, 3);
  check(t.vpTarget === 12 && t.robber === null, 'Ataque bárbaro: 12 PV, sin ladrón');
  check(t.players.every(P => ownVerts(t, P.id).some(v => t.buildings[v].type === 'city')), 'la segunda pieza inicial es una ciudad');
  check(t.board.castles.length === 1 && t.board.hexes.filter(h => h.coastal).length === 10, 'un castillo y 10 hexágonos costeros');
  check(t.board.hexes.filter(h => h.coastal && h.barbs).every(h => h.number === 2 || h.number === 12), 'empiezan bárbaros en el 2 y el 12');
  const p = t.current;
  toMain(t);
  const P = t.players[p];
  // desembarco al construir un poblado
  const sup0 = t.tb.barbSupply;
  const vs = C.validSettlements(t, p, false);
  if (vs.length) {
    give(P, { wood: 1, brick: 1, sheep: 1, wheat: 1 });
    C.apply(t, p, { type: 'buildSettlement', vertex: vs[0] });
    const land = t.events.filter(e => e.type === 'barbLand').pop();
    check(land && land.rolled.length === 3 && new Set(land.rolled).size === 3 && !land.rolled.includes(7), 'cada poblado provoca 3 desembarcos con números distintos (sin 7)');
    check(t.tb.barbSupply <= sup0, 'los bárbaros salen de la reserva');
  }
  // conquista: 3 bárbaros
  const h = t.board.hexes.find(x => x.coastal && !x.conquered);
  h.barbs = 2;
  t.board.hexes.forEach(x => { if (x.coastal) x.barbs = x.barbs || 0; });
  clearBoard(t);
  const corner = h.vertices.find(v => t.board.vertices[v].hexes.filter(x => C.isLand(t.board.hexes[x].terrain)).length === 1);
  if (corner !== undefined) {
    t.buildings[corner] = { owner: p, type: 'settlement' };
    const vp0 = C.totalVP(t, p);
    // tercer bárbaro
    h.barbs = 2;
    t.tb.barbSupply = 5;
    // usamos Traición para mover uno desde la reserva
    t.phase = 'tbTreason';
    C.apply(t, p, { type: 'treason', moves: [{ from: null, to: h.id }] });
    check(h.conquered, 'con 3 bárbaros el hexágono queda conquistado');
    check(C.totalVP(t, p) === vp0 - 1, 'un edificio rodeado solo por hexágonos conquistados no da puntos');
  }
  // compra de cartas: se juegan al instante
  const t2 = game('traders', { scenario: 4 }, 3);
  toMain(t2);
  const q = t2.current, Q = t2.players[q];
  give(Q, { sheep: 1, wheat: 1, ore: 1 });
  t2.devDeck.push('knighthood');
  C.apply(t2, q, { type: 'buyDev' });
  check(t2.phase === 'tbKnight' && Q.devCards.length === 0, 'Caballería se juega al comprarla: hay que colocar un caballero');
  const spots = TB.knightSpots(t2, false);
  check(spots.length && spots.every(e => TB.castleEdges(t2).has(e)), 'el caballero va en un camino del castillo');
  C.apply(t2, q, { type: 'placeKnight', edge: spots[0] });
  check(t2.tb.knights[spots[0]] && t2.tb.knights[spots[0]].owner === q && t2.phase === 'main', 'el caballero queda en el tablero');
  // hay que moverlo fuera del castillo antes de terminar
  check(!!C.apply(t2, q, { type: 'endTurn' }).error, 'no se puede terminar con caballeros en los caminos del castillo');
  C.apply(t2, q, { type: 'startMove' });
  const tg = TB.knightTargets(t2, spots[0]);
  check(tg.length && Math.max(...tg.map(x => x.cost)) === 3, 'un caballero recorre hasta 3 caminos');
  const out = tg.find(x => !TB.castleEdges(t2).has(x.edge));
  C.apply(t2, q, { type: 'moveKnight', from: spots[0], to: out.edge });
  check(t2.tb.knights[out.edge] && !t2.tb.knights[spots[0]], 'mover un caballero');
  give(Q, { wheat: 1 });
  C.apply(t2, q, { type: 'boostKnight', from: out.edge });
  check(t2.tb.knights[out.edge].boost && Math.max(0, ...TB.knightTargets(t2, out.edge).map(x => x.cost)) <= 5 - out.cost, 'con 1 cereal llega a 5 caminos');
  // Intriga
  t2.devDeck.push('intrigue');
  give(Q, { sheep: 1, wheat: 1, ore: 1 });
  t2.phase = 'main';
  const pr0 = Q.prisoners;
  C.apply(t2, q, { type: 'buyDev' });
  check(Q.prisoners === pr0 + 1, 'Intriga: un bárbaro pasa a ser tu prisionero');
  // Traición
  t2.devDeck.push('treason');
  give(Q, { sheep: 1, wheat: 1, ore: 1 });
  const go0 = Q.gold;
  C.apply(t2, q, { type: 'buyDev' });
  check(t2.phase === 'tbTreason' && Q.gold === go0 + 2, 'Traición: 2 de oro y mover bárbaros');
  C.apply(t2, q, { type: 'treason', moves: [] });
  // expulsión
  const t3 = game('traders', { scenario: 4 }, 3);
  toMain(t3);
  const r = t3.current;
  const hx = t3.board.hexes.find(x => x.coastal && !x.conquered);
  t3.board.hexes.forEach(x => { if (x.coastal) { x.barbs = 0; x.conquered = false; } });
  hx.barbs = 1;
  t3.tb.knights = {};
  hx.edges.slice(0, 2).forEach(e => { t3.tb.knights[e] = { owner: r, used: 0, boost: false }; });
  t3.players[r].prisoners = 0;
  t3.players[r].knightsLeft = 4;
  C.apply(t3, r, { type: 'endTurn' });
  check(hx.barbs === 0 && t3.players[r].prisoners === 1, 'al terminar el turno, más caballeros que bárbaros los expulsan y hacen prisioneros');
  t3.players[r].prisoners = 4;
  check(TB.extraVP(t3, r) >= 2, '2 prisioneros = 1 PV');
  // el 7: no hay ladrón, se roba
  const t4 = game('traders', { scenario: 4 }, 3);
  t4.players.forEach(P2 => { empty(P2); give(P2, { ore: 2 }); });
  roll(t4, 7);
  check(t4.phase === 'tbSteal', 'con un 7 no se mueve ladrón: solo se roba');
  C.apply(t4, t4.current, { type: 'tbSteal', victim: (t4.current + 1) % 3 });
  check(t4.phase === 'main' && t4.players[t4.current].resources.ore === 3, 'robo de 1 carta');
}

// ================= Escenario 5: Mercaderes y bárbaros =================
{
  const t = game('traders', { scenario: 5 }, 3);
  check(t.vpTarget === 13 && t.robber === null && t.tb.noLongestRoad, 'Mercaderes y bárbaros: 13 PV, sin ladrón ni Gran Ruta');
  check(t.board.hexes.filter(h => C.TRADE_HEXES.includes(h.terrain)).length === 3 && t.board.vertices.filter(v => v.plaza !== undefined).length === 3, '3 hexágonos comerciales con plaza');
  check(t.players.every(P => P.gold === 5 && P.wagon.v !== null && t.buildings[P.wagon.v].type === 'city'), 'empiezan con 5 de oro y la carreta en su ciudad');
  check(t.tb.barbs.length === 3, '3 bárbaros en caminos');
  check(!t.board.hexes.some(h => h.number === 2 || h.number === 12), 'no hay fichas de 2 ni 12');
  const p = t.current;
  toMain(t);
  const P = t.players[p];
  // costes de movimiento
  const W = P.wagon;
  const e0 = t.board.vertices[W.v].edges.find(e => t.board.edges[e].land && !t.roads[e]);
  if (e0 !== undefined) check(TB.wagonEdgeCost(t, p, e0).mp === 2 + (t.tb.barbs.includes(e0) ? 2 : 0), 'camino sin carretera: 2 movimientos');
  const own = ownEdges(t, p)[0];
  check(TB.wagonEdgeCost(t, p, own).mp === 1 + (t.tb.barbs.includes(own) ? 2 : 0) && TB.wagonEdgeCost(t, p, own).gold === 0, 'carretera propia: 1 movimiento');
  const foreign = ownEdges(t, (p + 1) % 3)[0];
  const fc = TB.wagonEdgeCost(t, p, foreign);
  check(fc.gold === 1 && fc.payTo === (p + 1) % 3, 'carretera ajena: 1 oro para su dueño');
  t.tb.barbs[0] = own;
  check(TB.wagonEdgeCost(t, p, own).mp === 3, 'un bárbaro suma 2 movimientos');
  // llegar a una plaza: carga
  const plazaV = t.board.vertices.find(v => v.plaza !== undefined);
  const corner = plazaV.adj[0];
  W.v = corner; W.mp = 4; W.stopped = false; P.cargo = null;
  C.apply(t, p, { type: 'startMove' });
  check(t.phase === 'tbMove', 'fase de movimiento');
  check(!!C.apply(t, p, { type: 'buildRoad', edge: 0 }).error, 'en la fase de movimiento no se construye');
  const kind = t.board.hexes[plazaV.plaza].terrain;
  const st0 = t.tb.stacks[kind].length;
  C.apply(t, p, { type: 'moveWagon', to: plazaV.id });
  check(W.v === plazaV.id && W.stopped && P.cargo && t.tb.stacks[kind].length === st0 - 1, 'en la plaza la carreta se detiene y carga una mercancía');
  // entrega
  const dest = t.board.vertices.find(v => v.plaza !== undefined && t.board.hexes[v.plaza].terrain === TB.GOOD_DEST[P.cargo]);
  W.v = dest.adj[0]; W.mp = 4; W.stopped = false;
  const d0 = P.delivered, g0 = P.gold, vp0 = C.totalVP(t, p);
  C.apply(t, p, { type: 'moveWagon', to: dest.id });
  check(P.delivered === d0 + 1 && P.gold === g0 + TB.TRAIN[W.level].gold && C.totalVP(t, p) === vp0 + 1, 'entregar da 1 PV y oro según el tren');
  // impulsar con cereal
  W.stopped = false; W.boosted = false; W.mp = 0;
  give(P, { wheat: 1 });
  check(!C.apply(t, p, { type: 'boostWagon' }).error && W.mp === 2, '1 cereal: +2 movimientos');
  check(!!C.apply(t, p, { type: 'boostWagon' }).error, 'solo una vez por turno');
  // tren de equipaje
  t.phase = 'main';
  W.level = 1;
  give(P, { wood: 1, wheat: 1 });
  check(!C.apply(t, p, { type: 'upgradeWagon' }).error && W.level === 2, 'mejorar el tren al nivel 2 (madera + cereal)');
  W.level = 4;
  give(P, { sheep: 1, wheat: 2, ore: 2 });
  const vp1 = C.totalVP(t, p);
  C.apply(t, p, { type: 'upgradeWagon' });
  check(W.level === 5 && C.totalVP(t, p) === vp1 + 1, 'el nivel 5 del tren vale 1 PV');
  // ahuyentar bárbaro
  C.apply(t, p, { type: 'startMove' });
  W.stopped = false;
  const bv = t.board.edges[t.tb.barbs[1]].v[0];
  W.v = bv;
  const free = TB.barbFreeEdges(t).find(e => e !== t.tb.barbs[1]);
  const b1 = t.tb.barbs[1];
  C.apply(t, p, { type: 'driveBarbarian', edge: b1, to: free, forced: 6 });
  check(t.tb.barbs[1] === free, 'con un 6 (nivel 5: 4-6) se ahuyenta al bárbaro');
  // cartas: Caballero mueve un bárbaro y roba
  t.phase = 'main';
  P.devCards.push({ type: 'knight', turn: -1 });
  t.devPlayed = false;
  C.apply(t, p, { type: 'playDev', card: 'knight' });
  check(t.phase === 'tbBarbarian', 'el Caballero mueve un bárbaro');
  const q = (p + 1) % 3;
  empty(t.players[q]); give(t.players[q], { ore: 1 });
  const target = ownEdges(t, q).find(e => !t.tb.barbs.includes(e));
  C.apply(t, p, { type: 'moveBarbarian', from: t.tb.barbs[0], to: target });
  check(t.tb.barbs.includes(target) && t.players[q].resources.ore === 0 && t.phase === 'main', 'y roba a quien tiene la carretera');
  // Viaje rápido
  t.devPlayed = false;
  P.devCards.push({ type: 'swiftJourney', turn: -1 });
  W.moved = false;
  check(!!C.apply(t, p, { type: 'playDev', card: 'swiftJourney' }).error, 'Viaje rápido solo después de mover la carreta');
  W.moved = true; W.stopped = true; W.mp = 0;
  check(!C.apply(t, p, { type: 'playDev', card: 'swiftJourney' }).error && W.mp === TB.TRAIN[W.level].mp && !W.stopped, 'Viaje rápido: la carreta se mueve otra vez');
  // sin Gran Ruta
  check(t.longestRoad === null, 'no hay Gran Ruta Comercial');
  // el oro se compra 4:1
  P.gold = 0;
  give(P, { ore: 4 });
  check(!C.apply(t, p, { type: 'bankTrade', give: 'ore', get: 'gold' }).error && P.gold === 1, '4 recursos iguales → 1 oro');
}

// ================= 5-6 jugadores en pareja =================
{
  const t = game('traders56', { scenario: 1 }, 5);
  check(t.board.hexes.filter(h => h.terrain === 'lake').length === 2 && t.board.fishing.length === 8, 'Pescadores 5-6: 2 lagos y 8 caladeros');
  const p = t.current;
  toMain(t);
  const turn0 = t.turn;
  C.apply(t, p, { type: 'endTurn' });
  const p2 = (p + 3) % 5;
  check(t.tb.p2 && t.tb.p2.p2 === p2 && t.current === p2 && t.phase === 'main', 'después del jugador 1 juega el jugador 2 (el tercero a su izquierda)');
  give(t.players[p2], { wood: 4 });
  check(!!C.apply(t, p2, { type: 'offerTrade', give: { wood: 1 }, get: { ore: 1 } }).error, 'el jugador 2 no comercia con otros jugadores');
  check(!C.apply(t, p2, { type: 'bankTrade', give: 'wood', get: 'ore' }).error, 'el jugador 2 sí comercia con el banco');
  C.apply(t, p2, { type: 'endTurn' });
  check(t.current === (p + 1) % 5 && t.turn === turn0 + 1 && !t.tb.p2, 'después pasa el turno al siguiente');
  const t5 = game('traders56', { scenario: 5 }, 6);
  check(t5.board.hexes.filter(h => h.terrain === 'quarry').length === 3 && t5.board.hexes.filter(h => h.terrain === 'glassworks').length === 3, 'escenario 5 en 5-6: 3 canteras y 3 vidrierías');
  const t4 = game('traders56', { scenario: 4 }, 6);
  check(t4.board.castles.length === 2, 'escenario 4 en 5-6: 2 castillos');
  const pp = t5.current;
  toMain(t5);
  C.apply(t5, pp, { type: 'endTurn' });
  t5.players[t5.current].gold = 4;
  check(!!C.apply(t5, t5.current, { type: 'bankTrade', give: 'gold', get: 'ore' }).error, 'en el escenario 5 el jugador 2 no compra con oro');
}

// ================= partidas completas entre bots =================
function botGames(mode, options, n, games) {
  let ok = 0, errs = 0;
  for (let g = 0; g < games; g++) {
    const t = C.createGame({ mode, options, players: NAMES.slice(0, n).map((name, i) => ({ name, color: 'c' + i, bot: true })) });
    const mm = t.players.map(() => ({}));
    let last = -1, acts = 0;
    for (let i = 0; i < 40000 && t.phase !== 'ended'; i++) {
      const w = TB.waiting(t);
      const pid = w ? w[0] : t.phase === 'discard' ? +Object.keys(t.pendingDiscard)[0] : t.phase === 'gold' ? +Object.keys(t.pendingGold)[0]
        : t.trade ? (t.players.find(x => x.id !== t.trade.from && !x.neutral && t.trade.responses[x.id] === undefined) || { id: t.trade.from }).id : C.actor(t);
      if (t.turn !== last) { last = t.turn; acts = 0; }
      let a = C.AI.decide(t, pid, mm[pid]);
      if (++acts > 80 && pid === t.current && ['main', 'tbMove'].includes(t.phase)) a = { type: 'endTurn' };
      if (C.apply(t, pid, a).error) { errs++; C.apply(t, t.current, { type: 'endTurn' }); }
    }
    if (t.phase === 'ended') ok++;
  }
  return { ok, errs };
}
for (const [mode, sc, n, extra] of [['traders', 1, 3], ['traders', 2, 4], ['traders', 3, 4], ['traders', 4, 3], ['traders', 5, 4], ['traders56', 4, 5], ['traders56', 5, 6],
  ['traders', 1, 2, { events: true }], ['classic', 0, 2, { harbormaster: true }], ['classic', 0, 4, { events: true, harbormaster: true }], ['extended', 0, 5, { events: true }]]) {
  const r = botGames(mode, Object.assign({ scenario: sc }, extra || {}), n, 2);
  check(r.ok === 2 && !r.errs, `${mode} esc. ${sc}, ${n} jugadores${extra ? ' (' + Object.keys(extra).join(', ') + ')' : ''}: 2 partidas entre bots sin errores`);
}

console.log(fails ? fails + ' fallos' : 'Todas las pruebas pasaron');
process.exit(fails ? 1 : 0);
