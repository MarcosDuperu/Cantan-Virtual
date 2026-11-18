// Aplicación: menú principal, perfil, configuración de partidas, LAN y reglas.
(function (root) {
  const C = root.Catan;
  const { icon, pieceSVG } = C.UIIcons;
  const esc = C.esc;
  const app = document.getElementById('app');
  const AVATARS = ['🦊', '🐻', '🦉', '🐺', '🦁', '🐯', '🐸', '🐵', '🐼', '🐨', '🦅', '🐲', '🐮', '🐷', '🐰', '🦄', '🐢', '🐙'];

  const MODE_CARDS = [
    { id: 'classic', title: 'Clásico', sub: '2-6 jugadores · 10 PV', desc: 'El juego original. Con 5-6 jugadores se usa la ampliación oficial y con 2, «Catan para dos».', art: ['wood', 'brick', 'sheep', 'wheat', 'ore'] },
    { id: 'seafarers', title: 'Navegantes', sub: '3-6 jugadores · 9 escenarios', desc: 'Barcos, islas, pirata y ríos de oro: de «Hacia nuevas costas» a «Nuevo mundo».', art: ['gold', 'wood', 'sheep'] },
    { id: 'cities', title: 'Ciudades y Caballeros', sub: '3-6 jugadores · 13 PV', desc: 'Mercancías, mejoras de ciudad, metrópolis, caballeros y bárbaros.', art: ['knight', 'vp', 'ore'] },
    { id: 'traders', title: 'Mercaderes y Bárbaros', sub: '2-6 jugadores · 5 escenarios', desc: 'Pescadores, ríos, caravanas, ataque bárbaro y carretas de mercancías.', art: ['fish', 'wheat', 'gold'] },
    { id: 'explorers', title: 'Piratas y Exploradores', sub: '2-6 jugadores · 5 escenarios', desc: 'Explora el mar oculto, funda colonias, captura guaridas piratas y lleva pescado y especias al Consejo.', art: ['fish', 'pirate', 'gold'] }
  ];

  // ---------- perfil ----------
  function loadProfile() {
    try { return JSON.parse(localStorage.getItem('catan.profile')) || null; } catch { return null; }
  }
  function saveProfile(p) { try { localStorage.setItem('catan.profile', JSON.stringify(p)); } catch { /* ignore */ } }
  let profile = loadProfile();

  function recordGame(won) {
    if (!profile) return;
    profile.stats = profile.stats || { played: 0, won: 0 };
    profile.stats.played++;
    if (won) profile.stats.won++;
    saveProfile(profile);
  }

  // ---------- utilidades ----------
  let bgBoard = null;
  function setBackground(show) {
    const bg = document.getElementById('bg');
    bg.style.display = show ? '' : 'none';
    if (show && !bgBoard) bgBoard = C.decorativeBoard(bg, 'classic');
  }

  function globalModal(html, { dismiss = true, mount } = {}) {
    const layer = document.getElementById('global-modal');
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal">${html}</div>`;
    layer.appendChild(back);
    let closed = false;
    const close = () => { if (closed) return; closed = true; back.remove(); };
    if (dismiss) back.addEventListener('mousedown', e => { if (e.target === back) close(); });
    if (mount) mount(back.firstChild, close);
    return close;
  }
  function alertBox(title, text) {
    globalModal(`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="go-btns"><button class="btn primary" data-ok>Aceptar</button></div>`, {
      mount: (m, close) => m.querySelector('[data-ok]').onclick = close
    });
  }

  function profileChip() {
    if (!profile) return '';
    const st = profile.stats || { played: 0, won: 0 };
    return `<button class="profile-chip" data-go="profile"><span class="pc-avatar" style="--pc:${C.colorHex(profile.color)}">${esc(profile.avatar)}</span>
      <span><b>${esc(profile.name)}</b><small>${st.won} victorias · ${st.played} partidas</small></span></button>`;
  }

  function screen(html, cls = '') {
    app.innerHTML = `<div class="screen ${cls}">${html}</div>`;
    app.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { C.Sound.play('click'); go(b.dataset.go); }));
    return app.firstChild;
  }

  function go(where) {
    if (where === 'menu') showMenu();
    else if (where === 'profile') showProfile();
    else if (where === 'solo') showSolo();
    else if (where === 'lan') showLan();
    else if (where === 'rules') showRules();
    else if (where === 'quit') { if (root.desktop) root.desktop.quit(); else window.close(); }
  }

  // ---------- menú principal ----------
  function showMenu() {
    setBackground(true);
    if (!profile) return showProfile(true);
    screen(`<div class="menu-top">${profileChip()}</div>
      <div class="title-block"><div class="title-hexes">${['wood', 'brick', 'sheep', 'wheat', 'ore'].map(k => `<span class="th th-${k}">${icon(k, 34)}</span>`).join('')}</div>
        <h1 class="game-title">CATAN</h1><div class="game-sub">Colonos · Edición virtual</div></div>
      <nav class="main-menu">
        <button class="menu-btn" data-go="solo"><span class="mb-ic">🤖</span><span><b>Jugar contra la máquina</b><small>Partida individual con rivales automáticos</small></span></button>
        <button class="menu-btn" data-go="lan"><span class="mb-ic">🖧</span><span><b>Partida en red (LAN)</b><small>Juega con otras computadoras de tu red</small></span></button>
        <button class="menu-btn" data-go="profile"><span class="mb-ic">👤</span><span><b>Perfil</b><small>Nombre, ficha y color</small></span></button>
        <button class="menu-btn" data-go="rules"><span class="mb-ic">📜</span><span><b>Reglas del juego</b><small>Básico, 5-6, Navegantes, Ciudades, Piratas…</small></span></button>
        ${root.desktop ? '<button class="menu-btn small" data-go="quit"><span><b>Salir</b></span></button>' : ''}
      </nav><div class="version">v0.1 · Catan es una marca de Catan GmbH. Proyecto personal sin fines comerciales.</div>`, 'menu');
  }

  // ---------- perfil ----------
  function showProfile(first) {
    setBackground(true);
    const p = Object.assign({ name: '', avatar: AVATARS[0], color: 'red', stats: { played: 0, won: 0 } }, profile || {});
    const el = screen(`<div class="panel narrow">
      <h2>${first ? '¡Bienvenido a Catan!' : 'Tu perfil'}</h2>
      ${first ? '<p>Crea tu perfil para empezar a jugar.</p>' : ''}
      <label class="field"><span>Nombre</span><input id="pf-name" maxlength="20" value="${esc(p.name)}" placeholder="Tu nombre"></label>
      <div class="field"><span>Ficha</span><div class="avatar-grid">${AVATARS.map(a => `<button class="av ${a === p.avatar ? 'on' : ''}" data-av="${a}">${a}</button>`).join('')}</div></div>
      <div class="field"><span>Color preferido</span><div class="color-row">${C.COLORS.map(c => `<button class="col ${c.id === p.color ? 'on' : ''}" data-col="${c.id}" style="--c:${c.hex}" title="${c.name}"></button>`).join('')}</div></div>
      ${!first ? `<div class="stats-row"><div><b>${p.stats.played}</b><small>Partidas</small></div><div><b>${p.stats.won}</b><small>Victorias</small></div>
        <div><b>${p.stats.played ? Math.round(100 * p.stats.won / p.stats.played) : 0}%</b><small>Éxito</small></div></div>` : ''}
      <div class="panel-foot">${!first ? '<button class="btn" data-go="menu">Volver</button>' : ''}<button class="btn primary" id="pf-save">Guardar</button></div></div>`);
    el.addEventListener('click', e => {
      const av = e.target.closest('[data-av]'), col = e.target.closest('[data-col]');
      if (av) { p.avatar = av.dataset.av; el.querySelectorAll('.av').forEach(b => b.classList.toggle('on', b === av)); }
      if (col) { p.color = col.dataset.col; el.querySelectorAll('.col').forEach(b => b.classList.toggle('on', b === col)); }
    });
    el.querySelector('#pf-save').addEventListener('click', () => {
      const name = el.querySelector('#pf-name').value.trim();
      if (!name) { el.querySelector('#pf-name').focus(); el.querySelector('#pf-name').classList.add('bad'); return; }
      p.name = name;
      profile = p;
      saveProfile(p);
      C.Sound.play('build');
      showMenu();
    });
    el.querySelector('#pf-name').focus();
  }

  // ---------- selección de modo ----------
  function modeCards(selected, onPick, container) {
    container.innerHTML = MODE_CARDS.map(m => `<button class="mode-card ${m.id === selected ? 'on' : ''} ${m.disabled ? 'disabled' : ''}" data-mode="${m.id}" ${m.disabled ? 'disabled' : ''}>
      <div class="mc-art">${m.art.map(a => `<span class="th th-${a}">${icon(a, 26)}</span>`).join('')}</div>
      <div class="mc-title">${m.title}</div><div class="mc-sub">${m.sub}</div><div class="mc-desc">${m.desc}</div>
      ${m.disabled ? '<div class="mc-soon">Próximamente</div>' : ''}</button>`).join('');
    container.onclick = e => {
      const b = e.target.closest('[data-mode]');
      if (b && !b.disabled) { C.Sound.play('click'); onPick(b.dataset.mode); }
    };
  }

  function makeBots(n, existing) {
    const used = new Set([profile.color]);
    const usedAv = new Set([profile.avatar]);
    const names = C.randomBotNames(n, [profile.name]);
    const bots = [];
    for (let i = 0; i < n; i++) {
      const prev = existing && existing[i];
      const color = C.COLORS.find(c => !used.has(c.id)).id;
      used.add(color);
      const av = AVATARS.filter(a => !usedAv.has(a))[Math.floor(Math.random() * (AVATARS.length - usedAv.size))];
      usedAv.add(av);
      bots.push({ name: names[i], color, avatar: av, difficulty: prev ? prev.difficulty : 'normal' });
    }
    return bots;
  }

  // Escenarios de cada modo (Piratas y Exploradores, Mercaderes y Bárbaros)
  function scenarioSet(mode) {
    if (mode === 'explorers') return { list: C.PE.SCENARIOS, def: 2 };
    if (mode === 'traders') return { list: C.TB.SCENARIOS, def: 1 };
    if (mode === 'seafarers') return { list: C.SF.SCENARIOS, def: 1 };
    return null;
  }
  // Escenarios que admite un número de jugadores (Catan para dos: solo 1 y 2)
  function scenarioList(mode, count) {
    const set = scenarioSet(mode);
    if (!set) return [];
    return Object.values(set.list).filter(x => x.id && (mode !== 'traders' || count !== 2 || x.two));
  }
  function validScenario(mode, sc, count) {
    const list = scenarioList(mode, count);
    if (!list.length) return null;
    return list.some(x => x.id === +sc) ? +sc : (list.some(x => x.id === scenarioSet(mode).def) ? scenarioSet(mode).def : list[0].id);
  }
  const hasVariants = mode => mode === 'classic' || mode === 'traders';
  function defaultVP(mode, sc) {
    const set = scenarioSet(mode);
    return set && sc ? set.list[sc].vp : C.EXPANSIONS[mode].vp;
  }

  function optionsHTML(mode, o, count) {
    const set = scenarioSet(mode);
    const sc = set ? validScenario(mode, o.scenario, count) : null;
    return `${set ? `<label class="opt"><span>Escenario</span><select id="op-scen">${scenarioList(mode, count).map(x => `<option value="${x.id}" ${x.id === sc ? 'selected' : ''}>${x.id}. ${esc(count >= 5 && x.name56 ? x.name56 : x.name)} (${x.vp} PV)</option>`).join('')}</select></label>
      <div class="opt-note muted small" id="op-scen-desc">${esc(set.list[sc].desc)}</div>` : ''}
      <label class="opt"><span>Puntos para ganar</span><input type="number" id="op-vp" min="5" max="25" value="${o.vpTarget || defaultVP(mode, sc)}"></label>
      ${mode === 'explorers' ? '' : `<label class="opt check"><input type="checkbox" id="op-friendly" ${o.friendlyRobber ? 'checked' : ''}><span>Ladrón amistoso <small>(no afecta a jugadores con ≤2 PV)</small></span></label>`}
      ${hasVariants(mode) ? `<label class="opt check"><input type="checkbox" id="op-events" ${o.events ? 'checked' : ''}><span>Cartas de evento <small>(sustituyen a los dados)</small></span></label>
      <label class="opt check"><input type="checkbox" id="op-harbor" ${o.harbormaster ? 'checked' : ''}><span>Señor del puerto <small>(+2 PV; se gana con 1 PV más)</small></span></label>` : ''}
      ${(mode === 'classic' || mode === 'cities') && (count === undefined || count >= 5) ? `<label class="opt check"><input type="checkbox" id="op-special" ${o.specialBuild ? 'checked' : ''}><span>Fase de construcción especial <small>(5-6: regla anterior a 2022, en vez de jugadores en pareja)</small></span></label>` : ''}
      ${mode === 'seafarers' || mode === 'explorers' ? `<label class="opt check"><input type="checkbox" id="op-2025" ${o.rules2025 ? 'checked' : ''}><span>Reglas 2025 <small>(6.ª edición: ${mode === 'seafarers' ? 'el pirata puede ir al marco; la Gran Muralla pide un edificio' : 'puedes devolver una pieza para hacer sitio a un colono o tripulación'})</small></span></label>` : ''}
      ${mode === 'classic' && count === 2 ? '<div class="opt-note muted small">Con 2 jugadores se juega «Catan para dos»: dos jugadores neutrales, doble tirada y fichas de comercio.</div>' : ''}
      <label class="opt"><span>Velocidad de la máquina</span><select id="op-speed">
        <option value="slow" ${o.speed === 'slow' ? 'selected' : ''}>Lenta</option><option value="normal" ${!o.speed || o.speed === 'normal' ? 'selected' : ''}>Normal</option>
        <option value="fast" ${o.speed === 'fast' ? 'selected' : ''}>Rápida</option></select></label>`;
  }
  function readOptions(el) {
    const ck = id => { const x = el.querySelector(id); return x ? x.checked : false; };
    const sc = el.querySelector('#op-scen');
    return {
      vpTarget: Math.max(5, Math.min(25, +el.querySelector('#op-vp').value || 10)),
      friendlyRobber: ck('#op-friendly'),
      events: ck('#op-events'),
      harbormaster: ck('#op-harbor'),
      specialBuild: ck('#op-special'),
      rules2025: ck('#op-2025'),
      scenario: sc ? +sc.value : undefined,
      speed: el.querySelector('#op-speed').value
    };
  }
  // Opciones que viajan a la partida (sin la velocidad)
  function gameOptions(o) {
    return { vpTarget: o.vpTarget, friendlyRobber: o.friendlyRobber, scenario: o.scenario, events: o.events, harbormaster: o.harbormaster, specialBuild: o.specialBuild, rules2025: o.rules2025 };
  }
  // Al cambiar de escenario se actualizan los PV por defecto
  function bindScenario(el, getMode) {
    el.querySelector('#opts').addEventListener('change', e => {
      if (e.target.id !== 'op-scen') return;
      const set = scenarioSet(getMode());
      if (!set) return;
      const sc = set.list[e.target.value];
      el.querySelector('#op-vp').value = sc.vp;
      el.querySelector('#op-scen-desc').textContent = sc.desc;
    });
  }

  // ---------- partida contra la máquina ----------
  function showSolo() {
    setBackground(true);
    const st = { mode: 'classic', count: 4, bots: [], options: { speed: 'normal' } };
    st.bots = makeBots(st.count - 1);
    const el = screen(`<div class="panel wide">
      <div class="panel-head"><button class="btn ghost" data-go="menu">← Volver</button><h2>Jugar contra la máquina</h2>${profileChip()}</div>
      <h3>Modo de juego</h3><div class="mode-grid" id="modes"></div>
      <div class="two-col">
        <div><h3>Jugadores <span class="muted" id="cnt-label"></span></h3><div class="count-row" id="counts"></div><div class="seat-list" id="seats"></div>
          <button class="btn ghost small" id="reroll">🎲 Nuevos nombres</button></div>
        <div><h3>Opciones</h3><div class="opts" id="opts"></div>
          <button class="btn ghost small" id="see-rules">📜 Ver reglas de este modo</button></div>
      </div>
      <div class="panel-foot"><button class="btn primary big" id="start">Comenzar partida</button></div></div>`);
    const draw = () => {
      const M = C.EXPANSIONS[st.mode];
      modeCards(st.mode, m => {
        st.mode = m;
        const MM = C.EXPANSIONS[m];
        st.count = Math.min(MM.max, Math.max(MM.min, st.count));
        st.bots = makeBots(st.count - 1, st.bots);
        st.options.vpTarget = null;
        draw();
      }, el.querySelector('#modes'));
      const counts = [];
      for (let i = M.min; i <= M.max; i++) counts.push(i);
      el.querySelector('#counts').innerHTML = counts.map(n => `<button class="cnt-btn ${n === st.count ? 'on' : ''}" data-n="${n}">${n}</button>`).join('');
      el.querySelector('#cnt-label').textContent = `(tú + ${st.count - 1} de la máquina)` + (st.count >= 5 ? (st.options.specialBuild && (st.mode === 'classic' || st.mode === 'cities') ? ' · ampliación 5-6' : ' · ampliación 5-6 en pareja') : st.count === 2 ? ' · con piezas neutrales' : '');
      el.querySelector('#seats').innerHTML = `<div class="seat me"><span class="pc-avatar" style="--pc:${C.colorHex(profile.color)}">${esc(profile.avatar)}</span>
        <span class="seat-name">${esc(profile.name)}</span><span class="tag-me">Tú</span></div>` +
        st.bots.map((b, i) => `<div class="seat"><span class="pc-avatar" style="--pc:${C.colorHex(b.color)}">${b.avatar}</span>
          <span class="seat-name">${esc(b.name)}</span><select data-diff="${i}">
          ${[['easy', 'Fácil'], ['normal', 'Normal'], ['hard', 'Difícil']].map(([k, l]) => `<option value="${k}" ${b.difficulty === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`).join('');
      el.querySelector('#opts').innerHTML = optionsHTML(st.mode, st.options, st.count);
    };
    draw();
    el.querySelector('#counts').addEventListener('click', e => {
      const b = e.target.closest('[data-n]');
      if (!b) return;
      st.options = readOptions(el);
      const prevScen = validScenario(st.mode, st.options.scenario, st.count);
      st.count = +b.dataset.n;
      // si el escenario elegido no admite este número de jugadores, se vuelve a los PV por defecto
      if (prevScen !== validScenario(st.mode, st.options.scenario, st.count)) st.options.vpTarget = null;
      st.bots = makeBots(st.count - 1, st.bots);
      draw();
    });
    el.querySelector('#seats').addEventListener('change', e => { if (e.target.dataset.diff !== undefined) st.bots[+e.target.dataset.diff].difficulty = e.target.value; });
    bindScenario(el, () => st.mode);
    el.querySelector('#reroll').addEventListener('click', () => { st.options = readOptions(el); st.bots = makeBots(st.count - 1, st.bots); draw(); });
    el.querySelector('#see-rules').addEventListener('click', () => showRulesModal(st.mode, st.count));
    el.querySelector('#start').addEventListener('click', () => {
      const o = readOptions(el);
      const seats = [{ kind: 'local', name: profile.name, color: profile.color, avatar: profile.avatar }]
        .concat(st.bots.map(b => ({ kind: 'bot', name: b.name, color: b.color, avatar: b.avatar, difficulty: b.difficulty })));
      const router = makeRouter();
      const session = new C.LocalSession({ mode: C.resolveMode(st.mode, seats.length), options: gameOptions(o), seats: C.shuffle(seats), speed: o.speed }, router);
      router.session = session;
      C._debug = session;
      session.start();
    });
  }

  // Encamina los mensajes de una sesión hacia la sala o la partida
  function makeRouter(lobbyHandlers = {}) {
    const r = {
      game: null, session: null,
      onLobby: l => lobbyHandlers.onLobby && lobbyHandlers.onLobby(l),
      onLobbyChat: m => lobbyHandlers.onLobbyChat && lobbyHandlers.onLobbyChat(m),
      onStarted: () => {},
      onState: v => {
        if (!r.game) {
          setBackground(false);
          app.innerHTML = '';
          const holder = document.createElement('div');
          holder.className = 'game-holder';
          app.appendChild(holder);
          r.game = new C.GameUI(holder, r.session, { onExit: () => { r.game = null; showMenu(); }, onGameEnd: recordGame });
          C._ui = r.game;
        }
        r.game.onState(v);
      },
      onChat: m => r.game && r.game.onChat(m),
      onError: msg => r.game ? r.game.onError(msg) : alertBox('Aviso', msg),
      onClosed: msg => {
        if (r.game) { r.game.destroy(); r.game = null; }
        showMenu();
        alertBox('Conexión', msg);
      }
    };
    return r;
  }

  // ---------- LAN ----------
  function showLan() {
    setBackground(true);
    const electron = !!(root.desktop && root.desktop.isElectron);
    const el = screen(`<div class="panel wide">
      <div class="panel-head"><button class="btn ghost" data-go="menu">← Volver</button><h2>Partida en red local</h2>${profileChip()}</div>
      <div class="two-col">
        <div class="lan-box"><h3>Crear partida</h3><p>Tu computadora será el anfitrión. Los demás jugadores se unen desde su copia del juego en la misma red (Wi-Fi o cable).</p>
          <button class="btn primary big" id="host">Crear partida</button></div>
        <div class="lan-box"><h3>Unirse a una partida</h3>
          ${electron ? '<div class="games-list" id="games"><div class="muted">Buscando partidas en la red…</div></div>' : '<p class="muted">Búsqueda automática disponible en la aplicación instalada.</p>'}
          <div class="join-row"><input id="addr" placeholder="IP del anfitrión, ej. 192.168.1.20" value="${electron ? '' : esc(location.host)}"><button class="btn" id="join">Unirse</button></div>
          <p class="muted small">Si no aparece la partida, pide al anfitrión la dirección que muestra en su sala y escríbela aquí.</p></div>
      </div></div>`);
    if (electron) {
      root.desktop.startDiscovery(games => {
        const g = el.querySelector('#games');
        if (!g) return;
        g.innerHTML = games.length ? games.map(x => `<div class="game-row"><div><b>${esc(x.name)}</b><small>${esc(C.EXPANSIONS[x.mode] ? C.EXPANSIONS[x.mode].name : (C.MODES[x.mode] ? C.MODES[x.mode].name : x.mode))} · ${x.players}/${x.max} jugadores · ${esc(x.address)}</small></div>
          <button class="btn small" data-join="${esc(x.address)}:${x.port}" ${x.open ? '' : 'disabled'}>${x.open ? 'Unirse' : 'En juego'}</button></div>`).join('')
          : '<div class="muted">Buscando partidas en la red…</div>';
      });
    }
    const leave = () => { if (electron) root.desktop.stopDiscovery(); };
    el.addEventListener('click', e => {
      const j = e.target.closest('[data-join]');
      if (j && !j.disabled) { leave(); joinGame(j.dataset.join); }
    });
    el.querySelector('[data-go="menu"]').addEventListener('click', leave);
    el.querySelector('#join').addEventListener('click', () => {
      const a = el.querySelector('#addr').value.trim();
      if (!a) return el.querySelector('#addr').focus();
      leave(); joinGame(a);
    });
    el.querySelector('#host').addEventListener('click', async () => {
      leave();
      const lobby = lobbyScreen(true);
      const router = makeRouter(lobby);
      const session = new C.LanHostSession(profile, router);
      router.session = session;
      lobby.session = session;
      C._debug = session;
      try { await session.open(); } catch (err) { showLan(); alertBox('No se pudo crear la partida', err.message); }
    });
  }

  async function joinGame(addr) {
    const lobby = lobbyScreen(false);
    const router = makeRouter(lobby);
    const session = new C.RemoteSession(profile, addr, router);
    router.session = session;
    lobby.session = session;
    C._debug = session;
    try { await session.open(); } catch (err) { showLan(); alertBox('No se pudo conectar', err.message); }
  }

  function lobbyScreen(isHost) {
    const el = screen(`<div class="panel wide">
      <div class="panel-head"><button class="btn ghost" id="lb-leave">← Salir</button><h2>${isHost ? 'Tu partida (anfitrión)' : 'Sala de espera'}</h2>${profileChip()}</div>
      <div class="lobby-addr" id="lb-addr">Conectando…</div>
      ${isHost ? '<h3>Modo de juego</h3><div class="mode-grid" id="modes"></div>' : '<div id="lb-mode" class="lb-mode"></div>'}
      <div class="two-col">
        <div><h3>Jugadores</h3><div class="seat-list" id="seats"></div>
          ${isHost ? `<div class="bot-add"><button class="btn small" data-bot="easy">+ Máquina fácil</button><button class="btn small" data-bot="normal">+ Máquina normal</button><button class="btn small" data-bot="hard">+ Máquina difícil</button></div>` : ''}
          ${!isHost ? '<div class="field"><span>Tu color</span><div class="color-row" id="my-color"></div></div>' : ''}</div>
        <div>${isHost ? '<h3>Opciones</h3><div class="opts" id="opts"></div>' : ''}
          <h3>Chat</h3><div class="lobby-chat" id="lchat"></div><form id="lchat-f" class="join-row"><input maxlength="300" placeholder="Mensaje…"><button class="btn small">Enviar</button></form></div>
      </div>
      <div class="panel-foot">${isHost ? '<button class="btn primary big" id="lb-start" disabled>Comenzar partida</button>' : '<div class="muted">Esperando a que el anfitrión comience la partida…</div>'}</div></div>`);
    const h = { session: null, last: null };
    el.querySelector('#lb-leave').addEventListener('click', () => { if (h.session) h.session.leave(); showLan(); });
    el.querySelector('#lchat-f').addEventListener('submit', e => {
      e.preventDefault();
      const inp = e.target.querySelector('input');
      if (inp.value.trim() && h.session) h.session.chat(inp.value.trim());
      inp.value = '';
    });
    h.onLobbyChat = m => {
      const c = el.querySelector('#lchat');
      if (!c) return;
      c.insertAdjacentHTML('beforeend', `<div class="chat-line"><b>${esc(m.name)}:</b> ${esc(m.text)}</div>`);
      c.scrollTop = c.scrollHeight;
    };
    if (isHost) {
      bindScenario(el, () => h.lastMode);
      // los invitados ven en la sala el escenario y los PV elegidos
      el.querySelector('#opts').addEventListener('change', () => {
        const o = readOptions(el);
        h.session.setOptions(gameOptions(o));
      });
      el.querySelector('.bot-add').addEventListener('click', e => { const b = e.target.closest('[data-bot]'); if (b) h.session.addBot(b.dataset.bot); });
      el.querySelector('#lb-start').addEventListener('click', () => {
        const o = readOptions(el);
        const n = h.last ? h.last.seats.length : 0;
        if (h.session.mode === 'traders' && n === 2 && !C.TB.SCENARIOS[o.scenario].two)
          return alertBox('Escenario no disponible', 'Con 2 jugadores solo se pueden jugar los escenarios 1 y 2 de Mercaderes y Bárbaros.');
        h.session.options = gameOptions(o);
        h.session.speed = o.speed;
        if (!h.session.start()) alertBox('Faltan jugadores', 'Este modo necesita entre ' + C.EXPANSIONS[h.session.mode].min + ' y ' + C.EXPANSIONS[h.session.mode].max + ' jugadores.');
      });
    }
    h.onLobby = l => {
      if (!document.body.contains(el)) return;
      const M = C.EXPANSIONS[l.mode];
      h.last = l;
      const addr = el.querySelector('#lb-addr');
      if (isHost && l.info) {
        const ips = (l.info.ips || []).filter(Boolean);
        addr.innerHTML = ips.length ? `Los demás pueden unirse con: ${ips.map(ip => `<b>${esc(ip)}${l.info.port && l.info.port !== '47800' && l.info.port !== 47800 ? ':' + l.info.port : ''}</b>`).join(' o ')}` : 'Partida creada';
      } else if (!isHost) addr.innerHTML = `Conectado a la partida · modo <b>${esc(M.name)}</b>`;
      if (isHost) {
        const prevOpts = el.querySelector('#op-vp') ? readOptions(el) : { speed: 'normal' };
        if (h.lastMode !== l.mode) {
          h.lastMode = l.mode;
          prevOpts.vpTarget = null;
          prevOpts.scenario = undefined;
          el.querySelector('#opts').innerHTML = optionsHTML(l.mode, prevOpts);
          const o = readOptions(el);
          Object.assign(h.session.options, gameOptions(o), { vpTarget: null });
        }
        modeCards(l.mode, m => h.session.setMode(m), el.querySelector('#modes'));
        el.querySelector('#lb-start').disabled = !(l.seats.length >= M.min && l.seats.length <= M.max);
        el.querySelector('#lb-start').textContent = l.seats.length < M.min ? `Faltan ${M.min - l.seats.length} jugador(es)` : 'Comenzar partida';
      } else {
        const set = scenarioSet(l.mode), lo = l.options || {};
        const scn = set && set.list[lo.scenario];
        el.querySelector('#lb-mode').innerHTML = `<b>${esc(M.name)}</b>${scn && scn.id ? ' · ' + esc(scn.name) : ''} · ${M.min}-${M.max} jugadores · ${lo.vpTarget || (scn ? scn.vp : M.vp)} PV${lo.friendlyRobber ? ' · ladrón amistoso' : ''}${lo.events ? ' · cartas de evento' : ''}${lo.harbormaster ? ' · Señor del puerto' : ''}${lo.specialBuild ? ' · construcción especial (5-6)' : ''}${lo.rules2025 ? ' · reglas 2025' : ''}`;
        const mine = l.seats.find(s => s.cid === h.session.cid);
        el.querySelector('#my-color').innerHTML = C.COLORS.map(c => {
          const taken = l.seats.some(s => s.color === c.id && s !== mine);
          return `<button class="col ${mine && mine.color === c.id ? 'on' : ''}" data-col="${c.id}" style="--c:${c.hex}" ${taken ? 'disabled' : ''}></button>`;
        }).join('');
        el.querySelector('#my-color').onclick = e => { const b = e.target.closest('[data-col]'); if (b && !b.disabled) h.session.setColor(b.dataset.col); };
      }
      el.querySelector('#seats').innerHTML = l.seats.map((s, i) => `<div class="seat ${s.kind === 'local' && isHost ? 'me' : ''}">
        <span class="pc-avatar" style="--pc:${C.colorHex(s.color)}">${esc(s.avatar || (s.kind === 'bot' ? '🤖' : s.name[0]))}</span>
        <span class="seat-name">${esc(s.name)}</span>
        <span class="seat-kind">${s.kind === 'bot' ? 'Máquina · ' + ({ easy: 'fácil', normal: 'normal', hard: 'difícil' }[s.difficulty] || '') : s.kind === 'local' ? 'Anfitrión' : 'Jugador en red'}</span>
        ${isHost && s.kind !== 'local' ? `<button class="mini no" data-rm="${i}">Quitar</button>` : ''}</div>`).join('') +
        Array.from({ length: Math.max(0, M.max - l.seats.length) }, () => '<div class="seat empty">Lugar libre</div>').join('');
      if (isHost) el.querySelector('#seats').onclick = e => { const b = e.target.closest('[data-rm]'); if (b) h.session.removeSeat(+b.dataset.rm); };
    };
    return h;
  }

  // ---------- reglas ----------
  function showRules(tab = 'classic') {
    setBackground(true);
    const el = screen(`<div class="panel wide rules">
      <div class="panel-head"><button class="btn ghost" data-go="menu">← Volver</button><h2>Reglas del juego</h2><span></span></div>
      <div class="tabs">${C.RULES_TABS.map(([k, l]) => `<button class="tab ${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
      <div class="rules-body">${C.RULES_TEXT[tab]}</div></div>`);
    el.querySelector('.tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) showRules(b.dataset.tab); });
  }
  function showRulesModal(mode, count) {
    const extra = count >= 5 ? (C.RULES_TEXT[mode + '56'] || '') : '';
    globalModal(`<div class="rules-modal">${C.RULES_TEXT[mode]}${extra}</div><div class="go-btns"><button class="btn primary" data-ok>Cerrar</button></div>`, {
      mount: (m, close) => m.querySelector('[data-ok]').onclick = close
    });
    document.querySelector('#global-modal .modal').classList.add('wide');
  }

  showMenu();
})(window);
