// Navegantes: los nueve escenarios oficiales (3-4 jugadores y ampliación 5-6 con jugadores en pareja).
// Los mapas se transcribieron de las ilustraciones del reglamento (5.ª edición, 2021, y 5-6 de 2023).
(function (root) {
  const C = root.Catan;
  const R = () => C._R;
  const { RES, TERRAIN_RES, shuffle, isLand } = C;

  const SCENARIOS = {
    1: { id: 1, name: 'Hacia nuevas costas', vp: 14, islandVP: 2, desc: 'Isla principal e islas pequeñas con oro: 2 PV por el primer poblado en cada isla pequeña.' },
    2: { id: 2, name: 'Las cuatro islas', name56: 'Las seis islas', vp: 13, islandVP: 2, desc: 'Empiezas en una o dos islas propias: 2 PV por el primer poblado en cada isla ajena.' },
    3: { id: 3, name: 'La isla de la niebla', vp: 12, islandVP: 0, desc: 'La niebla oculta hexágonos que se descubren al llegar con un barco o una carretera.' },
    4: { id: 4, name: 'A través del desierto', vp: 14, islandVP: 2, desc: 'Una franja de desierto parte la isla: 2 PV por el primer poblado en cada zona ajena.' },
    5: { id: 5, name: 'La tribu olvidada', vp: 13, islandVP: 0, desc: 'Las islas de la tribu regalan puntos, cartas de desarrollo y puertos a tus barcos.' },
    6: { id: 6, name: 'Tela para Catan', vp: 14, islandVP: 0, desc: 'Comercia con las aldeas de la tribu: 2 telas = 1 PV. Sin Gran Ruta Comercial.' },
    7: { id: 7, name: 'Las islas piratas', vp: 10, islandVP: 0, desc: 'Una ruta de barcos hasta tu fortaleza pirata, barcos de guerra y una flota pirata que ataca la costa.' },
    8: { id: 8, name: 'Las maravillas de Catan', vp: 10, islandVP: 1, desc: 'Construye una maravilla de 4 niveles, o llega a 10 PV con la maravilla más alta.' },
    9: { id: 9, name: 'Nuevo mundo', vp: 12, islandVP: 1, desc: 'Mapa al azar: 1 PV por el primer poblado en cada isla ajena.' }
  };
  const scName = (id, big) => (big && SCENARIOS[id].name56) || SCENARIOS[id].name;

  // ---------- mapas ----------
  // Cada mapa se describe con las columnas de la ilustración (hexágonos de lado plano), de izquierda a
  // derecha: [fila inicial, celdas de arriba abajo]. Las filas avanzan de a medio hexágono.
  // Códigos: f bosque, h colinas, p pastos, w campo, m montañas, d desierto, g oro, s mar, ? niebla,
  // x terreno al azar (isla principal 5-6), D/G hexágonos de la tribu (escenario 6). El número es la ficha.
  // Las direcciones de lados (puertos, regalos) son n, ne, se, s, sw, nw; las de cruces, e, se, sw, w, nw, ne.
  const MAPS = {
    '1-3': {
      cols: [[4, 'w6 f5 s h10'], [3, 'w11 m3 h11 s m8'], [2, 'h8 p10 p9 f8 s s'], [1, 's p2 m5 f10 s g4 s'], [2, 's w4 p6 s w3 s'], [3, 's s s p4 m9'], [4, 'h12 g5 s s']],
      harbors: [[2, 2, 'nw'], [2, 2, 'ne'], [0, 4, 'n'], [4, 4, 'n'], [0, 6, 'nw'], [0, 6, 's'], [4, 6, 's'], [2, 8, 'se']], set: 8, robber: [6, 4], pirate: [3, 13]
    },
    '1-4': {
      cols: [[3, 'w8 f2 m10 s w6'], [2, 'm3 p4 h9 p8 s h3'], [1, 'h6 f10 d w11 f5 s s'], [0, 's w12 h11 w3 p9 s g10 s'], [1, 's p5 f6 m4 s f9 s'], [2, 's s s s h5 m2'], [3, 'm8 p11 s g4 s']],
      harbors: [[1, 2, 'n'], [3, 2, 'n'], [0, 3, 'nw'], [4, 3, 'ne'], [0, 5, 'sw'], [4, 5, 'se'], [1, 8, 'sw'], [3, 8, 'se'], [2, 9, 's']], set: 9, robber: [2, 5], pirate: [3, 14]
    },
    '1-56': {
      cols: [[4, 'g5 s x x x s g10'], [3, 'f2 s x x x x s s'], [2, 'h4 s x x x x x s w3'], [1, 's s x x x x x x s s'], [2, 'p8 s x x x x x s h12'], [3, 'm11 s x x x x s s'], [4, 'g9 s x x x s m6']],
      harbors: [[3, 5, 'nw'], [4, 6, 'n'], [1, 7, 'nw'], [5, 7, 'ne'], [0, 10, 'nw'], [6, 10, 'se'], [0, 12, 'sw'], [5, 13, 'se'], [1, 13, 's'], [3, 15, 'sw'], [4, 14, 's']], set: 11, robber: [4, 18], pirate: [3, 1]
    },
    '2-3': {
      cols: [[3, 'p12 s s s'], [2, 'f5 p9 s m2 w5'], [1, 'w11 m8 f3 s h10 h6'], [0, 's s s s s s s'], [1, 'p6 m10 s f8 h11 s'], [2, 'm4 f9 s w9 h5'], [3, 's s w4 p3']],
      harbors: [[2, 1, 'nw'], [2, 1, 'se'], [4, 1, 'ne'], [1, 4, 'sw'], [5, 4, 'sw'], [1, 8, 'ne'], [4, 9, 'nw'], [5, 10, 'se'], [2, 11, 'sw']], set: 9, robber: [0, 3], pirate: [3, 6]
    },
    '2-4': {
      cols: [[3, 'p10 w11 s w4'], [2, 'w6 m4 h2 s m8'], [1, 'h4 p9 s s f9 p11'], [0, 's s s f6 s s s'], [1, 'w5 f3 s h5 m10 s'], [2, 'h10 s m3 w12 p5'], [3, 'p8 s f9 f11']],
      harbors: [[2, 1, 'nw'], [1, 2, 'nw'], [4, 1, 'sw'], [5, 2, 'n'], [1, 4, 'se'], [3, 6, 'ne'], [2, 11, 'ne'], [5, 10, 'sw'], [2, 11, 'sw']], set: 9, robber: [5, 8], pirate: [3, 12]
    },
    '2-56': {
      cols: [[4, 'p5 m6 s p2 s h5 w2'], [3, 'f9 w12 s w5 m3 s h8 p9'], [2, 's h4 s s p8 f10 s f5 w6'], [1, 's s s s s s s s s s'], [2, 'h11 w9 s p3 f4 s s f4 s'], [3, 'f8 m10 s m11 h10 s w3 h10'], [4, 'p12 m4 s f6 s m9 p6']],
      harbors: [[1, 3, 'n'], [4, 4, 'nw'], [6, 6, 'ne'], [5, 5, 'sw'], [0, 6, 'se'], [1, 9, 'nw'], [6, 10, 'se'], [0, 14, 'nw'], [5, 15, 'nw'], [6, 16, 'se'], [1, 17, 's']], set: 11, robber: [0, 10], pirate: [3, 1]
    },
    '3-3': {
      cols: [[3, 's p12 s ? ?'], [2, 's m8 w10 s ? ?'], [1, 's h11 f9 s ? s s'], [0, 's f6 p5 s ? s m4 s'], [1, 's s s ? s p8 p9'], [2, '? ? ? s f5 w3'], [3, '? ? s h6 f11']],
      harbors: [[3, 2, 'nw'], [2, 3, 'nw'], [0, 5, 'n'], [1, 6, 'sw'], [6, 9, 'se'], [6, 11, 's'], [4, 13, 'se'], [3, 12, 's']], set: 8, robber: [0, 5], pirate: [3, 0],
      fog: { t: 'ssggwwhhmmpf', n: [3, 3, 4, 5, 6, 8, 9, 10, 11, 12] }
    },
    '3-4': {
      cols: [[3, 'p2 f5 s ? ?'], [2, 'h9 p8 s ? ? s'], [1, 'w6 f4 s ? ? s f5'], [0, 's m3 s ? ? s w11 s'], [1, 's s ? s s p10 m8'], [2, '? ? s p9 f6 h12'], [3, '? s h4 w10 m3']],
      harbors: [[2, 1, 'nw'], [3, 2, 'n'], [1, 2, 'nw'], [0, 3, 'sw'], [6, 7, 'se'], [6, 11, 'ne'], [5, 12, 'se'], [4, 13, 'se'], [2, 13, 'se']], set: 9, robber: [4, 13], pirate: [3, 0],
      fog: { t: 'ssggwwhhmmpf', n: [3, 4, 5, 6, 8, 9, 10, 11, 11, 12] }
    },
    '3-56': {
      cols: [[4, 'g4 ? ? ? ? ? ? g10'], [3, '? ? ? ? ? ? ? ? ?'], [2, '? ? ? s s s s ? ? ?'], [1, 's ? s s f5 w11 p8 s s ? s'], [2, '? s f8 w9 h3 m12 w10 f3 s ?'], [3, 's w2 p4 m6 m10 p9 h12 f4 s'], [4, 'h5 p6 m3 d h11 h8 m11 w6']],
      harbors: [[5, 5, 'n'], [6, 4, 'se'], [4, 8, 'nw'], [6, 8, 'ne'], [3, 11, 'sw'], [6, 12, 'se'], [4, 14, 'sw'], [6, 18, 'ne'], [5, 17, 's']], set: 9, robber: [6, 10], pirate: [3, 17],
      fog: { t: 'ssssssssssssgwwhhmmpppfff', n: [2, 2, 3, 4, 5, 5, 6, 8, 9, 9, 10, 11, 12] }
    },
    '4-3': {
      cols: [[3, 'p8 p4 s m5'], [2, 'm10 w9 f8 s w9'], [1, 'f11 h6 w2 h9 s s'], [0, 's s m3 f10 s g5 s'], [1, 'w6 d h5 p6 s s'], [2, 'f3 d f4 s p11'], [3, 'g4 d s m8']],
      harbors: [[2, 1, 'nw'], [1, 2, 'nw'], [2, 3, 'ne'], [0, 3, 'sw'], [1, 6, 'sw'], [2, 7, 'sw'], [2, 7, 'se'], [5, 6, 'se']], set: 8, robber: [5, 4], pirate: [3, 12]
    },
    '4-4': {
      cols: [[3, 's f9 s m6 w12'], [2, 'p3 p11 m4 s s s'], [1, 'h12 h6 w5 f8 s g5 p3'], [0, 's s f10 h11 p9 s s s'], [1, 'w8 d m8 w10 f4 s h2'], [2, 'm11 d h3 p6 s w4'], [3, 'g10 d f5 s m9']],
      harbors: [[1, 2, 'n'], [1, 2, 'sw'], [0, 5, 'nw'], [3, 4, 'n'], [1, 6, 'sw'], [2, 7, 'sw'], [5, 8, 'se'], [4, 9, 'sw'], [4, 9, 'se']], set: 9, robber: [5, 4], pirate: [3, 14]
    },
    '4-56': {
      cols: [[4, 'p6 s p8 w2 s g4 s w9'], [3, 'h9 m11 s s s s s p11 f3'], [2, 'p12 w3 h12 m6 h11 m3 w9 s s m8'], [1, 's m4 f5 w10 h5 p10 f4 h8 s s s'], [2, 's s s w2 f8 p9 f10 s s g10'], [3, 'f5 p2 d d d d d s s'], [4, 'g4 m6 h11 s f12 w5 m3 h6']],
      harbors: [[1, 3, 'n'], [0, 4, 'nw'], [3, 3, 'ne'], [1, 5, 'sw'], [2, 6, 'sw'], [3, 7, 'ne'], [2, 10, 'nw'], [2, 14, 'nw'], [3, 15, 'sw'], [4, 14, 's'], [2, 1, 'se']], set: 11, robber: [5, 11], pirate: [0, 16]
    },
    '5-34': {
      cols: [[3, 'd h s h d g'], [2, 's s s s s s s'], [1, 'f11 w9 m3 p8 h10 w3 s f'], [2, 'p10 h8 p4 w12 f5 p2 s'], [1, 'w6 f9 m11 h5 f6 m4 s p'], [2, 's s s s s s s'], [3, 'g m s d m w']],
      harbors: [], robber: [0, 11], pirate: [6, 7],
      gifts: { harbor: [[0, 3, 'nw'], [6, 3, 'ne'], [0, 9, 'sw'], [6, 9, 'ne'], [2, 15, 'sw'], [4, 15, 'se']], harborSet: 6,
        vp: [[0, 3, 'sw'], [6, 3, 'se'], [0, 9, 'nw'], [6, 9, 'se'], [0, 13, 'sw'], [6, 13, 'se'], [2, 15, 's'], [4, 15, 's']],
        dev: [[0, 3, 'n'], [6, 3, 'n'], [0, 13, 's'], [6, 13, 's']] }
    },
    '5-56': {
      cols: [[4, 'd d s m h s w g'], [3, 's s s s s s s s s'], [2, 'f6 m4 w9 h8 f11 m3 p4 w6 f3 m6'], [1, 's f11 p12 f5 w10 p5 h9 w2 p9 h10 s'], [2, 'w3 h5 m11 p8 h4 f10 w4 h3 f8 m5'], [3, 's s s s s s s s s'], [4, 'd d s g g s p p']],
      harbors: [], robber: [0, 6], pirate: [0, 8],
      gifts: { harbor: [[0, 4, 'nw'], [0, 6, 'sw'], [6, 6, 'se'], [6, 10, 'ne'], [0, 12, 'sw'], [0, 16, 'nw'], [6, 16, 'se'], [6, 18, 'se']], harborSet: 8,
        vp: [[6, 4, 'ne'], [0, 6, 'nw'], [6, 6, 'ne'], [0, 10, 'sw'], [6, 10, 'se'], [0, 12, 'nw'], [6, 12, 'ne'], [6, 16, 'ne'], [0, 16, 'sw'], [0, 18, 'sw']],
        dev: [[0, 4, 'n'], [6, 4, 'n'], [0, 10, 'nw'], [6, 12, 'se'], [0, 18, 's'], [6, 18, 's']] }
    },
    '6-34': {
      cols: [[3, 'p10 f6 m5 w10 h8'], [2, 'h9 w2 s s p11 m4'], [1, 's s s G s s m2'], [0, 's s D s s D s s'], [1, 'w12 s s G s s s'], [2, 'w3 f12 s s f3 m9'], [3, 'f4 p6 h5 p11 w8']],
      villages: [[2, 7, 'w', 3], [2, 7, 'e', 6], [3, 4, 'w', 9], [3, 4, 'e', 10], [4, 7, 'w', 8], [4, 7, 'e', 11], [3, 10, 'w', 5], [3, 10, 'e', 4]],
      harbors: [[1, 2, 'n'], [5, 2, 'n'], [0, 5, 'nw'], [6, 3, 'se'], [6, 9, 'ne'], [0, 9, 'sw'], [1, 12, 'sw'], [2, 13, 's'], [5, 12, 's']], set: 9, robber: [4, 1], pirate: [3, 14]
    },
    '6-56': {
      cols: [[4, 'p10 f6 m5 f11 f8 w10 h6'], [3, 'h9 w2 s s s s p11 m4'], [2, 'm8 s s D s D s s m2'], [1, 's s G s s s s G s s'], [2, 'w11 s s D s D s s p3'], [3, 'w3 f12 s s s s f3 m9'], [4, 'f4 p6 h5 w12 h3 p11 w8']],
      villages: [[2, 8, 'w', 12], [2, 8, 'e', 6], [2, 12, 'w', 10], [2, 12, 'e', 9], [3, 5, 'w', 9], [3, 5, 'e', 4], [3, 15, 'w', 5], [3, 15, 'e', 4], [4, 8, 'w', 5], [4, 8, 'e', 2], [4, 12, 'w', 8], [4, 12, 'e', 10]],
      harbors: [[1, 3, 'n'], [5, 3, 'n'], [0, 6, 'nw'], [6, 4, 'se'], [0, 8, 'sw'], [6, 10, 'ne'], [6, 14, 'ne'], [0, 14, 'sw'], [1, 17, 'sw'], [2, 18, 's'], [5, 17, 's']], set: 11, robber: [4, 2], pirate: [3, 19]
    },
    '7-34': {
      cols: [[3, 'g3 m6 s s w10 h4'], [2, 'h s s p s m5 f2'], [1, 'w10 s s d s p11 f8 p9'], [2, 's m8 s s w6 h9 p12'], [1, 'w4 s s d s f3 p8 f5'], [2, 'h s s d s m9 f10'], [3, 'g11 m6 s s w4 h5']],
      harbors: [[0, 11, 'sw'], [6, 11, 'ne'], [6, 13, 'ne'], [1, 14, 'sw'], [2, 15, 'sw'], [3, 14, 's'], [5, 14, 's'], [5, 14, 'se']], set: 8, robber: null,
      seats: {
        orange: { fort: [0, 3, 'w'], circle: [0, 5, 'sw'], settle: [0, 11, 'e'], ship: [0, 11, 'ne'] },
        blue: { fort: [1, 2, 'e'], circle: [3, 4, 'w'], settle: [2, 11, 'ne'], ship: [3, 10, 'nw'] },
        white: { fort: [4, 1, 'se'], circle: [3, 4, 'e'], settle: [3, 10, 'e'], ship: [3, 10, 'ne'] },
        red: { fort: [6, 3, 'e'], circle: [6, 5, 'se'], settle: [5, 12, 'ne'], ship: [6, 11, 'nw'] }
      },
      seatOrder: { 3: ['orange', 'blue', 'red'], 4: ['orange', 'blue', 'white', 'red'] },
      fleet: [[0, 9], [0, 7], [1, 6], [2, 5], [3, 6], [4, 5], [5, 6], [6, 7], [6, 9], [5, 10], [4, 9], [3, 8], [2, 9], [1, 10]]
    },
    '7-56': {
      cols: [[4, 'g3 s m8 s s f9 w5 f4'], [3, 's s s s d s w11 m9 h8'], [2, 'g11 d m6 s s s p2 p10 h3 p5'], [1, 's s s s d s w6 w4 m5 p8 s'], [2, 'g11 d m8 s s s f12 f6 p4 f10'], [3, 's s s s d s m3 h10 f11'], [4, 'g3 s m6 s s p5 w4 h9']],
      harbors: [[0, 16, 'nw'], [0, 18, 'nw'], [6, 16, 'ne'], [6, 18, 'ne'], [0, 18, 's'], [1, 19, 's'], [3, 19, 's'], [5, 19, 's'], [6, 18, 's']], set: 9, robber: null,
      seats: {
        brown: { fort: [0, 4, 'nw'], circle: [0, 8, 'sw'], settle: [0, 14, 'nw'], ship: [0, 12, 'sw'] },
        green: { fort: [0, 4, 'e'], circle: [0, 8, 'e'], settle: [0, 14, 'e'], ship: [0, 14, 'ne'] },
        orange: { fort: [2, 2, 'se'], circle: [2, 6, 'se'], settle: [2, 14, 'ne'], ship: [3, 13, 'nw'] },
        blue: { fort: [4, 2, 'sw'], circle: [4, 6, 'sw'], settle: [3, 13, 'e'], ship: [3, 13, 'ne'] },
        white: { fort: [6, 4, 'w'], circle: [6, 8, 'w'], settle: [6, 14, 'w'], ship: [6, 14, 'nw'] },
        red: { fort: [6, 4, 'ne'], circle: [6, 8, 'se'], settle: [6, 14, 'ne'], ship: [6, 12, 'se'] }
      },
      seatOrder: { 5: ['green', 'orange', 'blue', 'white', 'red'], 6: ['brown', 'green', 'orange', 'blue', 'white', 'red'] },
      fleet: [[0, 10], [1, 9], [2, 8], [3, 7], [4, 8], [5, 9], [6, 10], [6, 12], [5, 13], [4, 12], [3, 11], [2, 12], [1, 13], [0, 12]], noAttack: [3, 7]
    },
    '8-34': {
      cols: [[3, 'm5 s p11 p2 s w5'], [2, 's f3 s f8 w9 s f4'], [1, 'h8 p9 s s h10 s s g6'], [2, 'm3 w4 m6 p5 h4 d s'], [1, 'm12 w6 h11 w10 p3 f9 d s'], [2, 's s s f11 s d s'], [3, 'g8 h2 s m10 s s']],
      harbors: [[3, 2, 'n'], [2, 3, 'nw'], [4, 3, 'ne'], [3, 4, 'sw'], [4, 7, 'ne'], [0, 7, 'sw'], [4, 9, 'se'], [1, 10, 'sw'], [1, 10, 'se']], set: 9, robber: [4, 13], pirate: null,
      purple: [[1, 4, 'sw'], [0, 7, 'ne']], brown: [[3, 12, 'nw'], [3, 12, 'ne'], [4, 11, 'e'], [4, 11, 'sw'], [4, 11, 'se']],
      excl: [[1, 4, 'w'], [1, 4, 'se'], [0, 7, 'nw'], [0, 7, 'e']]
    },
    '8-56': {
      cols: [[4, 's m5 f9 s p2 p11 s g6'], [3, 'g6 s f10 m3 s m9 w4 s f4'], [2, 's s h8 p5 s h4 f8 m12 s s'], [1, 's s w9 m3 f4 m6 w10 p9 h10 d s'], [2, 's h2 p5 w6 h5 w3 p8 f11 d s'], [3, 's s h11 s f11 s s d d'], [4, 'g8 s p10 s w12 s s s']],
      harbors: [[4, 4, 'n'], [2, 6, 'n'], [1, 7, 'n'], [4, 6, 'ne'], [0, 6, 'sw'], [4, 8, 'se'], [3, 9, 'sw'], [0, 12, 'sw'], [4, 12, 'se'], [1, 15, 'sw'], [2, 16, 'sw']], set: 11, robber: [5, 19], pirate: null,
      purple: [[1, 9, 'sw'], [0, 12, 'ne'], [6, 8, 'sw'], [5, 11, 'ne']], brown: [[4, 16, 'e'], [4, 16, 'sw'], [4, 16, 'se'], [3, 17, 'sw'], [3, 17, 'se']],
      excl: [[1, 9, 'w'], [1, 9, 'se'], [0, 12, 'nw'], [0, 12, 'e'], [6, 8, 'w'], [6, 8, 'se'], [5, 11, 'nw'], [5, 11, 'e']]
    }
  };
  // Nuevo mundo: marco vacío que se llena al azar (3-4: 42 hexágonos; 5-6: 63)
  const NEW_WORLD = {
    34: { ranges: [[3, 11], [2, 12], [1, 13], [2, 12], [1, 13], [2, 12], [3, 11]], seaExtra: [[3, 0], [3, 14]],
      terr: { sea: 19, fields: 5, hills: 4, mountains: 4, pasture: 5, forest: 5 }, tokens: [2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 12], set: 9 },
    56: { ranges: [[4, 18], [3, 19], [2, 20], [3, 19], [2, 20], [3, 19], [4, 18]], seaExtra: [[3, 1], [3, 21]],
      terr: { sea: 21, desert: 3, gold: 4, fields: 7, hills: 7, mountains: 7, pasture: 7, forest: 7 },
      tokens: [2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 10, 10, 10, 10, 11, 11, 11, 11, 12, 12], set: 11 }
  };
  const CODE = { f: 'forest', h: 'hills', p: 'pasture', w: 'fields', m: 'mountains', d: 'desert', g: 'gold', s: 'sea' };
  const HARBOR_SETS = {
    6: ['wood', 'brick', 'sheep', 'wheat', 'ore', 'any'],
    8: ['wood', 'brick', 'sheep', 'wheat', 'ore', 'any', 'any', 'any'],
    9: ['wood', 'brick', 'sheep', 'wheat', 'ore', 'any', 'any', 'any', 'any'],
    11: ['wood', 'brick', 'sheep', 'sheep', 'wheat', 'ore', 'any', 'any', 'any', 'any', 'any']
  };
  const S3 = Math.sqrt(3);
  const VDIR = { e: [1, 0], se: [0.5, S3 / 2], sw: [-0.5, S3 / 2], w: [-1, 0], nw: [-0.5, -S3 / 2], ne: [0.5, -S3 / 2] };
  const EDIR = { n: [0, -S3 / 2], ne: [0.75, -S3 / 4], se: [0.75, S3 / 4], s: [0, S3 / 2], sw: [-0.75, S3 / 4], nw: [-0.75, -S3 / 4] };

  // La ilustración usa hexágonos de lado plano; el tablero del juego, de punta. Para construir el grafo se gira
  // 90° (el norte del reglamento a la izquierda) y al final se vuelve a girar el dibujo (orientAsRulebook).
  // Celda (c, j) → coordenadas axiales del tablero.
  const toAxial = (c, j) => ({ q: (c + j) / 2, r: -c });
  function pointOf(c, j, dir, table) {
    const d = table[dir];
    return { x: S3 / 2 * j + d[1], y: -(1.5 * c + d[0]) };
  }
  function nearest(list, p) {
    let best = null, bd = Infinity;
    list.forEach(o => { const d = Math.hypot(o.x - p.x, o.y - p.y); if (d < bd) { bd = d; best = o; } });
    return bd < 0.3 ? best.id : null;
  }
  const vertexAt = (b, [c, j, dir]) => nearest(b.vertices, pointOf(c, j, dir, VDIR));
  const edgeAt = (b, [c, j, dir]) => nearest(b.edges, pointOf(c, j, dir, EDIR));
  const hexAt = (b, cj) => { if (!cj) return null; const a = toAxial(cj[0], cj[1]); const h = b.hexes.find(x => x.q === a.q && x.r === a.r); return h ? h.id : null; };

  // Las aristas entre dos hexágonos del marco no son navegables
  function fixFrame(b) {
    b.edges.forEach(e => { if (e.hexes.every(id => b.hexes[id].frame)) e.sea = false; });
  }
  function markFrame(b, all) {
    b.hexes.forEach((hx, i) => { if (all[i].frame) hx.frame = true; });
    fixFrame(b);
  }

  function mapKey(sc, n, big) {
    if (sc >= 5 && sc <= 8) return sc + '-' + (big ? '56' : '34');
    return sc + '-' + (big ? '56' : n <= 3 ? '3' : '4');
  }

  // Áreas: islas (o, en «A través del desierto», zonas separadas por el desierto)
  function computeAreas(b, splitDesert) {
    b.hexes.forEach(h => { h.area = -1; });
    let id = 0;
    const ok = h => isLand(h.terrain) && !h.hidden && !(splitDesert && h.terrain === 'desert');
    b.hexes.forEach(h => {
      if (!ok(h) || h.area >= 0) return;
      const st = [h];
      h.area = id;
      while (st.length) {
        const x = st.pop();
        C.neighborsOf(b, x).forEach(n => { if (ok(n) && n.area < 0) { n.area = id; st.push(n); } });
      }
      id++;
    });
    b.areaCount = id;
    delete b._byKey;
  }
  const areaSize = (b, a) => b.hexes.filter(h => h.area === a).length;
  function biggestArea(b) {
    let best = 0, bn = -1;
    for (let a = 0; a < b.areaCount; a++) { const n = areaSize(b, a); if (n > bn) { bn = n; best = a; } }
    return best;
  }

  function placeHarbors(b, list, types) {
    const t = shuffle(types.slice());
    while (t.length < list.length) t.push('any');
    b.ports = [];
    list.forEach((spec, i) => {
      const e = edgeAt(b, spec);
      if (e === null) return;
      const ed = b.edges[e];
      const sea = ed.hexes.map(id => b.hexes[id]).find(h => !isLand(h.terrain));
      if (!sea) return;
      b.ports.push({ id: b.ports.length, type: t[i], edge: e, hex: sea.id });
      ed.v.forEach(v => { b.vertices[v].port = t[i]; });
    });
  }

  function generate(opt, big) {
    opt = opt || {};
    const sc = SCENARIOS[opt.scenario] ? +opt.scenario : 1;
    const n = opt.players || (big ? 5 : 4);
    const b = sc === 9 ? newWorld(big) : fromMap(MAPS[mapKey(sc, n, big)], sc, n, big);
    b.scenario = sc;
    b.isSF = true;
    computeAreas(b, sc === 4);
    const main = biggestArea(b);
    const all = [...Array(b.areaCount).keys()];
    // islas donde se puede colocar al principio (las demás restricciones están en settleOk)
    if (sc === 2 || sc === 9 || sc === 3) b.homeAreas = all;
    else if (sc === 6) b.homeAreas = all.filter(a => !b.hexes.some(h => h.area === a && h.tribe));
    else b.homeAreas = [main];
    b.homeIslands = [...new Set(b.hexes.filter(h => h.island >= 0).map(h => h.island))];
    delete b._byKey;
    orientAsRulebook(b);
    return b;
  }

  // El tablero se arma con hexágonos de punta (girado 90°); para dibujarlo como en el reglamento se giran
  // las coordenadas de dibujo 90° en sentido horario y los hexágonos pasan a tener el lado plano arriba.
  // Solo cambia el dibujo: la topología (cruces, lados, vecinos) es la misma.
  function orientAsRulebook(b) {
    const rot = o => { const x = o.x, y = o.y; o.x = +(-y).toFixed(4); o.y = +x.toFixed(4); };
    b.hexes.forEach(h => { rot(h); h.flat = true; });
    b.vertices.forEach(rot);
    b.edges.forEach(e => {
      rot(e);
      const va = b.vertices[e.v[0]], vb = b.vertices[e.v[1]];
      e.angle = +(Math.atan2(vb.y - va.y, vb.x - va.x) * 180 / Math.PI).toFixed(2);
    });
    b.flat = true;
  }

  function fromMap(M, sc, n, big) {
    const list = [];
    const randomCells = [];
    M.cols.forEach(([j0, str], c) => str.trim().split(/\s+/).forEach((tok, k) => {
      const j = j0 + 2 * k;
      const h = Object.assign(toAxial(c, j), { c, j });
      if (tok === '?') { h.terrain = 'sea'; h.hidden = true; } else if (tok === 'x') { randomCells.push(h); } else if (tok === 'D' || tok === 'G') {
        h.terrain = tok === 'D' ? 'desert' : 'gold'; h.tribe = true;
      } else {
        h.terrain = CODE[tok[0]];
        if (tok.length > 1) h.number = +tok.slice(1);
      }
      list.push(h);
    }));
    if (randomCells.length) {
      const t = shuffle(C._B.EXT_TERRAINS.slice());
      randomCells.forEach((h, i) => { h.terrain = t[i]; h.main = true; });
    }
    const all = addFrame(list);
    const b = C._B.buildGraph(all);
    b.hexes.forEach((hx, i) => {
      const src = all[i];
      if (src.hidden) hx.hidden = true;
      if (src.tribe) hx.tribe = true;
      if (src.main) hx.main = true;
    });
    markFrame(b, all);
    if (randomCells.length) C._B.assignNumbers(b, b.hexes.filter(h => h.main && h.terrain !== 'desert').map(h => h.id), C._B.EXT_TOKENS);
    if (b.hexes.some(h => h.hidden)) { C.refreshFlags(b); fixFrame(b); }
    placeHarbors(b, M.harbors || [], HARBOR_SETS[M.set] || []);
    b.robber = hexAt(b, M.robber);
    if (M.robber && b.robber === null) b.robber = null;
    b.pirate = hexAt(b, M.pirate);
    const X = b.sfData = {};
    if (M.fog) X.fog = { t: M.fog.t.split('').map(ch => CODE[ch]), n: M.fog.n.slice() };
    if (M.gifts) {
      X.gifts = [];
      const hs = shuffle(HARBOR_SETS[M.gifts.harborSet].slice());
      M.gifts.harbor.forEach((g, i) => X.gifts.push({ edge: edgeAt(b, g), kind: 'harbor', port: hs[i] }));
      M.gifts.vp.forEach(g => X.gifts.push({ edge: edgeAt(b, g), kind: 'vp' }));
      M.gifts.dev.forEach(g => X.gifts.push({ edge: edgeAt(b, g), kind: 'dev' }));
      X.gifts = X.gifts.filter(g => g.edge !== null);
    }
    if (M.villages) X.villages = M.villages.map(([c, j, d, num]) => ({ v: vertexAt(b, [c, j, d]), number: num })).filter(x => x.v !== null);
    if (M.seats) {
      const order = M.seatOrder[n] || M.seatOrder[big ? 6 : 4];
      X.seats = order.map(k => {
        const p = M.seats[k];
        return { color: k, fort: vertexAt(b, p.fort), circle: vertexAt(b, p.circle), settle: vertexAt(b, p.settle), ship: edgeAt(b, p.ship) };
      });
      X.fleet = M.fleet.map(cj => hexAt(b, cj));
      X.noAttack = M.noAttack ? hexAt(b, M.noAttack) : null;
      b.pirate = X.fleet[0];
    }
    if (M.purple) {
      X.purple = M.purple.map(p => vertexAt(b, p));
      X.brown = M.brown.map(p => vertexAt(b, p));
      X.excl = M.excl.map(p => vertexAt(b, p));
    }
    return b;
  }

  // Rodea las celdas con un anillo de mar del marco
  function addFrame(list) {
    const keys = new Set(list.map(h => h.q + ',' + h.r));
    const out = list.slice();
    const NB = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    list.forEach(h => NB.forEach(([dq, dr]) => {
      const k = (h.q + dq) + ',' + (h.r + dr);
      if (!keys.has(k)) { keys.add(k); out.push({ q: h.q + dq, r: h.r + dr, terrain: 'sea', frame: true }); }
    }));
    return out;
  }

  function newWorld(big) {
    const W = NEW_WORLD[big ? 56 : 34];
    const list = [];
    W.ranges.forEach(([a, z], c) => { for (let j = a; j <= z; j += 2) list.push(Object.assign(toAxial(c, j), { c, j, rnd: true })); });
    W.seaExtra.forEach(([c, j]) => list.push(Object.assign(toAxial(c, j), { c, j, terrain: 'sea' })));
    const terr = [];
    Object.entries(W.terr).forEach(([k, cnt]) => { for (let i = 0; i < cnt; i++) terr.push(k); });
    let b, all;
    for (let att = 0; att < 30; att++) {
      shuffle(terr);
      list.filter(h => h.rnd).forEach((h, i) => { h.terrain = terr[i]; });
      all = addFrame(list);
      b = C._B.buildGraph(all);
      // que ninguna isla quede de un único desierto y que haya al menos una isla de 4 o más hexágonos
      const sizes = {};
      b.hexes.forEach(h => { if (h.island >= 0) sizes[h.island] = (sizes[h.island] || 0) + 1; });
      if (Math.max(...Object.values(sizes)) >= 4) break;
    }
    markFrame(b, all);
    C._B.assignNumbers(b, b.hexes.filter(h => isLand(h.terrain) && h.terrain !== 'desert').map(h => h.id), W.tokens);
    // los puertos los colocan los jugadores antes de los poblados (ver init)
    b.ports = [];
    b.robber = null;
    b.pirate = null;
    b.sfData = { harbors: shuffle(HARBOR_SETS[W.set].slice()) };
    return b;
  }

  // ================= reglas =================
  const sc = s => s.sf.scenario;
  const nm = (s, pid) => s.players[pid].name;
  const isBig = s => !!C.MODES[s.mode].pairs;
  const die = () => 1 + Math.floor(Math.random() * 6);

  function init(s, mode, config) {
    const o = config.options || {};
    const b = s.board, X = b.sfData || {};
    const id = b.scenario || 1;
    s.sf = {
      scenario: id, big: !!mode.pairs, islandVP: SCENARIOS[id].islandVP,
      noLongestRoad: id === 6 || id === 7, noArmy: id === 7
    };
    if (!o.vpTarget) s.vpTarget = SCENARIOS[id].vp;
    s.players.forEach(P => { P.islands = []; P.chits = 0; P.cloth = 0; P.home = null; P.wonder = null; P.harborsHeld = []; });
    if (id === 3) s.sf.fog = { t: shuffle(X.fog.t.slice()), n: shuffle(X.fog.n.slice()) };
    if (id === 5) {
      s.sf.robberStart = s.robber;
      s.sf.gifts = X.gifts.map(g => Object.assign({}, g, { taken: null }));
      s.sf.gifts.filter(g => g.kind === 'dev').forEach(g => { g.card = s.devDeck.pop() || 'knight'; });
    }
    if (id === 6) {
      s.sf.villages = X.villages.map(x => ({ v: x.v, number: x.number, cloth: 5, conn: [] }));
      s.sf.supply = 10;
      // tercer poblado: tras el segundo, todos colocan otro empezando por el último en colocar
      const n = s.players.length, st = s.setup;
      for (let i = 0; i < n; i++) st.order.push((s.first + i) % n);
      st.resFrom = 2 * n;
    }
    if (id === 7) initPirates(s, X);
    if (id === 9) {
      // Nuevo mundo: empezando por el primer jugador, cada uno toma un puerto y lo coloca en la costa
      s.sf.harborQueue = X.harbors.slice();
      s.sf.hp = { kind: 'nw', pid: s.first, type: s.sf.harborQueue[0], ret: 'setup', n: 0, total: X.harbors.length };
      s.phase = 'sfHarbor';
      s.current = s.first;
    }
    if (id === 8) {
      const list = ['cathedral', 'bridge', 'wall', 'monument', 'theater'].concat(s.sf.big ? ['bridge', 'cathedral'] : []);
      s.sf.wonders = list.map((k, i) => ({ id: i, kind: k, owner: null, level: 0 }));
      s.sf.purple = X.purple; s.sf.brown = X.brown; s.sf.excl = X.excl;
    }
  }

  // ---------- Las islas piratas ----------
  function initPirates(s, X) {
    const n = s.players.length;
    // 3 jugadores: sin cartas de PV; 4 o más: los PV se usan como caballeros
    s.devDeck = s.devDeck.filter(c => n >= 4 || c !== 'vp').map(c => (c === 'vp' ? 'knight' : c));
    s.sf.fleet = { path: X.fleet, idx: 0, noAttack: X.noAttack };
    s.pirate = X.fleet[0];
    s.robber = null;
    s.sf.forts = X.seats.map((seat, pid) => ({ owner: pid, v: seat.fort, circle: seat.circle, start: seat.settle, hp: 3, color: seat.color }));
    s.sf.routes = X.seats.map(() => []);
    s.sf.attacked = null;
    X.seats.forEach((seat, pid) => {
      const P = s.players[pid];
      s.buildings[seat.settle] = { owner: pid, type: 'settlement' };
      P.pieces.settlement--;
      s.roads[seat.ship] = { owner: pid, type: 'ship', turn: -1 };
      P.pieces.ship--;
      s.sf.routes[pid].push(seat.ship);
    });
  }
  const fortOf = (s, pid) => s.sf.forts[pid];
  const routeOf = (s, pid) => s.sf.routes[pid];
  // la ruta sin los barcos que ya no están (por ejemplo, el que se está moviendo)
  const liveRoute = (s, pid) => routeOf(s, pid).filter(e => s.roads[e] && s.roads[e].owner === pid && s.roads[e].type === 'ship');
  function routeEnd(s, pid) {
    const r = liveRoute(s, pid);
    if (!r.length) return fortOf(s, pid) ? fortOf(s, pid).start : null;
    const last = s.board.edges[r[r.length - 1]];
    if (r.length === 1) {
      // el extremo libre es el que no toca el poblado inicial
      return last.v.find(v => !(s.buildings[v] && s.buildings[v].owner === pid)) ?? last.v[0];
    }
    const prev = s.board.edges[r[r.length - 2]];
    return last.v.find(v => !prev.v.includes(v));
  }
  const reachedCircle = (s, pid) => liveRoute(s, pid).some(e => s.board.edges[e].v.includes(fortOf(s, pid).circle));
  const routeDone = (s, pid) => routeEnd(s, pid) === fortOf(s, pid).v;
  // distancias en barcos desde un cruce objetivo (por aristas navegables libres)
  function seaDist(s, pid, target) {
    const dist = new Map([[target, 0]]);
    const q = [target];
    while (q.length) {
      const v = q.shift();
      for (const e of s.board.vertices[v].edges) {
        const E = s.board.edges[e];
        if (!E.sea || (s.roads[e] && s.roads[e].owner !== pid)) continue;
        const o = E.v[0] === v ? E.v[1] : E.v[0];
        if (!dist.has(o)) { dist.set(o, dist.get(v) + 1); q.push(o); }
      }
    }
    return dist;
  }
  function pirateRouteEdges(s, pid) {
    const F = fortOf(s, pid);
    if (!F || routeDone(s, pid)) return [];
    const end = routeEnd(s, pid);
    if (end === null) return [];
    const target = reachedCircle(s, pid) || end === F.circle ? F.v : F.circle;
    const d = seaDist(s, pid, target);
    if (!d.has(end)) return [];
    return s.board.vertices[end].edges.filter(e => {
      const E = s.board.edges[e];
      if (!E.sea || s.roads[e] || (s.pirate !== null && E.hexes.includes(s.pirate))) return false;
      const o = E.v[0] === end ? E.v[1] : E.v[0];
      return d.get(o) === d.get(end) - 1;
    });
  }
  const warships = (s, pid) => routeOf(s, pid).filter(e => s.roads[e] && s.roads[e].war).length;

  function moveFleet(s, pid, d1, d2) {
    const F = s.sf.fleet;
    if (!F || s.pirate === null) return null;
    const steps = Math.min(d1, d2);
    F.idx = (F.idx + steps) % F.path.length;
    s.pirate = F.path[F.idx];
    R().log(s, 'La flota pirata avanza ' + steps + ' hexágono(s).');
    if (s.pirate === F.noAttack) return null;
    const hx = s.board.hexes[s.pirate];
    const mine = hx.vertices.filter(v => s.buildings[v] && s.buildings[v].owner === pid);
    if (!mine.length) return null;
    const P = s.players[pid];
    const str = warships(s, pid);
    if (steps > str) {
      const cities = Object.values(s.buildings).filter(b => b.owner === pid && b.type === 'city').length;
      let lost = 0;
      for (let i = 0; i < 1 + cities; i++) {
        const pool = [];
        RES.forEach(k => { for (let x = 0; x < P.resources[k]; x++) pool.push(k); });
        if (!pool.length) break;
        const k = pool[Math.floor(Math.random() * pool.length)];
        P.resources[k]--; s.bank[k]++; lost++;
      }
      R().log(s, '¡La flota pirata (fuerza ' + steps + ') ataca a ' + nm(s, pid) + ' (fuerza ' + str + ')! Pierde ' + lost + ' carta(s).', pid);
      R().event(s, { type: 'sfFleet', pid, result: 'lose', lost });
      return null;
    }
    if (str > steps) {
      R().log(s, nm(s, pid) + ' rechaza a la flota pirata (fuerza ' + str + ' contra ' + steps + ') y gana 1 recurso.', pid);
      R().event(s, { type: 'sfFleet', pid, result: 'win' });
      return 1;
    }
    R().log(s, 'La flota pirata y ' + nm(s, pid) + ' empatan (fuerza ' + str + ').', pid);
    R().event(s, { type: 'sfFleet', pid, result: 'tie' });
    return null;
  }

  function attackFortress(s, pid, forced) {
    const F = fortOf(s, pid);
    if (!F || F.hp <= 0) return { error: 'No tienes fortaleza que atacar' };
    if (!routeDone(s, pid)) return { error: 'Tu ruta todavía no llega a la fortaleza' };
    if (s.sf.attacked === pid) return { error: 'Ya atacaste en este turno' };
    s.sf.attacked = pid;
    const d = forced || die();
    const str = warships(s, pid);
    const r = routeOf(s, pid);
    let result;
    if (str > d) {
      F.hp--;
      result = 'win';
      R().log(s, nm(s, pid) + ' ataca la fortaleza (' + str + ' contra ' + d + ') y la debilita: quedan ' + F.hp + '.', pid);
      if (F.hp <= 0) {
        s.buildings[F.v] = { owner: pid, type: 'settlement' };
        R().log(s, '¡' + nm(s, pid) + ' conquista su fortaleza pirata! Ahora es su poblado.', pid);
        if (s.sf.forts.every(x => x.hp <= 0)) { s.pirate = null; s.sf.fleet = null; R().log(s, 'Todas las fortalezas cayeron: la flota pirata se retira.'); }
      }
    } else {
      const lose = str < d ? 2 : 1;
      for (let i = 0; i < lose && r.length > 1; i++) {
        const e = r.pop();
        delete s.roads[e];
        s.players[pid].pieces.ship++;
      }
      result = str < d ? 'lose' : 'tie';
      R().log(s, nm(s, pid) + ' ataca la fortaleza (' + str + ' contra ' + d + ') y pierde ' + lose + ' barco(s).', pid);
      R().updateLongestRoad(s);
    }
    R().event(s, { type: 'sfAttack', pid, die: d, str, result });
    return null;
  }

  // ---------- consultas para el motor ----------
  function areaOf(s, v) {
    for (const h of s.board.vertices[v].hexes) {
      const hx = s.board.hexes[h];
      if (!hx.hidden && isLand(hx.terrain) && hx.area >= 0) return hx.area;
    }
    return -1;
  }
  const isTribeVertex = (s, v) => s.board.vertices[v].hexes.every(h => !isLand(s.board.hexes[h].terrain) || s.board.hexes[h].tribe);
  const homeOf = (s, pid) => (sc(s) === 2 || sc(s) === 9) ? (s.players[pid].home || []) : s.board.homeAreas;

  function settleOk(s, pid, v, setup) {
    const id = sc(s);
    const a = areaOf(s, v);
    if (s.sf.villages && isTribeVertex(s, v)) return false;
    if (s.sf.forts && s.sf.forts.some(f => f.v === v && !(s.buildings[v]))) return false;
    if (id === 7) {
      const main = s.board.homeAreas[0];
      if (a === main) return true;
      return !setup && fortOf(s, pid) && fortOf(s, pid).circle === v;
    }
    if (id === 5 && a !== s.board.homeAreas[0]) return false;
    if (!setup) return true;
    if (a < 0 || !s.board.homeAreas.includes(a)) return false;
    if (id === 8 && [].concat(s.sf.purple, s.sf.brown, s.sf.excl).includes(v)) return false;
    return true;
  }

  function routeOk(s, pid, e, kind, setupVertex) {
    if (sc(s) !== 7 || kind !== 'ship') return true;
    if (setupVertex !== undefined && setupVertex !== null) return false;
    return pirateRouteEdges(s, pid).includes(e);
  }

  // Cruce que ancla una ruta de barcos (poblado propio o, en «Tela para Catan», una aldea)
  function anchor(s, pid, v) {
    return !!(s.sf.villages && s.sf.villages.some(x => x.v === v));
  }

  function robberFilter(s, pid, list) {
    const id = sc(s);
    return list.filter(h => {
      const hx = s.board.hexes[h];
      if (hx.frame || hx.hidden) return false;
      if (isLand(hx.terrain)) {
        if (id === 5 && (hx.area !== s.board.homeAreas[0] || h === s.sf.robberStart)) return false;
        if (id === 6 && hx.tribe) return false;
      } else if (id === 6 && !s.sf.villages.some(x => x.conn.includes(pid))) return false;
      return true;
    });
  }

  function extraVP(s, pid) {
    const P = s.players[pid];
    return s.sf.islandVP * P.islands.length + (P.chits || 0) + Math.floor((P.cloth || 0) / 2);
  }

  function winCheck(s, pid) {
    const vp = C.totalVP(s, pid);
    if (sc(s) === 7) return vp >= s.vpTarget && fortOf(s, pid) && fortOf(s, pid).hp <= 0;
    if (sc(s) === 8) {
      const w = s.sf.wonders.find(x => x.owner === pid);
      if (w && w.level >= 4) return true;
      if (vp < s.vpTarget || !w) return false;
      return s.sf.wonders.every(x => x === w || x.level < w.level);
    }
    return vp >= s.vpTarget;
  }

  function filterDev(s, pid, list) {
    if (sc(s) === 7 && !(routeOf(s, pid) || []).some(e => s.roads[e] && !s.roads[e].war)) return list.filter(c => c !== 'knight');
    return list;
  }

  // Caballero en «Las islas piratas»: el barco normal más atrasado de la ruta pasa a ser de guerra
  function knight(s, pid) {
    if (sc(s) !== 7) return false;
    const e = routeOf(s, pid).find(x => s.roads[x] && !s.roads[x].war);
    if (e !== undefined) { s.roads[e].war = true; R().log(s, nm(s, pid) + ' convierte un barco en barco de guerra (' + warships(s, pid) + ').', pid); }
    return true;
  }

  // ---------- después de construir ----------
  function afterSettlement(s, pid, v, setup) {
    const P = s.players[pid];
    const a = areaOf(s, v);
    if (setup) {
      if ((sc(s) === 2 || sc(s) === 9) && a >= 0) { P.home = P.home || []; if (!P.home.includes(a)) P.home.push(a); }
    } else if (s.sf.islandVP && a >= 0 && !homeOf(s, pid).includes(a) && !P.islands.includes(a)) {
      P.islands.push(a);
      R().log(s, P.name + (sc(s) === 4 ? ' llega a una zona nueva' : ' coloniza una isla nueva') + ': +' + s.sf.islandVP + ' PV.', pid);
    }
    if (s.sf.gifts) offerHarbor(s, pid, setup);
  }

  function afterRoute(s, pid, kind, e, opts) {
    opts = opts || {};
    if (sc(s) === 3) reveal(s, pid, e);
    if (kind !== 'ship') return;
    if (s.sf.routes && !opts.setup) {
      // al mover un barco de la ruta pirata, pasa a ser su nuevo extremo
      if (opts.moved) s.sf.routes[pid] = liveRoute(s, pid).filter(x => x !== e);
      const r = routeOf(s, pid);
      if (!r.includes(e)) r.push(e);
    }
    if (s.sf.gifts) {
      s.sf.gifts.filter(g => g.edge === e && g.taken === null).forEach(g => takeGift(s, pid, g));
    }
    if (s.sf.villages) connectVillages(s, pid, e);
  }

  // ---------- La isla de la niebla ----------
  function reveal(s, pid, e) {
    const B = s.board;
    const ids = new Set();
    B.edges[e].v.forEach(v => B.vertices[v].hexes.forEach(h => { if (B.hexes[h].hidden) ids.add(h); }));
    if (!ids.size) return;
    const gold = {};
    ids.forEach(h => {
      const hx = B.hexes[h];
      const t = s.sf.fog.t.pop() || 'sea';
      hx.hidden = false;
      hx.terrain = t;
      if (isLand(t)) {
        hx.number = s.sf.fog.n.pop() || null;
        if (!hx.number) delete hx.number;
        const res = TERRAIN_RES[t];
        if (res && s.bank[res] > 0) { s.bank[res]--; s.players[pid].resources[res]++; R().log(s, nm(s, pid) + ' descubre ' + C.TERRAIN_NAME_ES[t] + ' y recibe 1 ' + C.RES_NAME[res] + '.', pid); }
        else if (t === 'gold') { gold[pid] = 1; R().log(s, nm(s, pid) + ' descubre un río de oro.', pid); }
        else R().log(s, nm(s, pid) + ' descubre ' + C.TERRAIN_NAME_ES[t] + '.', pid);
      } else R().log(s, nm(s, pid) + ' descubre mar.', pid);
      R().event(s, { type: 'sfReveal', pid, hex: h, terrain: t });
    });
    C.refreshFlags(B);
    fixFrame(B);
    // islas nuevas o ampliadas
    B.hexes.forEach(h => { if (isLand(h.terrain) && h.island < 0) h.island = 1000 + h.id; });
    computeAreas(B, false);
    if (Object.keys(gold).length && s.phase !== 'gold') { s.sf.goldWhy = 'Descubrimiento: río de oro'; C._R.startGold(s, gold, s.phase); }
  }

  // ---------- La tribu olvidada ----------
  function takeGift(s, pid, g) {
    const P = s.players[pid];
    g.taken = pid;
    if (g.kind === 'vp') { P.chits++; R().log(s, P.name + ' recibe un punto de victoria de la tribu.', pid); }
    else if (g.kind === 'dev') {
      const dc = { type: g.card, turn: s.turn };
      if (g.card === 'vp') dc.variant = 'library';
      P.devCards.push(dc);
      R().log(s, P.name + ' recibe una carta de desarrollo de la tribu.', pid);
    } else {
      P.harborsHeld.push(g.port);
      R().log(s, P.name + ' recibe un puerto ' + (g.port === 'any' ? '3:1' : '2:1 de ' + C.RES_NAME[g.port]) + ' de la tribu.', pid);
      offerHarbor(s, pid);
    }
    R().event(s, { type: 'sfGift', pid, kind: g.kind });
  }
  // Coloca los puertos recibidos junto a un poblado costero propio (sin puertos vecinos)
  function harborSpots(s, pid) {
    const B = s.board;
    const out = [];
    Object.keys(s.buildings).map(Number).filter(v => s.buildings[v].owner === pid).forEach(v => {
      B.vertices[v].edges.forEach(e => {
        const E = B.edges[e];
        if (E.hexes.length !== 2) return;
        const hs = E.hexes.map(id => B.hexes[id]);
        if (!hs.some(h => isLand(h.terrain)) || !hs.some(h => h.terrain === 'sea')) return;
        if (E.v.some(x => B.vertices[x].port)) return;
        out.push({ v, e });
      });
    });
    return out;
  }
  // Valor de un lado para un puerto: producción del recurso del puerto (o de todo, si es 3:1) en sus dos cruces
  function harborValue(s, e, type, pid) {
    const B = s.board;
    let val = 0;
    B.edges[e].v.forEach(v => {
      B.vertices[v].hexes.forEach(h => {
        const hx = B.hexes[h];
        if (hx.number && (type === 'any' || TERRAIN_RES[hx.terrain] === type)) val += C.PIPS[hx.number] * (type === 'any' ? 0.5 : 1);
      });
      const b = s.buildings[v];
      if (b && pid !== undefined && b.owner === pid) val += b.type === 'city' ? 2 : 1;
    });
    return val;
  }
  function putHarbor(s, pid, e, type) {
    const B = s.board;
    const E = B.edges[e];
    const sea = E.hexes.map(id => B.hexes[id]).find(h => h.terrain === 'sea');
    B.ports.push({ id: B.ports.length, type, edge: e, hex: sea.id, owner: pid });
    E.v.forEach(x => { B.vertices[x].port = type; });
    R().log(s, nm(s, pid) + ' coloca un puerto ' + (type === 'any' ? '3:1' : '2:1 de ' + C.RES_NAME[type]) + '.', pid);
    R().event(s, { type: 'sfHarbor', pid, edge: e, port: type });
  }
  function placeHeldHarbors(s, pid) {
    const P = s.players[pid];
    while (P.harborsHeld.length) {
      const spots = harborSpots(s, pid);
      if (!spots.length) return;
      const type = P.harborsHeld[0];
      spots.sort((a, b) => harborValue(s, b.e, type, pid) - harborValue(s, a.e, type, pid));
      putHarbor(s, pid, spots[0].e, type);
      P.harborsHeld.shift();
    }
  }
  // La tribu olvidada: quien recibe el puerto elige dónde ponerlo (la máquina y la colocación inicial, solos)
  function offerHarbor(s, pid, setup) {
    const P = s.players[pid];
    if (!P.harborsHeld.length || !harborSpots(s, pid).length) return;
    if (P.bot || setup || s.phase === 'setup' || s.phase === 'sfHarbor') { placeHeldHarbors(s, pid); return; }
    s.sf.hp = { kind: 'gift', pid, type: P.harborsHeld[0], ret: s.phase };
    s.phase = 'sfHarbor';
  }
  // Lados donde puede ir el puerto que se está colocando
  function harborEdges(s) {
    const hp = s.sf.hp;
    if (!hp) return [];
    const B = s.board;
    if (hp.kind === 'gift') return [...new Set(harborSpots(s, hp.pid).map(x => x.e))];
    return B.edges.filter(E => {
      if (E.hexes.length !== 2) return false;
      const hs = E.hexes.map(id => B.hexes[id]);
      return hs.some(h => isLand(h.terrain)) && hs.some(h => h.terrain === 'sea') && !E.v.some(x => B.vertices[x].port);
    }).map(E => E.id);
  }
  function placeHarborAction(s, pid, e) {
    const hp = s.sf.hp;
    if (s.phase !== 'sfHarbor' || !hp || hp.pid !== pid) return { error: 'No te toca colocar un puerto' };
    if (!harborEdges(s).includes(e)) return { error: 'El puerto debe ir en la costa, sin tocar otro puerto' + (hp.kind === 'gift' ? ', junto a tu poblado' : '') };
    putHarbor(s, pid, e, hp.type);
    if (hp.kind === 'gift') {
      const P = s.players[pid];
      P.harborsHeld.shift();
      if (P.harborsHeld.length && harborSpots(s, pid).length) { hp.type = P.harborsHeld[0]; return null; }
      s.phase = hp.ret;
      s.sf.hp = null;
      return null;
    }
    // Nuevo mundo: sigue el jugador de la izquierda hasta colocar todos
    s.sf.harborQueue.shift();
    hp.n++;
    const harborsLeft = s.sf.harborQueue.length && harborEdges(s).length;
    if (harborsLeft) {
      hp.pid = (hp.pid + 1) % s.players.length;
      hp.type = s.sf.harborQueue[0];
      s.current = hp.pid;
      return null;
    }
    s.sf.hp = null;
    s.phase = 'setup';
    s.current = s.setup.order[0];
    R().log(s, 'Puertos colocados. ' + nm(s, s.current) + ' coloca primero.');
    return null;
  }

  // ---------- Tela para Catan ----------
  function connectVillages(s, pid, e) {
    const E = s.board.edges[e];
    s.sf.villages.forEach(x => {
      if (!E.v.includes(x.v) || x.conn.includes(pid)) return;
      x.conn.push(pid);
      R().log(s, nm(s, pid) + ' comercia con la aldea del ' + x.number + '.', pid);
      giveCloth(s, x, [pid]);
    });
    checkClothEnd(s);
  }
  function giveCloth(s, x, pids) {
    if (x.cloth <= 0) return;
    pids.forEach(p => {
      if (x.cloth > 0) { x.cloth--; s.players[p].cloth++; } else if (s.sf.supply > 0) { s.sf.supply--; s.players[p].cloth++; }
    });
  }
  function afterProduce(s, roll) {
    if (!s.sf.villages) return;
    const got = {};
    s.sf.villages.forEach(x => {
      if (x.number !== roll || !x.conn.length || x.cloth <= 0) return;
      giveCloth(s, x, x.conn);
      x.conn.forEach(p => { got[p] = (got[p] || 0) + 1; });
    });
    Object.entries(got).forEach(([p, n]) => R().log(s, nm(s, +p) + ' recibe ' + n + ' tela(s).', +p));
    checkClothEnd(s);
  }
  function checkClothEnd(s) {
    if (s.winner !== null || !s.sf.villages) return;
    if (s.sf.villages.filter(x => x.cloth > 0).length > 3) return;
    const ps = s.players.map(p => p.id).sort((a, b) => (C.totalVP(s, b) - C.totalVP(s, a)) || (s.players[b].cloth - s.players[a].cloth));
    s.winner = ps[0];
    s.phase = 'ended';
    R().log(s, 'Quedan 3 aldeas o menos con tela: termina la partida. ¡' + nm(s, ps[0]) + ' gana con ' + C.totalVP(s, ps[0]) + ' puntos!', ps[0]);
    R().event(s, { type: 'win', pid: ps[0] });
  }

  // ---------- Las maravillas ----------
  const WONDERS = {
    cathedral: { name: 'Catedral', cost: { brick: 1, wheat: 1, ore: 3 }, req: '1 ciudad y al menos 6 PV' },
    bridge: { name: 'Gran Puente', cost: { wood: 3, wheat: 1, sheep: 1 }, req: 'Un poblado en el estrecho (cruce violeta)' },
    wall: { name: 'Gran Muralla', cost: { wood: 1, brick: 3, wheat: 1 }, req: 'Dos poblados en el páramo (cruces marrones); con las reglas 2025, un edificio' },
    monument: { name: 'Monumento', cost: { wheat: 3, ore: 2 }, req: 'Una ciudad en un puerto y una ruta de 5 carreteras o barcos seguidos sin ramificar' },
    theater: { name: 'Teatro', cost: { wood: 1, brick: 1, sheep: 3 }, req: '2 ciudades' }
  };
  const ownBuildings = (s, pid) => Object.keys(s.buildings).map(Number).filter(v => s.buildings[v].owner === pid);
  // Tramo más largo de carreteras/barcos propios sin bifurcaciones
  function straightRoute(s, pid) {
    const own = new Set(Object.keys(s.roads).map(Number).filter(e => s.roads[e].owner === pid));
    const deg = v => s.board.vertices[v].edges.filter(e => own.has(e)).length;
    let best = 0;
    const seen = new Set();
    own.forEach(e0 => {
      if (seen.has(e0)) return;
      // recorre el tramo en ambos sentidos mientras los cruces tengan exactamente 2 piezas propias
      let len = 1;
      seen.add(e0);
      s.board.edges[e0].v.forEach(start => {
        let v = start, prev = e0;
        while (deg(v) === 2 && !(s.buildings[v] && s.buildings[v].owner !== pid)) {
          const nx = s.board.vertices[v].edges.find(x => own.has(x) && x !== prev);
          if (nx === undefined || seen.has(nx)) break;
          seen.add(nx); len++; prev = nx;
          const E = s.board.edges[nx];
          v = E.v[0] === v ? E.v[1] : E.v[0];
        }
      });
      best = Math.max(best, len);
    });
    return best;
  }
  function wonderReqOk(s, pid, kind) {
    const mine = ownBuildings(s, pid);
    const cities = mine.filter(v => s.buildings[v].type === 'city');
    switch (kind) {
      case 'cathedral': return cities.length >= 1 && C.totalVP(s, pid) >= 6;
      case 'bridge': return mine.some(v => s.sf.purple.includes(v));
      // la carta de 2020 pide dos poblados en el páramo; la de 2025, un edificio en uno de sus cruces
      case 'wall': return mine.filter(v => s.sf.brown.includes(v)).length >= (s.rules2025 ? 1 : 2);
      case 'monument': return cities.some(v => s.board.vertices[v].port) && straightRoute(s, pid) >= 5;
      case 'theater': return cities.length >= 2;
    }
    return false;
  }
  function wonderOptions(s, pid) {
    if (s.sf.wonders.some(w => w.owner === pid)) return [];
    return s.sf.wonders.filter(w => w.owner === null && wonderReqOk(s, pid, w.kind)).map(w => w.id);
  }
  function startWonder(s, pid, wid) {
    const w = s.sf.wonders[wid];
    if (!w || !wonderOptions(s, pid).includes(wid)) return { error: 'No cumples los requisitos de esa maravilla' };
    const P = s.players[pid];
    if (P.pieces.ship <= 0) return { error: 'Necesitas un barco para marcar la maravilla' };
    w.owner = pid;
    P.pieces.ship--;
    P.wonder = wid;
    R().log(s, P.name + ' empieza a construir ' + WONDERS[w.kind].name + '.', pid);
    R().event(s, { type: 'sfWonder', pid, wid, level: 0 });
    return null;
  }
  function buildWonder(s, pid) {
    const w = s.sf.wonders.find(x => x.owner === pid);
    if (!w) return { error: 'Primero elige una maravilla' };
    if (w.level >= 4) return { error: 'Tu maravilla ya está terminada' };
    const cost = WONDERS[w.kind].cost;
    if (!C.hasRes(s.players[pid].resources, cost)) return { error: 'Recursos insuficientes' };
    R().pay(s, pid, cost);
    w.level++;
    R().log(s, nm(s, pid) + ' construye el nivel ' + w.level + ' de ' + WONDERS[w.kind].name + '.', pid);
    R().event(s, { type: 'sfWonder', pid, wid: w.id, level: w.level });
    R().checkWin(s, pid);
    return null;
  }

  // ---------- acciones propias ----------
  function handle(s, pid, a) {
    const res = r => ({ result: r || undefined });
    if (a.type === 'sfSteal') {
      if (s.phase !== 'sfSteal' || pid !== s.current) return res({ error: 'No hay nada que robar ahora' });
      const vs = stealVictims(s, pid);
      if (vs.length && !vs.includes(a.victim)) return res({ error: 'Elige un jugador con cartas' });
      if (vs.length) {
        const V = s.players[a.victim];
        const pool = [];
        RES.forEach(k => { for (let i = 0; i < V.resources[k]; i++) pool.push(k); });
        const k = pool[Math.floor(Math.random() * pool.length)];
        V.resources[k]--; s.players[pid].resources[k]++;
        R().log(s, nm(s, pid) + ' roba una carta a ' + V.name + '.', pid);
        R().event(s, { type: 'steal', from: a.victim, to: pid, res: k });
      }
      s.phase = 'main';
      return res();
    }
    if (a.type === 'sfPlaceHarbor') return res(placeHarborAction(s, pid, a.edge));
    if (a.type === 'sfAttack') {
      if (sc(s) !== 7 || s.phase !== 'main' || pid !== s.current) return res({ error: 'No puedes atacar ahora' });
      const r = attackFortress(s, pid, a.forced);
      if (r) return res(r);
      R().checkWin(s, pid);
      if (s.phase === 'ended') return res();
      return res(R().doEndTurn(s, pid));
    }
    if (a.type === 'sfWonderStart' || a.type === 'sfWonderBuild') {
      if (sc(s) !== 8 || s.phase !== 'main' || pid !== s.current) return res({ error: 'No puedes construir maravillas ahora' });
      return res(a.type === 'sfWonderStart' ? startWonder(s, pid, a.wonder) : buildWonder(s, pid));
    }
    return null;
  }
  function stealVictims(s, pid) {
    return s.players.filter(p => p.id !== pid && (p.resources ? C.total(p.resources) : p.resCount) > 0).map(p => p.id);
  }

  // Tirada: en «Las islas piratas» la flota se mueve y ataca antes que nada; con 7 se roba a cualquiera
  function onRoll(s, pid, d1, d2) {
    s.sf.goldWhy = null;
    if (sc(s) !== 7) return null;
    s.sf.attacked = null;
    const r = moveFleet(s, pid, d1, d2);
    if (r) s.sf.goldWhy = 'Victoria sobre la flota pirata';
    return r;
  }

  function onTurnStart(s) { if (s.sf.routes) s.sf.attacked = null; }

  function redact(s, v) {
    v.board.hexes.forEach(h => { if (h.hidden) { h.terrain = 'hidden'; delete h.number; } });
    delete v.board.sfData;
    if (v.sf.fog) v.sf.fog = { left: s.sf.fog.t.length };
    if (v.sf.gifts) v.sf.gifts.forEach(g => { delete g.card; if (g.taken === null) delete g.port; });
  }

  // Valor extra de un cruce para la IA (islas nuevas, regalos, aldeas, niebla)
  function vertexBonus(s, pid, v) {
    const P = s.players[pid];
    let val = 0;
    const a = areaOf(s, v);
    if (s.sf.islandVP && a >= 0 && !homeOf(s, pid).includes(a) && !P.islands.includes(a) && s.phase !== 'setup') val += 4.5 * s.sf.islandVP;
    return val;
  }
  function edgeBonus(s, pid, e) {
    const B = s.board;
    let val = 0;
    if (sc(s) === 3 && B.edges[e].v.some(v => B.vertices[v].hexes.some(h => B.hexes[h].hidden))) val += 3;
    if (s.sf.gifts && s.sf.gifts.some(g => g.edge === e && g.taken === null)) val += 6;
    if (s.sf.villages && s.sf.villages.some(x => B.edges[e].v.includes(x.v) && !x.conn.includes(pid) && x.cloth > 0)) val += 6;
    return val;
  }

  C.TERRAIN_NAME_ES = { forest: 'bosque', hills: 'colinas', pasture: 'pastos', fields: 'campos', mountains: 'montañas', desert: 'desierto', gold: 'un río de oro', sea: 'mar' };

  C.SF = {
    SCENARIOS, MAPS, WONDERS, scName, generate, init, handle, settleOk, routeOk, anchor, robberFilter, extraVP, winCheck, filterDev, knight,
    afterSettlement, afterRoute, afterProduce, onRoll, onTurnStart, redact, vertexBonus, edgeBonus, areaOf, homeOf,
    pirateRouteEdges, routeOf, routeDone, harborEdges, harborValue, reachedCircle, warships, fortOf, attackFortress, stealVictims, wonderOptions, wonderReqOk,
    straightRoute, harborSpots, isTribeVertex
  };
})(typeof window !== 'undefined' ? window : globalThis);
