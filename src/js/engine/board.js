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
  const NO_TOKEN = ['desert', 'swamp', 'lake', 'oasis', 'castle', 'quarry', 'glassworks'];
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
      order.forEach(h => { h.number = NO_TOKEN.includes(h.terrain) ? undefined : sequence[k++]; if (h.number === undefined) delete h.number; });
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
  // Fichas de cada área: las 6 estándar (lista de componentes de la 6.ª edición, que coincide con las planchas de 2020) y las
  // 3 de la ampliación 5-6. Norte = luna verde (loro en 2025), sur = sol naranja (ganso).
  const PE_AREA_TOKENS = [[3, 4, 5, 6, 9, 10, 2, 5, 9], [4, 5, 8, 9, 10, 11, 3, 4, 10]];
  // Bancos de pesca: los del norte llevan el 1, 2 y 3; los del sur, el 4, 5 y 6
  const PE_FISH_NOS = [[1, 2, 3], [4, 5, 6]];
  // Fichas de guarida: el reglamento solo muestra el 5 (ejemplo 12) y las de la ampliación 5-6 (9 y 10); las demás son propias
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
    const hid = board0.filter(h => h.hid);
    // tipos de cada área según el escenario (en el mapa oficial las celdas vienen sin tipo)
    [0, 1].forEach(ai => {
      const kinds = [];
      Object.entries(comp[ai]).forEach(([k, c]) => { for (let i = 0; i < c; i++) kinds.push(k); });
      hid.filter(h => h.area === ai).forEach((h, i) => { h.kind = kinds[i]; });
    });
    // las losetas de cada zona se barajan y se reparten al azar (como en el reglamento)
    [0, 1].forEach(ai => {
      const cells = hid.filter(h => h.area === ai);
      const ks = shuffle(cells.map(h => h.kind));
      cells.forEach((h, i) => { h.kind = ks[i]; });
    });
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
    [0, 1].forEach(ai => {
      const nos = shuffle(PE_FISH_NOS[ai].slice());
      board.hexes.filter(h => h.terrain === 'fish' && h.area === ai).forEach((h, i) => { h.fishNo = nos[i % 3]; h.fish = 0; });
    });
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
  // puertos de Mercaderes y Bárbaros: los lugares fijos del marco (las piezas de marco que cambia la expansión los mantienen)
  const tbPorts = (board, big) => big ? framePorts(board, [3, 4, 5, 6, 5, 4, 3], EXT_FRAME_PORTS, BASE_PORTS) : framePorts(board, [3, 4, 5, 4, 3], BASE_FRAME_PORTS, BASE_PORTS);
  const ROW34 = [0, 3, 7, 12, 16];
  const ROW56 = [0, 3, 7, 12, 18, 23, 27];
  const removeOnce = (list, items) => { const l = list.slice(); items.forEach(x => { const i = l.indexOf(x); if (i >= 0) l.splice(i, 1); }); return l; };
  const angleOf = h => Math.atan2(h.y, h.x);

  // Caladeros 3-4 del reglamento: [hexágono de la costa, hexágono vecino, número] (fila, posición), en sentido horario desde arriba
  const FISH34 = [[[0, 0], [0, 1], 6], [[1, 3], [2, 4], 8], [[2, 4], [3, 3], 9], [[4, 0], [4, 1], 5], [[3, 0], [4, 0], 4], [[0, 0], [1, 0], 10]];
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
    tbPorts(board, big);
    if (!big) {
      // 3-4: caladeros como en la ilustración del reglamento (cada uno entre dos hexágonos de la costa)
      const hx = (r, c) => board.hexes[ROW34[r] + c];
      board.fishing = FISH34.map(([a, b, n]) => {
        const A = hx(...a), B = hx(...b);
        const sea = board.hexes.find(h => h.terrain === 'sea' && C.neighborsOf(board, h).includes(A) && C.neighborsOf(board, h).includes(B));
        return { hex: sea.id, number: n, vertices: sea.vertices.filter(v => board.vertices[v].land) };
      });
      board.robber = null;
      return tbFinish(board);
    }
    // 5-6: un caladero en cada espacio de la costa sin puerto, repartidos por el marco
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

  // Ríos: tableros oficiales 3-4 y 5-6
  function tbRivers(big) {
    return big ? tbRiversOfficial(true) : tbRivers34();
  }
  // Ríos 3-4 (ilustración del reglamento): el río de 4 hexágonos ocupa la 2.ª fila (pantano, pasto, colina, montaña, de oeste
  // a este) y el de 3 la 4.ª (pantano, colina, montaña); los pantanos están en la desembocadura, junto al marco oeste.
  // Sitios de puente: la desembocadura y los lados entre hexágonos seguidos del río (7 en total).
  function tbRivers34() { return tbRiversOfficial(false); }
  // Ríos 5-6 (ilustración del reglamento 5-6): el río de 3 hexágonos baja desde la costa norte (pantano, colina, montaña), el de 4
  // sube desde la costa sur (pantano, pasto, colina, montaña) por la segunda columna, y el río de la ampliación (montaña, pasto,
  // pasto) desemboca en la costa este por la fila del medio. Todas las fichas de la ampliación en espiral, sin pantanos.
  const RIVERS = {
    false: { rows: ROW34, rivers: [[[1, 0], [1, 1], [1, 2], [1, 3]], [[3, 0], [3, 1], [3, 2]]], terr: [['swamp', 'pasture', 'hills', 'mountains'], ['swamp', 'hills', 'mountains']],
      mouths: [[0, 'W'], [0, 'W']] },
    true: { rows: ROW56, rivers: [[[6, 1], [5, 1], [4, 1], [3, 1]], [[0, 1], [1, 1], [2, 1]], [[3, 5], [3, 4], [3, 3]]],
      terr: [['swamp', 'pasture', 'hills', 'mountains'], ['swamp', 'hills', 'mountains'], ['pasture', 'pasture', 'mountains']],
      mouths: [[0, 'SE'], [0, 'NE'], [0, 'E']] }
  };
  function tbRiversOfficial(big) {
    const R0 = RIVERS[big];
    const land = tbLand(big);
    const at = (r, c) => land[R0.rows[r] + c];
    const rivers = R0.rivers.map(path => path.map(([r, c]) => at(r, c)));
    const rt = R0.terr;
    rivers.forEach((path, ri) => path.forEach((h, i) => { h.river = ri; h.riverIdx = i; h.terrain = rt[ri][i]; }));
    const used = rt.flat().filter(t => t !== 'swamp').concat(['desert']);
    if (big) used.push('desert');
    const rest = shuffle(removeOnce(big ? EXT_TERRAINS : BASE_TERRAINS, used));
    land.filter(h => h.river === undefined).forEach(h => { h.terrain = rest.pop(); });
    const all = addSeaRing(land);
    const board = buildGraph(all);
    board.hexes.forEach((hx, i) => { if (all[i].river !== undefined) { hx.river = all[i].river; hx.riverIdx = all[i].riverIdx; } });
    const noSwamp = board.hexes.filter(h => isLand(h.terrain) && h.terrain !== 'swamp').map(h => h.id);
    if (big) {
      // 5-6: todas las fichas de la ampliación en espiral (no se aplica lo de la «2» con la «12»)
      if (!spiralNumbers(board, EXT_SPIRAL_TOKENS)) assignNumbers(board, noSwamp, EXT_TOKENS);
    } else {
      // fichas en espiral sin la «2» (B), saltando los pantanos; la «2» va con la «12»
      if (!spiralNumbers(board, SPIRAL_TOKENS.filter((x, i) => i !== 1))) assignNumbers(board, noSwamp, removeOnce(BASE_TOKENS, [2]));
      const h12 = board.hexes.find(h => h.number === 12); if (h12) h12.number2 = 2;
    }
    const edgeBetween = (a, b) => a.edges.find(e => board.edges[e].hexes.includes(b.id));
    board.bridgeSites = [];
    rivers.forEach((path, ri) => {
      const hs = path.map(h => board.hexes[land.indexOf(h)]);
      board.bridgeSites.push(sideOf(board, hs[R0.mouths[ri][0]], R0.mouths[ri][1]));
      for (let i = 0; i + 1 < hs.length; i++) board.bridgeSites.push(edgeBetween(hs[i], hs[i + 1]));
    });
    tbPorts(board, big);
    board.robber = board.hexes.find(h => h.terrain === 'swamp').id;
    return tbFinish(board);
  }

  // Caravanas: el oasis (u oasis) en el centro; 3 flechas por oasis en esquinas alternas
  function tbCaravans(big) {
    const land = tbLand(big);
    const terr = shuffle((big ? EXT_TERRAINS : BASE_TERRAINS).filter(t => t !== 'desert'));
    // oasis en el centro (3-4) o, en 5-6, en la 3.ª fila (2.º hexágono) y la 5.ª fila (4.º hexágono), como en el reglamento
    const oases = big ? [land[ROW56[2] + 1], land[ROW56[4] + 3]] : [land[ROW34[2] + 2]];
    land.forEach(h => { h.terrain = oases.includes(h) ? 'oasis' : terr.pop(); });
    const board = buildGraph(addSeaRing(land));
    assignNumbers(board, board.hexes.filter(h => isLand(h.terrain) && h.terrain !== 'oasis').map(h => h.id), big ? EXT_TOKENS : BASE_TOKENS);
    tbPorts(board, big);
    // las flechas del oasis apuntan a las esquinas noreste, sur y noroeste
    board.oases = board.hexes.filter(h => h.terrain === 'oasis').map(h => ({ hex: h.id, arrows: h.vertices.filter((v, k) => k % 2 === 0) }));
    board.robber = null;
    return tbFinish(board);
  }

  // Ataque bárbaro: tableros oficiales 3-4 y 5-6
  function tbBarbarians(big) {
    return tbBarbariansOfficial(big);
  }
  // Ataque bárbaro 3-4 (ilustración del reglamento): desierto arriba a la derecha, castillo abajo a la izquierda,
  // fichas fijas; solo los terrenos se reparten al azar (10 en la costa, 7 en el interior).
  // 5-6: castillos en los extremos de la fila del medio, desiertos al final de la 3.ª fila y al principio de la 5.ª.
  const BARB = {
    false: { sizes: [3, 4, 5, 4, 3], rows: ROW34, special: { '0,2': 'desert', '4,0': 'castle' },
      tokens: [[3, 8, 0], [9, 4, 5, 10], [12, 6, 10, 8, 11], [4, 9, 3, 5], [0, 6, 2]],
      coast: ['forest', 'forest', 'hills', 'hills', 'pasture', 'pasture', 'pasture', 'mountains', 'fields', 'fields'],
      inner: ['forest', 'pasture', 'hills', 'mountains', 'mountains', 'fields', 'fields'] },
    true: { sizes: [3, 4, 5, 6, 5, 4, 3], rows: ROW56, special: { '2,4': 'desert', '4,0': 'desert', '3,0': 'castle', '3,5': 'castle' },
      tokens: [[12, 9, 3], [4, 5, 10, 8], [5, 11, 6, 3, 0], [0, 8, 10, 4, 6, 0], [0, 3, 8, 11, 9], [6, 4, 9, 10], [2, 5, 11]],
      coast: ['forest', 'forest', 'forest', 'hills', 'hills', 'hills', 'pasture', 'pasture', 'mountains', 'mountains', 'fields', 'fields'],
      inner: ['forest', 'forest', 'hills', 'hills', 'pasture', 'pasture', 'pasture', 'mountains', 'mountains', 'mountains', 'fields', 'fields', 'fields', 'fields'] }
  };
  function tbBarbariansOfficial(big) {
    const B0 = BARB[big];
    const land = tbLand(big);
    const coastTerr = shuffle(B0.coast.slice());
    const innerTerr = shuffle(B0.inner.slice());
    const last = B0.sizes.length - 1;
    B0.sizes.forEach((n, r) => { for (let c = 0; c < n; c++) {
      const h = land[B0.rows[r] + c];
      const outer = r === 0 || r === last || c === 0 || c === n - 1;
      const sp = B0.special[r + ',' + c];
      if (sp) h.terrain = sp;
      else { h.terrain = outer ? coastTerr.pop() : innerTerr.pop(); h.coastal = outer; }
      if (B0.tokens[r][c]) h.number = B0.tokens[r][c];
    } });
    const all = addSeaRing(land);
    const board = buildGraph(all);
    board.hexes.forEach((hx, i) => { if (all[i].coastal) hx.coastal = true; });
    tbPorts(board, big);
    return barbFinish(board);
  }
  function barbFinish(board) {
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

  // Mercaderes y Bárbaros: tableros oficiales 3-4 y 5-6 (hexágonos comerciales con plaza central)
  function tbTraders(big) {
    return big ? tbTraders56() : tbTraders34();
  }
  // Mercaderes y Bárbaros 5-6 (ilustración del reglamento 5-6): isla de 4-5-6-7-6-5-4 hexágonos con 3 canteras, 3 vidrierías,
  // el castillo en el centro y 2 desiertos; fichas fijas; los puertos se reparten por la costa (el marco es distinto).
  const TR56 = [
    ['quarry', 6, 10, 'glassworks'], [4, 'desert', 3, 12, 8], [3, 5, 10, 5, 9, 11], ['glassworks', 8, 12, 'castle', 2, 6, 'quarry'],
    [11, 9, 4, 9, 5, 3], [6, 2, 11, 'desert', 4], ['quarry', 10, 8, 'glassworks']
  ];
  function tbTraders56() {
    const land = rowsToHexes(TR56.map(r => r.map(() => 'x').join(' ')));
    const terr = shuffle(removeOnce(EXT_TERRAINS, ['desert', 'desert']));
    let k = 0;
    TR56.flat().forEach(c => {
      const h = land[k++];
      if (typeof c === 'string') h.terrain = c;
      else { h.terrain = terr.pop(); h.number = c; }
    });
    const board = buildGraph(addSeaRing(land));
    const starts = [0];
    TR56.forEach(r => starts.push(starts[starts.length - 1] + r.length));
    const hx = (r, c) => board.hexes[starts[r] + c];
    board.barbStart = [sideOf(board, hx(0, 2), 'SE'), sideOf(board, hx(3, 1), 'SW'), sideOf(board, hx(5, 3), 'E')];
    board.hexes.filter(h => TRADE_HEXES.includes(h.terrain)).forEach(h => {
      // las canteras y vidrierías de la ampliación permiten construir también en la costa (6 esquinas); el castillo, en sus 6
      addPlaza(board, h, h.vertices.slice());
      h.tradeCoastBuild = true;
    });
    placePorts(board, EXT_PORTS);
    board.robber = null;
    return tbFinish(board);
  }

  // Mercaderes y Bárbaros 3-4 (ilustración del reglamento): castillo en la esquina oeste, cantera en la noreste y vidriería
  // en la sureste; fichas en espiral sin la «2» ni la «12»; los 3 bárbaros empiezan en los caminos marcados con una cruz.
  function tbTraders34() {
    const land = tbLand(false);
    const at = (r, c) => land[ROW34[r] + c];
    at(2, 0).terrain = 'castle'; at(0, 2).terrain = 'quarry'; at(4, 2).terrain = 'glassworks';
    const terr = shuffle(removeOnce(BASE_TERRAINS, ['desert', 'pasture', 'fields']));
    land.filter(h => !h.terrain).forEach(h => { h.terrain = terr.pop(); });
    const board = buildGraph(addSeaRing(land));
    const seq = SPIRAL_TOKENS.filter(x => x !== 2 && x !== 12);
    if (!spiralNumbers(board, seq)) assignNumbers(board, board.hexes.filter(h => isLand(h.terrain) && !TRADE_HEXES.includes(h.terrain)).map(h => h.id), removeOnce(BASE_TOKENS, [2, 12]));
    const hx = (r, c) => board.hexes[ROW34[r] + c];
    board.barbStart = [sideOf(board, hx(0, 1), 'SE'), sideOf(board, hx(2, 1), 'SW'), sideOf(board, hx(3, 2), 'E')];
    board.hexes.filter(h => TRADE_HEXES.includes(h.terrain)).forEach(h => {
      const cs = h.vertices.filter(v => board.vertices[v].hexes.some(o => o !== h.id && isLand(board.hexes[o].terrain)));
      addPlaza(board, h, cs);
      h.tradeCoastBuild = false;
    });
    tbPorts(board, false);
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
