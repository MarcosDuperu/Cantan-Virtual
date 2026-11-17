// Simula partidas completas solo con bots para validar el motor.
// Uso: node tools/simulate.js [modo] [partidas] [jugadores] [escenario] [variantes separadas por comas: events,harbormaster,friendlyRobber]
require('../src/js/engine/board.js');
require('../src/js/engine/rules.js');
require('../src/js/engine/ck.js');
require('../src/js/engine/pe.js');
require('../src/js/engine/tb.js');
require('../src/js/engine/ai.js');
require('../src/js/engine/names.js');
const C = globalThis.Catan;

const mode = process.argv[2] || 'classic';
const games = +(process.argv[3] || 20);
const n = +(process.argv[4] || ((mode === 'extended' || mode === 'cities56' || mode === 'explorers56') ? 6 : 4));
const scenario = +(process.argv[5] || 2);
const extra = process.argv[6] ? Object.fromEntries(process.argv[6].split(',').map(k => [k, true])) : {};
let wins = 0, totalTurns = 0, errors = 0, stuck = 0;
const ckStats = [];
const peStats = [];

for (let g = 0; g < games; g++) {
  const names = C.randomBotNames(n);
  const s = C.createGame({ mode, options: Object.assign({ scenario }, extra), players: names.map((name, i) => ({ name, color: 'c' + i, bot: true, difficulty: ['easy', 'normal', 'hard'][i % 3] })) });
  const mem = s.players.map(() => ({}));
  let steps = 0, turnActions = 0, lastTurn = -1;
  while (s.phase !== 'ended' && steps < 40000) {
    steps++;
    if (s.turn !== lastTurn) { lastTurn = s.turn; turnActions = 0; }
    // quién debe actuar
    let pid;
    const ppd = s.ck ? Object.keys(s.ck.pendingProgressDiscard) : [];
    const tw = s.tb ? C.TB.waiting(s) : null;
    if (ppd.length) pid = +ppd[0];
    else if (tw) pid = tw[0];
    else if (s.phase === 'give') pid = +Object.keys(s.pendingGive)[0];
    else if (s.phase === 'discard') pid = +Object.keys(s.pendingDiscard)[0];
    else if (s.phase === 'gold') pid = +Object.keys(s.pendingGold)[0];
    else if (s.phase === 'main' && s.trade) {
      const t = s.trade;
      const pend = s.players.find(p => p.id !== t.from && !p.neutral && t.responses[p.id] === undefined);
      pid = pend ? pend.id : t.from;
    } else pid = C.actor(s);
    let a = C.AI.decide(s, pid, mem[pid]);
    if (!a || a.type === 'wait') { console.log('bot sin acción', s.phase, pid); stuck++; break; }
    if (++turnActions > 60 && (s.phase === 'main' || s.phase === 'move' || s.phase === 'tbMove') && pid === s.current) a = s.players[pid].progress && s.players[pid].progress.length > 4 ? { type: 'discardProgress', index: 0 } : { type: 'endTurn' };
    const r = C.apply(s, pid, a);
    if (r.error) {
      errors++;
      if (errors < 25) console.log('ERROR', s.phase, JSON.stringify(a), r.error);
      // forzar avance
      const fb = s.phase === 'main' || s.phase === 'move' || s.phase === 'tbMove' ? { type: 'endTurn' } : s.phase === 'roadBuilding' ? { type: 'endRoadBuilding' } : s.phase === 'specialBuild' ? { type: 'endTurn' } : null;
      if (!fb || C.apply(s, C.actor(s), fb).error) { stuck++; console.log('atascado en', s.phase); break; }
    }
  }
  if (s.phase === 'ended') {
    wins++; totalTurns += s.turn;
    if (s.pe) peStats.push({ hidden: s.board.hexes.filter(h => h.hidden).length, missions: s.players.map(p => p.missions.lairs + p.missions.fish + p.missions.spice).reduce((a, b) => a + b, 0), lairs: s.board.hexes.filter(h => h.lair).length });
    if (s.ck) ckStats.push({ attacks: s.ck.attacks, metro: Object.values(s.ck.metropolis).filter(Boolean).length });
    if (g < 3) console.log(`Partida ${g + 1}: gana ${s.players[s.winner].name} (${s.players[s.winner].difficulty}) en turno ${s.turn}. PV:`, s.players.map(p => C.totalVP(s, p.id)).join(','));
  } else if (steps >= 40000) { console.log('no terminó, turno', s.turn, s.players.map(p => C.totalVP(s, p.id))); stuck++; }
}
console.log(`${mode}: ${wins}/${games} terminadas, turnos medios ${(totalTurns / Math.max(1, wins)).toFixed(1)}, errores ${errors}, atascos ${stuck}`);
if (ckStats.length) console.log('C&K: ataques bárbaros medios', (ckStats.reduce((a, x) => a + x.attacks, 0) / ckStats.length).toFixed(1), '· metrópolis medias', (ckStats.reduce((a, x) => a + x.metro, 0) / ckStats.length).toFixed(1));
if (peStats.length) console.log('P&E: hexágonos ocultos al final', (peStats.reduce((a, x) => a + x.hidden, 0) / peStats.length).toFixed(1), '· pasos de misión (todos)', (peStats.reduce((a, x) => a + x.missions, 0) / peStats.length).toFixed(1), '· guaridas sin capturar', (peStats.reduce((a, x) => a + x.lairs, 0) / peStats.length).toFixed(1));
