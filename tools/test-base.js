// Pruebas de reglas del juego básico y su ampliación 5-6. Uso: node tools/test-base.js
['board', 'rules', 'ck', 'pe', 'tb', 'ai', 'names'].forEach(f => require('../src/js/engine/' + f + '.js'));
const C = globalThis.Catan;
let fails = 0;
const check = (cond, msg) => { if (!cond) { fails++; console.log('FALLO:', msg); } else console.log('ok  ', msg); };

const NAMES = ['Ana', 'Beto', 'Caro', 'Dani', 'Eva', 'Fede'];
function game(mode, n, options = {}) {
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
const toMain = s => { C.apply(s, s.current, { type: 'roll', forced: [1, 2] }); if (s.phase !== 'main') s.phase = 'main'; s.pendingDiscard = {}; };

// ================= jugadores en pareja (5-6, regla de 2022) =================
for (const mode of ['extended', 'cities56']) {
  const s = game(mode, 6);
  check(s.pairs && !s.specialBuild, mode + ': por defecto se juega con jugadores en pareja');
  toMain(s);
  const p1 = s.current, turn0 = s.turn;
  C.apply(s, p1, { type: 'endTurn' });
  const p2 = (p1 + 3) % 6;
  check(s.pair && s.pair.p2 === p2 && s.current === p2 && s.phase === 'main' && s.turn === turn0, mode + ': después del jugador 1 juega el tercero a su izquierda');
  give(s.players[p2], { sheep: 4 });
  check(!!C.apply(s, p2, { type: 'offerTrade', give: { sheep: 1 }, get: { ore: 1 } }).error, mode + ': el jugador 2 no comercia con otros jugadores');
  const ore0 = s.players[p2].resources.ore;
  check(!C.apply(s, p2, { type: 'bankTrade', give: 'sheep', get: 'ore' }).error && s.players[p2].resources.ore === ore0 + 1, mode + ': el jugador 2 sí comercia con el banco');
  give(s.players[p2], { wood: 1, brick: 1 });
  const e = C.validRoutes(s, p2, 'road')[0];
  if (e !== undefined) check(!C.apply(s, p2, { type: 'buildRoad', edge: e }).error, mode + ': el jugador 2 construye');
  C.apply(s, p2, { type: 'endTurn' });
  check(!s.pair && s.current === (p1 + 1) % 6 && s.turn === turn0 + 1 && s.phase === 'roll', mode + ': luego el turno pasa al siguiente jugador');
}
{
  // el jugador 2 puede jugar una carta comprada en otro turno
  const s = game('extended', 5);
  toMain(s);
  const p1 = s.current, p2 = (p1 + 3) % 5;
  s.players[p2].devCards.push({ type: 'yearOfPlenty', turn: -1 });
  C.apply(s, p1, { type: 'endTurn' });
  check(!C.apply(s, p2, { type: 'playDev', card: 'yearOfPlenty', resources: { ore: 2 } }).error, 'el jugador 2 juega 1 carta de desarrollo');
  // y puede ganar en su parte
  const s2 = game('extended', 5);
  toMain(s2);
  const q1 = s2.current, q2 = (q1 + 3) % 5;
  for (let i = 0; i < 10; i++) s2.players[q2].devCards.push({ type: 'vp', turn: -1 });
  C.apply(s2, q1, { type: 'endTurn' });
  check(s2.phase === 'ended' && s2.winner === q2, 'el jugador 2 puede ganar en su parte del turno');
}
{
  // regla anterior: fase de construcción especial
  const s = game('extended', 5, { specialBuild: true });
  check(!s.pairs && s.specialBuild, 'opción: fase de construcción especial');
  toMain(s);
  const p1 = s.current;
  C.apply(s, p1, { type: 'endTurn' });
  check(s.phase === 'specialBuild' && s.specialBuilder === (p1 + 1) % 5, 'al terminar construyen los demás en orden');
}

// ================= colocación oficial =================
{
  let okSeq = 0, okRed = 0;
  for (let i = 0; i < 50; i++) {
    const b = C.generateBoard('classic');
    const land = b.hexes.filter(h => C.isLand(h.terrain));
    if (land.map(h => h.number).filter(Boolean).sort((x, y) => x - y).join() === '2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12') okSeq++;
    if (!land.some(h => (h.number === 6 || h.number === 8) && C.neighborsOf(b, h).some(n => n.number === 6 || n.number === 8))) okRed++;
  }
  check(okSeq === 50 && okRed === 50, 'fichas en espiral A…R: las 18 fichas y nunca dos rojas juntas');
  // el desierto no lleva ficha y la espiral sigue la secuencia oficial desde una esquina
  const b = C.generateBoard('classic');
  const land = b.hexes.filter(h => C.isLand(h.terrain));
  const isCorner = h => C.neighborsOf(b, h).filter(n => C.isLand(n.terrain)).length === 3;
  // la A (5) va en una esquina; si esa esquina es el desierto, se salta y va en el hexágono siguiente
  const corner = land.find(h => h.number === 5 && isCorner(h)) || land.find(h => h.terrain === 'desert' && isCorner(h));
  check(land.find(h => h.terrain === 'desert').number === undefined && !!corner, 'la ficha A (5) empieza en una esquina y el desierto no tiene ficha');
  const s = C.createGame({ mode: 'classic', players: NAMES.slice(0, 4).map((name, i) => ({ name, color: 'c' + i })) });
  check(/^Tiradas para empezar/.test(s.log[0].msg) && s.setup.order[0] === s.first, 'el primer jugador se decide tirando los dados');
}

// ================= partidas completas entre bots =================
function botGames(mode, n, options, games) {
  let ok = 0, errs = 0;
  for (let g = 0; g < games; g++) {
    const t = C.createGame({ mode, options, players: NAMES.slice(0, n).map((name, i) => ({ name, color: 'c' + i, bot: true })) });
    const mm = t.players.map(() => ({}));
    let last = -1, acts = 0;
    for (let i = 0; i < 40000 && t.phase !== 'ended'; i++) {
      const tw = t.tb ? C.TB.waiting(t) : null;
      const ppd = t.ck ? Object.keys(t.ck.pendingProgressDiscard) : [];
      const pid = ppd.length ? +ppd[0] : tw ? tw[0] : t.phase === 'discard' ? +Object.keys(t.pendingDiscard)[0] : t.phase === 'gold' ? +Object.keys(t.pendingGold)[0]
        : t.phase === 'give' ? +Object.keys(t.pendingGive)[0]
        : t.trade ? (t.players.find(x => x.id !== t.trade.from && !x.neutral && t.trade.responses[x.id] === undefined) || { id: t.trade.from }).id : C.actor(t);
      if (t.turn !== last) { last = t.turn; acts = 0; }
      let a = C.AI.decide(t, pid, mm[pid]);
      if (++acts > 80 && pid === t.current && t.phase === 'main') a = { type: 'endTurn' };
      if (C.apply(t, pid, a).error) { errs++; C.apply(t, C.actor(t), t.phase === 'specialBuild' ? { type: 'endTurn' } : { type: 'endTurn' }); }
    }
    if (t.phase === 'ended') ok++;
  }
  return { ok, errs };
}
for (const [mode, n, o] of [['classic', 3], ['classic', 4], ['extended', 5], ['extended', 6], ['extended', 6, { specialBuild: true }], ['cities56', 5]]) {
  const r = botGames(mode, n, o || {}, 2);
  check(r.ok === 2 && !r.errs, `${mode}, ${n} jugadores${o ? ' (' + Object.keys(o).join(', ') + ')' : ''}: 2 partidas entre bots sin errores`);
}

console.log(fails ? fails + ' fallos' : 'Todas las pruebas pasaron');
process.exit(fails ? 1 : 0);
