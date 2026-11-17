// Geometría del tablero y generación de mapas para cada modo de juego.
(function (root) {
  const C = root.Catan || (root.Catan = {});

  const RES = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
  const TERRAIN_RES = { forest: 'wood', hills: 'brick', pasture: 'sheep', fields: 'wheat', mountains: 'ore' };
  const LAND = ['forest', 'hills', 'pasture', 'fields', 'mountains', 'desert', 'gold', 'lake', 'swamp', 'oasis', 'castle', 'quarry', 'glassworks'];
  const PIPS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
  const SQ3 = Math.sqrt(3);
  const NEIGH = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function isLand(t) { return LAND.includes(t); }

  function hexCenter(q, r) { return { x: SQ3 * (q + r / 2), y: 1.5 * r }; }

  // Filas centradas: devuelve [{q,r,token}]
  function rowsToHexes(rows) {
    const n = rows.length;
    const out = [];
    rows.forEach((row, i) => {
      const toks = row.trim().split(/\s+/);
      const L = toks.length;
      const r = i - (n - 1) / 2;
      const q0 = Math.floor(-(L - 1) / 2 - r / 2 + 0.5);
      toks.forEach((t, k) => out.push({ q: q0 + k, r, token: t }));
    });
    return out;
  }

  // Añade un anillo de mar alrededor de la tierra (para tableros clásicos)
  function addSeaRing(hexes) {
    const keys = new Set(hexes.map(h => h.q + ',' + h.r));
    const sea = [];
    for (const h of hexes) {
      for (const [dq, dr] of NEIGH) {
        const k = (h.q + dq) + ',' + (h.r + dr);
        if (!keys.has(k)) { keys.add(k); sea.push({ q: h.q + dq, r: h.r + dr, terrain: 'sea' }); }
      }
    }
    return hexes.concat(sea);
  }

  // Construye vértices y aristas a partir de los hexágonos.
  function buildGraph(hexList) {
    const hexes = hexList.map((h, id) => {
      const c = hexCenter(h.q, h.r);
      return { id, q: h.q, r: h.r, x: c.x, y: c.y, terrain: h.terrain, number: h.number || null, island: -1, vertices: [], edges: [] };
    });
    const vIndex = new Map();
    const vertices = [];
    const eIndex = new Map();
    const edges = [];
    const vkey = (x, y) => Math.round(x * 1000) + ',' + Math.round(y * 1000);
    for (const h of hexes) {
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 180 * (60 * i - 30);
        const x = h.x + Math.cos(a), y = h.y + Math.sin(a);
        const k = vkey(x, y);
        let v = vIndex.get(k);
        if (v === undefined) {
          v = vertices.length;
          vIndex.set(k, v);
          vertices.push({ id: v, x: +x.toFixed(4), y: +y.toFixed(4), hexes: [], adj: [], edges: [], land: false, port: null });
        }
        vertices[v].hexes.push(h.id);
        h.vertices.push(v);
      }
      for (let i = 0; i < 6; i++) {
        const a = h.vertices[i], b = h.vertices[(i + 1) % 6];
        const k = Math.min(a, b) + '|' + Math.max(a, b);
        let e = eIndex.get(k);
        if (e === undefined) {
          e = edges.length;
          eIndex.set(k, e);
          const va = vertices[a], vb = vertices[b];
          edges.push({ id: e, v: [a, b], hexes: [], x: +((va.x + vb.x) / 2).toFixed(4), y: +((va.y + vb.y) / 2).toFixed(4),
            angle: +(Math.atan2(vb.y - va.y, vb.x - va.x) * 180 / Math.PI).toFixed(2), land: false, sea: false });
          va.adj.push(b); vb.adj.push(a);
          va.edges.push(e); vb.edges.push(e);
        }
        edges[e].hexes.push(h.id);
        h.edges.push(e);
      }
    }
    for (const v of vertices) v.land = v.hexes.some(id => isLand(hexes[id].terrain));
    for (const e of edges) {
      e.land = e.hexes.some(id => isLand(hexes[id].terrain));
      e.sea = e.hexes.length === 2 && e.hexes.some(id => hexes[id].terrain === 'sea');
    }
    // islas: componentes conexas de tierra
    let island = 0;
    const byKey = new Map(hexes.map(h => [h.q + ',' + h.r, h]));
    for (const h of hexes) {
      if (!isLand(h.terrain) || h.island >= 0) continue;
      const stack = [h];
      h.island = island;
      while (stack.length) {
        const c = stack.pop();
        for (const [dq, dr] of NEIGH) {
          const n = byKey.get((c.q + dq) + ',' + (c.r + dr));
          if (n && isLand(n.terrain) && n.island < 0) { n.island = island; stack.push(n); }
        }
      }
      island++;
    }
    return { hexes, vertices, edges, islands: island };
  }

  function neighborsOf(board, h) {
    const byKey = board._byKey || (board._byKey = new Map(board.hexes.map(x => [x.q + ',' + x.r, x])));
    return NEIGH.map(([dq, dr]) => byKey.get((h.q + dq) + ',' + (h.r + dr))).filter(Boolean);
  }

  // Asigna números evitando 6/8 adyacentes
  function assignNumbers(board, hexIds, tokens) {
    for (let attempt = 0; attempt < 500; attempt++) {
      const t = shuffle(tokens.slice());
      hexIds.forEach((id, i) => { board.hexes[id].number = t[i]; });
      let ok = true;
      for (const id of hexIds) {
        const h = board.hexes[id];
        if (h.number !== 6 && h.number !== 8) continue;
        if (neighborsOf(board, h).some(n => n.number === 6 || n.number === 8)) { ok = false; break; }
      }
      if (ok) return;
    }
  }

  // Colocación oficial (3-4): fichas A…R en espiral desde una esquina, en sentido antihorario hacia el centro,
  // saltando el desierto. Se prueba desde las esquinas (al azar) hasta que ningún 6 u 8 queda junto a otro.
  const SPIRAL_TOKENS = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];
  function spiralNumbers(board, sequence) {
    const land = board.hexes.filter(h => isLand(h.terrain));
    const cx = land.reduce((a, h) => a + h.x, 0) / land.length, cy = land.reduce((a, h) => a + h.y, 0) / land.length;
    // anillos: el exterior toca el mar; cada anillo interior toca al anterior
    const ringOf = new Map();
    let frontier = land.filter(h => neighborsOf(board, h).some(n => !isLand(n.terrain)));
    for (let d = 0; frontier.length; d++) {
      frontier.forEach(h => ringOf.set(h.id, d));
      frontier = land.filter(h => !ringOf.has(h.id) && neighborsOf(board, h).some(n => ringOf.get(n.id) === d));
    }
    const maxD = Math.max(...ringOf.values());
    const dist = h => maxD - ringOf.get(h.id);
    const ang = h => Math.atan2(h.y - cy, h.x - cx);
    const landN = h => neighborsOf(board, h).filter(n => isLand(n.terrain)).length;
    const corners = shuffle(land.filter(h => dist(h) === maxD && landN(h) === 3));
    // antihorario en pantalla (y hacia abajo): ángulos decrecientes
    const ccw = (from, a) => { let d = from - a; while (d < 0) d += 2 * Math.PI; while (d >= 2 * Math.PI) d -= 2 * Math.PI; return d; };
    for (const start of corners) {
      const order = [];
      let a0 = ang(start);
      for (let d = maxD; d >= 0; d--) {
        const ring = land.filter(h => dist(h) === d);
        ring.sort((x, y) => ccw(a0, ang(x)) - ccw(a0, ang(y)));
        order.push(...ring);
      }
      let k = 0;
      order.forEach(h => { h.number = h.terrain === 'desert' ? undefined : sequence[k++]; if (h.number === undefined) delete h.number; });
      const bad = land.some(h => (h.number === 6 || h.number === 8) && neighborsOf(board, h).some(n => n.number === 6 || n.number === 8));
      if (!bad) return true;
    }
    return false;
  }

  // Coloca puertos repartidos en la costa de una isla
  function placePorts(board, types, islandId) {
    const coast = board.edges.filter(e => {
      if (e.hexes.length !== 2) return false;
      const [a, b] = e.hexes.map(id => board.hexes[id]);
      const landHex = isLand(a.terrain) ? a : (isLand(b.terrain) ? b : null);
      const seaHex = a.terrain === 'sea' ? a : (b.terrain === 'sea' ? b : null);
      return landHex && seaHex && (islandId === undefined || landHex.island === islandId);
    });
    let cx = 0, cy = 0;
    coast.forEach(e => { cx += e.x; cy += e.y; });
    cx /= coast.length; cy /= coast.length;
    coast.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
    const n = types.length;
    const offset = Math.floor(Math.random() * coast.length);
    const ports = [];
    const used = new Set();
    const t = shuffle(types.slice());
    for (let i = 0; i < n; i++) {
      let idx = (offset + Math.round(i * coast.length / n)) % coast.length;
      // evita compartir vértices con otro puerto
      for (let tries = 0; tries < coast.length; tries++) {
        const e = coast[idx];
        if (!used.has(e.v[0]) && !used.has(e.v[1])) break;
        idx = (idx + 1) % coast.length;
      }
      const e = coast[idx];
      used.add(e.v[0]); used.add(e.v[1]);
      const seaHex = e.hexes.map(id => board.hexes[id]).find(h => h.terrain === 'sea');
      const port = { id: i, type: t[i], edge: e.id, hex: seaHex.id };
      ports.push(port);
      board.vertices[e.v[0]].port = t[i];
      board.vertices[e.v[1]].port = t[i];
    }
    board.ports = ports;
  }

  const BASE_TERRAINS = ['forest', 'forest', 'forest', 'forest', 'pasture', 'pasture', 'pasture', 'pasture',
    'fields', 'fields', 'fields', 'fields', 'hills', 'hills', 'hills', 'mountains', 'mountains', 'mountains', 'desert'];
  const BASE_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
  const BASE_PORTS = ['any', 'any', 'any', 'any', 'wood', 'brick', 'sheep', 'wheat', 'ore'];

  const EXT_TERRAINS = BASE_TERRAINS.concat(['forest', 'forest', 'pasture', 'pasture', 'fields', 'fields', 'hills', 'hills', 'mountains', 'mountains', 'desert']);
  const EXT_TOKENS = [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12];
  const EXT_PORTS = ['any', 'any', 'any', 'any', 'any', 'wood', 'brick', 'sheep', 'sheep', 'wheat', 'ore'];
  // Ampliación 5-6 (reglamento 2022): fichas A…Y, ZA, ZB, ZC (leídas del tablero de ejemplo, en el orden de la espiral)
  const EXT_SPIRAL_TOKENS = [6, 10, 6, 3, 12, 8, 9, 12, 8, 5, 11, 8, 4, 11, 9, 2, 11, 5, 10, 3, 9, 4, 3, 10, 5, 4, 2, 6];
  // Lugares de puerto del marco: [tipo fijo o null, fila, posición en la fila, lado], filas desde arriba y posiciones desde la izquierda.
  // Leídos de los tableros de ejemplo de los reglamentos (3-4: 2020; 5-6: 2022). En la preparación variable las 9 piezas de puerto
  // del juego básico se reparten al azar sobre esos lugares; los 2 puertos impresos en los marcos pequeños del 5-6 son fijos.
  const BASE_FRAME_PORTS = [[null, 0, 0, 'NW'], [null, 0, 1, 'NE'], [null, 1, 3, 'NE'], [null, 2, 4, 'E'], [null, 3, 3, 'SE'],
    [null, 4, 1, 'SE'], [null, 4, 0, 'SW'], [null, 3, 0, 'W'], [null, 1, 0, 'W']];
  const EXT_FRAME_PORTS = [[null, 0, 0, 'NW'], [null, 0, 1, 'NE'], [null, 0, 2, 'E'], [null, 2, 0, 'W'], [null, 3, 5, 'E'], ['any', 4, 0, 'W'],
    [null, 5, 0, 'W'], [null, 6, 0, 'SW'], [null, 6, 1, 'SE'], ['sheep', 6, 2, 'E'], [null, 5, 3, 'E']];

  // Coloca los puertos en los lugares del marco. "rows" son los tamaños de las filas de tierra (los primeros hexágonos del tablero);
  // los lugares sin tipo fijo reciben al azar los tipos de "pool".
  function framePorts(board, rows, list, pool) {
    const types = shuffle(pool.slice());
    const SIDE = { E: 0, SE: 60, SW: 120, W: 180, NW: 240, NE: 300 };
    const starts = [];
    rows.reduce((a, n) => { starts.push(a); return a + n; }, 0);
    board.ports = list.map(([fixed, r, p, side], i) => {
      const type = fixed || types.pop();
      const h = board.hexes[starts[r] + p];
      const a = SIDE[side] * Math.PI / 180;
      const e = h.edges.map(id => board.edges[id]).find(x => (x.x - h.x) * Math.cos(a) + (x.y - h.y) * Math.sin(a) > 0.8);
      const seaHex = e.hexes.map(id => board.hexes[id]).find(x => x.terrain === 'sea');
      board.vertices[e.v[0]].port = type;
      board.vertices[e.v[1]].port = type;
      return { id: i, type, edge: e.id, hex: seaHex.id };
    });
  }

  function finishLand(list, terrains, tokens) {
    const t = shuffle(terrains.slice());
    list.forEach((h, i) => { h.terrain = t[i]; });
    return list;
  }

  function generateClassic() {
    const land = rowsToHexes(['x x x', 'x x x x', 'x x x x x', 'x x x x', 'x x x']);
    finishLand(land, BASE_TERRAINS);
    const board = buildGraph(addSeaRing(land));
    const ids = board.hexes.filter(h => isLand(h.terrain) && h.terrain !== 'desert').map(h => h.id);
    if (!spiralNumbers(board, SPIRAL_TOKENS)) assignNumbers(board, ids, BASE_TOKENS);
    framePorts(board, [3, 4, 5, 4, 3], BASE_FRAME_PORTS, BASE_PORTS);
    board.robber = board.hexes.find(h => h.terrain === 'desert').id;
    board.pirate = null;
    board.homeIslands = [0];
    return board;
  }

  function generateExtended() {
    const land = rowsToHexes(['x x x', 'x x x x', 'x x x x x', 'x x x x x x', 'x x x x x', 'x x x x', 'x x x']);
    finishLand(land, EXT_TERRAINS);
    const board = buildGraph(addSeaRing(land));
    const ids = board.hexes.filter(h => isLand(h.terrain) && h.terrain !== 'desert').map(h => h.id);
    if (!spiralNumbers(board, EXT_SPIRAL_TOKENS)) assignNumbers(board, ids, EXT_TOKENS);
    framePorts(board, [3, 4, 5, 6, 5, 4, 3], EXT_FRAME_PORTS, BASE_PORTS);
    board.robber = board.hexes.find(h => h.terrain === 'desert').id;
    board.pirate = null;
    board.homeIslands = [0];
    return board;
  }

  // ---------- Piratas y Exploradores ----------
  // Composición oficial de la zona inexplorada por área (norte = luna verde, sur = sol naranja).
  // t = terrenos, sea = mar, lair = río de oro con guarida, fish = banco de pesca, spice = isla de especias.
  const PE_AREAS = {
    small: {
      1: [{ t: 6, sea: 2 }, { t: 6, sea: 2 }],
      2: [{ t: 6, sea: 2, lair: 3 }, { t: 6, sea: 2, lair: 3 }],
      3: [{ t: 6, lair: 3, fish: 2 }, { t: 6, lair: 2, fish: 3 }],
      4: [{ t: 6, sea: 1, fish: 3, spice: 3 }, { t: 6, sea: 1, fish: 3, spice: 3 }],
      5: [{ t: 6, sea: 1, fish: 3, spice: 3, lair: 3 }, { t: 6, sea: 1, fish: 3, spice: 3, lair: 3 }]
    },
    big: { // ampliación 5-6 (el escenario 1 no es oficial para 5-6: tablero del 2 con mar en lugar de guaridas)
      1: [{ t: 9, sea: 5 }, { t: 9, sea: 5 }],
      2: [{ t: 9, sea: 1, lair: 4 }, { t: 9, sea: 1, lair: 4 }],
      3: [{ t: 9, lair: 4, fish: 3 }, { t: 9, lair: 4, fish: 3 }],
      4: [{ t: 9, sea: 1, fish: 3, spice: 3 }, { t: 9, sea: 1, fish: 3, spice: 3 }],
      5: [{ t: 9, sea: 1, fish: 3, spice: 3, lair: 4 }, { t: 9, sea: 1, fish: 3, spice: 3, lair: 4 }]
    }
  };
  // Terrenos de cada área. Los 6 primeros de cada lista son las losetas estándar (leídas de «Hexágonos de este
  // escenario» del reglamento 2020); los 3 últimos, las de la ampliación 5-6.
  const PE_AREA_TERRAINS = [
    ['mountains', 'mountains', 'forest', 'pasture', 'fields', 'hills', 'mountains', 'forest', 'fields'],
    ['mountains', 'forest', 'pasture', 'fields', 'fields', 'hills', 'mountains', 'pasture', 'hills']
  ];
  const PE_AREA_TOKENS = [[4, 5, 6, 8, 9, 11, 2, 5, 9], [3, 5, 6, 8, 10, 12, 3, 4, 10]];
  const PE_LAIR_TOKENS = [4, 5, 6, 8, 10, 11, 9, 10];
  const PE_BENEFITS = ['fastTravel', 'pirate', 'fastGold'];

  // Recalcula qué vértices y aristas tocan tierra o mar visibles (los hexágonos ocultos no cuentan)
  function refreshFlags(board) {
    const vis = id => !board.hexes[id].hidden;
    board.vertices.forEach(v => { v.land = v.hexes.some(id => vis(id) && isLand(board.hexes[id].terrain)); });
    board.edges.forEach(e => {
      e.land = e.hexes.some(id => vis(id) && isLand(board.hexes[id].terrain));
      e.sea = e.hexes.length === 2 && e.hexes.some(id => vis(id) && board.hexes[id].terrain === 'sea');
    });
  }

  // Tableros oficiales 3-4 (ilustraciones de los ejemplos 2, 10, 13, 15 y 17 del reglamento 2020), en filas de hexágonos
  // de punta de arriba abajo: L isla inicial, s mar, C Consejo de Catan, G área norte (luna verde), O área sur (sol naranja).
  // Alrededor va el marco (un anillo de mar donde no puede ir el pirata ni se navega entre dos piezas del marco).
  const PE_MAPS = {
    1: ['L L s s G G', 'L L s s G G G', 'L L s s G s G G', 'L L L s s s s s s', 'L L s s O s O O', 'L L s s O O O', 'L L s s O O'],
    2: ['L L s s G G G', 'L L s s G G G G', 'L L s s G G s G G', 'L L L s s s s s s s', 'L L s s O O s O O', 'L L s s O O O O', 'L L s s O O O'],
    3: ['L L s s G G G', 'L L s s G G G G', 'L L s s G G s G G', 'L L L C s s s s s s', 'L L s s O O s O O', 'L L s s O O O O', 'L L s s O O O'],
    4: ['L L s s G G G G', 'L L s s G G G G G', 'L L s s G G s G s G', 'L L L C s s s s s s s', 'L L s s O O s O s O', 'L L s s O O O O O', 'L L s s O O O O'],
    5: ['L L s s G G G G G', 'L L s s G G G G G G', 'L L s s G G s G s G G', 'L L L C s s s s s s s s', 'L L s s O O s O s O O', 'L L s s O O O O O O', 'L L s s O O O O O']
  };
  // Tableros oficiales 5-6 (ejemplos 1-4 del reglamento 5-6 de 2022/2023); el escenario 4 usa el mismo tablero que el 3.
  const PE_MAPS56 = {
    2: ['L L s s G s G', 'L L s s G G G G', 'L L s s G G G G G', 'L L L s s G s G s G', 'L L L L s s s s s s s',
      'L L L s s O s O s O', 'L L s s O O O O O', 'L L s s O O O O', 'L L s s O s O'],
    3: ['L L s s G s G G', 'L L s s G G G G G', 'L L s s G G G s s G', 'L L L s s G s G G s G', 'L L L L C s s s s s s s',
      'L L L s s O s O O s O', 'L L s s O O O s s O', 'L L s s O O O O O', 'L L s s O s O O'],
    5: ['L L s s G s G s G', 'L L s s G G G G G G', 'L L s s G G G G G G G', 'L L L s s G s G s G s G', 'L L L L C s s s s s s s s',
      'L L L s s O s O s O s O', 'L L s s O O O O O O O', 'L L s s O O O O O O', 'L L s s O s O s O']
  };
  PE_MAPS56[1] = PE_MAPS56[2];
  PE_MAPS56[4] = PE_MAPS56[3];
  // Isla inicial 5-6: 22 hexágonos (los 15 del 3-4 y 2 pastos, 2 montañas, bosque, campo y colina de la ampliación 5-6),
  // terrenos al azar y fichas fijas (el texto dice «21 hexágonos», pero el dibujo y las 22 fichas muestran 22)
  const PE_ISLAND_TOKENS56 = [2, 9, 11, 8, 4, 10, 10, 3, 8, 6, 5, 4, 5, 3, 10, 6, 8, 4, 11, 6, 12, 9];
  const PE_ISLAND_TERRAINS56 = 'm f w p h p p m f w p f h m f p p m m f w h';
  // Isla inicial (15 hexágonos): fichas fijas en todos los escenarios; terrenos fijos en los escenarios 1 y 2 (al azar en 3-5).
  const PE_ISLAND_TOKENS = [11, 9, 3, 8, 4, 10, 6, 12, 8, 10, 4, 11, 6, 3, 5];
  const PE_ISLAND_TERRAINS = {
    1: 'm f w p h p p m f w p f h m f',
    2: 'p f w p h m p m f w p f m h f'
  };
  const T1 = { f: 'forest', h: 'hills', p: 'pasture', w: 'fields', m: 'mountains' };
  // Escenario 1: colocación fija (ejemplo 2). Por color: poblado, carretera, poblado portuario y barco con colono,
  // dados como [fila, posición en la fila de la isla, esquina o lado]. Esquinas: N NE SE S SW NW; lados: NE E SE SW W NW.
  const PE_FIXED_STARTS = [
    { settle: [5, 0, 'SE'], road: [5, 1, 'SW'], harbor: [0, 1, 'S'], ship: [0, 1, 'SE'] }, // rojo
    { settle: [0, 0, 'S'], road: [0, 0, 'SE'], harbor: [5, 1, 'SE'], ship: [6, 1, 'NE'] }, // azul
    { settle: [3, 0, 'SE'], road: [3, 1, 'SW'], harbor: [3, 2, 'S'], ship: [3, 2, 'SE'] }, // blanco
    { settle: [2, 0, 'SW'], road: [2, 0, 'SW'], harbor: [2, 1, 'SE'], ship: [3, 2, 'NE'] } // naranja
  ];
  const CORNER = { NE: -30, SE: 30, S: 90, SW: 150, NW: 210, N: 270 };
  const SIDEA = { E: 0, SE: 60, SW: 120, W: 180, NW: 240, NE: 300 };
  function nearestId(list, x, y) {
    let best = null, bd = Infinity;
    list.forEach(o => { const d = Math.hypot(o.x - x, o.y - y); if (d < bd) { bd = d; best = o.id; } });
    return best;
  }
  const cornerOf = (b, h, c) => { const a = CORNER[c] * Math.PI / 180; return nearestId(b.vertices, h.x + Math.cos(a), h.y + Math.sin(a)); };
  const sideOf = (b, h, c) => { const a = SIDEA[c] * Math.PI / 180, d = Math.sqrt(3) / 2; return nearestId(b.edges, h.x + d * Math.cos(a), h.y + d * Math.sin(a)); };

  function officialExplorers(sc, big) {
    const rows = big ? PE_MAPS56[sc] : PE_MAPS[sc];
    const cells = rowsToHexes(rows);
    const comp = PE_AREAS[big ? 'big' : 'small'][sc];
    const islandRows = [];
    let li = 0;
    const toks = big ? PE_ISLAND_TOKENS56 : PE_ISLAND_TOKENS;
    const terr = !big && PE_ISLAND_TERRAINS[sc] ? PE_ISLAND_TERRAINS[sc].split(' ').map(k => T1[k])
      : shuffle((big ? PE_ISLAND_TERRAINS56 : PE_ISLAND_TERRAINS[1]).split(' ').map(k => T1[k]));
    cells.forEach(h => {
      if (h.token === 'L') {
        h.terrain = terr[li]; h.number = toks[li]; h.start = true; li++;
        const row = Math.round(h.r + (rows.length - 1) / 2);
        (islandRows[row] || (islandRows[row] = [])).push(h);
      } else if (h.token === 'C') h.terrain = 'council';
      else if (h.token === 'G' || h.token === 'O') { h.area = h.token === 'G' ? 0 : 1; h.hid = true; h.terrain = 'sea'; }
      else h.terrain = 'sea';
    });
    [0, 1].forEach(ai => {
      const kinds = [];
      Object.entries(comp[ai]).forEach(([k, c]) => { for (let i = 0; i < c; i++) kinds.push(k); });
      const list = cells.filter(h => h.hid && h.area === ai);
      if (kinds.length !== list.length) throw new Error('Mapa de Piratas: el área ' + ai + ' tiene ' + list.length + ' celdas para ' + kinds.length + ' hexágonos');
      list.forEach(h => { h.kind = 'x'; });
    });
    const board0 = addSeaRing(cells);
    board0.forEach(h => { if (!h.token) h.frameCell = true; });
    return { board0, islandRows };
  }

  function generateExplorers(opt, big) {
    const sc = PE_AREAS.small[opt && opt.scenario] ? +opt.scenario : 2;
    return finishExplorers(sc, big, officialExplorers(sc, big), opt);
  }

  // Contenido oculto de las áreas, grafo y datos de la partida (común a los tableros 3-4 y 5-6)
  function finishExplorers(sc, big, built, opt) {
    const { board0, islandRows } = built;
    const comp = PE_AREAS[big ? 'big' : 'small'][sc];
    // reparto del contenido oculto: las guaridas y especias deben tener agua cerca
    const byKey = new Map(board0.map(h => [h.q + ',' + h.r, h]));
    const hid = board0.filter(h => h.hid);
    // tipos de cada área según el escenario (en el mapa oficial las celdas vienen sin tipo)
    [0, 1].forEach(ai => {
      const kinds = [];
      Object.entries(comp[ai]).forEach(([k, c]) => { for (let i = 0; i < c; i++) kinds.push(k); });
      hid.filter(h => h.area === ai).forEach((h, i) => { h.kind = kinds[i]; });
    });
    const water = h => !h || h.terrain === 'sea' || h.kind === 'sea' || h.kind === 'fish' || h.terrain === 'council';
    for (let attempt = 0; attempt < 400; attempt++) {
      [0, 1].forEach(ai => {
        const cells = hid.filter(h => h.area === ai);
        const ks = shuffle(cells.map(h => h.kind));
        cells.forEach((h, i) => { h.kind = ks[i]; });
      });
      const ok = hid.every(h => !['lair', 'spice'].includes(h.kind) ||
        NEIGH.filter(([dq, dr]) => water(byKey.get((h.q + dq) + ',' + (h.r + dr)))).length >= 2);
      if (ok) break;
    }
    const terrPools = [0, 1].map(ai => shuffle(PE_AREA_TERRAINS[ai].slice(0, big ? 9 : 6)));
    hid.forEach(h => {
      if (h.kind === 't') h.terrain = terrPools[h.area].pop();
      else if (h.kind === 'lair') h.terrain = 'gold';
      else h.terrain = h.kind;
    });
    const board = buildGraph(board0);
    board.hexes.forEach((hx, i) => {
      const src = board0[i];
      hx.start = !!src.start;
      hx.hidden = !!src.hid;
      if (hx.hidden) hx.area = src.area;
      if (src.kind === 'lair') hx.lair = { crews: [] };
    });
    const fishNos = shuffle([1, 2, 3, 4, 5, 6]);
    board.hexes.filter(h => h.terrain === 'fish').forEach((h, i) => { h.fishNo = fishNos[i % 6]; h.fish = 0; });
    // cada área tiene una aldea de cada ventaja; las de bonificación pirata llevan un 4 y un 5
    const pirateDie = shuffle([4, 5]);
    [0, 1].forEach(ai => {
      const ben = shuffle(PE_BENEFITS.slice());
      board.hexes.filter(h => h.terrain === 'spice' && h.area === ai).forEach((h, i) => {
        const b = ben[i % 3];
        h.spice = { benefit: b === 'pirate' ? 'pirate' + pirateDie[ai] : b, left: 0, crews: [] };
      });
    });
    board.numberPool = [0, 1].map(ai => shuffle(PE_AREA_TOKENS[ai].slice(0, big ? 9 : 6)));
    board.lairPool = shuffle(PE_LAIR_TOKENS.slice(0, big ? 8 : 6));
    board.hexes.forEach((h, i) => {
      const ns = neighborsOf(board, h);
      h.frame = !!board0[i].frameCell;
      h.nearStart = !h.start && ns.some(n => n.start);
    });
    // las aristas entre dos piezas del marco (o en su borde exterior) no son rutas
    board.edges.forEach(e => { if (e.hexes.every(id => board.hexes[id].frame)) e.offBoard = true; });
    {
      const idOf = h => board.hexes.find(x => x.q === h.q && x.r === h.r);
      const at = ([r, k]) => idOf(islandRows[r][k]);
      // lugares marcados para los poblados portuarios (escenarios 2-5): las dos esquinas este del último hexágono de cada fila
      board.harborSites = sc === 1 && !big ? null : islandRows.flatMap(row => { const h = idOf(row[row.length - 1]); return [cornerOf(board, h, 'NE'), cornerOf(board, h, 'SE')]; });
      if (sc === 1 && !big) {
        board.fixedStarts = PE_FIXED_STARTS.map(f => ({
          settle: cornerOf(board, at(f.settle), f.settle[2]), road: sideOf(board, at(f.road), f.road[2]),
          harbor: cornerOf(board, at(f.harbor), f.harbor[2]), ship: sideOf(board, at(f.ship), f.ship[2])
        }));
      }
    }
    board.homeIslands = [board.hexes.find(h => h.start).island];
    board.robber = null;
    board.pirate = null;
    board.ports = [];
    board.scenario = sc;
    refreshFlags(board);
    return board;
  }

  // ---------- Mercaderes y Bárbaros ----------
  const TRADE_HEXES = ['castle', 'quarry', 'glassworks'];
  const axialDist = h => (Math.abs(h.q) + Math.abs(h.r) + Math.abs(h.q + h.r)) / 2;
  // Isla básica (radio 2) o de la ampliación 5-6 en coordenadas axiales
  function tbLand(big) {
    return big ? rowsToHexes(['x x x', 'x x x x', 'x x x x x', 'x x x x x x', 'x x x x x', 'x x x x', 'x x x']).map(h => ({ q: h.q, r: h.r }))
      : rowsToHexes(['x x x', 'x x x x', 'x x x x x', 'x x x x', 'x x x']).map(h => ({ q: h.q, r: h.r }));
  }
  function tbFinish(board) {
    board.pirate = null;
    board.homeIslands = [0];
    return board;
  }
  const removeOnce = (list, items) => { const l = list.slice(); items.forEach(x => { const i = l.indexOf(x); if (i >= 0) l.splice(i, 1); }); return l; };
  const angleOf = h => Math.atan2(h.y, h.x);

  // Pescadores: lago(s) en el interior y caladeros en la costa (3 cruces cada uno)
  function tbFishermen(big) {
    const land = tbLand(big);
    const terr = shuffle((big ? EXT_TERRAINS : BASE_TERRAINS).map(t => t === 'desert' ? 'lake' : t));
    const keys = new Set(land.map(h => h.q + ',' + h.r));
    const isInner = h => NEIGH.every(([dq, dr]) => keys.has((h.q + dq) + ',' + (h.r + dr)));
    for (let k = 0; k < 200; k++) {
      land.forEach((h, i) => { h.terrain = terr[i]; });
      if (land.filter(h => h.terrain === 'lake').every(isInner)) break;
      shuffle(terr);
    }
    const board = buildGraph(addSeaRing(land));
    assignNumbers(board, board.hexes.filter(h => isLand(h.terrain) && h.terrain !== 'lake').map(h => h.id), big ? EXT_TOKENS : BASE_TOKENS);
    placePorts(board, big ? EXT_PORTS : BASE_PORTS);
    const portHex = new Set(board.ports.map(p => p.hex));
    const coast = board.hexes.filter(h => h.terrain === 'sea' && !portHex.has(h.id) && h.vertices.filter(v => board.vertices[v].land).length === 3);
    coast.sort((x, y) => angleOf(x) - angleOf(y));
    const nums = shuffle(big ? [4, 5, 5, 6, 8, 9, 9, 10] : [4, 5, 6, 8, 9, 10]);
    const n = nums.length, off = Math.floor(Math.random() * coast.length);
    const used = new Set();
    board.fishing = [];
    for (let i = 0; i < n; i++) {
      let idx = (off + Math.round(i * coast.length / n)) % coast.length;
      for (let t = 0; t < coast.length && used.has(coast[idx].id); t++) idx = (idx + 1) % coast.length;
      const h = coast[idx];
      used.add(h.id);
      board.fishing.push({ hex: h.id, number: nums[i], vertices: h.vertices.filter(v => board.vertices[v].land) });
    }
    board.robber = null;
    return tbFinish(board);
  }

  // Ríos: recorridos desde la costa hacia el interior; el extremo interior de dos de ellos es un pantano
  function tbRivers(big) {
    const land = tbLand(big);
    const keys = new Map(land.map(h => [h.q + ',' + h.r, h]));
    const lens = big ? [3, 4, 3] : [3, 4];
    let rivers;
    for (let att = 0; att < 500; att++) {
      rivers = [];
      const taken = new Set();
      let ok = true;
      for (const L of lens) {
        const coastal = land.filter(h => !taken.has(h.q + ',' + h.r) && axialDist(h) === (big ? 3 : 2) &&
          ![...taken].some(k => { const [q, r] = k.split(',').map(Number); return Math.abs(q - h.q) + Math.abs(r - h.r) + Math.abs(q + r - h.q - h.r) <= 2; }));
        if (!coastal.length) { ok = false; break; }
        const path = [coastal[Math.floor(Math.random() * coastal.length)]];
        while (path.length < L) {
          const last = path[path.length - 1];
          const nx = shuffle(NEIGH.slice()).map(([dq, dr]) => keys.get((last.q + dq) + ',' + (last.r + dr)))
            .filter(h => h && !path.includes(h) && !taken.has(h.q + ',' + h.r) && axialDist(h) <= axialDist(last) &&
              ![...taken].some(k => { const [q, r] = k.split(',').map(Number); return Math.abs(q - h.q) + Math.abs(r - h.r) + Math.abs(q + r - h.q - h.r) <= 1; }));
          if (!nx.length) break;
          path.push(nx[0]);
        }
        if (path.length < L) { ok = false; break; }
        path.forEach(h => taken.add(h.q + ',' + h.r));
        rivers.push(path);
      }
      if (ok) break;
    }
    const swamps = new Set([rivers[0][rivers[0].length - 1], rivers[1][rivers[1].length - 1]]);
    const riverTerr = shuffle(big ? ['mountains', 'mountains', 'mountains', 'hills', 'hills', 'pasture', 'pasture', 'pasture']
      : shuffle(['mountains', 'mountains', 'hills', 'hills', 'pasture', 'pasture']).slice(0, 5));
    const rest = shuffle(big ? removeOnce(EXT_TERRAINS, ['mountains', 'mountains', 'mountains', 'hills', 'hills', 'pasture', 'pasture', 'pasture', 'desert', 'desert'])
      : removeOnce(BASE_TERRAINS, ['mountains', 'mountains', 'hills', 'hills', 'pasture', 'pasture', 'desert']));
    rivers.forEach((path, ri) => path.forEach((h, i) => { h.river = ri; h.riverIdx = i; h.terrain = swamps.has(h) ? 'swamp' : riverTerr.pop(); }));
    land.filter(h => h.river === undefined).forEach(h => { h.terrain = rest.pop() || 'fields'; });
    const all = addSeaRing(land);
    const board = buildGraph(all);
    board.hexes.forEach((hx, i) => { if (all[i].river !== undefined) { hx.river = all[i].river; hx.riverIdx = all[i].riverIdx; } });
    const ids = board.hexes.filter(h => isLand(h.terrain) && h.terrain !== 'swamp').map(h => h.id);
    assignNumbers(board, ids, big ? EXT_TOKENS : removeOnce(BASE_TOKENS, [2]));
    if (!big) { const h12 = board.hexes.find(h => h.number === 12); if (h12) h12.number2 = 2; }
    // sitios de puente: aristas que cruza cada río (entre hexágonos seguidos y desde la fuente hacia tierra)
    const byKey = new Map(board.hexes.map(h => [h.q + ',' + h.r, h]));
    const edgeBetween = (a, b) => a.edges.find(e => board.edges[e].hexes.includes(b.id));
    board.bridgeSites = [];
    rivers.forEach((path, ri) => {
      const hs = path.map(h => byKey.get(h.q + ',' + h.r));
      for (let i = 0; i + 1 < hs.length; i++) board.bridgeSites.push(edgeBetween(hs[i], hs[i + 1]));
      const last = hs[hs.length - 1], prev = hs[hs.length - 2];
      const dq = last.q - prev.q, dr = last.r - prev.r;
      let nx = byKey.get((last.q + dq) + ',' + (last.r + dr));
      if (!nx || !isLand(nx.terrain) || nx.river !== undefined) nx = C.neighborsOf(board, last).find(h => isLand(h.terrain) && h.river === undefined);
      if (nx) board.bridgeSites.push(edgeBetween(last, nx));
    });
    placePorts(board, big ? EXT_PORTS : BASE_PORTS);
    board.robber = board.hexes.find(h => h.terrain === 'swamp').id;
    return tbFinish(board);
  }

  // Caravanas: el oasis (u oasis) en el centro; 3 flechas por oasis en esquinas alternas
  function tbCaravans(big) {
    const land = tbLand(big);
    const terr = shuffle((big ? EXT_TERRAINS : BASE_TERRAINS).filter(t => t !== 'desert'));
    const oases = big ? [{ q: -1, r: 0 }, { q: 1, r: 0 }] : [{ q: 0, r: 0 }];
    land.forEach(h => { h.terrain = oases.some(o => o.q === h.q && o.r === h.r) ? 'oasis' : terr.pop(); });
    const board = buildGraph(addSeaRing(land));
    assignNumbers(board, board.hexes.filter(h => isLand(h.terrain) && h.terrain !== 'oasis').map(h => h.id), big ? EXT_TOKENS : BASE_TOKENS);
    placePorts(board, big ? EXT_PORTS : BASE_PORTS);
    board.oases = board.hexes.filter(h => h.terrain === 'oasis').map((h, i) => ({ hex: h.id, arrows: h.vertices.filter((v, k) => k % 2 === i % 2) }));
    board.robber = null;
    return tbFinish(board);
  }

  // Ataque bárbaro: castillo(s) y desierto(s) en la costa; los hexágonos costeros llevan números distintos
  function tbBarbarians(big) {
    const land = tbLand(big);
    const R = big ? 3 : 2;
    const outer = land.filter(h => {
      const keys = new Set(land.map(x => x.q + ',' + x.r));
      return NEIGH.some(([dq, dr]) => !keys.has((h.q + dq) + ',' + (h.r + dr)));
    });
    outer.forEach(h => { const c = hexCenter(h.q, h.r); h.ang = Math.atan2(c.y, c.x); });
    outer.sort((a, b) => a.ang - b.ang);
    const n = outer.length;
    const top = outer.reduce((b, h) => (hexCenter(h.q, h.r).y < hexCenter(b.q, b.r).y ? h : b), outer[0]);
    const ti = outer.indexOf(top);
    const special = big ? { [ti]: 'castle', [(ti + n / 2) % n]: 'castle', [(ti + 4) % n]: 'desert', [(ti + n / 2 + 4) % n]: 'desert' }
      : { [ti]: 'castle', [(ti + n / 2) % n]: 'desert' };
    const coastTerr = shuffle(big ? ['forest', 'forest', 'forest', 'hills', 'hills', 'hills', 'pasture', 'pasture', 'mountains', 'mountains', 'fields', 'fields']
      : ['forest', 'forest', 'hills', 'hills', 'pasture', 'pasture', 'pasture', 'mountains', 'fields', 'fields']);
    outer.forEach((h, i) => { h.terrain = special[i] || coastTerr.pop(); h.coastal = !special[i]; });
    const inner = land.filter(h => !outer.includes(h));
    const innerTerr = shuffle(big ? ['forest', 'forest', 'hills', 'hills', 'pasture', 'pasture', 'pasture', 'mountains', 'mountains', 'mountains', 'fields', 'fields', 'fields', 'fields']
      : ['forest', 'pasture', 'hills', 'mountains', 'mountains', 'fields', 'fields']);
    inner.forEach(h => { h.terrain = innerTerr.pop(); });
    const all = addSeaRing(land);
    const board = buildGraph(all);
    board.hexes.forEach((hx, i) => { if (all[i].coastal) hx.coastal = true; });
    const coastNums = big ? [2, 3, 4, 5, 5, 6, 8, 9, 9, 10, 11, 12] : [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
    assignNumbers(board, board.hexes.filter(h => h.coastal).map(h => h.id), coastNums);
    assignNumbers(board, board.hexes.filter(h => isLand(h.terrain) && !h.coastal && h.terrain !== 'castle' && h.terrain !== 'desert').map(h => h.id),
      big ? removeOnce(EXT_TOKENS, [2, 12].concat(coastNums)) : [3, 4, 5, 6, 8, 9, 10]);
    placePorts(board, big ? EXT_PORTS : BASE_PORTS);
    // orden horario de comprobación: empieza en un hexágono costero junto a un castillo
    const castles = board.hexes.filter(h => h.terrain === 'castle');
    const ring = board.hexes.filter(h => h.coastal || h.terrain === 'castle' || (h.terrain === 'desert' && C.neighborsOf(board, h).some(x => x.terrain === 'sea')));
    ring.sort((a, b) => angleOf(a) - angleOf(b));
    const ci = ring.indexOf(castles[0]);
    board.coastOrder = ring.slice(ci + 1).concat(ring.slice(0, ci)).filter(h => h.coastal).map(h => h.id);
    board.castles = castles.map(h => h.id);
    board.robber = null;
    return tbFinish(board);
  }

  // Añade la plaza central de un hexágono comercial y sus caminos interiores
  function addPlaza(board, hex, corners) {
    const id = board.vertices.length;
    board.vertices.push({ id, x: +hex.x.toFixed(4), y: +hex.y.toFixed(4), hexes: [hex.id], adj: [], edges: [], land: true, port: null, plaza: hex.id });
    corners.forEach(c => {
      const e = board.edges.length;
      const vc = board.vertices[c];
      board.edges.push({ id: e, v: [id, c], hexes: [hex.id], x: +((hex.x + vc.x) / 2).toFixed(4), y: +((hex.y + vc.y) / 2).toFixed(4),
        angle: +(Math.atan2(vc.y - hex.y, vc.x - hex.x) * 180 / Math.PI).toFixed(2), land: true, sea: false, interior: hex.id });
      board.vertices[id].adj.push(c); vc.adj.push(id);
      board.vertices[id].edges.push(e); vc.edges.push(e);
      hex.edges.push(e);
    });
    hex.plaza = id;
  }

  // Mercaderes y Bárbaros: hexágonos comerciales en la costa (con plaza central), 3 bárbaros en caminos
  function tbTraders(big) {
    const land = tbLand(big);
    const keys = new Set(land.map(x => x.q + ',' + x.r));
    const seaN = h => NEIGH.filter(([dq, dr]) => !keys.has((h.q + dq) + ',' + (h.r + dr))).length;
    const outer = land.filter(h => seaN(h) > 0);
    outer.forEach(h => { const c = hexCenter(h.q, h.r); h.ang = Math.atan2(c.y, c.x); });
    outer.sort((a, b) => a.ang - b.ang);
    const kinds = big ? ['castle', 'quarry', 'glassworks', 'desert', 'quarry', 'glassworks', 'desert', 'quarry', 'glassworks'] : ['castle', 'quarry', 'glassworks'];
    const corners = outer.filter(h => seaN(h) === 3);
    let spots;
    if (big) {
      const n = outer.length, off = Math.floor(Math.random() * 2);
      spots = kinds.map((k, i) => outer[(off + Math.round(i * n / kinds.length)) % n]);
    } else {
      const off = Math.floor(Math.random() * 2);
      spots = [0, 2, 4].map(i => corners[(i + off) % corners.length]);
    }
    spots.forEach((h, i) => { h.terrain = kinds[i]; });
    const terr = shuffle(big ? removeOnce(EXT_TERRAINS, ['desert', 'desert', 'forest', 'pasture', 'fields', 'hills', 'mountains', 'pasture', 'fields'])
      : removeOnce(BASE_TERRAINS, ['desert', 'pasture', 'fields']));
    land.filter(h => !h.terrain).forEach(h => { h.terrain = terr.pop() || 'fields'; });
    const board = buildGraph(addSeaRing(land));
    const num = board.hexes.filter(h => isLand(h.terrain) && !TRADE_HEXES.includes(h.terrain) && h.terrain !== 'desert').map(h => h.id);
    assignNumbers(board, num, big ? shuffle(EXT_TOKENS.slice()).slice(0, num.length) : removeOnce(BASE_TOKENS, [2, 12]));
    board.hexes.filter(h => TRADE_HEXES.includes(h.terrain)).forEach(h => {
      // plaza unida a las esquinas que tocan otro terreno (en 5-6, a todas: sus hexágonos permiten construir en la costa)
      const cs = h.vertices.filter(v => big || board.vertices[v].hexes.some(o => o !== h.id && isLand(board.hexes[o].terrain)));
      addPlaza(board, h, cs);
      h.tradeCoastBuild = big;
    });
    placePorts(board, big ? EXT_PORTS : BASE_PORTS);
    board.robber = null;
    return tbFinish(board);
  }

  function generateTraders(opt, big) {
    const sc = +(opt && opt.scenario) || 1;
    let b;
    if (sc === 1) b = tbFishermen(big);
    else if (sc === 2) b = tbRivers(big);
    else if (sc === 3) b = tbCaravans(big);
    else if (sc === 4) b = tbBarbarians(big);
    else b = tbTraders(big);
    b.scenario = sc;
    return b;
  }

  function generateBoard(mode, opt) {
    let b;
    if (mode === 'extended') b = generateExtended();
    else if (mode === 'seafarers' || mode === 'seafarers56') b = C.SF.generate(opt, mode === 'seafarers56');
    else if (mode === 'explorers') b = generateExplorers(opt, false);
    else if (mode === 'explorers56') b = generateExplorers(opt, true);
    else if (mode === 'traders') b = generateTraders(opt, false);
    else if (mode === 'traders56') b = generateTraders(opt, true);
    else b = generateClassic();
    delete b._byKey;
    return b;
  }

  Object.assign(C, { RES, TERRAIN_RES, PIPS, LAND, isLand, shuffle, generateBoard, neighborsOf, hexCenter, refreshFlags, TRADE_HEXES });
  C._B = { buildGraph, spiralNumbers, EXT_SPIRAL_TOKENS, addSeaRing, assignNumbers, rowsToHexes, EXT_TERRAINS, EXT_TOKENS, BASE_TERRAINS, BASE_TOKENS };
})(typeof window !== 'undefined' ? window : globalThis);
