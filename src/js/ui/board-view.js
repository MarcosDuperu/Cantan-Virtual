// Dibujo del tablero en SVG con terrenos ilustrados, fichas, puertos y piezas.
(function (root) {
  const C = root.Catan;
  const S = 50; // radio del hexágono en unidades SVG
  let CUR = ''; // prefijo de ids del tablero que se está dibujando

  function rng(seed) {
    let x = (seed * 9301 + 49297) % 233280;
    return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  }

  const BASE = {
    forest: ['#4f9a45', '#2d6a2b'], hills: ['#d8814f', '#a9502a'], pasture: ['#a6d66a', '#77ae43'],
    fields: ['#f3d562', '#d9ab2f'], mountains: ['#a3a9b1', '#6f767f'], desert: ['#f0dfa8', '#d4bd7c'],
    gold: ['#f7d65a', '#c99317'], sea: ['#3a8fd0', '#2a6fae'],
    fish: ['#4aa0d8', '#2a72b0'], spice: ['#e0a860', '#a8692a'], council: ['#efe6cc', '#c9b68a'], hidden: ['#6b7884', '#3c4650'],
    lake: ['#5fb4e6', '#2f7fbf'], swamp: ['#7f9a5a', '#4f6a36'], oasis: ['#f0dfa8', '#c9b06a'],
    castle: ['#d8d2c4', '#a39a88'], quarry: ['#d9d4cc', '#9c958a'], glassworks: ['#e6d3b0', '#b8946a']
  };
  const isWaterT = t => t === 'sea' || t === 'fish';
  const isTileT = t => C.isLand(t) || t === 'spice' || t === 'council';

  const SPOTS = [[-0.5, -0.48], [0.02, -0.66], [0.52, -0.44], [-0.66, 0.06], [0.66, 0.08], [-0.38, 0.56], [0.36, 0.6]];

  function tree(x, y, k) {
    return `<g transform="translate(${x},${y}) scale(${k})"><rect x="-1.2" y="3" width="2.4" height="4" fill="#5b3a1e"/>
      <polygon points="0,-9 6,0 -6,0" fill="#1e5520"/><polygon points="0,-5 7.5,4 -7.5,4" fill="#2a6d2a"/></g>`;
  }
  function sheep(x, y, k) {
    return `<g transform="translate(${x},${y}) scale(${k})"><g fill="#fbfbf6"><circle cx="-2.5" cy="0" r="3"/><circle cx="1" cy="-1.5" r="3"/><circle cx="3" cy="1" r="2.8"/><circle cx="-0.5" cy="2" r="3"/></g>
      <ellipse cx="6" cy="-0.5" rx="2" ry="1.6" fill="#2b2b2b"/><rect x="-2.5" y="4" width="1" height="2.6" fill="#2b2b2b"/><rect x="2" y="4" width="1" height="2.6" fill="#2b2b2b"/></g>`;
  }
  function mountain(x, y, k, snow) {
    return `<g transform="translate(${x},${y}) scale(${k})"><polygon points="-10,7 0,-9 10,7" fill="#5f666f" stroke="#454b52" stroke-width=".6"/>
      <polygon points="0,-9 4,-2.5 1.5,-3.5 -1,-1.5 -4,-2.5" fill="${snow ? '#f4f6f8' : '#8d949c'}"/><polygon points="0,-9 10,7 3,7" fill="#4c525a" opacity=".55"/></g>`;
  }
  function wheat(x, y, k) {
    return `<g transform="translate(${x},${y}) scale(${k})" stroke="#9a6b12" stroke-width=".9" fill="#c7901c">
      <path d="M0,7 L0,-6" fill="none"/><ellipse cx="-1.5" cy="-4" rx="1.2" ry="2.2"/><ellipse cx="1.5" cy="-4" rx="1.2" ry="2.2"/>
      <ellipse cx="-1.5" cy="0" rx="1.2" ry="2.2"/><ellipse cx="1.5" cy="0" rx="1.2" ry="2.2"/></g>`;
  }
  function bricks(x, y, k) {
    return `<g transform="translate(${x},${y}) scale(${k})" stroke="#6e2a10" stroke-width=".6"><rect x="-7" y="1" width="6.5" height="3.5" fill="#b9512a"/>
      <rect x="0.5" y="1" width="6.5" height="3.5" fill="#c9603a"/><rect x="-3.5" y="-3" width="6.5" height="3.5" fill="#d06a42"/></g>`;
  }

  function decor(h) {
    const r = rng(h.id + 7);
    const cx = h.x * S, cy = h.y * S;
    let out = '';
    const spots = SPOTS.map(([dx, dy]) => [cx + (dx + (r() - 0.5) * 0.12) * S, cy + (dy + (r() - 0.5) * 0.1) * S]);
    switch (h.terrain) {
      case 'forest':
        spots.forEach(([x, y]) => { out += tree(x, y, 1.05 + r() * 0.35); });
        out += tree(cx - 0.18 * S, cy + 0.78 * S, 0.8) + tree(cx + 0.2 * S, cy - 0.85 * S, 0.7);
        break;
      case 'pasture':
        for (let i = 0; i < 12; i++) {
          const a = r() * Math.PI * 2, d = (0.45 + r() * 0.4) * S;
          const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.9;
          out += `<path d="M${x - 2},${y} l2,-4 l2,4" stroke="#5c9435" stroke-width="1.1" fill="none"/>`;
        }
        [spots[0], spots[2], spots[3], spots[6]].forEach(([x, y]) => { out += sheep(x, y, 1.15); });
        break;
      case 'fields':
        for (let i = -3; i <= 3; i++) {
          out += `<path d="M${cx - 0.85 * S},${cy + i * 0.22 * S} Q${cx},${cy + i * 0.22 * S - 6} ${cx + 0.85 * S},${cy + i * 0.22 * S}" stroke="#c99a22" stroke-width="1.4" fill="none" opacity=".6"/>`;
        }
        spots.forEach(([x, y]) => { out += wheat(x - 3, y, 1.1) + wheat(x + 3, y + 1, 1.1); });
        break;
      case 'hills':
        out += `<ellipse cx="${cx - 0.35 * S}" cy="${cy + 0.45 * S}" rx="${0.5 * S}" ry="${0.25 * S}" fill="#b55c32" opacity=".7"/>
          <ellipse cx="${cx + 0.4 * S}" cy="${cy - 0.45 * S}" rx="${0.45 * S}" ry="${0.22 * S}" fill="#b55c32" opacity=".7"/>`;
        spots.forEach(([x, y]) => { out += bricks(x, y, 1.15); });
        break;
      case 'mountains':
        out += mountain(cx - 0.42 * S, cy - 0.42 * S, 1.5, true) + mountain(cx + 0.38 * S, cy - 0.5 * S, 1.25, true) +
          mountain(cx - 0.55 * S, cy + 0.38 * S, 1.2, false) + mountain(cx + 0.5 * S, cy + 0.4 * S, 1.35, true) + mountain(cx, cy + 0.7 * S, 0.9, false);
        break;
      case 'desert':
        out += `<path d="M${cx - 0.8 * S},${cy + 0.3 * S} q${0.4 * S},-${0.25 * S} ${0.8 * S},0 t${0.8 * S},0" stroke="#c9ae68" stroke-width="2" fill="none"/>
          <path d="M${cx - 0.6 * S},${cy - 0.4 * S} q${0.3 * S},-${0.2 * S} ${0.6 * S},0 t${0.6 * S},0" stroke="#c9ae68" stroke-width="2" fill="none"/>
          <g transform="translate(${cx + 0.45 * S},${cy - 0.05 * S})" fill="#4f8a3a" stroke="#2f5a22" stroke-width=".7">
          <rect x="-2" y="-11" width="4" height="16" rx="2"/><rect x="-7" y="-6" width="3" height="7" rx="1.5"/><rect x="4" y="-8" width="3" height="6" rx="1.5"/></g>`;
        break;
      case 'gold':
        out += `<path d="M${cx - 0.9 * S},${cy - 0.2 * S} C${cx - 0.3 * S},${cy - 0.6 * S} ${cx + 0.2 * S},${cy + 0.5 * S} ${cx + 0.9 * S},${cy + 0.1 * S}" stroke="#4aa3e0" stroke-width="7" fill="none" opacity=".85"/>`;
        spots.forEach(([x, y]) => { out += `<circle cx="${x}" cy="${y}" r="${2.5 + r() * 2}" fill="#fff3a8" stroke="#b9860f" stroke-width=".8"/>`; });
        break;
      case 'fish':
        [[-0.45, -0.3], [0.4, -0.35], [-0.1, 0.45]].forEach(([dx, dy], i) => {
          const x = cx + dx * S, y = cy + dy * S, f = i % 2 ? -1 : 1;
          out += `<g transform="translate(${x},${y}) scale(${f},1)" opacity=".75"><path d="M-7,0 Q-1,-5 5,0 Q-1,5 -7,0Z" fill="#9fd6f5"/><path d="M5,0 L9,-3 L9,3Z" fill="#9fd6f5"/></g>`;
        });
        out += `<circle cx="${cx}" cy="${cy}" r="${0.62 * S}" fill="none" stroke="#bfe6ff" stroke-width="1.5" stroke-dasharray="4 5" opacity=".7"/>`;
        break;
      case 'spice':
        [[-0.42, -0.35], [0.4, -0.3], [-0.05, 0.5]].forEach(([dx, dy]) => {
          const x = cx + dx * S, y = cy + dy * S;
          out += `<g transform="translate(${x},${y})"><rect x="-6" y="-3" width="12" height="8" fill="#e9d2a0" stroke="#5a3a17" stroke-width=".8"/>
            <path d="M-8,-3 L0,-10 L8,-3Z" fill="#a8432a" stroke="#5a3a17" stroke-width=".8"/></g>`;
        });
        out += `<path d="M${cx - 0.7 * S},${cy + 0.12 * S} q${0.2 * S},-${0.3 * S} ${0.4 * S},0" stroke="#2d6a2b" stroke-width="3" fill="none"/>`;
        break;
      case 'council':
        out += `<g transform="translate(${cx},${cy - 0.22 * S}) scale(1.3)">${C.UIIcons.icon('council', 40).replace(/^<svg[^>]*>/, '<g transform="translate(-20,-20)">').replace(/<\/svg>$/, '</g>')}</g>`;
        break;
      case 'lake':
        out += `<ellipse cx="${cx}" cy="${cy}" rx="${0.62 * S}" ry="${0.45 * S}" fill="#7fc8f0" opacity=".6"/>`;
        [[-0.3, -0.1], [0.25, 0.15]].forEach(([dx, dy], i) => { out += `<g transform="translate(${cx + dx * S},${cy + dy * S}) scale(${i ? -1 : 1},1)"><path d="M-7,0 Q-1,-5 5,0 Q-1,5 -7,0Z" fill="#e8f6ff"/><path d="M5,0 L9,-3 L9,3Z" fill="#e8f6ff"/></g>`; });
        break;
      case 'swamp':
        for (let i = 0; i < 6; i++) { const x = cx + (r() - 0.5) * 1.1 * S, y = cy + (r() - 0.5) * 0.9 * S; out += `<path d="M${x},${y + 6} l-2,-10 M${x + 3},${y + 6} l1,-12 M${x + 6},${y + 6} l3,-9" stroke="#2f4a1f" stroke-width="1.4"/>`; }
        out += `<ellipse cx="${cx}" cy="${cy + 0.25 * S}" rx="${0.4 * S}" ry="${0.13 * S}" fill="#4f8fbf" opacity=".6"/>`;
        break;
      case 'oasis':
        out += `<ellipse cx="${cx}" cy="${cy + 0.1 * S}" rx="${0.3 * S}" ry="${0.16 * S}" fill="#4aa3e0"/>`;
        [[-0.32, -0.15], [0.3, -0.2], [0.05, -0.4]].forEach(([dx, dy]) => {
          const x = cx + dx * S, y = cy + dy * S;
          out += `<path d="M${x},${y + 14} Q${x + 2},${y} ${x},${y - 6}" stroke="#7a4a24" stroke-width="2.4" fill="none"/>
            <path d="M${x},${y - 6} q-9,-3 -12,4 M${x},${y - 6} q9,-3 12,4 M${x},${y - 6} q-4,-8 -10,-8 M${x},${y - 6} q4,-8 10,-8" stroke="#2d6a2b" stroke-width="3" fill="none" stroke-linecap="round"/>`;
        });
        break;
      case 'castle':
        out += `<g transform="translate(${cx},${cy})"><path d="M-18,14 V-6 H-12 V-12 H-6 V-6 H6 V-12 H12 V-6 H18 V14Z" fill="#b8b0a0" stroke="#4a4235" stroke-width="1.6"/>
          <path d="M-5,14 V3 Q0,-3 5,3 V14Z" fill="#4a3a22"/><path d="M-2,-12 V-24" stroke="#4a3a22" stroke-width="1.5"/><path d="M-2,-24 L8,-21 L-2,-18Z" fill="#c0281c"/></g>`;
        break;
      case 'quarry':
        out += `<g transform="translate(${cx},${cy})"><path d="M-22,10 L-12,-10 L0,-4 L10,-14 L22,10Z" fill="#c7c1b6" stroke="#6a645a" stroke-width="1.4"/>
          <rect x="-8" y="2" width="9" height="7" fill="#f2efe8" stroke="#6a645a"/><rect x="3" y="4" width="8" height="5" fill="#ebe6dc" stroke="#6a645a"/></g>`;
        break;
      case 'glassworks':
        out += `<g transform="translate(${cx},${cy})"><rect x="-16" y="-6" width="24" height="18" fill="#c98b3b" stroke="#5a3a17" stroke-width="1.4"/>
          <rect x="10" y="-20" width="6" height="32" fill="#8a5c2a" stroke="#5a3a17"/><path d="M-12,-2 h7 v7 h-7Z M-2,-2 h7 v7 h-7Z" fill="#9fd6f5" stroke="#1d5a80" stroke-width=".8"/>
          <circle cx="13" cy="-24" r="3" fill="#bbb" opacity=".7"/></g>`;
        break;
      case 'hidden':
        out += `<circle cx="${cx - 0.3 * S}" cy="${cy - 0.2 * S}" r="${0.32 * S}" fill="#8e9aa5" opacity=".35"/><circle cx="${cx + 0.25 * S}" cy="${cy + 0.1 * S}" r="${0.36 * S}" fill="#8e9aa5" opacity=".3"/>
          <text x="${cx}" y="${cy + 11}" text-anchor="middle" font-size="30" font-weight="900" font-family="Georgia,serif" fill="#d9e1e8" opacity=".75">?</text>
          ${h.area === 0 ? `<path d="M${cx + 14},${cy - 26} a7,7 0 1,0 6,10 a5.5,5.5 0 1,1 -6,-10Z" fill="#8fd18f" opacity=".85"/>` : h.area === 1 ? `<circle cx="${cx + 17}" cy="${cy - 20}" r="5" fill="#f2a24a" opacity=".9"/>` : ''}`;
        break;
      case 'sea':
        for (let i = 0; i < 3; i++) {
          const x = cx + (r() - 0.5) * S, y = cy + (r() - 0.5) * S;
          out += `<path d="M${x - 7},${y} q3.5,-3 7,0 t7,0" stroke="#7fc0ec" stroke-width="1.3" fill="none" opacity=".7"/>`;
        }
        break;
    }
    return out;
  }

  function hexPts(h, scale = 1) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - (h.flat ? 0 : 30));
      pts.push([(h.x + Math.cos(a) * scale) * S, (h.y + Math.sin(a) * scale) * S]);
    }
    return pts;
  }
  // Grosor de una pieza hexagonal: caras laterales sombreadas según su orientación (luz arriba a la izquierda)
  function prismSides(h, scale, depth, color) {
    const p = hexPts(h, scale);
    let out = `<polygon points="${p.map(([x, y]) => x.toFixed(1) + ',' + (y + depth).toFixed(1)).join(' ')}" fill="${color}"/>`;
    for (let i = 0; i < 6; i++) {
      const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % 6];
      const nx = y2 - y1, ny = x1 - x2; // normal hacia fuera (puntos en sentido horario en pantalla)
      if (ny <= 0.01) continue; // cara oculta (mira hacia arriba)
      const len = Math.hypot(nx, ny), dark = 0.18 + 0.32 * Math.max(0, nx / len) + 0.12 * (ny / len);
      out += `<polygon points="${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${(y2 + depth).toFixed(1)} ${x1.toFixed(1)},${(y1 + depth).toFixed(1)}" fill="${color}"/>
        <polygon points="${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${(y2 + depth).toFixed(1)} ${x1.toFixed(1)},${(y1 + depth).toFixed(1)}" fill="rgba(0,0,0,${dark.toFixed(2)})"/>`;
    }
    return out;
  }

  function hexPoints(h, scale = 1) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - (h.flat ? 0 : 30));
      pts.push(((h.x + Math.cos(a) * scale) * S).toFixed(1) + ',' + ((h.y + Math.sin(a) * scale) * S).toFixed(1));
    }
    return pts.join(' ');
  }

  function token(h) {
    const cx = h.x * S, cy = h.y * S;
    const red = h.number === 6 || h.number === 8;
    const pips = C.PIPS[h.number];
    let dots = '';
    for (let i = 0; i < pips; i++) dots += `<circle cx="${cx + (i - (pips - 1) / 2) * 3.4}" cy="${cy + 9}" r="1.3" fill="${red ? '#c0281c' : '#333'}"/>`;
    return `<g class="token"><ellipse cx="${cx + 2}" cy="${cy + 6}" rx="${0.34 * S}" ry="${0.3 * S}" fill="rgba(0,0,0,.3)"/>
      <rect x="${cx - 0.33 * S}" y="${cy}" width="${0.66 * S}" height="3.5" fill="#b3955c"/><circle cx="${cx}" cy="${cy + 3.5}" r="${0.33 * S}" fill="#a3854c" stroke="#6e5530" stroke-width="1.2"/>
      <circle cx="${cx}" cy="${cy}" r="${0.33 * S}" fill="url(#${CUR}-tokface)" stroke="#8a6d3b" stroke-width="1.5"/>
      <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="${red ? 19 : 17}" font-weight="800" font-family="Georgia,serif" fill="${red ? '#c0281c' : '#2b2b2b'}">${h.number}</text>${dots}</g>`;
  }

  function portSVG(b, p) {
    const e = b.edges[p.edge];
    const hx = b.hexes[p.hex];
    const v0 = b.vertices[e.v[0]], v1 = b.vertices[e.v[1]];
    const bx = (hx.x * 0.55 + e.x * 0.45) * S, by = (hx.y * 0.55 + e.y * 0.45) * S;
    const col = p.type === 'any' ? '#f6f1e1' : C.UIIcons.RES_COLOR[p.type];
    const label = p.type === 'any' ? '3:1' : '2:1';
    let ico = '';
    if (p.type !== 'any') ico = `<g transform="translate(${bx - 8},${by - 15}) scale(.4)">${iconInner(p.type)}</g>`;
    return `<g class="port">
      <line x1="${v0.x * S}" y1="${v0.y * S}" x2="${bx}" y2="${by}" stroke="#8b5e34" stroke-width="4" stroke-linecap="round"/>
      <line x1="${v1.x * S}" y1="${v1.y * S}" x2="${bx}" y2="${by}" stroke="#8b5e34" stroke-width="4" stroke-linecap="round"/>
      <circle cx="${bx}" cy="${by}" r="15" fill="${col}" stroke="#5a3a17" stroke-width="2"/>
      ${ico}<text x="${bx}" y="${by + (p.type === 'any' ? 4.5 : 11)}" text-anchor="middle" font-size="${p.type === 'any' ? 11 : 8}" font-weight="800" fill="#2b2b2b">${label}</text></g>`;
  }

  function iconInner(name) {
    const svg = C.UIIcons.icon(name, 40);
    return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  }

  // Pieza de madera con volumen: sombra, costado oscuro desplazado y cara superior con brillo
  function solid(d, col, depth = 3.2) {
    return `<path d="${d}" transform="translate(2.5,${depth + 2.5})" fill="rgba(0,0,0,.35)"/>
      <path d="${d}" transform="translate(0,${depth})" fill="${col}" stroke="#1b1b1b" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="${d}" transform="translate(0,${depth})" fill="rgba(0,0,0,.38)"/>
      <path d="${d}" fill="${col}" stroke="#1b1b1b" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="${d}" fill="url(#${CUR}-shine)"/>`;
  }
  function settlementSVG(v, color, cls = '') {
    const x = v.x * S, y = v.y * S;
    return `<g class="piece ${cls}" transform="translate(${x},${y - 2}) scale(1.3)">${solid(C.UIIcons.PIECE.settlement, C.colorHex(color))}</g>`;
  }
  function citySVG(v, color, cls = '') {
    const x = v.x * S, y = v.y * S;
    return `<g class="piece ${cls}" transform="translate(${x},${y - 2}) scale(1.25)">${solid(C.UIIcons.PIECE.city, C.colorHex(color))}
      <rect x="2.5" y="-4" width="3" height="4" fill="#1b1b1b" opacity=".5"/></g>`;
  }
  const AREA_COL = { trade: '#e9b92d', politics: '#2f6fd6', science: '#2f9a4a' };
  // Muralla: base de piedra bajo la ciudad
  function wallSVG(v) {
    const x = v.x * S, y = v.y * S;
    return `<g class="wall" transform="translate(${x},${y + 4})"><ellipse cx="0" cy="6" rx="22" ry="9" fill="rgba(0,0,0,.3)"/>
      <path d="M-21,2 L-21,8 Q0,16 21,8 L21,2 Q0,10 -21,2Z" fill="#8d8478" stroke="#3e3a33" stroke-width="1.2"/>
      <path d="M-21,2 Q0,10 21,2 Q0,-6 -21,2Z" fill="#a89f92" stroke="#3e3a33" stroke-width="1.2"/>
      ${[-14, -5, 5, 14].map(dx => `<line x1="${dx}" y1="${4 + Math.abs(dx) * -0.12 + 3}" x2="${dx}" y2="${10 - Math.abs(dx) * 0.12}" stroke="#3e3a33" stroke-width=".8"/>`).join('')}</g>`;
  }
  // Metrópolis: ciudad con torre del color de su área
  function metroSVG(v, color, area, cls = '') {
    const x = v.x * S, y = v.y * S;
    const ac = AREA_COL[area] || '#f2c230';
    return `<g class="piece ${cls}" transform="translate(${x},${y - 2}) scale(1.3)">${solid('M-15,9 L-15,-2 L-8,-8 L-1,-2 L-1,-9 L-5,-9 L-5,-14 L5,-14 L5,-9 L1,-9 L1,-2 L15,-2 L15,9Z', C.colorHex(color))}
      <path d="M-5,-14 L0,-21 L5,-14Z" fill="${ac}" stroke="#1b1b1b" stroke-width="1.2"/><circle cx="0" cy="-23" r="2" fill="${ac}" stroke="#1b1b1b" stroke-width=".8"/>
      <rect x="6" y="1" width="3" height="4" fill="#1b1b1b" opacity=".5"/><rect x="-11" y="1" width="3" height="4" fill="#1b1b1b" opacity=".5"/></g>`;
  }
  // Caballero: escudo con casco; los aros indican la fuerza (1-3); inactivo = gris
  function knightSVG(v, color, level, active, cls = '') {
    const x = v.x * S, y = v.y * S;
    const col = C.colorHex(color);
    const rings = [0, 1, 2].slice(0, level).map(i => `<circle cx="0" cy="0" r="${11.5 + i * 2.6}" fill="none" stroke="${active ? '#f2c230' : '#9a9a9a'}" stroke-width="1.6"/>`).join('');
    return `<g class="piece knight ${active ? 'active' : 'inactive'} ${cls}" transform="translate(${x},${y})">
      <circle cx="2" cy="5" r="${11 + level * 2.6}" fill="rgba(0,0,0,.35)"/>
      <circle cx="0" cy="3" r="11" fill="${active ? col : '#d8d4cc'}" stroke="#1b1b1b" stroke-width="1.6"/><circle cx="0" cy="3" r="11" fill="rgba(0,0,0,.38)"/>
      <circle cx="0" cy="0" r="11" fill="${active ? col : '#d8d4cc'}" stroke="#1b1b1b" stroke-width="1.6"/><circle cx="0" cy="0" r="11" fill="url(#${CUR}-shine)"/>${rings}
      <path d="M-5.5,-1 Q0,-10 5.5,-1 L5.5,4 L-5.5,4Z" fill="${active ? '#dfe3e8' : '#bdbab3'}" stroke="#1b1b1b" stroke-width="1"/>
      <rect x="-4" y="0" width="8" height="1.6" fill="#1b1b1b"/>
      ${active ? '' : `<circle cx="0" cy="0" r="11" fill="${col}" opacity=".45"/>`}
      <text x="0" y="9.5" text-anchor="middle" font-size="6.5" font-weight="900" fill="#1b1b1b">${'I'.repeat(level)}</text></g>`;
  }
  function merchantSVG(h) {
    const x = h.x * S + 0.5 * S, y = h.y * S + 0.1 * S;
    return `<g class="robber merchant" transform="translate(${x},${y})"><ellipse cx="0" cy="12" rx="8" ry="3" fill="rgba(0,0,0,.35)"/>
      <path d="M-7,11 Q-8,-2 0,-3 Q8,-2 7,11Z" fill="#e9b92d" stroke="#6b420a" stroke-width="1.3"/>
      <circle cx="0" cy="-8" r="5.5" fill="#e9b92d" stroke="#6b420a" stroke-width="1.3"/><path d="M-6,-10 L6,-10 L0,-17Z" fill="#8a1f2f"/></g>`;
  }
  function roadSVG(b, e, color, cls = '', damaged) {
    const E = b.edges[e];
    const rot = `rotate(${E.angle + (damaged ? 90 : 0)})${damaged ? ' scale(.6,1)' : ''}`;
    const bar = (fill, extra = '') => `<rect x="${-0.36 * S}" y="-4" width="${0.72 * S}" height="8" rx="2.5" fill="${fill}"${extra}/>`;
    const col = C.colorHex(color), line = ' stroke="#1b1b1b" stroke-width="1.6"';
    // el grosor va siempre hacia abajo en pantalla, sea cual sea la orientación del camino
    return `<g class="piece ${cls}" transform="translate(${E.x * S},${E.y * S})">
      <g transform="translate(2,5.5) ${rot}">${bar('rgba(0,0,0,.35)')}</g>
      <g transform="translate(0,3) ${rot}">${bar(col, line)}${bar('rgba(0,0,0,.38)')}</g>
      <g transform="${rot}">${bar(col, line)}${bar(`url(#${CUR}-shine)`)}</g></g>`;
  }
  function shipSVG(b, e, color, cls = '') {
    const E = b.edges[e];
    let ang = E.angle;
    if (ang > 90) ang -= 180;
    if (ang < -90) ang += 180;
    return `<g class="piece ${cls}" transform="translate(${E.x * S},${E.y * S}) rotate(${ang})">
      <path d="M-13,2 L13,2 L9,9 L-9,9 Z" fill="${C.colorHex(color)}" stroke="#1b1b1b" stroke-width="1.6"/>
      <path d="M0,-13 L0,2" stroke="#1b1b1b" stroke-width="1.6"/><path d="M1,-12 L11,0 L1,0 Z" fill="#f6f1e1" stroke="#1b1b1b" stroke-width="1"/>
      <path d="M-1,-11 L-9,0 L-1,0 Z" fill="${C.colorHex(color)}" stroke="#1b1b1b" stroke-width="1"/></g>`;
  }
  function robberSVG(h) {
    const x = h.x * S - 0.52 * S, y = h.y * S + 0.05 * S;
    return `<g class="robber" transform="translate(${x},${y})"><ellipse cx="0" cy="13" rx="9" ry="3" fill="rgba(0,0,0,.35)"/>
      <path d="M-8,12 Q-9,-2 0,-4 Q9,-2 8,12 Z" fill="#3b3b3f" stroke="#111" stroke-width="1.4"/>
      <circle cx="0" cy="-9" r="6" fill="#3b3b3f" stroke="#111" stroke-width="1.4"/></g>`;
  }
  function pirateSVG(h) {
    const x = h.x * S, y = h.y * S;
    return `<g class="robber" transform="translate(${x},${y}) scale(1.4)"><path d="M-14,2 L14,2 L9,10 L-9,10 Z" fill="#1c1c1c" stroke="#000" stroke-width="1.2"/>
      <path d="M0,-15 L0,2" stroke="#000" stroke-width="1.6"/><path d="M-11,-12 L11,-12 L9,0 L-9,0 Z" fill="#2b2b2b" stroke="#000"/>
      <circle cx="0" cy="-6" r="3" fill="#f6f1e1"/><path d="M-3,-1 L3,-1" stroke="#f6f1e1" stroke-width="1.4"/></g>`;
  }

  // ---------- Piratas y Exploradores ----------
  const itemSVG = (k, x, y, size) => `<g transform="translate(${x - size / 2},${y - size / 2}) scale(${size / 40})">${iconInner(k)}</g>`;
  function harborSVG(v, color, cls = '') {
    const x = v.x * S, y = v.y * S;
    return `<g class="piece ${cls}" transform="translate(${x},${y - 2}) scale(1.3)">${solid('M-13,9 L-13,-2 L-4,-10 L5,-2 L5,1 L13,1 L13,9Z', C.colorHex(color))}
      <g stroke="#1b1b1b" stroke-width="1.3" fill="none"><path d="M9,1.5 V7.5"/><path d="M6.5,5.5 Q9,8.5 11.5,5.5"/><circle cx="9" cy="2.6" r="1"/></g>
      <rect x="-8" y="0" width="3" height="4" fill="#1b1b1b" opacity=".5"/></g>`;
  }
  function peShipSVG(b, e, color, sh, offset, sel) {
    const E = b.edges[e];
    let ang = E.angle;
    if (ang > 90) ang -= 180;
    if (ang < -90) ang += 180;
    const rad = (ang + 90) * Math.PI / 180;
    const x = E.x * S + Math.cos(rad) * offset, y = E.y * S + Math.sin(rad) * offset;
    const col = C.colorHex(color);
    const cargo = sh.cargo.map((k, i) => itemSVG(k, (i - (sh.cargo.length - 1) / 2) * 11, -3, 12)).join('');
    return `<g class="piece peship ${sel ? 'sel' : ''}" transform="translate(${x},${y}) rotate(${ang})">
      <path d="M-15,3 L15,3 L10,11 L-10,11 Z" transform="translate(1.2,1.5)" fill="rgba(0,0,0,.35)"/>
      <path d="M-15,3 L15,3 L10,11 L-10,11 Z" fill="${col}" stroke="#1b1b1b" stroke-width="1.6"/>
      <path d="M0,-14 L0,3" stroke="#1b1b1b" stroke-width="1.6"/><path d="M1,-13 L12,1 L1,1 Z" fill="#f6f1e1" stroke="#1b1b1b" stroke-width="1"/>
      <path d="M-1,-12 L-10,1 L-1,1 Z" fill="${col}" stroke="#1b1b1b" stroke-width="1"/>
      ${cargo ? `<g transform="rotate(${-ang}) translate(0,-14)"><rect x="${-sh.cargo.length * 6.5}" y="-9" width="${sh.cargo.length * 13}" height="13" rx="4" fill="#fdfaf2" stroke="#1b1b1b" stroke-width=".8"/>${cargo}</g>` : ''}</g>`;
  }
  function pePirateSVG(h, color) {
    const x = h.x * S, y = h.y * S;
    return `<g class="robber" transform="translate(${x},${y}) scale(1.35)"><path d="M-14,2 L14,2 L9,10 L-9,10 Z" fill="#1c1c1c" stroke="#000" stroke-width="1.2"/>
      <path d="M0,-17 L0,2" stroke="#000" stroke-width="1.6"/><path d="M-11,-13 L11,-13 L9,0 L-9,0 Z" fill="#2b2b2b" stroke="#000"/>
      <circle cx="0" cy="-7" r="3" fill="#f6f1e1"/><path d="M-3,-2 L3,-2" stroke="#f6f1e1" stroke-width="1.4"/>
      <path d="M0,-17 L9,-15 L0,-13Z" fill="${C.colorHex(color)}" stroke="#000" stroke-width=".6"/></g>`;
  }
  function pePieces(view, b, hl) {
    let out = '';
    b.hexes.forEach(h => {
      const cx = h.x * S, cy = h.y * S;
      if (h.lair) {
        out += `<g class="lair" transform="translate(${cx + 0.42 * S},${cy - 0.42 * S})"><circle r="13" fill="#1b1b1b" stroke="#f2c230" stroke-width="2"/>${itemSVG('pirate', 0, 0, 20)}</g>`;
        h.lair.crews.forEach((o, i) => { out += `<circle cx="${cx - 0.35 * S + i * 12}" cy="${cy + 0.5 * S}" r="5.5" fill="${C.colorHex(view.players[o].color)}" stroke="#1b1b1b" stroke-width="1.4"/>`; });
      }
      (h.leftCrews || []).forEach((o, i) => { out += `<g transform="translate(${cx - 0.3 * S + i * 13},${cy + 0.55 * S})"><circle r="6" fill="${C.colorHex(view.players[o].color)}" stroke="#1b1b1b" stroke-width="1.4"/></g>`; });
      if (h.terrain === 'fish' && h.fishNo) {
        out += `<g class="fishno" transform="translate(${cx},${cy + 0.5 * S})"><rect x="-10" y="-10" width="20" height="20" rx="4" fill="#fdfaf2" stroke="#1d5a80" stroke-width="1.6"/>
          <text y="5" text-anchor="middle" font-size="14" font-weight="900" fill="#1d5a80">${h.fishNo}</text></g>`;
        if (h.fish) out += `<g class="pe-token">${itemSVG('fish', cx, cy - 0.12 * S, 34)}</g>`;
      }
      if (h.terrain === 'spice' && h.spice) {
        const BI = { fastTravel: '⛵', pirate4: '⚔4', pirate5: '⚔5', fastGold: '★' };
        out += `<g transform="translate(${cx},${cy + 0.05 * S})"><circle r="15" fill="#fdfaf2" stroke="#6b2a10" stroke-width="1.6"/>${itemSVG('spice', 0, -1, 20)}
          <text x="11" y="15" font-size="11" font-weight="900" fill="#6b2a10">${h.spice.left}</text></g>
          <text x="${cx}" y="${cy - 0.45 * S}" text-anchor="middle" font-size="14">${BI[h.spice.benefit] || ''}</text>`;
      }
    });
    // muelles de los poblados portuarios
    Object.entries(view.pe.docks || {}).forEach(([v, items]) => {
      if (!items.length) return;
      const vx = b.vertices[v];
      out += `<g transform="translate(${vx.x * S},${vx.y * S + 19})"><rect x="${-items.length * 7.5}" y="-8" width="${items.length * 15}" height="16" rx="4" fill="#8b5e34" stroke="#3a2510"/>
        ${items.map((k, i) => itemSVG(k, (i - (items.length - 1) / 2) * 14, 0, 14)).join('')}</g>`;
    });
    const byEdge = {};
    Object.values(view.pe.ships).forEach(x => { (byEdge[x.edge] || (byEdge[x.edge] = [])).push(x); });
    Object.entries(byEdge).forEach(([e, list]) => list.forEach((x, i) => {
      out += peShipSVG(b, +e, view.players[x.owner].color, x, list.length > 1 ? (i ? 9 : -9) : 0, hl.selShip === x.id);
    }));
    if (view.pe.pirate) out += pePirateSVG(b.hexes[view.pe.pirate.hex], view.players[view.pe.pirate.owner].color);
    return out;
  }

  // ---------- Mercaderes y Bárbaros ----------
  function bridgeSVG(b, e, color, cls = '') {
    const E = b.edges[e];
    const col = C.colorHex(color);
    return `<g class="piece ${cls}" transform="translate(${E.x * S},${E.y * S}) rotate(${E.angle})">
      <rect x="${-0.4 * S}" y="-7" width="${0.8 * S}" height="14" rx="3" fill="#8b5e34" stroke="#1b1b1b" stroke-width="1.4"/>
      ${[-12, -4, 4, 12].map(x => `<line x1="${x}" y1="-7" x2="${x}" y2="7" stroke="#5a3a17" stroke-width="1.2"/>`).join('')}
      <rect x="${-0.4 * S}" y="-7" width="${0.8 * S}" height="3.5" fill="${col}" stroke="#1b1b1b" stroke-width=".8"/>
      <rect x="${-0.4 * S}" y="3.5" width="${0.8 * S}" height="3.5" fill="${col}" stroke="#1b1b1b" stroke-width=".8"/></g>`;
  }
  // Navegantes: elementos propios de cada escenario
  function sfPieces(view, b) {
    const S2 = view.sf;
    let out = '';
    const col = o => (view.players[o] ? C.colorHex(view.players[o].color) : '#777');
    // barcos de guerra (Las islas piratas)
    Object.entries(view.roads).forEach(([e, r]) => {
      if (!r.war) return;
      const E = b.edges[e];
      out += `<g transform="translate(${E.x * S},${E.y * S - 15})"><circle r="7" fill="#1b1b1b" stroke="${col(r.owner)}" stroke-width="2"/><text y="3.5" text-anchor="middle" font-size="9" fill="#fff">⚔</text></g>`;
    });
    // regalos de la tribu
    (S2.gifts || []).forEach(g => {
      if (g.taken !== null) return;
      const E = b.edges[g.edge];
      const ic = g.kind === 'vp' ? '★' : g.kind === 'dev' ? '🂠' : '⚓';
      const fill = g.kind === 'vp' ? '#f2c230' : g.kind === 'dev' ? '#e8dcc0' : '#cde8f7';
      out += `<g class="sf-gift" transform="translate(${E.x * S},${E.y * S})"><title>${g.kind === 'vp' ? 'Punto de victoria' : g.kind === 'dev' ? 'Carta de desarrollo' : 'Puerto'} de la tribu</title>
        <circle r="10" fill="${fill}" stroke="#5a3a17" stroke-width="1.8"/><text y="4" text-anchor="middle" font-size="11" font-weight="900" fill="#3a2a12">${ic}</text></g>`;
    });
    // aldeas (Tela para Catan)
    (S2.villages || []).forEach(x => {
      const V = b.vertices[x.v];
      const red = x.number === 6 || x.number === 8;
      out += `<g class="sf-village" transform="translate(${V.x * S},${V.y * S})"><title>Aldea del ${x.number}: ${x.cloth} tela(s)</title>
        <circle r="13" fill="#f6e8c6" stroke="#8a6d3b" stroke-width="1.8"/><text y="4" text-anchor="middle" font-size="13" font-weight="800" font-family="Georgia,serif" fill="${red ? '#c0281c' : '#2b2b2b'}">${x.number}</text>
        <g transform="translate(12,-11)"><circle r="7.5" fill="#8a3fb0" stroke="#fff" stroke-width="1.2"/><text y="3.5" text-anchor="middle" font-size="9" font-weight="900" fill="#fff">${x.cloth}</text></g>
        ${x.conn.map((p, i) => `<circle cx="${-12 + i * 6}" cy="15" r="3" fill="${col(p)}" stroke="#1b1b1b" stroke-width=".8"/>`).join('')}</g>`;
    });
    // fortalezas piratas y cruces de destino
    (S2.forts || []).forEach(f => {
      const V = b.vertices[f.v], Ci = b.vertices[f.circle];
      out += `<circle cx="${Ci.x * S}" cy="${Ci.y * S}" r="10" fill="none" stroke="${col(f.owner)}" stroke-width="3.5" opacity=".9"><title>Destino de la ruta de ${view.players[f.owner] ? view.players[f.owner].name : ''}</title></circle>`;
      if (f.hp <= 0) return;
      out += `<g transform="translate(${V.x * S},${V.y * S})"><title>Fortaleza pirata de ${view.players[f.owner] ? view.players[f.owner].name : ''}: ${f.hp} de 3</title>
        <path d="M-11,9 L-11,-5 L-7,-5 L-7,-9 L-3,-9 L-3,-5 L3,-5 L3,-9 L7,-9 L7,-5 L11,-5 L11,9 Z" fill="#2b2b2f" stroke="${col(f.owner)}" stroke-width="2.5"/>
        <text y="6" text-anchor="middle" font-size="10" font-weight="900" fill="#fff">${f.hp}</text></g>`;
    });
    // Las maravillas: estrecho (violeta), páramo (marrón) y cruces prohibidos al empezar (!)
    const sq = (v, fill) => { const V = b.vertices[v]; return `<rect x="${V.x * S - 7}" y="${V.y * S - 7}" width="14" height="14" fill="${fill}" stroke="#1b1b1b" stroke-width="1" opacity=".85"/>`; };
    (S2.purple || []).forEach(v => { out += sq(v, '#8e3fb0'); });
    (S2.brown || []).forEach(v => { out += sq(v, '#7a2c22'); });
    if (view.phase === 'setup') (S2.excl || []).forEach(v => { const V = b.vertices[v]; out += `<text x="${V.x * S}" y="${V.y * S + 6}" text-anchor="middle" font-size="18" font-weight="900" fill="#d01c1c" stroke="#fff" stroke-width=".8">!</text>`; });
    return out;
  }

  function tbPieces(view, b, hl) {
    const T = view.tb;
    let out = '';
    const col = o => view.players[o] ? C.colorHex(view.players[o].color) : '#999';
    // ríos (líneas por el centro de sus hexágonos)
    const rivers = {};
    b.hexes.forEach(h => { if (h.river !== undefined) (rivers[h.river] = rivers[h.river] || [])[h.riverIdx] = h; });
    Object.values(rivers).forEach(list => {
      const pts = list.filter(Boolean);
      const first = pts[0];
      const sea = C.neighborsOf ? null : null;
      let d = '';
      pts.forEach((h, i) => { d += (i ? ' L' : 'M') + (h.x * S).toFixed(1) + ',' + (h.y * S).toFixed(1); });
      const mouth = b.hexes.filter(x => x.terrain === 'sea').sort((a, c) => Math.hypot(a.x - first.x, a.y - first.y) - Math.hypot(c.x - first.x, c.y - first.y))[0];
      if (mouth) d = 'M' + ((first.x + mouth.x) / 2 * S).toFixed(1) + ',' + ((first.y + mouth.y) / 2 * S).toFixed(1) + ' L' + d.slice(1);
      out += `<path d="${d}" stroke="#2f7fbf" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>
        <path d="${d}" stroke="#7fc8f0" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`;
    });
    (b.bridgeSites || []).forEach(e => {
      if (view.roads[e]) return;
      const E = b.edges[e];
      out += `<g transform="translate(${E.x * S},${E.y * S}) rotate(${E.angle})"><rect x="${-0.36 * S}" y="-5" width="${0.72 * S}" height="10" rx="2" fill="none" stroke="#5a3a17" stroke-width="1.6" stroke-dasharray="4 3"/></g>`;
    });
    // caladeros
    (b.fishing || []).forEach(f => {
      const vs = f.vertices.map(v => b.vertices[v]);
      const h = b.hexes[f.hex];
      const x = (h.x * 0.55 + vs.reduce((a, v) => a + v.x, 0) / vs.length * 0.45) * S, y = (h.y * 0.55 + vs.reduce((a, v) => a + v.y, 0) / vs.length * 0.45) * S;
      vs.forEach(v => { out += `<line x1="${v.x * S}" y1="${v.y * S}" x2="${x}" y2="${y}" stroke="#1d5a80" stroke-width="2.4" stroke-dasharray="3 3" opacity=".8"/>`; });
      out += `<g class="fishing" transform="translate(${x},${y})"><circle r="15" fill="#e8f6ff" stroke="#1d5a80" stroke-width="2"/>
        <path d="M-9,-4 Q-4,-9 2,-4 Q-4,1 -9,-4Z M2,-4 L6,-7 L6,-1Z" fill="#3a8fd0"/>
        <text y="11" text-anchor="middle" font-size="11" font-weight="900" fill="#1d5a80">${f.number}</text></g>`;
    });
    // flechas del oasis
    (b.oases || []).forEach(o => o.arrows.forEach(v => {
      const V = b.vertices[v], h = b.hexes[o.hex];
      const x = (V.x * 0.7 + h.x * 0.3) * S, y = (V.y * 0.7 + h.y * 0.3) * S;
      const ang = Math.atan2(V.y - h.y, V.x - h.x) * 180 / Math.PI;
      out += `<path transform="translate(${x},${y}) rotate(${ang})" d="M-7,-7 L7,0 L-7,7Z" fill="#c0281c" stroke="#fff" stroke-width="1.5"/>`;
    }));
    // camellos
    Object.keys(T.camels || {}).forEach(e => {
      const E = b.edges[e];
      out += `<g class="camel" transform="translate(${E.x * S},${E.y * S}) rotate(${E.angle}) translate(0,-6)">
        <path d="M-10,4 Q-9,-4 -4,-3 Q-2,-8 2,-3 Q6,-6 7,-2 L9,-5 L11,-4 L9,1 L8,4 M-7,4 V9 M-2,4 V9 M3,4 V9 M7,4 V9" fill="#c9954a" stroke="#6b4a1f" stroke-width="1.4" stroke-linejoin="round"/></g>`;
    });
    // ataque bárbaro: hexágonos costeros con bárbaros y caballeros en caminos
    b.hexes.forEach(h => {
      if (h.conquered) out += `<polygon points="${hexPoints(h, 0.9)}" fill="rgba(60,20,10,.45)" stroke="#5a1a10" stroke-width="3"/>`;
      if (h.barbs) {
        for (let i = 0; i < h.barbs; i++) out += `<g transform="translate(${h.x * S + (i - (h.barbs - 1) / 2) * 15},${h.y * S - 0.5 * S})"><circle r="7" fill="#3b2a1a" stroke="#000" stroke-width="1.2"/>
          <path d="M-5,-4 L-8,-10 M5,-4 L8,-10" stroke="#e9dfc4" stroke-width="2"/></g>`;
      }
    });
    Object.entries(T.knights || {}).forEach(([e, k]) => {
      const E = b.edges[e];
      out += `<g class="piece tbknight" transform="translate(${E.x * S},${E.y * S})"><path d="M0,-11 L9,-7 V0 C9,6 4,10 0,12 C-4,10 -9,6 -9,0 V-7Z" fill="${col(k.owner)}" stroke="#1b1b1b" stroke-width="1.6"/>
        <path d="M0,-6 V7 M-5,-1 H5" stroke="#f1d36b" stroke-width="2"/></g>`;
    });
    // bárbaros en caminos (escenario 5)
    (Array.isArray(T.barbs) ? T.barbs : []).forEach(e => {
      const E = b.edges[e];
      out += `<g transform="translate(${E.x * S},${E.y * S})"><circle r="9" fill="#3b2a1a" stroke="#000" stroke-width="1.4"/><path d="M-6,-5 L-10,-12 M6,-5 L10,-12" stroke="#e9dfc4" stroke-width="2.2"/>
        <circle cx="-3" cy="-1" r="1.5" fill="#f2c230"/><circle cx="3" cy="-1" r="1.5" fill="#f2c230"/></g>`;
    });
    // carretas
    const wag = {};
    view.players.forEach(p => { if (p.wagon && p.wagon.v !== null && p.wagon.v !== undefined) (wag[p.wagon.v] = wag[p.wagon.v] || []).push(p); });
    Object.entries(wag).forEach(([v, ps]) => ps.forEach((p, i) => {
      const V = b.vertices[v];
      const x = V.x * S + (i - (ps.length - 1) / 2) * 16, y = V.y * S + 14;
      out += `<g class="piece wagon" transform="translate(${x},${y})"><rect x="-10" y="-8" width="20" height="10" rx="2" fill="${col(p.id)}" stroke="#1b1b1b" stroke-width="1.4"/>
        <path d="M-9,-8 Q0,-17 9,-8" fill="#f6f1e1" stroke="#1b1b1b" stroke-width="1"/><circle cx="-6" cy="4" r="3.5" fill="#5a3a17" stroke="#1b1b1b"/><circle cx="6" cy="4" r="3.5" fill="#5a3a17" stroke="#1b1b1b"/>
        ${p.cargo ? `<text y="-9" text-anchor="middle" font-size="9" font-weight="900">${{ glass: '🔷', marble: '⬜', sand: '🟨', tools: '🔨' }[p.cargo] || ''}</text>` : ''}</g>`;
    }));
    return out;
  }

  class BoardView {
    constructor(el, opts = {}) {
      this.el = el;
      this.onClick = opts.onClick || (() => {});
      this.boardKey = null;
      const uid = this.uid = 'b' + Math.random().toString(36).slice(2, 7);
      el.innerHTML = `<svg class="board-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          ${Object.entries(BASE).map(([k, [a, b]]) => `<radialGradient id="${uid}-${k}" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`).join('')}
          <linearGradient id="${uid}-bevel" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
          <linearGradient id="${uid}-shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
          <radialGradient id="${uid}-tokface" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#ecd9ab"/></radialGradient>
          <filter id="${uid}-glow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <g class="layer-static"></g><g class="layer-pieces"></g><g class="layer-hl"></g></svg>`;
      this.svg = el.querySelector('svg');
      this.gStatic = el.querySelector('.layer-static');
      this.gPieces = el.querySelector('.layer-pieces');
      this.gHl = el.querySelector('.layer-hl');
      this.svg.addEventListener('click', ev => {
        const t = ev.target.closest('[data-kind]');
        if (t) this.onClick(t.dataset.kind, +t.dataset.id, ev);
      });
      this.prevPieces = new Set();
    }

    renderStatic(b) {
      CUR = this.uid;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      b.hexes.forEach(h => {
        minX = Math.min(minX, h.x); maxX = Math.max(maxX, h.x); minY = Math.min(minY, h.y); maxY = Math.max(maxY, h.y);
      });
      const pad = 0.95;
      this.svg.setAttribute('viewBox', `${(minX - pad) * S} ${(minY - pad * 1.1) * S} ${(maxX - minX + 2 * pad) * S} ${(maxY - minY + 2.2 * pad) * S}`);
      let out = '';
      // marco de mar (y bancos de pesca)
      b.hexes.filter(h => isWaterT(h.terrain)).forEach(h => {
        out += `<polygon points="${hexPoints(h, 1.02)}" fill="url(#${this.uid}-${h.terrain})"/>${decor(h)}`;
        if (h.frame && b.isSF) out += `<polygon points="${hexPoints(h, 1.02)}" fill="rgba(8,30,60,.28)"/>`;
      });
      // isla: sombra sobre el agua, costado de arena y playa
      const land = b.hexes.filter(h => isTileT(h.terrain)).sort((a, c) => a.y - c.y || a.x - c.x);
      land.forEach(h => { out += `<polygon points="${hexPoints(h, 1.1)}" fill="rgba(5,25,50,.35)" transform="translate(4,14)"/>`; });
      land.forEach(h => { out += prismSides(h, 1.08, 9, '#c9b27a'); });
      land.forEach(h => { out += `<polygon points="${hexPoints(h, 1.08)}" fill="#e8d9a6" stroke="#e8d9a6" stroke-width="4"/>`; });
      // casillas con grosor (las de abajo tapan el costado de las de arriba)
      land.forEach(h => {
        out += `<g class="hex">${prismSides(h, 0.95, 6, BASE[h.terrain] ? BASE[h.terrain][1] : '#888')}
          <polygon points="${hexPoints(h, 0.95)}" fill="url(#${this.uid}-${h.terrain})" stroke="rgba(255,248,225,.75)" stroke-width="1.5"/>${decor(h)}
          <polygon points="${hexPoints(h, 0.95)}" fill="url(#${this.uid}-bevel)" pointer-events="none"/></g>`;
      });
      // zona inexplorada (Piratas y Exploradores)
      b.hexes.filter(h => h.terrain === 'hidden').forEach(h => {
        out += `<g class="hex fog"><polygon points="${hexPoints(h, 1.0)}" fill="url(#${this.uid}-hidden)" stroke="#2c343c" stroke-width="1.5"/>${decor(h)}</g>`;
      });
      (b.ports || []).forEach(p => { out += portSVG(b, p); });
      this.gStatic.innerHTML = out;
    }

    render(view, hl) {
      CUR = this.uid;
      const b = view.board;
      const key = b.hexes.length + ':' + b.hexes.map(h => h.terrain + (h.number || '')).join(',') + '|' + (b.ports || []).map(p => p.edge).join(',');
      if (key !== this.boardKey) { this.boardKey = key; this.renderStatic(b); this.prevPieces = new Set(); }
      let out = '';
      b.hexes.forEach(h => { if (h.number) out += token(h); });
      const seen = new Set();
      const colorOf = o => o < 0 || !view.players[o] ? 'neutral' : view.players[o].color;
      Object.entries(view.roads).forEach(([e, r]) => {
        const k = 'e' + e + r.type;
        seen.add(k);
        const cls = this.prevPieces.size && !this.prevPieces.has(k) ? 'new' : '';
        const col = colorOf(r.owner);
        out += r.type === 'ship' ? shipSVG(b, +e, col, cls) : r.bridge ? bridgeSVG(b, +e, col, cls)
          : roadSVG(b, +e, col, cls + (r.damaged ? ' damaged' : ''), r.damaged);
      });
      Object.entries(view.buildings).forEach(([v, bd]) => {
        const k = 'v' + v + bd.type;
        seen.add(k);
        const cls = this.prevPieces.size && !this.prevPieces.has(k) ? 'new' : '';
        if (bd.wall) out += wallSVG(b.vertices[v]);
        if (bd.metro) out += metroSVG(b.vertices[v], colorOf(bd.owner), bd.metro, cls);
        else if (bd.type === 'harbor') out += harborSVG(b.vertices[v], colorOf(bd.owner), cls);
        else out += bd.type === 'city' ? citySVG(b.vertices[v], colorOf(bd.owner), cls) : settlementSVG(b.vertices[v], colorOf(bd.owner), cls);
      });
      Object.entries(view.knights || {}).forEach(([v, k]) => {
        const key = 'k' + v + k.owner + k.level;
        seen.add(key);
        const cls = this.prevPieces.size && !this.prevPieces.has(key) ? 'new' : '';
        out += knightSVG(b.vertices[v], view.players[k.owner].color, k.level, k.active, cls);
      });
      if (view.ck && view.ck.merchant) out += merchantSVG(b.hexes[view.ck.merchant.hex]);
      this.prevPieces = seen.size ? seen : new Set(['_']);
      if (view.robber !== null && view.robber !== undefined) out += robberSVG(b.hexes[view.robber]);
      if (view.pirate !== null && view.pirate !== undefined) out += pirateSVG(b.hexes[view.pirate]);
      if (view.pe) out += pePieces(view, b, hl || {});
      if (view.tb) out += tbPieces(view, b, hl || {});
      if (view.sf) out += sfPieces(view, b);
      this.gPieces.innerHTML = out;
      this.renderHL(b, hl || {});
    }

    renderHL(b, hl) {
      let out = '';
      (hl.hexes || []).forEach(id => {
        const h = b.hexes[id];
        out += `<polygon class="hl-hex" data-kind="hex" data-id="${id}" points="${hexPoints(h, 0.9)}"/>`;
      });
      (hl.edges || []).forEach(id => {
        const e = b.edges[id];
        const v0 = b.vertices[e.v[0]], v1 = b.vertices[e.v[1]];
        const x0 = (v0.x * 0.8 + v1.x * 0.2) * S, y0 = (v0.y * 0.8 + v1.y * 0.2) * S;
        const x1 = (v1.x * 0.8 + v0.x * 0.2) * S, y1 = (v1.y * 0.8 + v0.y * 0.2) * S;
        out += `<g data-kind="edge" data-id="${id}" class="hl-edge-g"><line class="hl-edge-hit" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"/>
          <line class="hl-edge ${hl.edgeClass || ''}" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"/></g>`;
      });
      (hl.vertices || []).forEach(id => {
        const v = b.vertices[id];
        out += `<g data-kind="vertex" data-id="${id}" class="hl-vertex-g"><circle class="hl-vertex-hit" cx="${v.x * S}" cy="${v.y * S}" r="15"/>
          <circle class="hl-vertex ${hl.vertexClass || ''}" cx="${v.x * S}" cy="${v.y * S}" r="${hl.vertexR || 8}"/></g>`;
      });
      (hl.vertices2 || []).forEach(id => {
        const v = b.vertices[id];
        out += `<g data-kind="vertex" data-id="${id}" class="hl-vertex-g"><circle class="hl-vertex-hit" cx="${v.x * S}" cy="${v.y * S}" r="16"/>
          <circle class="hl-vertex attack" cx="${v.x * S}" cy="${v.y * S}" r="15"/></g>`;
      });
      (hl.selectedVertices || []).forEach(id => {
        const v = b.vertices[id];
        out += `<circle cx="${v.x * S}" cy="${v.y * S}" r="17" fill="none" stroke="#ffe066" stroke-width="3" class="pulse"/>`;
      });
      (hl.selectedHexes || []).forEach(id => {
        out += `<polygon points="${hexPoints(b.hexes[id], 0.9)}" fill="rgba(255,224,102,.35)" stroke="#ffe066" stroke-width="4"/>`;
      });
      (hl.selected || []).forEach(id => {
        const e = b.edges[id];
        out += `<circle cx="${e.x * S}" cy="${e.y * S}" r="14" fill="none" stroke="#ffe066" stroke-width="3" class="pulse"/>`;
      });
      this.gHl.innerHTML = out;
    }
  }

  // Tablero decorativo para el fondo del menú
  function decorativeBoard(el, mode) {
    const bv = new BoardView(el);
    const b = C.generateBoard(mode || 'classic');
    bv.render({ board: b, roads: {}, buildings: {}, robber: b.robber, pirate: b.pirate, players: [] });
    return bv;
  }

  C.BoardView = BoardView;
  C.decorativeBoard = decorativeBoard;
})(window);
