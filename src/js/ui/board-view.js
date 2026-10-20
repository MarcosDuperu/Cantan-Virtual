// Dibujo del tablero en SVG con terrenos ilustrados, fichas, puertos y piezas.
(function (root) {
  const C = root.Catan;
  const S = 50; // radio del hexágono en unidades SVG

  function rng(seed) {
    let x = (seed * 9301 + 49297) % 233280;
    return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  }

  const BASE = {
    forest: ['#4f9a45', '#2d6a2b'], hills: ['#d8814f', '#a9502a'], pasture: ['#a6d66a', '#77ae43'],
    fields: ['#f3d562', '#d9ab2f'], mountains: ['#a3a9b1', '#6f767f'], desert: ['#f0dfa8', '#d4bd7c'],
    gold: ['#f7d65a', '#c99317'], sea: ['#3a8fd0', '#2a6fae']
  };

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
      case 'sea':
        for (let i = 0; i < 3; i++) {
          const x = cx + (r() - 0.5) * S, y = cy + (r() - 0.5) * S;
          out += `<path d="M${x - 7},${y} q3.5,-3 7,0 t7,0" stroke="#7fc0ec" stroke-width="1.3" fill="none" opacity=".7"/>`;
        }
        break;
    }
    return out;
  }

  function hexPoints(h, scale = 1) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 30);
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
    return `<g class="token"><circle cx="${cx + 1}" cy="${cy + 2}" r="${0.33 * S}" fill="rgba(0,0,0,.25)"/>
      <circle cx="${cx}" cy="${cy}" r="${0.33 * S}" fill="#f6e8c6" stroke="#8a6d3b" stroke-width="1.5"/>
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

  function settlementSVG(v, color, cls = '') {
    const x = v.x * S, y = v.y * S;
    return `<g class="piece ${cls}" transform="translate(${x},${y}) scale(1.3)"><path d="${C.UIIcons.PIECE.settlement}" transform="translate(1.5,2)" fill="rgba(0,0,0,.35)"/>
      <path d="${C.UIIcons.PIECE.settlement}" fill="${C.colorHex(color)}" stroke="#1b1b1b" stroke-width="1.8" stroke-linejoin="round"/></g>`;
  }
  function citySVG(v, color, cls = '') {
    const x = v.x * S, y = v.y * S;
    return `<g class="piece ${cls}" transform="translate(${x},${y}) scale(1.25)"><path d="${C.UIIcons.PIECE.city}" transform="translate(1.5,2)" fill="rgba(0,0,0,.35)"/>
      <path d="${C.UIIcons.PIECE.city}" fill="${C.colorHex(color)}" stroke="#1b1b1b" stroke-width="1.8" stroke-linejoin="round"/>
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
    return `<g class="piece ${cls}" transform="translate(${x},${y}) scale(1.3)">
      <path d="M-15,9 L-15,-2 L-8,-8 L-1,-2 L-1,-9 L-5,-9 L-5,-14 L5,-14 L5,-9 L1,-9 L1,-2 L15,-2 L15,9Z" transform="translate(1.5,2)" fill="rgba(0,0,0,.35)"/>
      <path d="M-15,9 L-15,-2 L-8,-8 L-1,-2 L-1,-9 L-5,-9 L-5,-14 L5,-14 L5,-9 L1,-9 L1,-2 L15,-2 L15,9Z" fill="${C.colorHex(color)}" stroke="#1b1b1b" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M-5,-14 L0,-21 L5,-14Z" fill="${ac}" stroke="#1b1b1b" stroke-width="1.2"/><circle cx="0" cy="-23" r="2" fill="${ac}" stroke="#1b1b1b" stroke-width=".8"/>
      <rect x="6" y="1" width="3" height="4" fill="#1b1b1b" opacity=".5"/><rect x="-11" y="1" width="3" height="4" fill="#1b1b1b" opacity=".5"/></g>`;
  }
  // Caballero: escudo con casco; los aros indican la fuerza (1-3); inactivo = gris
  function knightSVG(v, color, level, active, cls = '') {
    const x = v.x * S, y = v.y * S;
    const col = C.colorHex(color);
    const rings = [0, 1, 2].slice(0, level).map(i => `<circle cx="0" cy="0" r="${11.5 + i * 2.6}" fill="none" stroke="${active ? '#f2c230' : '#9a9a9a'}" stroke-width="1.6"/>`).join('');
    return `<g class="piece knight ${active ? 'active' : 'inactive'} ${cls}" transform="translate(${x},${y})">
      <circle cx="1.5" cy="2" r="${11 + level * 2.6}" fill="rgba(0,0,0,.35)"/>
      <circle cx="0" cy="0" r="11" fill="${active ? col : '#d8d4cc'}" stroke="#1b1b1b" stroke-width="1.6"/>${rings}
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
  function roadSVG(b, e, color, cls = '') {
    const E = b.edges[e];
    return `<g class="piece ${cls}" transform="translate(${E.x * S},${E.y * S}) rotate(${E.angle})">
      <rect x="${-0.36 * S}" y="-4" width="${0.72 * S}" height="8" rx="2.5" fill="rgba(0,0,0,.35)" transform="translate(1,1.5)"/>
      <rect x="${-0.36 * S}" y="-4" width="${0.72 * S}" height="8" rx="2.5" fill="${C.colorHex(color)}" stroke="#1b1b1b" stroke-width="1.6"/></g>`;
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

  class BoardView {
    constructor(el, opts = {}) {
      this.el = el;
      this.onClick = opts.onClick || (() => {});
      this.boardKey = null;
      const uid = this.uid = 'b' + Math.random().toString(36).slice(2, 7);
      el.innerHTML = `<svg class="board-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          ${Object.entries(BASE).map(([k, [a, b]]) => `<radialGradient id="${uid}-${k}" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`).join('')}
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
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      b.hexes.forEach(h => {
        minX = Math.min(minX, h.x); maxX = Math.max(maxX, h.x); minY = Math.min(minY, h.y); maxY = Math.max(maxY, h.y);
      });
      const pad = 0.95;
      this.svg.setAttribute('viewBox', `${(minX - pad) * S} ${(minY - pad * 1.1) * S} ${(maxX - minX + 2 * pad) * S} ${(maxY - minY + 2.2 * pad) * S}`);
      let out = '';
      // marco de mar
      b.hexes.filter(h => h.terrain === 'sea').forEach(h => {
        out += `<polygon points="${hexPoints(h, 1.02)}" fill="url(#${this.uid}-sea)"/>${decor(h)}`;
      });
      // sombra de la isla
      b.hexes.filter(h => C.isLand(h.terrain)).forEach(h => {
        out += `<polygon points="${hexPoints(h, 1.08)}" fill="#e8d9a6" stroke="#e8d9a6" stroke-width="4"/>`;
      });
      b.hexes.filter(h => C.isLand(h.terrain)).forEach(h => {
        out += `<g class="hex"><polygon points="${hexPoints(h, 0.97)}" fill="url(#${this.uid}-${h.terrain})" stroke="#f1e6c2" stroke-width="2.5"/>${decor(h)}</g>`;
      });
      (b.ports || []).forEach(p => { out += portSVG(b, p); });
      this.gStatic.innerHTML = out;
    }

    render(view, hl) {
      const b = view.board;
      const key = b.hexes.length + ':' + b.hexes.map(h => h.terrain[0] + (h.number || '')).join('');
      if (key !== this.boardKey) { this.boardKey = key; this.renderStatic(b); this.prevPieces = new Set(); }
      let out = '';
      b.hexes.forEach(h => { if (h.number) out += token(h); });
      const seen = new Set();
      Object.entries(view.roads).forEach(([e, r]) => {
        const k = 'e' + e + r.type;
        seen.add(k);
        const cls = this.prevPieces.size && !this.prevPieces.has(k) ? 'new' : '';
        out += r.type === 'ship' ? shipSVG(b, +e, view.players[r.owner].color, cls) : roadSVG(b, +e, view.players[r.owner].color, cls);
      });
      Object.entries(view.buildings).forEach(([v, bd]) => {
        const k = 'v' + v + bd.type;
        seen.add(k);
        const cls = this.prevPieces.size && !this.prevPieces.has(k) ? 'new' : '';
        if (bd.wall) out += wallSVG(b.vertices[v]);
        if (bd.metro) out += metroSVG(b.vertices[v], view.players[bd.owner].color, bd.metro, cls);
        else out += bd.type === 'city' ? citySVG(b.vertices[v], view.players[bd.owner].color, cls) : settlementSVG(b.vertices[v], view.players[bd.owner].color, cls);
      });
      Object.entries(view.knights || {}).forEach(([v, k]) => {
        const key = 'k' + v + k.owner + k.level;
        seen.add(key);
        const cls = this.prevPieces.size && !this.prevPieces.has(key) ? 'new' : '';
        out += knightSVG(b.vertices[v], view.players[k.owner].color, k.level, k.active, cls);
      });
      if (view.ck && view.ck.merchant) out += merchantSVG(b.hexes[view.ck.merchant.hex]);
      this.prevPieces = seen.size ? seen : new Set(['_']);
      out += robberSVG(b.hexes[view.robber]);
      if (view.pirate !== null && view.pirate !== undefined) out += pirateSVG(b.hexes[view.pirate]);
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
