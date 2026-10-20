// Geometría del tablero y generación de mapas para cada modo de juego.
(function (root) {
  const C = root.Catan || (root.Catan = {});

  const RES = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
  const TERRAIN_RES = { forest: 'wood', hills: 'brick', pasture: 'sheep', fields: 'wheat', mountains: 'ore' };
  const LAND = ['forest', 'hills', 'pasture', 'fields', 'mountains', 'desert', 'gold'];
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
    assignNumbers(board, ids, BASE_TOKENS);
    placePorts(board, BASE_PORTS);
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
    assignNumbers(board, ids, EXT_TOKENS);
    placePorts(board, EXT_PORTS);
    board.robber = board.hexes.find(h => h.terrain === 'desert').id;
    board.pirate = null;
    board.homeIslands = [0];
    return board;
  }

  // Navegantes: "Hacia nuevas costas" (adaptado). x = isla principal, y = islas exteriores
  const SEAFARERS_ROWS = [
    '. . . . . . . .',
    '. x x x . . y y .',
    '. x x x x . . y . .',
    '. x x x x x . . . y .',
    '. x x x x . y . y .',
    '. x x x . y y . .',
    '. . . . . . . .'
  ];
  function generateSeafarers() {
    const all = rowsToHexes(SEAFARERS_ROWS);
    const main = all.filter(h => h.token === 'x');
    const outer = all.filter(h => h.token === 'y');
    finishLand(main, BASE_TERRAINS);
    finishLand(outer, ['gold', 'gold', 'forest', 'hills', 'pasture', 'fields', 'mountains', 'mountains']);
    all.filter(h => h.token === '.').forEach(h => { h.terrain = 'sea'; });
    const board = buildGraph(all);
    const mainIsland = board.hexes.find(h => h.terrain !== 'sea' && main.some(m => m.q === h.q && m.r === h.r)).island;
    const mainIds = board.hexes.filter(h => h.island === mainIsland && h.terrain !== 'desert').map(h => h.id);
    assignNumbers(board, mainIds, BASE_TOKENS);
    const outerIds = board.hexes.filter(h => h.island >= 0 && h.island !== mainIsland).map(h => h.id);
    assignNumbers(board, outerIds, [3, 4, 5, 6, 8, 9, 10, 11]);
    placePorts(board, BASE_PORTS, mainIsland);
    board.robber = board.hexes.find(h => h.terrain === 'desert').id;
    // pirata: hexágono de mar más céntrico entre islas
    const seas = board.hexes.filter(h => h.terrain === 'sea' && neighborsOf(board, h).length === 6);
    seas.sort((a, b) => Math.abs(a.x - 1) + Math.abs(a.y) - (Math.abs(b.x - 1) + Math.abs(b.y)));
    board.pirate = seas[0].id;
    board.homeIslands = [mainIsland];
    return board;
  }

  function generateBoard(mode) {
    let b;
    if (mode === 'extended') b = generateExtended();
    else if (mode === 'seafarers') b = generateSeafarers();
    else b = generateClassic();
    delete b._byKey;
    return b;
  }

  Object.assign(C, { RES, TERRAIN_RES, PIPS, LAND, isLand, shuffle, generateBoard, neighborsOf, hexCenter });
})(typeof window !== 'undefined' ? window : globalThis);
