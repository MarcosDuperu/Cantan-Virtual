// Anfitrión de partida: ejecuta el motor, los bots y reparte vistas a los jugadores.
(function (root) {
  const C = root.Catan;

  const COLORS = [
    { id: 'red', hex: '#d63a2f', name: 'Rojo' },
    { id: 'blue', hex: '#2f6fd6', name: 'Azul' },
    { id: 'orange', hex: '#f08c1a', name: 'Naranja' },
    { id: 'white', hex: '#f4f1e8', name: 'Blanco' },
    { id: 'green', hex: '#3a9a3f', name: 'Verde' },
    { id: 'brown', hex: '#7a4a24', name: 'Marrón' }
  ];
  C.COLORS = COLORS;
  C.colorHex = id => id === 'neutral' ? '#9b9890' : (COLORS.find(c => c.id === id) || COLORS[0]).hex;

  const SPEED = { slow: 1.6, normal: 1, fast: 0.45 };

  class GameHost {
    // seats: [{name,color,bot,difficulty,avatar, kind:'local'|'remote'|'bot', cid}]
    constructor({ mode, options, seats, onLocal, sendRemote, speed }) {
      this.seats = seats.map(s => Object.assign({}, s));
      this.onLocal = onLocal || (() => {});
      this.sendRemote = sendRemote || (() => {});
      this.speed = SPEED[speed] || 1;
      this.state = C.createGame({ mode, options, players: this.seats.map(s => ({ name: s.name, color: s.color, bot: s.kind === 'bot', difficulty: s.difficulty, avatar: s.avatar })) });
      this.mem = this.seats.map(() => ({}));
      this.timer = null;
      this.tradeTimer = null;
      this.chat = [];
      this.turnActions = 0;
      this.lastTurn = -1;
      this.destroyed = false;
    }

    start() { this.broadcast(); this.tick(); }

    destroy() { this.destroyed = true; clearTimeout(this.timer); clearTimeout(this.tradeTimer); }

    pidForCid(cid) { return this.seats.findIndex(s => s.kind === 'remote' && s.cid === cid); }

    action(pid, a) {
      if (this.destroyed) return { error: 'Partida cerrada' };
      const r = C.apply(this.state, pid, a);
      if (r.error) {
        this.errorTo(pid, r.error);
      } else {
        this.broadcast();
        this.tick();
      }
      return r;
    }

    errorTo(pid, msg) {
      const seat = this.seats[pid];
      if (!seat) return;
      if (seat.kind === 'local') this.onLocal({ t: 'error', msg });
      else if (seat.kind === 'remote') this.sendRemote(seat.cid, { t: 'error', msg });
    }

    say(pid, text) {
      text = String(text || '').slice(0, 300).trim();
      if (!text) return;
      const m = { t: 'chat', from: pid, name: this.state.players[pid].name, color: this.state.players[pid].color, text, at: Date.now() };
      this.chat.push(m);
      if (this.chat.length > 100) this.chat.shift();
      this.seats.forEach(s => {
        if (s.kind === 'local') this.onLocal(m);
        else if (s.kind === 'remote') this.sendRemote(s.cid, m);
      });
    }

    broadcast() {
      this.seats.forEach((s, pid) => {
        if (s.kind === 'bot') return;
        const view = C.viewFor(this.state, pid);
        view.seatKinds = this.seats.map(x => x.kind);
        const msg = { t: 'state', view };
        if (s.kind === 'local') this.onLocal(msg);
        else this.sendRemote(s.cid, msg);
      });
    }

    // Un jugador remoto se desconecta: pasa a ser controlado por la máquina
    dropRemote(cid) {
      const pid = this.pidForCid(cid);
      if (pid < 0) return;
      this.seats[pid].kind = 'bot';
      this.seats[pid].cid = null;
      this.state.players[pid].bot = true;
      this.state.log.push({ id: ++this.state.logSeq, msg: this.state.players[pid].name + ' se desconectó; la máquina juega por él/ella.', pid });
      this.broadcast();
      this.tick();
    }

    whoActs() {
      const s = this.state;
      const isBot = p => this.seats[p] && this.seats[p].kind === 'bot';
      if (s.phase === 'ended') return null;
      if (s.ck) {
        const p = Object.keys(s.ck.pendingProgressDiscard).map(Number).find(isBot);
        if (p !== undefined) return p;
        if (s.phase === 'give') { const g = Object.keys(s.pendingGive).map(Number).find(isBot); return g === undefined ? null : g; }
      }
      if (s.tb) { const w = C.TB.waiting(s); if (w) { const p = w.find(isBot); return p === undefined ? null : p; } }
      if (s.phase === 'discard') { const p = Object.keys(s.pendingDiscard).map(Number).find(isBot); return p === undefined ? null : p; }
      if (s.phase === 'gold') { const p = Object.keys(s.pendingGold).map(Number).find(isBot); return p === undefined ? null : p; }
      if (s.phase === 'main' && s.trade) {
        const t = s.trade;
        const r = s.players.find(p => p.id !== t.from && isBot(p.id) && t.responses[p.id] === undefined && (t.to === null || t.to === p.id));
        if (r) return r.id;
        return isBot(t.from) ? t.from : null;
      }
      const a = C.actor(s);
      return isBot(a) ? a : null;
    }

    tick() {
      if (this.destroyed || this.timer) return;
      const pid = this.whoActs();
      if (pid === null) return;
      const s = this.state;
      let delay = 750;
      if (s.phase === 'setup') delay = 900;
      else if (s.phase === 'roll') delay = 1000;
      else if (s.trade && s.trade.from !== pid) delay = 1300;
      else if (s.phase === 'discard' || s.phase === 'gold') delay = 900;
      this.timer = setTimeout(() => {
        this.timer = null;
        if (this.destroyed) return;
        this.runBot(pid);
      }, delay * this.speed);
    }

    runBot(pid) {
      const s = this.state;
      if (this.whoActs() !== pid) { this.tick(); return; }
      if (s.turn !== this.lastTurn) { this.lastTurn = s.turn; this.turnActions = 0; }
      let a = C.AI.decide(s, pid, this.mem[pid]);
      if (a && a.type === 'wait') {
        // espera respuestas humanas a la oferta del bot
        if (!this.tradeTimer) {
          this.tradeTimer = setTimeout(() => { this.tradeTimer = null; this.mem[pid].tradeExpired = true; this.tick(); }, 12000 * this.speed);
        }
        return;
      }
      if (this.tradeTimer && !(s.trade && s.trade.from === pid)) { clearTimeout(this.tradeTimer); this.tradeTimer = null; }
      if (a && (a.type === 'confirmTrade' || a.type === 'cancelTrade') && this.tradeTimer) { clearTimeout(this.tradeTimer); this.tradeTimer = null; }
      if (!a) return;
      if (pid === s.current && (s.phase === 'main' || s.phase === 'move' || s.phase === 'tbMove') && ++this.turnActions > 60) {
        a = s.players[pid].progress && s.players[pid].progress.length > 4 ? { type: 'discardProgress', index: 0 } : { type: 'endTurn' };
      }
      let r = C.apply(s, pid, a);
      if (r.error) {
        const fb = s.phase === 'main' || s.phase === 'move' || s.phase === 'tbMove' ? { type: 'endTurn' } : s.phase === 'roadBuilding' ? { type: 'endRoadBuilding' } : s.phase === 'specialBuild' ? { type: 'endTurn' } : null;
        if (fb) r = C.apply(s, pid, fb);
        if (r.error) console.warn('Bot atascado', s.phase, a, r.error);
      }
      this.broadcast();
      this.tick();
    }
  }

  // ----- Sesiones: interfaz común para la UI -----
  // ui recibe: onState(view), onChat(m), onError(msg), onLobby(l), onClosed(msg)

  class LocalSession {
    constructor({ mode, options, seats, speed }, ui) {
      this.ui = ui;
      this.host = new GameHost({ mode, options, seats, speed, onLocal: m => this.recv(m) });
      this.me = seats.findIndex(s => s.kind === 'local');
    }
    recv(m) {
      if (m.t === 'state') this.ui.onState(m.view);
      else if (m.t === 'chat') this.ui.onChat(m);
      else if (m.t === 'error') this.ui.onError(m.msg);
    }
    start() { this.host.start(); }
    send(a) { this.host.action(this.me, a); }
    chat(text) { this.host.say(this.me, text); }
    leave() { this.host.destroy(); }
  }

  // Anfitrión LAN: sala de espera + partida
  class LanHostSession {
    constructor(profile, ui) {
      this.profile = profile;
      this.ui = ui;
      this.ws = null;
      this.host = null;
      this.mode = 'classic';
      this.options = { vpTarget: null, friendlyRobber: false };
      this.speed = 'normal';
      this.seats = [{ kind: 'local', name: profile.name, color: profile.color, avatar: profile.avatar }];
      this.info = null;
    }
    async open() {
      let url;
      if (root.desktop && root.desktop.isElectron) {
        this.info = await root.desktop.startHost({ info: this.announceInfo() });
        url = 'ws://127.0.0.1:' + this.info.port;
      } else {
        url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
        this.info = { port: location.port, ips: [location.hostname] };
      }
      await new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        this.ws = ws;
        ws.onopen = () => { ws.send(JSON.stringify({ t: 'hello', role: 'host' })); };
        ws.onmessage = ev => {
          const m = JSON.parse(ev.data);
          if (m.t === 'welcome') { resolve(); this.pushLobby(); return; }
          if (m.t === 'error') { reject(new Error(m.msg)); return; }
          this.onRelay(m);
        };
        ws.onerror = () => reject(new Error('No se pudo abrir el servidor de partida'));
        ws.onclose = () => { if (this.host) this.ui.onClosed('Se cerró el servidor de la partida'); };
      });
    }
    announceInfo() {
      return { name: 'Partida de ' + this.profile.name, mode: this.mode, players: this.seats.length, max: C.EXPANSIONS[this.mode].max, open: !this.host };
    }
    relay(obj) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj)); }
    toCid(cid, msg) { this.relay({ t: 'to', cid, msg }); }

    freeColor(pref) {
      const used = new Set(this.seats.map(s => s.color));
      if (pref && !used.has(pref)) return pref;
      return COLORS.find(c => !used.has(c.id)).id;
    }

    onRelay(m) {
      if (m.t === 'join') {
        if (this.host || this.seats.length >= C.EXPANSIONS[this.mode].max) {
          this.relay({ t: 'kick', cid: m.cid, msg: this.host ? 'La partida ya comenzó' : 'La partida está llena' });
          return;
        }
        const p = m.profile || {};
        let name = String(p.name || 'Jugador').slice(0, 20);
        if (this.seats.some(s => s.name === name)) name += ' ' + (this.seats.length + 1);
        this.seats.push({ kind: 'remote', cid: m.cid, name, color: this.freeColor(p.color), avatar: p.avatar });
        this.pushLobby();
      } else if (m.t === 'leave') {
        if (this.host) { this.host.dropRemote(m.cid); return; }
        this.seats = this.seats.filter(s => s.cid !== m.cid);
        this.pushLobby();
      } else if (m.t === 'from') {
        const msg = m.msg;
        if (this.host) {
          const pid = this.host.pidForCid(m.cid);
          if (pid < 0) return;
          if (msg.t === 'action') this.host.action(pid, msg.a);
          else if (msg.t === 'chat') this.host.say(pid, msg.text);
        } else if (msg.t === 'color') {
          const seat = this.seats.find(s => s.cid === m.cid);
          if (seat && !this.seats.some(s => s.color === msg.color)) { seat.color = msg.color; this.pushLobby(); }
        } else if (msg.t === 'lobbyChat') {
          const seat = this.seats.find(s => s.cid === m.cid);
          if (seat) this.lobbyChat(seat.name, msg.text);
        }
      }
    }

    lobbyChat(name, text) {
      const m = { t: 'lobbyChat', name, text: String(text).slice(0, 300) };
      this.relay({ t: 'all', msg: m });
      this.ui.onLobbyChat && this.ui.onLobbyChat(m);
    }

    lobbyState() {
      return { t: 'lobby', mode: this.mode, options: this.options, speed: this.speed, info: this.info,
        seats: this.seats.map(s => ({ kind: s.kind, name: s.name, color: s.color, difficulty: s.difficulty, avatar: s.avatar, cid: s.cid })) };
    }
    pushLobby() {
      const l = this.lobbyState();
      this.relay({ t: 'all', msg: l });
      this.ui.onLobby && this.ui.onLobby(l);
      if (root.desktop && root.desktop.isElectron) root.desktop.announce(this.announceInfo());
    }

    setMode(mode) {
      this.mode = mode;
      const max = C.EXPANSIONS[mode].max;
      // quita bots sobrantes
      while (this.seats.length > max) {
        const i = this.seats.map(s => s.kind).lastIndexOf('bot');
        if (i < 0) break;
        this.seats.splice(i, 1);
      }
      this.pushLobby();
    }
    setOptions(o) { Object.assign(this.options, o); this.pushLobby(); }
    addBot(difficulty) {
      if (this.seats.length >= C.EXPANSIONS[this.mode].max) return;
      const name = C.randomBotNames(1, this.seats.map(s => s.name))[0];
      this.seats.push({ kind: 'bot', name, color: this.freeColor(), difficulty: difficulty || 'normal' });
      this.pushLobby();
    }
    removeSeat(i) {
      const s = this.seats[i];
      if (!s || s.kind === 'local') return;
      if (s.kind === 'remote') this.relay({ t: 'kick', cid: s.cid, msg: 'El anfitrión te quitó de la partida' });
      this.seats.splice(i, 1);
      this.pushLobby();
    }
    canStart() {
      const m = C.EXPANSIONS[this.mode];
      return this.seats.length >= m.min && this.seats.length <= m.max;
    }
    start() {
      if (!this.canStart()) return false;
      const seats = C.shuffle(this.seats.slice());
      this.me = seats.findIndex(s => s.kind === 'local');
      this.host = new GameHost({
        mode: C.resolveMode(this.mode, seats.length), options: this.options, seats, speed: this.speed,
        onLocal: m => {
          if (m.t === 'state') this.ui.onState(m.view);
          else if (m.t === 'chat') this.ui.onChat(m);
          else if (m.t === 'error') this.ui.onError(m.msg);
        },
        sendRemote: (cid, msg) => this.toCid(cid, msg)
      });
      this.relay({ t: 'all', msg: { t: 'started' } });
      if (root.desktop && root.desktop.isElectron) root.desktop.announce(this.announceInfo());
      this.host.start();
      return true;
    }
    send(a) { if (this.host) this.host.action(this.me, a); }
    chat(text) { if (this.host) this.host.say(this.me, text); else this.lobbyChat(this.profile.name, text); }
    leave() {
      if (this.host) this.host.destroy();
      this.host = null;
      try { this.ws && this.ws.close(); } catch { /* ignore */ }
      if (root.desktop && root.desktop.isElectron) root.desktop.stopHost();
    }
  }

  // Jugador que se une a una partida LAN
  class RemoteSession {
    constructor(profile, address, ui) {
      this.profile = profile;
      this.address = address;
      this.ui = ui;
      this.ws = null;
      this.closedByMe = false;
    }
    open() {
      return new Promise((resolve, reject) => {
        let addr = this.address.trim();
        if (!/:\d+$/.test(addr)) addr += ':47800';
        const ws = new WebSocket('ws://' + addr);
        this.ws = ws;
        let ok = false;
        const to = setTimeout(() => { if (!ok) { try { ws.close(); } catch { /* ignore */ } reject(new Error('Tiempo de espera agotado')); } }, 6000);
        ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', role: 'player', profile: this.profile }));
        ws.onmessage = ev => {
          const m = JSON.parse(ev.data);
          if (m.t === 'welcome') { ok = true; clearTimeout(to); this.cid = m.cid; resolve(); return; }
          if (m.t === 'error') { clearTimeout(to); reject(new Error(m.msg)); return; }
          if (m.t === 'kicked') { this.closedByMe = true; this.ui.onClosed(m.msg || 'Desconectado'); return; }
          if (m.t === 'hostGone') { this.closedByMe = true; this.ui.onClosed('El anfitrión cerró la partida'); return; }
          if (m.t === 'state' || m.t === 'started') this.started = true;
          if (m.t === 'lobby') this.ui.onLobby && this.ui.onLobby(m);
          else if (m.t === 'lobbyChat') this.ui.onLobbyChat && this.ui.onLobbyChat(m);
          else if (m.t === 'state') this.ui.onState(m.view);
          else if (m.t === 'chat') this.ui.onChat(m);
          else if (m.t === 'error') this.ui.onError(m.msg);
          else if (m.t === 'started') this.ui.onStarted && this.ui.onStarted();
        };
        ws.onerror = () => { if (!ok) { clearTimeout(to); reject(new Error('No se pudo conectar a ' + addr)); } };
        ws.onclose = () => { if (ok && !this.closedByMe) this.ui.onClosed('Se perdió la conexión con el anfitrión'); };
      });
    }
    raw(obj) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj)); }
    send(a) { this.raw({ t: 'action', a }); }
    chat(text) { this.raw({ t: this.started ? 'chat' : 'lobbyChat', text }); }
    setColor(color) { this.raw({ t: 'color', color }); }
    leave() { this.closedByMe = true; try { this.ws && this.ws.close(); } catch { /* ignore */ } }
  }

  Object.assign(C, { GameHost, LocalSession, LanHostSession, RemoteSession });
})(window);
