// Ilustraciones completas de cartas: desarrollo (caballero, progreso, puntos) y especiales.
(function (root) {
  const C = root.Catan;
  let uid = 0;

  const FRAME = {
    knight: { fill: '#5b3a8c', edge: '#2e1a4d', label: 'Caballero' },
    progress: { fill: '#2f7d3a', edge: '#173f1c', label: 'Progreso' },
    vp: { fill: '#c98515', edge: '#6b420a', label: 'Punto de victoria' },
    special: { fill: '#9c1f1f', edge: '#4d0d0d', label: 'Carta especial' },
    trade: { fill: '#d4a514', edge: '#6b5208', label: 'Comercio' },
    politics: { fill: '#2f5fae', edge: '#152c55', label: 'Política' },
    science: { fill: '#2f8a3a', edge: '#164a1c', label: 'Ciencia' }
  };

  const VP_VARIANTS = {
    university: 'Universidad', market: 'Mercado', library: 'Biblioteca', chapel: 'Capilla', hall: 'Gran Salón'
  };

  const hills = (a = '#7cb655', b = '#5a9a3c') => `<path d="M0,74 Q22,60 46,70 T100,64 V110 H0Z" fill="${a}"/><path d="M0,88 Q40,76 100,86 V110 H0Z" fill="${b}"/>`;
  const cloud = (x, y, k = 1) => `<g transform="translate(${x},${y}) scale(${k})" fill="#fff" opacity=".9"><ellipse cx="0" cy="0" rx="8" ry="4"/><ellipse cx="6" cy="-2" rx="6" ry="4"/><ellipse cx="-6" cy="1" rx="5" ry="3"/></g>`;
  const sun = `<circle cx="80" cy="20" r="7" fill="#ffe27a"/><circle cx="80" cy="20" r="11" fill="#ffe27a" opacity=".3"/>`;

  const SCENES = {
    knight: () => `${sun}${cloud(24, 18)}${hills()}
      <g fill="#9aa1aa" stroke="#555" stroke-width=".6"><rect x="74" y="50" width="16" height="20"/><rect x="72" y="46" width="5" height="8"/><rect x="87" y="46" width="5" height="8"/><rect x="79" y="58" width="5" height="12" fill="#5a4a35"/></g>
      <line x1="72" y1="14" x2="72" y2="100" stroke="#7a5230" stroke-width="2.6"/><polygon points="72,6 75.5,17 68.5,17" fill="#dfe3e8" stroke="#666" stroke-width=".6"/>
      <path d="M72,19 L88,23 L72,28Z" fill="#c0281c"/>
      <rect x="42" y="80" width="6.5" height="18" fill="#8a9099" stroke="#555" stroke-width=".5"/><rect x="52" y="80" width="6.5" height="18" fill="#8a9099" stroke="#555" stroke-width=".5"/>
      <rect x="40" y="96" width="9" height="5" rx="1.5" fill="#3a2a1a"/><rect x="51" y="96" width="9" height="5" rx="1.5" fill="#3a2a1a"/>
      <path d="M37,50 Q50,43 63,50 L61,82 H39Z" fill="#b3bac3" stroke="#555" stroke-width=".8"/>
      <path d="M42,53 H58 L57,82 H43Z" fill="#5b3a8c"/><path d="M50,56 V79 M44,64 H56" stroke="#f2c230" stroke-width="2.4"/>
      <rect x="59" y="56" width="14" height="6" rx="3" fill="#b3bac3" stroke="#555" stroke-width=".6"/>
      <path d="M41,33 Q50,21 59,33 V47 H41Z" fill="#c9cfd6" stroke="#555" stroke-width=".8"/><rect x="43.5" y="37" width="13" height="2.6" fill="#222"/>
      <path d="M50,24 Q58,10 68,16 Q59,18 54,28Z" fill="#c0281c"/>
      <path d="M24,54 H46 V69 Q46,82 35,88 Q24,82 24,69Z" fill="#2f6fd6" stroke="#1b2b4a" stroke-width="1.4"/>
      <path d="M35,57 V84 M27,67 H43" stroke="#f2c230" stroke-width="3"/>`,

    roadBuilding: () => `${sun}${cloud(30, 16)}${hills('#8cc45e', '#6aa844')}
      <g fill="#c25a35" stroke="#6b2a12" stroke-width=".5"><rect x="44" y="56" width="7" height="6"/><polygon points="43,56 47.5,51 52,56"/><rect x="56" y="57" width="6" height="5"/><polygon points="55,57 59,53 63,57"/></g>
      <path d="M46,64 L55,64 L84,110 L14,110Z" fill="#c49a62"/>
      <g stroke="#8a6232" stroke-width="1"><path d="M44,72 H58"/><path d="M40,80 H62"/><path d="M34,90 H67"/><path d="M27,101 H74"/></g>
      <g fill="#a9432a" stroke="#5a1f10" stroke-width=".6"><rect x="8" y="88" width="9" height="5"/><rect x="17" y="88" width="9" height="5"/><rect x="12" y="83" width="9" height="5"/></g>
      <g fill="#7a4a24" stroke="#3d2712" stroke-width=".6"><rect x="8" y="96" width="18" height="4" rx="2"/><rect x="10" y="100" width="18" height="4" rx="2"/></g>
      <circle cx="78" cy="66" r="4.5" fill="#f0c8a0" stroke="#7a5a3a" stroke-width=".6"/><path d="M74,62 Q78,57 82,62Z" fill="#c0281c"/>
      <path d="M73,71 H83 L84,88 H72Z" fill="#3f6db5"/><rect x="73" y="88" width="4" height="10" fill="#5a3a1e"/><rect x="79" y="88" width="4" height="10" fill="#5a3a1e"/>
      <path d="M83,73 L92,64" stroke="#7a5230" stroke-width="2"/><rect x="88" y="59" width="8" height="5" rx="1" fill="#7d8590" transform="rotate(-45 92 61)"/>`,

    yearOfPlenty: () => `<rect width="100" height="110" fill="#f4e2b8"/>
      <g fill="#ffe27a">${[[18, 18], [50, 12], [82, 22], [30, 34], [70, 36]].map(([x, y]) => `<path d="M${x},${y - 5} L${x + 1.5},${y - 1.5} L${x + 5},${y} L${x + 1.5},${y + 1.5} L${x},${y + 5} L${x - 1.5},${y + 1.5} L${x - 5},${y} L${x - 1.5},${y - 1.5}Z"/>`).join('')}</g>
      <rect x="0" y="92" width="100" height="18" fill="#8b5e34"/><rect x="0" y="90" width="100" height="4" fill="#a8743a"/>
      <path d="M14,52 Q14,90 56,90 Q80,90 88,70 Q72,78 54,74 Q30,70 26,44Z" fill="#c98b3b" stroke="#6b4423" stroke-width="1.4"/>
      <path d="M22,50 Q24,74 54,78" stroke="#a06a2a" stroke-width="1.2" fill="none"/><path d="M18,60 Q24,84 56,86" stroke="#a06a2a" stroke-width="1.2" fill="none"/>
      <g stroke="#9a6b12" stroke-width="1.2"><path d="M70,74 L84,48"/><path d="M74,76 L92,56"/></g>
      <g fill="#e9b92d"><ellipse cx="84" cy="46" rx="2.4" ry="4" transform="rotate(30 84 46)"/><ellipse cx="92" cy="54" rx="2.4" ry="4" transform="rotate(45 92 54)"/></g>
      <circle cx="66" cy="76" r="6" fill="#d63a2f" stroke="#8a1f15" stroke-width=".8"/><circle cx="77" cy="80" r="5.5" fill="#e9b92d" stroke="#9a6b12" stroke-width=".8"/>
      <circle cx="72" cy="70" r="5" fill="#5aa04f" stroke="#2a6b2a" stroke-width=".8"/><ellipse cx="86" cy="84" rx="7" ry="3" fill="#7a4a24"/>
      <polygon points="58,82 64,78 68,86" fill="#8b929b" stroke="#444" stroke-width=".6"/>`,

    monopoly: () => `<rect width="100" height="110" fill="#e8d4a8"/><rect x="0" y="0" width="100" height="60" fill="#c9a874"/>
      <g fill="#8b5e34"><rect x="8" y="10" width="26" height="40"/><rect x="66" y="10" width="26" height="40"/></g>
      <g fill="#c98b3b">${[14, 22, 30, 38].map(y => `<rect x="10" y="${y}" width="22" height="5"/><rect x="68" y="${y}" width="22" height="5"/>`).join('')}</g>
      <path d="M34,104 Q34,60 50,58 Q66,60 66,104Z" fill="#8a1f2f" stroke="#4d0d18" stroke-width="1"/>
      <path d="M44,60 L50,74 L56,60" fill="#f2c230"/>
      <circle cx="50" cy="48" r="10" fill="#f0c8a0" stroke="#7a5a3a" stroke-width=".8"/>
      <path d="M38,44 Q50,28 62,44 Q50,38 38,44Z" fill="#3a2a5a"/><rect x="38" y="42" width="24" height="4" rx="2" fill="#3a2a5a"/>
      <path d="M45,54 Q50,58 55,54" stroke="#7a3a2a" stroke-width="1.2" fill="none"/>
      <rect x="0" y="88" width="100" height="22" fill="#6b4423"/><rect x="0" y="86" width="100" height="4" fill="#8b5e34"/>
      <path d="M62,70 Q56,76 58,86 Q62,92 76,92 Q88,92 88,84 Q90,74 82,70Z" fill="#b88a4a" stroke="#5a3a17" stroke-width="1.2"/>
      <path d="M64,70 L68,62 H78 L80,70Z" fill="#9a6b32" stroke="#5a3a17"/><text x="73" y="86" text-anchor="middle" font-size="12" font-weight="900" fill="#f6e3a8" font-family="Georgia,serif">M</text>
      ${[[18, 86], [26, 86], [22, 81]].map(([x, y]) => `<g><ellipse cx="${x}" cy="${y}" rx="5" ry="2" fill="#d9a520" stroke="#8a5d00" stroke-width=".6"/><ellipse cx="${x}" cy="${y - 2}" rx="5" ry="2" fill="#f4c430" stroke="#8a5d00" stroke-width=".6"/></g>`).join('')}`,

    university: () => `${sun}${cloud(22, 20)}${hills('#8cc45e', '#6aa844')}
      <rect x="20" y="58" width="60" height="38" fill="#ede3cc" stroke="#7a6a52" stroke-width="1"/>
      <path d="M34,58 A16,16 0 0 1 66,58Z" fill="#4fa38f" stroke="#2a6b5a" stroke-width="1"/><rect x="48" y="34" width="4" height="10" fill="#4fa38f"/>
      <path d="M50,24 L50,36" stroke="#5a4a35" stroke-width="1"/><path d="M50,24 L60,27 L50,30Z" fill="#c0281c"/>
      <polygon points="16,60 50,48 84,60" fill="#d9ccb0" stroke="#7a6a52" stroke-width="1" opacity=".0"/>
      <g fill="#fbf6ea" stroke="#9a8a6a" stroke-width=".6">${[24, 34, 44, 54, 64, 74].map(x => `<rect x="${x}" y="64" width="3.5" height="26"/>`).join('')}</g>
      <rect x="44" y="76" width="12" height="20" rx="6" fill="#6b4423"/><rect x="16" y="94" width="68" height="5" fill="#cbbd9e" stroke="#7a6a52" stroke-width=".6"/>
      <g fill="#3a2a1a"><rect x="30" y="100" width="6" height="3"/><circle cx="33" cy="98" r="2"/></g>`,

    market: () => `${sun}${cloud(30, 16)}<rect x="0" y="70" width="100" height="40" fill="#d8c08a"/>
      ${[[6, '#c0281c'], [36, '#2f6fd6'], [66, '#2f7d3a']].map(([x, col]) => `<g>
        <rect x="${x + 2}" y="54" width="2.5" height="36" fill="#6b4423"/><rect x="${x + 23.5}" y="54" width="2.5" height="36" fill="#6b4423"/>
        <path d="M${x},54 L${x + 28},54 L${x + 26},44 L${x + 2},44Z" fill="${col}"/>
        ${[0, 1, 2].map(i => `<rect x="${x + 4 + i * 8}" y="44" width="4" height="10" fill="#fff" opacity=".85"/>`).join('')}
        <rect x="${x + 2}" y="76" width="24" height="10" fill="#a8743a" stroke="#5a3a17" stroke-width=".6"/></g>`).join('')}
      <circle cx="12" cy="74" r="3" fill="#d63a2f"/><circle cx="18" cy="74" r="3" fill="#e9b92d"/><circle cx="24" cy="74" r="3" fill="#d63a2f"/>
      <g fill="#fbfbf6"><circle cx="42" cy="74" r="3"/><circle cx="48" cy="73" r="3"/><circle cx="54" cy="74" r="3"/></g>
      <g fill="#7d8590"><polygon points="70,77 74,70 78,77"/><polygon points="77,77 81,71 86,77"/></g>
      <circle cx="50" cy="92" r="4" fill="#f0c8a0"/><path d="M45,108 Q45,96 50,96 Q55,96 55,108Z" fill="#8a4a24"/>`,

    library: () => `<rect width="100" height="110" fill="#5a3a20"/>
      ${[16, 40, 64, 88].map((y, r) => `<rect x="6" y="${y}" width="88" height="3" fill="#3d2712"/>` +
        Array.from({ length: 11 }, (_, i) => `<rect x="${8 + i * 8}" y="${y - 18 + (i * 7 % 5)}" width="6.5" height="${18 - (i * 7 % 5)}" fill="${['#c0281c', '#2f6fd6', '#2f7d3a', '#c98515', '#5b3a8c', '#7a4a24'][(i + r * 2) % 6]}" stroke="#2b1d0e" stroke-width=".4"/>`).join('')).join('')}
      <rect x="28" y="86" width="44" height="22" fill="#8b5e34" stroke="#3d2712"/><path d="M36,86 Q50,78 64,86" fill="#f6ecd0" stroke="#7a6a52" stroke-width=".8"/>
      <path d="M50,80 V86" stroke="#7a6a52" stroke-width=".8"/><circle cx="74" cy="80" r="3" fill="#ffe27a"/><rect x="72.5" y="83" width="3" height="5" fill="#f6ecd0"/>`,

    chapel: () => `${sun}${cloud(20, 22)}${hills('#8cc45e', '#6aa844')}
      <rect x="24" y="60" width="38" height="34" fill="#efe6d2" stroke="#7a6a52" stroke-width="1"/>
      <polygon points="20,62 43,44 66,62" fill="#a9432a" stroke="#5a1f10" stroke-width="1"/>
      <rect x="60" y="38" width="16" height="56" fill="#e6dcc4" stroke="#7a6a52" stroke-width="1"/>
      <polygon points="58,40 68,14 78,40" fill="#a9432a" stroke="#5a1f10" stroke-width="1"/>
      <rect x="64" y="46" width="8" height="10" rx="4" fill="#3a2a1a"/><path d="M66,56 Q68,52 70,56Z" fill="#d9a520"/>
      <circle cx="43" cy="69" r="5" fill="#6aa0d6" stroke="#7a6a52" stroke-width=".8"/>
      <rect x="37" y="78" width="12" height="16" rx="6" fill="#6b4423"/>`,

    hall: () => `${sun}${cloud(26, 18)}${hills('#8cc45e', '#6aa844')}
      <polygon points="12,52 50,32 88,52" fill="#d9ccb0" stroke="#7a6a52" stroke-width="1"/>
      <rect x="14" y="52" width="72" height="6" fill="#cbbd9e" stroke="#7a6a52" stroke-width=".8"/>
      <g fill="#fbf6ea" stroke="#9a8a6a" stroke-width=".6">${[18, 30, 42, 54, 66, 78].map(x => `<rect x="${x}" y="58" width="5" height="30"/>`).join('')}</g>
      <rect x="12" y="88" width="76" height="5" fill="#cbbd9e" stroke="#7a6a52" stroke-width=".6"/><rect x="8" y="93" width="84" height="5" fill="#b8a888" stroke="#7a6a52" stroke-width=".6"/>
      <path d="M50,20 V34" stroke="#5a4a35" stroke-width="1"/><path d="M50,20 L62,23 L50,27Z" fill="#2f6fd6"/>
      <circle cx="50" cy="45" r="4" fill="#f2c230" stroke="#8a5d00" stroke-width=".6"/>`,

    longestRoad: () => `${sun}${cloud(24, 16)}<rect x="0" y="40" width="100" height="70" fill="#7cb655"/>
      <path d="M0,60 Q30,50 50,58 T100,52" stroke="#5a9a3c" stroke-width="8" fill="none" opacity=".5"/>
      <path d="M86,42 C70,52 30,48 26,62 C20,80 80,72 74,90 C70,102 40,104 30,110" stroke="#c49a62" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M86,42 C70,52 30,48 26,62 C20,80 80,72 74,90 C70,102 40,104 30,110" stroke="#8a6232" stroke-width="1" stroke-dasharray="3 4" fill="none"/>
      <g fill="#c25a35" stroke="#6b2a12" stroke-width=".5"><rect x="82" y="34" width="8" height="7"/><polygon points="81,34 86,29 91,34"/></g>
      ${[[10, 50], [92, 66], [12, 92], [90, 100]].map(([x, y]) => `<g transform="translate(${x},${y})"><rect x="-1" y="2" width="2" height="4" fill="#5b3a1e"/><polygon points="0,-7 5,3 -5,3" fill="#2a6d2a"/></g>`).join('')}
      <g transform="translate(46,76)"><rect x="-12" y="-8" width="20" height="10" rx="2" fill="#a8743a" stroke="#5a3a17"/>
        <path d="M-12,-8 Q-2,-18 8,-8" fill="#f6ecd0" stroke="#7a6a52"/><circle cx="-8" cy="4" r="4" fill="#5a3a1e"/><circle cx="4" cy="4" r="4" fill="#5a3a1e"/>
        <path d="M8,-2 L16,-4" stroke="#5a3a17" stroke-width="1.4"/><ellipse cx="20" cy="-4" rx="6" ry="3.5" fill="#8a5a34"/><rect x="16" y="-2" width="2" height="7" fill="#8a5a34"/><rect x="22" y="-2" width="2" height="7" fill="#8a5a34"/>
        <path d="M24,-6 L28,-11 L27,-4Z" fill="#8a5a34"/></g>`,

    largestArmy: () => `<rect width="100" height="110" fill="#b9d3ec"/>${cloud(20, 16)}${cloud(76, 24, .8)}${hills('#7cb655', '#5a9a3c')}
      ${[[22, 30, '#c0281c'], [50, 22, '#2f6fd6'], [78, 30, '#f2c230']].map(([x, y, c]) => `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 50}" stroke="#7a5230" stroke-width="2"/><path d="M${x},${y} L${x + 14},${y + 4} L${x},${y + 10}Z" fill="${c}"/>`).join('')}
      ${[[22, 64, '#c0281c'], [78, 64, '#d9a520'], [50, 58, '#2f6fd6']].map(([x, y, c]) => `<g transform="translate(${x},${y})">
        <path d="M-7,-14 Q0,-22 7,-14 V-6 H-7Z" fill="#c9cfd6" stroke="#555" stroke-width=".7"/><rect x="-5" y="-12" width="10" height="2" fill="#222"/>
        <path d="M-10,-4 H10 V8 Q10,18 0,24 Q-10,18 -10,8Z" fill="${c}" stroke="#2b1d0e" stroke-width="1.2"/>
        <path d="M0,-2 V20 M-7,7 H7" stroke="#fff" stroke-width="2.4"/></g>`).join('')}
      <g stroke="#dfe3e8" stroke-width="2.6" stroke-linecap="round"><path d="M34,100 L66,80"/><path d="M66,100 L34,80"/></g>
      <g stroke="#7a5230" stroke-width="3" stroke-linecap="round"><path d="M34,100 L38,97.5"/><path d="M66,100 L62,97.5"/></g>`
  };


  const flame = (x, y, k = 1) => `<g transform="translate(${x},${y}) scale(${k})"><path d="M0,-12 Q7,-4 4,4 Q0,8 -4,4 Q-7,-4 0,-12Z" fill="#f08c1a"/><path d="M0,-6 Q3,-1 2,3 Q0,5 -2,3 Q-3,-1 0,-6Z" fill="#ffe27a"/></g>`;
  const table = `<rect x="0" y="86" width="100" height="24" fill="#6b4423"/><rect x="0" y="84" width="100" height="4" fill="#8b5e34"/>`;
  const interior = `<rect width="100" height="110" fill="#d9c49a"/><rect x="0" y="0" width="100" height="60" fill="#c8ad7a"/>`;
  const sea = `<rect width="100" height="110" fill="#9fd0f0"/>${cloud(24, 16)}<rect x="0" y="66" width="100" height="44" fill="#2f78b8"/>
    <path d="M0,72 q6,-3 12,0 t12,0 t12,0 t12,0 t12,0 t12,0 t12,0 t12,0 t12,0" stroke="#7fc0ec" stroke-width="1.5" fill="none"/>`;
  const shipShape = (x, y, k, col) => `<g transform="translate(${x},${y}) scale(${k})"><path d="M-16,0 L16,0 L11,9 L-11,9Z" fill="${col}" stroke="#3d2712" stroke-width="1.2"/>
    <path d="M0,-24 L0,0" stroke="#3d2712" stroke-width="1.6"/><path d="M1,-22 L14,-3 L1,-3Z" fill="#f6f1e1" stroke="#3d2712"/><path d="M-1,-20 L-11,-3 L-1,-3Z" fill="#f6f1e1" stroke="#3d2712"/>
    <path d="M0,-24 L8,-21 L0,-18Z" fill="#c0281c"/></g>`;
  Object.assign(SCENES, {
    alchemist: () => `${interior}${table}
      <path d="M40,40 L40,56 L28,80 Q26,86 32,86 L68,86 Q74,86 72,80 L60,56 L60,40Z" fill="#cfeaf5" stroke="#4a6a7a" stroke-width="1.4" opacity=".95"/>
      <path d="M32,72 L68,72 L72,80 Q74,86 68,86 L32,86 Q26,86 28,80Z" fill="#7a3fa0"/><rect x="37" y="34" width="26" height="7" rx="2" fill="#8b5e34"/>
      ${[[46, 64], [54, 60], [50, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#c79be0"/>`).join('')}
      <g transform="translate(14,74) rotate(-12)"><rect width="14" height="14" rx="2.5" fill="#c0281c" stroke="#5a1010"/><circle cx="4" cy="4" r="1.5" fill="#fff"/><circle cx="10" cy="10" r="1.5" fill="#fff"/></g>
      <g transform="translate(76,72) rotate(10)"><rect width="14" height="14" rx="2.5" fill="#f2c230" stroke="#6b5208"/><circle cx="7" cy="7" r="1.5" fill="#222"/><circle cx="3.5" cy="3.5" r="1.5" fill="#222"/><circle cx="10.5" cy="10.5" r="1.5" fill="#222"/></g>`,
    inventor: () => `${interior}${table}
      <g transform="translate(36,46)"><circle r="16" fill="#9aa1aa" stroke="#4a4f55" stroke-width="2"/>${Array.from({ length: 8 }, (_, i) => `<rect x="-3" y="-21" width="6" height="7" fill="#9aa1aa" stroke="#4a4f55" transform="rotate(${i * 45})"/>`).join('')}<circle r="5" fill="#4a4f55"/></g>
      <g transform="translate(64,62)"><circle r="11" fill="#c98b3b" stroke="#6b4423" stroke-width="2"/>${Array.from({ length: 6 }, (_, i) => `<rect x="-2.5" y="-15" width="5" height="5" fill="#c98b3b" stroke="#6b4423" transform="rotate(${i * 60})"/>`).join('')}<circle r="3.5" fill="#6b4423"/></g>
      <circle cx="26" cy="92" r="7" fill="#f6e8c6" stroke="#8a6d3b" stroke-width="1.2"/><text x="26" y="95.5" text-anchor="middle" font-size="9" font-weight="800" fill="#222">4</text>
      <circle cx="74" cy="92" r="7" fill="#f6e8c6" stroke="#8a6d3b" stroke-width="1.2"/><text x="74" y="95.5" text-anchor="middle" font-size="9" font-weight="800" fill="#222">10</text>
      <path d="M36,90 Q50,80 64,90" stroke="#c0281c" stroke-width="1.8" fill="none" marker-end=""/><path d="M60,86 L65,90 L59,92" fill="#c0281c"/>`,
    crane: () => `${sun}${hills('#8cc45e', '#6aa844')}
      <rect x="54" y="56" width="32" height="40" fill="#efe6d2" stroke="#7a6a52"/><rect x="58" y="44" width="24" height="12" fill="#e2d6bb" stroke="#7a6a52" stroke-dasharray="3 2"/>
      <path d="M22,98 L22,20 L72,20" stroke="#8b5e34" stroke-width="4" fill="none"/><path d="M22,40 L40,20" stroke="#8b5e34" stroke-width="2.5"/>
      <path d="M64,20 L64,36" stroke="#3d2712" stroke-width="1.2"/><rect x="57" y="36" width="14" height="9" fill="#a9a196" stroke="#4a4540"/>
      <rect x="14" y="94" width="18" height="6" fill="#6b4423"/>`,
    irrigation: () => `${sun}<rect x="0" y="44" width="100" height="66" fill="#e8c547"/>
      ${[52, 64, 78, 94].map(y => `<path d="M0,${y} L100,${y - 6}" stroke="#c99a22" stroke-width="2"/>`).join('')}
      <path d="M0,70 C30,62 60,80 100,66" stroke="#4aa3e0" stroke-width="7" fill="none"/><path d="M50,72 L50,110" stroke="#4aa3e0" stroke-width="5"/>
      ${[[18, 56], [80, 50], [24, 90], [78, 88]].map(([x, y]) => `<g transform="translate(${x},${y})" stroke="#9a6b12" fill="#e9b92d"><path d="M0,10 L0,-6"/><ellipse cx="-2" cy="-4" rx="1.5" ry="3"/><ellipse cx="2" cy="-4" rx="1.5" ry="3"/><ellipse cx="-2" cy="1" rx="1.5" ry="3"/><ellipse cx="2" cy="1" rx="1.5" ry="3"/></g>`).join('')}`,
    engineer: () => `${sun}${cloud(30, 18)}${hills('#8cc45e', '#6aa844')}
      <path d="M8,96 L8,60 L16,60 L16,54 L24,54 L24,60 L36,60 L36,54 L44,54 L44,60 L56,60 L56,54 L64,54 L64,60 L72,60 L72,96Z" fill="#a89f92" stroke="#3e3a33" stroke-width="1.2"/>
      ${[66, 74, 82, 90].map((y, i) => `<path d="M8,${y} H72" stroke="#6e665c" stroke-width=".8"/>` + [0, 1, 2, 3].map(j => `<path d="M${12 + j * 16 + (i % 2) * 8},${y - 8} V${y}" stroke="#6e665c" stroke-width=".8"/>`).join('')).join('')}
      <path d="M76,98 L76,48 M90,98 L90,48 M76,60 H90 M76,76 H90" stroke="#8b5e34" stroke-width="2.5"/>
      <circle cx="84" cy="40" r="4" fill="#f0c8a0"/><path d="M80,46 H88 L87,58 H81Z" fill="#c0562b"/>`,
    medicine: () => `${interior}${table}
      <path d="M38,44 L38,52 Q26,58 26,72 L26,86 L74,86 L74,72 Q74,58 62,52 L62,44Z" fill="#d8f0e6" stroke="#2a6b5a" stroke-width="1.4"/>
      <rect x="36" y="36" width="28" height="9" rx="2" fill="#8b5e34"/><rect x="44" y="60" width="12" height="22" fill="#c0281c"/><rect x="39" y="65" width="22" height="12" fill="#c0281c"/>
      <g fill="#3d9a40">${[[14, 80], [18, 72], [84, 78], [88, 70]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="2" transform="rotate(-30 ${x} ${y})"/>`).join('')}</g>`,
    mining: () => `${sun}<polygon points="0,96 30,30 52,58 72,20 100,96" fill="#7d858e" stroke="#4a4f55" stroke-width="1.4"/>
      <polygon points="72,20 78,32 68,30" fill="#eef2f5"/><path d="M36,96 L36,72 Q46,60 56,72 L56,96Z" fill="#2b2218"/>
      <path d="M36,72 Q46,60 56,72" stroke="#8b5e34" stroke-width="4" fill="none"/><rect x="0" y="96" width="100" height="14" fill="#8a7a62"/>
      <g transform="translate(70,90)"><path d="M-12,-10 L12,-10 L9,2 L-9,2Z" fill="#6b4423" stroke="#3d2712"/><circle cx="-6" cy="4" r="3" fill="#333"/><circle cx="6" cy="4" r="3" fill="#333"/>
      <polygon points="-9,-10 -4,-17 1,-10" fill="#8b929b"/><polygon points="-1,-10 5,-16 9,-10" fill="#a0a7b0"/></g>`,
    printer: () => `${interior}${table}
      <rect x="22" y="40" width="56" height="46" fill="#8b5e34" stroke="#3d2712" stroke-width="1.4"/><rect x="28" y="30" width="44" height="12" fill="#6b4423" stroke="#3d2712"/>
      <path d="M50,20 V30" stroke="#3d2712" stroke-width="3"/><path d="M36,20 H64" stroke="#3d2712" stroke-width="3"/>
      <rect x="30" y="54" width="40" height="22" fill="#f6ecd0" stroke="#7a6a52"/>${[60, 64, 68, 72].map(y => `<path d="M34,${y} H66" stroke="#2b2218" stroke-width="1"/>`).join('')}`,
    smith: () => `<rect width="100" height="110" fill="#3a2e28"/>${flame(80, 40, 2)}${flame(70, 46, 1.4)}
      <path d="M20,74 H70 L64,82 H56 L58,96 H34 L36,82 H26Z" fill="#4a4f55" stroke="#1b1b1b" stroke-width="1.4"/><path d="M14,74 H24 L20,70 H14Z" fill="#4a4f55"/>
      <g transform="translate(46,52) rotate(-35)"><rect x="-2" y="0" width="4" height="26" fill="#8b5e34"/><rect x="-9" y="-6" width="18" height="9" rx="1.5" fill="#7d8590" stroke="#1b1b1b"/></g>
      ${[[40, 66], [52, 62], [58, 68], [34, 62]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#ffd34a"/>`).join('')}`,
    bishop: () => `${interior}
      <path d="M32,96 Q30,60 50,52 Q70,60 68,96Z" fill="#f6f1e1" stroke="#7a6a52" stroke-width="1.2"/><path d="M46,56 L46,96 M54,56 L54,96" stroke="#c0281c" stroke-width="2"/>
      <circle cx="50" cy="44" r="8" fill="#f0c8a0" stroke="#7a5a3a"/>
      <path d="M40,38 Q42,14 50,10 Q58,14 60,38Z" fill="#f6f1e1" stroke="#c0a030" stroke-width="1.5"/><path d="M50,12 V36 M44,22 H56" stroke="#c0a030" stroke-width="2"/>
      <path d="M76,98 V30 Q76,20 84,20 Q90,22 88,30" stroke="#d9a520" stroke-width="3" fill="none"/>`,
    constitution: () => `${interior}
      <path d="M20,22 H76 Q82,22 82,28 V88 H26 Q20,88 20,82Z" fill="#f6ecd0" stroke="#7a6a52" stroke-width="1.4"/>
      <path d="M20,82 Q20,76 26,76 Q32,76 32,82 Q32,88 26,88" fill="#e6d8b0" stroke="#7a6a52"/>
      <text x="51" y="38" text-anchor="middle" font-size="9" font-weight="800" font-family="Georgia,serif" fill="#3d2712">LEY</text>
      ${[46, 52, 58, 64].map(y => `<path d="M30,${y} H72" stroke="#9a8a6a" stroke-width="1.1"/>`).join('')}
      <circle cx="66" cy="78" r="8" fill="#c0281c" stroke="#6b1510"/><path d="M62,84 L60,96 L66,92 L72,96 L70,84" fill="#c0281c"/>`,
    deserter: () => `${sun}${hills()}
      <g transform="translate(64,60)"><circle cx="0" cy="-16" r="6" fill="#c9cfd6" stroke="#555"/><path d="M-7,-10 Q0,-14 7,-10 L6,10 H-6Z" fill="#9aa1aa" stroke="#555"/>
      <path d="M-6,10 L-10,28 M6,10 L12,26" stroke="#555" stroke-width="4"/><path d="M6,-6 L18,6" stroke="#7a5230" stroke-width="2"/><path d="M14,4 L24,0 L22,10Z" fill="#7d8590"/></g>
      <path d="M20,50 L20,96" stroke="#7a5230" stroke-width="2"/><path d="M20,52 L36,58 L20,64Z" fill="#c0281c" transform="rotate(25 20 52)"/>
      <path d="M30,84 L44,84 M40,80 L44,84 L40,88" stroke="#fff" stroke-width="2.5" fill="none"/>`,
    diplomat: () => `${interior}${table}
      <path d="M18,60 Q30,54 42,62 L58,62 Q70,54 82,60 L78,74 Q68,70 58,76 L42,76 Q32,70 22,74Z" fill="#f0c8a0" stroke="#7a5a3a" stroke-width="1.2"/>
      <path d="M8,56 L22,60 L22,76 L8,80Z" fill="#2f6fd6"/><path d="M92,56 L78,60 L78,76 L92,80Z" fill="#8a1f2f"/>
      <path d="M30,92 H70" stroke="#c49a62" stroke-width="7"/><path d="M44,88 L56,96 M56,88 L44,96" stroke="#c0281c" stroke-width="2.5"/>`,
    intrigue: () => `<rect width="100" height="110" fill="#2b2240"/>${[[14, 18], [80, 14], [60, 28], [24, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff"/>`).join('')}
      <circle cx="78" cy="22" r="8" fill="#f4e9b0"/><circle cx="82" cy="19" r="7" fill="#2b2240"/>
      <path d="M18,52 Q50,34 82,52 Q78,72 60,70 Q50,62 40,70 Q22,72 18,52Z" fill="#c0281c" stroke="#f2c230" stroke-width="1.5"/>
      <ellipse cx="36" cy="56" rx="7" ry="4" fill="#2b2240"/><ellipse cx="64" cy="56" rx="7" ry="4" fill="#2b2240"/>
      <path d="M82,52 Q92,46 94,36" stroke="#f2c230" stroke-width="1.5" fill="none"/><path d="M50,74 L50,100" stroke="#8b5e34" stroke-width="2.5"/>`,
    saboteur: () => `${sun}${hills('#9aa35e', '#7a8a44')}
      <g transform="translate(48,74)"><rect x="-22" y="-14" width="40" height="16" fill="#8b5e34" stroke="#3d2712" transform="rotate(12)"/>
      <circle cx="-12" cy="8" r="8" fill="none" stroke="#3d2712" stroke-width="3"/><path d="M14,4 L20,16 L8,12Z" fill="#3d2712"/></g>
      ${flame(40, 62, 1.6)}${flame(56, 60, 1.2)}${flame(30, 70, 1)}<path d="M50,40 Q46,28 54,20 Q52,30 60,34" stroke="#888" stroke-width="3" fill="none" opacity=".6"/>`,
    spy: () => `${interior}
      <path d="M24,104 Q22,52 50,40 Q78,52 76,104Z" fill="#3a3a44"/><path d="M34,52 Q50,20 66,52 Q58,46 50,46 Q42,46 34,52Z" fill="#2a2a32"/>
      <ellipse cx="44" cy="54" rx="3" ry="2" fill="#f2c230"/><ellipse cx="56" cy="54" rx="3" ry="2" fill="#f2c230"/>
      <circle cx="74" cy="76" r="11" fill="#cfeaf5" opacity=".7" stroke="#7a5230" stroke-width="3"/><path d="M82,84 L92,96" stroke="#7a5230" stroke-width="4"/>`,
    warlord: () => SCENES.largestArmy(),
    wedding: () => `${interior}${[[20, 16], [80, 18], [50, 10]].map(([x, y]) => `<path d="M${x},${y} l3,6 l-6,0z" fill="#f2c230"/>`).join('')}
      <g transform="translate(50,40)"><path d="M-14,-6 Q0,-16 14,-6 L12,6 H-12Z" fill="#d9a520" stroke="#6b420a"/><path d="M0,6 V12" stroke="#6b420a" stroke-width="2"/><circle cx="0" cy="14" r="2.5" fill="#6b420a"/></g>
      <circle cx="40" cy="78" r="13" fill="none" stroke="#f2c230" stroke-width="5"/><circle cx="58" cy="78" r="13" fill="none" stroke="#e0a91b" stroke-width="5"/>
      <path d="M58,62 l3,-6 l3,6z" fill="#cfeaf5" stroke="#4a6a7a"/>`,
    commercialHarbor: () => `${sea}<rect x="0" y="60" width="44" height="10" fill="#8b5e34"/>${[6, 18, 30, 42].map(x => `<rect x="${x}" y="68" width="3" height="16" fill="#6b4423"/>`).join('')}
      ${shipShape(70, 66, 1.2, '#a8743a')}<g transform="translate(16,48)"><rect width="12" height="10" fill="#c98b3b" stroke="#5a3a17"/><rect x="14" width="12" height="10" fill="#9b5fb5" stroke="#4a2a5a"/></g>`,
    merchantFleet: () => `${sea}${shipShape(32, 68, 1, '#2f6fd6')}${shipShape(70, 72, 1.25, '#c0281c')}${shipShape(54, 58, 0.6, '#e9b92d')}`,
    tradeMonopoly: () => `${interior}${table}
      <path d="M12,70 Q24,64 36,70 L36,84 Q24,78 12,84Z" fill="#c0281c" stroke="#6b1510"/><ellipse cx="12" cy="77" rx="3" ry="7" fill="#e04a3a" stroke="#6b1510"/>
      <rect x="42" y="64" width="22" height="20" fill="#f6ecd0" stroke="#7a6a52"/>${[69, 73, 77].map(y => `<path d="M45,${y} H61" stroke="#9a8a6a"/>`).join('')}
      ${[[78, 84], [86, 84], [82, 78], [82, 72]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="2.4" fill="#f4c430" stroke="#8a5d00" stroke-width=".7"/>`).join('')}
      <path d="M50,24 L50,50 M38,34 L50,24 L62,34" stroke="#3d2712" stroke-width="3" fill="none"/>`,
    defender: () => `<rect width="100" height="110" fill="#b9d3ec"/>${cloud(76, 18)}${hills()}
      <g fill="#9aa1aa" stroke="#4a4f55"><rect x="60" y="40" width="30" height="50"/><rect x="58" y="34" width="7" height="8"/><rect x="71" y="34" width="7" height="8"/><rect x="84" y="34" width="7" height="8"/></g>
      <path d="M8,72 L30,60 L20,82Z" fill="#5a3a20"/><path d="M14,66 L18,52 L24,62" fill="#3a2a1a"/>
      <path d="M28,50 H52 V68 Q52,84 40,92 Q28,84 28,68Z" fill="#c0281c" stroke="#4d0d0d" stroke-width="1.6"/>
      <path d="M40,54 V86 M31,66 H49" stroke="#f2c230" stroke-width="3.5"/>`,
    metro_trade: () => metroScene('#e9b92d'),
    metro_politics: () => metroScene('#2f6fd6'),
    metro_science: () => metroScene('#2f9a4a')
  });
  function metroScene(col) {
    return `${sun}${cloud(24, 18)}${hills('#8cc45e', '#6aa844')}
      <rect x="12" y="62" width="20" height="34" fill="#efe6d2" stroke="#7a6a52"/><rect x="68" y="58" width="22" height="38" fill="#efe6d2" stroke="#7a6a52"/>
      <rect x="34" y="44" width="32" height="52" fill="#e6dcc4" stroke="#7a6a52"/><path d="M34,44 L50,26 L66,44Z" fill="${col}" stroke="#3d2712"/>
      <path d="M50,26 L50,12" stroke="#3d2712" stroke-width="1.2"/><path d="M50,12 L60,15 L50,18Z" fill="${col}"/>
      <path d="M12,62 L22,52 L32,62Z" fill="#a9432a"/><path d="M68,58 L79,48 L90,58Z" fill="#a9432a"/>
      ${[52, 64, 76].map(y => `<rect x="40" y="${y}" width="6" height="7" fill="#6aa0d6"/><rect x="54" y="${y}" width="6" height="7" fill="#6aa0d6"/>`).join('')}`;
  }
  const PROGRESS_SCENE = { roadBuilding: 'roadBuilding', masterMerchant: 'monopoly', merchant: 'market', resourceMonopoly: 'yearOfPlenty' };

  function wrapTitle(t) {
    const words = t.split(' ');
    if (t.length <= 13 || words.length === 1) return [t];
    let a = '', b = '';
    for (const w of words) { if ((a + ' ' + w).trim().length <= 14 && !b) a = (a + ' ' + w).trim(); else b = (b + ' ' + w).trim(); }
    return [a, b];
  }

  function card(sceneKey, frameKey, title, pv) {
    const id = 'cd' + (++uid);
    const F = FRAME[frameKey];
    const lines = wrapTitle(title);
    const fs = lines.length > 1 ? 9.2 : (title.length > 10 ? 10 : 11.5);
    const text = lines.map((l, i) => `<text x="50" y="${lines.length > 1 ? 117.5 + i * 10 : 123}" text-anchor="middle" font-size="${fs}" font-weight="800" font-family="Georgia,serif" fill="#2b1d0e">${l}</text>`).join('');
    return `<svg class="card-art" viewBox="0 0 100 140" preserveAspectRatio="xMidYMid meet">
      <defs><clipPath id="${id}"><rect x="7" y="7" width="86" height="96" rx="4"/></clipPath>
        <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fc3ea"/><stop offset="1" stop-color="#e6f2fa"/></linearGradient></defs>
      <rect x="1" y="1" width="98" height="138" rx="8" fill="${F.fill}" stroke="${F.edge}" stroke-width="2"/>
      <rect x="4" y="4" width="92" height="132" rx="6" fill="none" stroke="#f2c230" stroke-width=".8" opacity=".7"/>
      <g clip-path="url(#${id})"><rect x="7" y="7" width="86" height="96" fill="url(#${id}s)"/>
        <g transform="translate(7,7) scale(.86,.873)">${SCENES[sceneKey]()}</g></g>
      <rect x="7" y="7" width="86" height="96" rx="4" fill="none" stroke="${F.edge}" stroke-width="1.2"/>
      <rect x="7" y="106" width="86" height="28" rx="4" fill="#f6ecd0" stroke="${F.edge}" stroke-width="1"/>${text}
      ${pv ? `<g><circle cx="83" cy="17" r="10" fill="#f2c230" stroke="#6b420a" stroke-width="1.5"/>
        <text x="83" y="20.5" text-anchor="middle" font-size="9" font-weight="900" fill="#4d2a00" font-family="Georgia,serif">${pv}PV</text></g>` : ''}
    </svg>`;
  }

  function devCard(type, variant) {
    if (type === 'knight') return card('knight', 'knight', 'Caballero');
    if (type === 'vp') {
      const v = VP_VARIANTS[variant] ? variant : 'university';
      return card(v, 'vp', VP_VARIANTS[v], 1);
    }
    if (type === 'roadBuilding') return card('roadBuilding', 'progress', 'Construcción de carreteras');
    if (type === 'yearOfPlenty') return card('yearOfPlenty', 'progress', 'Descubrimiento');
    if (type === 'monopoly') return card('monopoly', 'progress', 'Monopolio');
    return '';
  }

  function specialCard(kind) {
    return kind === 'longestRoad' ? card('longestRoad', 'special', 'Gran Ruta Comercial', 2) : card('largestArmy', 'special', 'Gran Ejército', 2);
  }

  const DEV_HELP = {
    knight: 'Mueve el ladrón y roba una carta a un jugador. Cuenta para el Gran Ejército.',
    vp: 'Vale 1 punto de victoria. Se mantiene oculta y cuenta automáticamente.',
    roadBuilding: 'Construye gratis 2 carreteras (o barcos en Navegantes).',
    yearOfPlenty: 'Toma 2 cartas de recurso cualesquiera del banco.',
    monopoly: 'Elige un recurso: todos los jugadores te entregan todas sus cartas de ese tipo.',
    longestRoad: 'La tiene quien posee la ruta continua más larga (mínimo 5 tramos). Vale 2 PV.',
    largestArmy: 'La tiene quien ha jugado más caballeros (mínimo 3). Vale 2 PV.'
  };

  function progressCard(type) {
    const CK = C.CK;
    const area = CK.PROGRESS_AREA[type];
    const scene = PROGRESS_SCENE[type] || type;
    const pv = type === 'printer' || type === 'constitution' ? 1 : 0;
    return card(SCENES[scene] ? scene : 'hall', area, CK.PROGRESS_NAME[type], pv);
  }
  function ckSpecialCard(kind) {
    if (kind === 'defender') return card('defender', 'special', 'Defensor de Catan', 1);
    if (kind === 'merchant') return card('market', 'trade', 'Mercader', 1);
    if (kind.startsWith('metro_')) return card(kind, kind.slice(6), C.CK.METRO_NAME[kind.slice(6)].replace('Metrópolis', 'Metrópolis'), 2);
    return '';
  }

  C.CardArt = { devCard, specialCard, progressCard, ckSpecialCard, VP_VARIANTS, DEV_HELP };
})(window);
