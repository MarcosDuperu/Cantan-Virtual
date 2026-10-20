// Efectos de sonido sintetizados (sin archivos externos)
(function (root) {
  const C = root.Catan;
  let ctx = null;
  let enabled = true;
  try { enabled = localStorage.getItem('catan.sound') !== 'off'; } catch { /* ignore */ }

  function ac() {
    if (!ctx) { try { ctx = new (root.AudioContext || root.webkitAudioContext)(); } catch { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  // Tono con envolvente; "to" desliza la frecuencia hasta otro valor
  function tone(freq, dur, type = 'sine', vol = 0.15, delay = 0, to = null, attack = 0.005) {
    const a = ac(); if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  // Ruido filtrado: golpes de madera, piedra, olas, pasos
  function noise(dur, vol = 0.2, delay = 0, { type = 'bandpass', freq = 1800, to = null, q = 1, attack = 0.002 } = {}) {
    const a = ac(); if (!a) return;
    const t = a.currentTime + delay;
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.buffer = buf;
    src.connect(f).connect(g).connect(a.destination); src.start(t); src.stop(t + dur + 0.05);
  }
  // Golpe de martillo sobre madera
  const woodHit = (delay, pitch = 1) => {
    noise(0.07, 0.5, delay, { freq: 900 * pitch, q: 4 });
    tone(180 * pitch, 0.09, 'sine', 0.35, delay, 90 * pitch);
  };
  // Golpe de piedra pesada
  const stoneHit = (delay) => {
    noise(0.16, 0.6, delay, { type: 'lowpass', freq: 500, to: 150 });
    tone(90, 0.18, 'sine', 0.45, delay, 50);
  };
  const bell = (f, delay, vol = 0.12) => {
    tone(f, 1.4, 'sine', vol, delay);
    tone(f * 2.76, 0.6, 'sine', vol * 0.35, delay);
    tone(f * 5.4, 0.25, 'sine', vol * 0.15, delay);
  };

  const FX = {
    dice() { for (let i = 0; i < 7; i++) noise(0.04, 0.3, i * 0.06 + Math.random() * 0.02, { freq: 2500 + Math.random() * 1500, q: 3 }); woodHit(0.48, 1.6); },
    // Carretera: tablones que se colocan y dos clavos
    road() { noise(0.12, 0.25, 0, { freq: 600, to: 300, q: 2 }); woodHit(0.12, 1.2); woodHit(0.24, 1.25); },
    // Poblado: tres martillazos y una campanilla de casa nueva
    settlement() { woodHit(0, 1); woodHit(0.13, 1.05); woodHit(0.26, 0.95); tone(659, 0.35, 'triangle', 0.12, 0.42); tone(880, 0.5, 'triangle', 0.1, 0.52); },
    // Ciudad: bloques de piedra y campana de torre
    city() { stoneHit(0); stoneHit(0.2); stoneHit(0.38); bell(392, 0.6, 0.14); bell(523, 0.95, 0.1); },
    // Barco: ola que rompe, crujido de madera y bocina grave
    ship() { noise(0.9, 0.22, 0, { type: 'lowpass', freq: 300, to: 1600, attack: 0.3 }); tone(140, 0.25, 'sawtooth', 0.04, 0.15, 260); tone(110, 0.7, 'triangle', 0.18, 0.5, 104, 0.08); },
    // Ladrón: pasos sigilosos y acorde menor amenazante
    robber() {
      [0, 0.22, 0.44].forEach(d => noise(0.08, 0.4, d, { type: 'lowpass', freq: 260 }));
      tone(147, 0.5, 'sawtooth', 0.07, 0.6, 139); tone(175, 0.5, 'sawtooth', 0.05, 0.6, 165); tone(110, 0.9, 'sawtooth', 0.08, 0.85, 98);
    },
    // Pirata: oleaje y cuerno de barco pirata
    pirate() {
      noise(0.8, 0.25, 0, { type: 'lowpass', freq: 400, to: 1400, attack: 0.25 });
      tone(98, 0.45, 'sawtooth', 0.09, 0.45, 92, 0.05); tone(98, 0.8, 'sawtooth', 0.09, 0.95, 82, 0.05); tone(147, 0.8, 'square', 0.03, 0.95, 123);
    },
    // Robo de carta
    steal() { noise(0.18, 0.2, 1.1, { type: 'highpass', freq: 2500, to: 6000 }); tone(620, 0.12, 'triangle', 0.08, 1.22, 410); },
    build() { woodHit(0); },
    // Ciudades y Caballeros
    knight() { tone(1800, 0.15, 'square', 0.05, 0, 2400); noise(0.12, 0.3, 0.02, { type: 'highpass', freq: 3000 }); [0.25, 0.4, 0.55].forEach(d => noise(0.06, 0.35, d, { type: 'lowpass', freq: 500 })); },
    activate() { tone(900, 0.25, 'sawtooth', 0.05, 0, 2600); noise(0.2, 0.18, 0, { type: 'highpass', freq: 4000, to: 9000 }); },
    promote() { tone(523, 0.14, 'square', 0.07); tone(659, 0.14, 'square', 0.07, 0.12); tone(784, 0.3, 'square', 0.07, 0.24); },
    knightMove() { [0, 0.12, 0.24, 0.36, 0.48].forEach((d, i) => noise(0.05, 0.4, d, { type: 'lowpass', freq: i % 2 ? 380 : 520 })); },
    wall() { stoneHit(0); stoneHit(0.18); noise(0.3, 0.15, 0.3, { type: 'lowpass', freq: 800, to: 200 }); },
    improve() { bell(523, 0, 0.1); bell(659, 0.18, 0.08); bell(784, 0.36, 0.08); },
    metropolis() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'triangle', 0.13, i * 0.13)); bell(262, 0.7, 0.16); },
    drum() { tone(90, 0.25, 'sine', 0.4, 0, 55); noise(0.1, 0.25, 0, { type: 'lowpass', freq: 300 }); tone(90, 0.25, 'sine', 0.3, 0.3, 55); },
    horn() { tone(196, 0.6, 'sawtooth', 0.08, 0, null, 0.08); tone(262, 0.9, 'sawtooth', 0.08, 0.5, null, 0.08); tone(330, 0.9, 'triangle', 0.06, 0.5); },
    pillage() { [0, 0.3, 0.6].forEach(d => tone(110, 0.25, 'sine', 0.4, d, 60)); noise(0.8, 0.25, 0.4, { type: 'lowpass', freq: 600, to: 2000, attack: 0.2 }); tone(147, 0.8, 'sawtooth', 0.07, 0.9, 98); },
    coin() { tone(988, 0.08, 'square', 0.06); tone(1319, 0.2, 'square', 0.06, 0.08); },
    turn() { tone(523, 0.15, 'sine', 0.15); tone(659, 0.15, 'sine', 0.15, 0.12); tone(784, 0.3, 'sine', 0.15, 0.24); },
    card() { noise(0.1, 0.2, 0, { freq: 3000, to: 1200 }); tone(660, 0.1, 'sine', 0.08, 0.05); },
    win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.15, i * 0.15)); },
    error() { tone(160, 0.18, 'square', 0.06); },
    click() { tone(800, 0.04, 'sine', 0.05); }
  };
  C.Sound = {
    _fx: FX,
    play(name) { if (enabled && FX[name]) try { FX[name](); } catch { /* ignore */ } },
    get enabled() { return enabled; },
    toggle() { enabled = !enabled; try { localStorage.setItem('catan.sound', enabled ? 'on' : 'off'); } catch { /* ignore */ } return enabled; }
  };
})(window);
