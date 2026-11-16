// Ilustraciones SVG de recursos, cartas y piezas.
(function (root) {
  const C = root.Catan;

  const RES_COLOR = { wood: '#2f7d32', brick: '#c0562b', sheep: '#8cc152', wheat: '#e9b92d', ore: '#7d8590', gold: '#e0a91b',
    paper: '#2f9a4a', cloth: '#e0a91b', coin: '#2f6fd6' };

  const ICON = {
    wood: `<rect x="18" y="28" width="4" height="8" fill="#6b4423"/>
      <polygon points="20,4 30,18 10,18" fill="#1f5e22"/><polygon points="20,10 32,26 8,26" fill="#2e7d32"/>
      <polygon points="20,16 34,31 6,31" fill="#3d9a40"/>`,
    brick: `<g stroke="#7a2f12" stroke-width="1.2"><rect x="4" y="24" width="15" height="8" fill="#d0643a"/><rect x="21" y="24" width="15" height="8" fill="#c0562b"/>
      <rect x="12" y="15" width="15" height="8" fill="#d97048"/><rect x="4" y="6" width="9" height="8" fill="#c0562b"/><rect x="15" y="6" width="15" height="8" fill="#d0643a"/></g>`,
    sheep: `<g fill="#fff" stroke="#bbb" stroke-width=".8"><circle cx="15" cy="20" r="6"/><circle cx="22" cy="17" r="6"/><circle cx="27" cy="22" r="5.5"/><circle cx="19" cy="25" r="6"/><circle cx="12" cy="25" r="4.5"/></g>
      <ellipse cx="31" cy="19" rx="4" ry="3.2" fill="#333"/><rect x="13" y="29" width="2.4" height="6" fill="#333"/><rect x="24" y="29" width="2.4" height="6" fill="#333"/>`,
    wheat: `<g stroke="#9a6b12" stroke-width="1.6" fill="none"><path d="M20,37 L20,6"/><path d="M14,37 Q16,20 12,9"/><path d="M26,37 Q24,20 28,9"/></g>
      <g fill="#e9b92d" stroke="#a87512" stroke-width=".6">${[8, 13, 18, 23].map(y => `<ellipse cx="17.5" cy="${y}" rx="2.4" ry="3.6" transform="rotate(-25 17.5 ${y})"/><ellipse cx="22.5" cy="${y}" rx="2.4" ry="3.6" transform="rotate(25 22.5 ${y})"/>`).join('')}
      <ellipse cx="11.5" cy="11" rx="2" ry="3.2"/><ellipse cx="28.5" cy="11" rx="2" ry="3.2"/></g>`,
    ore: `<polygon points="4,32 12,14 20,22 27,9 37,32" fill="#6c737c" stroke="#3e434a" stroke-width="1.2"/>
      <polygon points="12,14 15,20 10,21" fill="#c9ced4"/><polygon points="27,9 31,17 24,15" fill="#e8ecef"/>
      <polygon points="14,32 19,26 25,32" fill="#8b929b"/>`,
    paper: `<path d="M8,8 H30 Q34,8 34,12 V32 H12 Q8,32 8,28Z" fill="#f6ecd0" stroke="#7a6a52" stroke-width="1.4"/>
      <path d="M8,28 Q8,24 12,24 Q16,24 16,28 Q16,32 12,32" fill="#e6d8b0" stroke="#7a6a52" stroke-width="1.2"/>
      <g stroke="#9a8a6a" stroke-width="1.2"><path d="M14,13 H29"/><path d="M14,17 H29"/><path d="M18,21 H29"/></g>
      <path d="M26,30 L33,4 L35,5 L28,31Z" fill="#2f9a4a" stroke="#1d5a2c" stroke-width=".8"/>`,
    cloth: `<path d="M6,14 Q20,8 34,14 L34,30 Q20,24 6,30Z" fill="#c0281c" stroke="#6b1510" stroke-width="1.2"/>
      <ellipse cx="6" cy="22" rx="4" ry="8" fill="#e04a3a" stroke="#6b1510" stroke-width="1.2"/><ellipse cx="6" cy="22" rx="1.5" ry="3" fill="#6b1510"/>
      <g stroke="#f2c230" stroke-width="1.4" fill="none"><path d="M12,13 Q22,9 32,14"/><path d="M12,27 Q22,23 32,28"/></g>
      <path d="M20,11 Q28,10 34,14 L34,18 Q26,14 20,16Z" fill="#f2c230" opacity=".6"/>`,
    coin: `<g stroke="#8a5d00" stroke-width="1.2"><ellipse cx="16" cy="30" rx="11" ry="4" fill="#d9a520"/><rect x="5" y="22" width="22" height="8" fill="#e9b92d"/>
      <ellipse cx="16" cy="22" rx="11" ry="4" fill="#f4c430"/><ellipse cx="26" cy="16" rx="9" ry="9" fill="#f4c430"/></g>
      <text x="26" y="20" text-anchor="middle" font-size="11" font-weight="900" fill="#8a5d00" font-family="Georgia,serif">C</text>`,
    gold: `<circle cx="20" cy="20" r="13" fill="#f4c430" stroke="#a87512" stroke-width="2"/><text x="20" y="26" font-size="16" text-anchor="middle" font-weight="bold" fill="#8a5d00">★</text>`,
    knight: `<path d="M20,4 L33,9 V19 C33,28 26,34 20,37 C14,34 7,28 7,19 V9 Z" fill="#5b6fb5" stroke="#26315e" stroke-width="1.6"/>
      <path d="M20,9 V31 M12,18 H28" stroke="#f1d36b" stroke-width="3"/>`,
    vp: `<path d="M6,30 L8,12 L15,20 L20,8 L25,20 L32,12 L34,30 Z" fill="#f4c430" stroke="#8a5d00" stroke-width="1.5"/>
      <rect x="6" y="30" width="28" height="4" fill="#d9a520" stroke="#8a5d00"/><circle cx="20" cy="22" r="2.5" fill="#c0281c"/>`,
    roadBuilding: `<rect x="3" y="22" width="20" height="6" rx="1.5" transform="rotate(-25 13 25)" fill="#b07a3f" stroke="#5a3a17"/>
      <rect x="17" y="14" width="20" height="6" rx="1.5" transform="rotate(25 27 17)" fill="#b07a3f" stroke="#5a3a17"/>
      <circle cx="20" cy="20" r="3" fill="#f1d36b"/>`,
    yearOfPlenty: `<path d="M8,30 C8,14 22,6 34,8 C28,12 26,18 28,26 C22,30 14,32 8,30 Z" fill="#c98b3b" stroke="#6b4423" stroke-width="1.4"/>
      <circle cx="13" cy="26" r="3.5" fill="#d63a2f"/><circle cx="19" cy="25" r="3.5" fill="#e9b92d"/><circle cx="16" cy="20" r="3" fill="#3d9a40"/>`,
    monopoly: `<path d="M12,14 C8,18 6,24 8,30 C10,35 30,35 32,30 C34,24 32,18 28,14 Z" fill="#a8743a" stroke="#5a3a17" stroke-width="1.5"/>
      <path d="M13,14 L16,7 H24 L27,14 Z" fill="#8a5c2a" stroke="#5a3a17"/><text x="20" y="29" text-anchor="middle" font-size="12" font-weight="bold" fill="#f4e3b0">M</text>`,
    // Piratas y Exploradores
    settler: `<path d="M8,36 Q8,19 20,19 Q32,19 32,36Z" fill="#c98b3b" stroke="#5a3a17" stroke-width="1.5"/>
      <circle cx="20" cy="11" r="6.5" fill="#f4dcb0" stroke="#5a3a17" stroke-width="1.5"/><path d="M12,8 Q20,0 28,8 L30,9 H10Z" fill="#7a4a24" stroke="#3a2510"/>
      <path d="M26,24 L34,16 L36,18 L28,26Z" fill="#8a5c2a" stroke="#3a2510" stroke-width=".8"/>`,
    crew: `<path d="M8,36 Q8,19 20,19 Q32,19 32,36Z" fill="#2b4a7a" stroke="#14233d" stroke-width="1.5"/>
      <path d="M11,25 H29 M10,30 H30" stroke="#f6f1e1" stroke-width="2.2"/>
      <circle cx="20" cy="11" r="6.5" fill="#f0c8a0" stroke="#3a2510" stroke-width="1.5"/><path d="M12,7 H28 L26,10 H14Z" fill="#f6f1e1" stroke="#333"/>`,
    fish: `<path d="M4,20 Q15,7 28,20 Q15,33 4,20Z" fill="#4aa3e0" stroke="#1d5a80" stroke-width="1.6"/>
      <path d="M27,20 L37,11 L37,29Z" fill="#3a8fd0" stroke="#1d5a80" stroke-width="1.6"/><circle cx="11" cy="18" r="2" fill="#1b1b1b"/>
      <path d="M17,13 Q20,20 17,27" stroke="#1d5a80" stroke-width="1.2" fill="none"/>`,
    spice: `<path d="M12,13 H28 L30,17 Q35,24 30,33 Q20,39 10,33 Q5,24 10,17Z" fill="#c0562b" stroke="#6b2a10" stroke-width="1.5"/>
      <rect x="14" y="6" width="12" height="7" rx="1.5" fill="#8a5c2a" stroke="#5a3a17"/><path d="M9,23 Q20,27 31,23" stroke="#f2c230" stroke-width="2.2" fill="none"/>`,
    pirate: `<path d="M7,8 H33 V27 Q20,33 7,27Z" fill="#1b1b1b" stroke="#000"/><circle cx="20" cy="15" r="6" fill="#f6f1e1"/>
      <circle cx="17.6" cy="14.5" r="1.6" fill="#1b1b1b"/><circle cx="22.4" cy="14.5" r="1.6" fill="#1b1b1b"/>
      <path d="M11,23 L29,29 M29,23 L11,29" stroke="#f6f1e1" stroke-width="2.4"/>`,
    council: `<path d="M5,14 L20,5 L35,14Z" fill="#e9dfc4" stroke="#5a4a2a" stroke-width="1.5"/><rect x="6" y="14" width="28" height="3" fill="#d8ccaa" stroke="#5a4a2a"/>
      <g fill="#f6f1e1" stroke="#5a4a2a">${[9, 16, 23, 30].map(x => `<rect x="${x - 1.5}" y="17" width="3" height="13"/>`).join('')}</g>
      <rect x="4" y="30" width="32" height="5" fill="#d8ccaa" stroke="#5a4a2a"/>`
  };

  function icon(name, size = 28, extra = '') {
    return `<svg class="ic ${extra}" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">${ICON[name] || ''}</svg>`;
  }

  // Formas de piezas (coordenadas locales, escala 1 ≈ 50px de hexágono)
  const PIECE = {
    settlement: 'M-9,6 L-9,-3 L0,-11 L9,-3 L9,6 Z',
    city: 'M-14,8 L-14,-3 L-7,-9 L0,-3 L0,-6 L7,-13 L14,-6 L14,8 Z',
    ship: 'M-12,2 L12,2 L8,8 L-8,8 Z'
  };

  function pieceSVG(kind, color, size = 24) {
    const fill = C.colorHex(color);
    let inner = '';
    if (kind === 'road') inner = `<rect x="-14" y="-3.5" width="28" height="7" rx="2" fill="${fill}" stroke="#222" stroke-width="1.5" transform="rotate(-30)"/>`;
    else if (kind === 'ship') inner = `<path d="${PIECE.ship}" fill="${fill}" stroke="#222" stroke-width="1.5"/><path d="M0,-12 L0,2" stroke="#222" stroke-width="1.5"/><path d="M1,-11 L10,0 L1,0 Z" fill="#f6f1e1" stroke="#222"/>`;
    else inner = `<path d="${PIECE[kind]}" fill="${fill}" stroke="#222" stroke-width="1.6" stroke-linejoin="round"/>`;
    return `<svg class="ic" width="${size}" height="${size}" viewBox="-16 -16 32 32">${inner}</svg>`;
  }

  C.UIIcons = { icon, RES_COLOR, PIECE, pieceSVG };
})(window);
