// Reglas de cada modo de juego (resumen fiel al reglamento original)
(function (root) {
  const C = root.Catan;
  const CLASSIC = `
  <h2>Catan — Juego básico (3-4 jugadores)</h2>
  <p><b>Objetivo:</b> ser el primero en alcanzar <b>10 puntos de victoria</b> (PV) durante tu propio turno.</p>
  <h3>El tablero</h3>
  <p>19 hexágonos de terreno rodeados de mar: bosque (madera), colinas (arcilla), pastos (lana), campos (cereal),
  montañas (mineral) y un desierto. Cada terreno lleva una ficha numérica (2-12). Los números 6 y 8, en rojo, son los más probables
  y nunca están juntos. En la costa hay 9 puertos: 4 genéricos (3:1) y 5 especiales (2:1).</p>
  <h3>Preparación</h3>
  <p>Cada jugador coloca un poblado y una carretera adyacente; después, en orden inverso, un segundo poblado y carretera.
  Por el segundo poblado se reciben las materias primas de los terrenos que lo rodean.</p>
  <h3>El turno</h3>
  <ol><li><b>Producción:</b> tira los dos dados. Todos los poblados junto a un terreno con ese número reciben 1 carta (las ciudades, 2).
  Si el banco no tiene suficientes cartas de un recurso para todos, nadie recibe ese recurso (salvo que solo lo pida un jugador).</li>
  <li><b>Comercio:</b> con otros jugadores (solo con el jugador en turno) o con el banco: 4:1, o 3:1 / 2:1 si tienes un puerto.</li>
  <li><b>Construcción:</b> carreteras, poblados, ciudades y cartas de desarrollo.</li></ol>
  <h3>Costes</h3>
  <ul><li>Carretera: madera + arcilla</li><li>Poblado (1 PV): madera + arcilla + lana + cereal</li>
  <li>Ciudad (2 PV, mejora un poblado): 2 cereal + 3 mineral</li><li>Carta de desarrollo: lana + cereal + mineral</li></ul>
  <h3>Reglas de construcción</h3>
  <ul><li><b>Regla de distancia:</b> ningún poblado puede estar en un cruce adyacente a otro poblado o ciudad.</li>
  <li>Los poblados deben conectarse a una de tus carreteras (salvo en la preparación).</li>
  <li>Las carreteras se conectan a tus carreteras, poblados o ciudades; un poblado rival corta tu camino.</li>
  <li>Límite de piezas: 15 carreteras, 5 poblados y 4 ciudades.</li></ul>
  <h3>El 7 y el ladrón</h3>
  <p>Si sale un 7 nadie produce. Quien tenga <b>más de 7 cartas</b> descarta la mitad (redondeando hacia abajo).
  El jugador en turno mueve el ladrón a otro terreno y roba una carta al azar a un jugador con poblado o ciudad junto a él.
  El terreno con el ladrón no produce.</p>
  <h3>Cartas de desarrollo (25)</h3>
  <ul><li><b>Caballero (14):</b> mueve el ladrón y roba. Se puede jugar antes de tirar los dados.</li>
  <li><b>Punto de victoria (5):</b> 1 PV oculto.</li>
  <li><b>Construcción de carreteras (2):</b> construye 2 carreteras gratis.</li>
  <li><b>Descubrimiento (2):</b> toma 2 recursos cualesquiera del banco.</li>
  <li><b>Monopolio (2):</b> elige un recurso; todos te entregan todas sus cartas de ese tipo.</li></ul>
  <p>Solo puedes jugar <b>una</b> carta de desarrollo por turno y nunca la que compraste en ese mismo turno.</p>
  <h3>Cartas especiales (2 PV cada una)</h3>
  <ul><li><b>Gran Ruta Comercial:</b> la primera persona con una carretera continua de al menos 5 tramos. Se pierde si otro la supera.</li>
  <li><b>Gran Ejército:</b> el primero en jugar 3 caballeros. Se pierde si otro juega más.</li></ul>`;

  const EXTENDED = `
  <h2>Ampliación para 5-6 jugadores</h2>
  <p>Se aplican todas las reglas del juego básico con estos cambios:</p>
  <ul><li><b>Tablero:</b> 30 hexágonos (6 bosques, 6 pastos, 6 campos, 5 colinas, 5 montañas, 2 desiertos) y 28 fichas numéricas.</li>
  <li><b>Puertos:</b> 11 (5 genéricos 3:1 y 6 especiales 2:1, con dos de lana).</li>
  <li><b>Banco:</b> 24 cartas de cada recurso.</li>
  <li><b>Cartas de desarrollo:</b> 34 (20 caballeros, 5 puntos, 3 de cada carta de progreso).</li>
  <li><b>Fase de construcción especial:</b> cuando un jugador termina su turno, cada uno de los demás, en orden,
  puede construir y comprar cartas de desarrollo (sin comerciar ni jugar cartas). Así hay menos espera entre turnos.</li>
  <li>Se sigue ganando con <b>10 PV</b>, y solo durante tu propio turno.</li></ul>`;

  const SEAFARERS = `
  <h2>Navegantes de Catan — «Hacia nuevas costas»</h2>
  <p>Se aplican las reglas básicas más las siguientes:</p>
  <h3>Barcos</h3>
  <ul><li>Coste: <b>madera + lana</b>. Cada jugador tiene 15 barcos.</li>
  <li>Se colocan en aristas de mar o de costa, conectados a tus poblados/ciudades o a otros barcos tuyos.</li>
  <li>Una carretera y un barco solo se conectan entre sí a través de un poblado o ciudad propios.</li>
  <li><b>Mover barcos:</b> una vez por turno puedes mover un barco del extremo abierto de una línea de barcos
  (no construido este turno) a otra posición válida.</li>
  <li>La Gran Ruta Comercial cuenta carreteras y barcos conectados.</li></ul>
  <h3>Islas y oro</h3>
  <ul><li>Los poblados iniciales se colocan en la isla principal.</li>
  <li>El primer poblado que construyes en <b>cada isla nueva</b> te da <b>2 PV</b> extra.</li>
  <li><b>Río de oro:</b> quien produce en un terreno de oro elige el recurso que quiera del banco.</li></ul>
  <h3>El pirata</h3>
  <ul><li>Con un 7 o un caballero puedes mover el ladrón <b>o</b> el pirata (a un hexágono de mar).</li>
  <li>Al mover el pirata robas a un jugador con un barco junto a ese hexágono.</li>
  <li>No se pueden construir ni mover barcos junto al pirata.</li></ul>
  <p>Se gana con <b>14 PV</b>.</p>`;

  const CITIES = `
  <h2>Ciudades y Caballeros (3-4 jugadores)</h2>
  <p>Se juega con el tablero básico y sus reglas, con estos cambios. <b>Se gana con 13 PV</b> en tu turno.
  No hay cartas de desarrollo ni Gran Ejército: en su lugar hay cartas de progreso, caballeros y mejoras de ciudad.</p>
  <h3>Preparación</h3>
  <p>Cada jugador coloca un poblado con carretera y, en la segunda ronda, <b>una ciudad</b> con carretera.
  La ciudad da 1 recurso por cada terreno que la rodea.</p>
  <h3>Mercancías</h3>
  <p>Las ciudades producen distinto: en <b>bosque</b> 1 madera + 1 <b>papel</b>, en <b>pastos</b> 1 lana + 1 <b>tela</b>,
  en <b>montañas</b> 1 mineral + 1 <b>moneda</b>; en campos y colinas, 2 recursos. Las mercancías cuentan como cartas en la mano
  y se comercian como los recursos (4:1 con el banco, 3:1 con puerto genérico).</p>
  <h3>Los tres dados</h3>
  <p>Cada turno se tiran el dado <b>rojo</b>, el <b>amarillo</b> y el <b>dado de eventos</b>. Primero se resuelve el evento:</p>
  <ul><li><b>Barco</b> (3 caras): el barco bárbaro avanza una casilla. Al llegar al final, los bárbaros atacan.</li>
  <li><b>Puerta de ciudad</b> (amarilla = Comercio, azul = Política, verde = Ciencia): cada jugador con mejoras de ese color
  roba una carta de progreso de ese color si el dado rojo muestra un número cubierto por su nivel
  (nivel 1: 1-2, nivel 2: 1-3, nivel 3: 1-4, nivel 4: 1-5, nivel 5: 1-6).</li></ul>
  <p>Después se produce con la suma del rojo y el amarillo.</p>
  <h3>El 7 y el ladrón</h3>
  <p>Con un 7 se descarta la mitad si tienes más de 7 cartas (<b>+2 por cada muralla</b>). El ladrón <b>no se mueve
  hasta el primer ataque bárbaro</b>; después funciona como siempre.</p>
  <h3>Los bárbaros</h3>
  <p>Cuando el barco llega a Catan se compara la <b>fuerza bárbara</b> (número total de ciudades y metrópolis en juego)
  con la <b>defensa</b> (suma de la fuerza de todos los caballeros <b>activos</b>).</p>
  <ul><li><b>Si gana Catan:</b> el jugador con más fuerza activa recibe una carta de <b>Defensor de Catan</b> (1 PV).
  Si hay empate, cada empatado roba una carta de progreso.</li>
  <li><b>Si ganan los bárbaros:</b> el jugador (o jugadores) con menos fuerza activa pierde una ciudad, que vuelve a ser poblado.
  Las metrópolis no se pueden saquear; quien solo tiene metrópolis (o ninguna ciudad) no participa.</li>
  <li>Después del ataque todos los caballeros quedan inactivos y el barco vuelve al inicio.</li></ul>
  <h3>Caballeros</h3>
  <ul><li><b>Reclutar</b> (lana + mineral): caballero básico (fuerza 1), inactivo, en un cruce libre junto a tus carreteras.</li>
  <li><b>Activar</b> (cereal). Solo los activos defienden y actúan.</li>
  <li><b>Ascender</b> (lana + mineral, una vez por turno): básico → fuerte (2) → poderoso (3). El poderoso requiere la <b>Fortaleza</b>.</li>
  <li>Cada jugador tiene 2 caballeros de cada nivel. Los caballeros cortan las carreteras rivales como los poblados.</li>
  <li><b>Acciones</b> (el caballero queda inactivo; no puede actuar el turno en que se activó):
  moverse por tus carreteras a otro cruce libre; <b>desalojar</b> a un caballero rival más débil;
  o <b>ahuyentar al ladrón</b> si está junto a un terreno con el ladrón (lo mueves y robas, como con un 7).</li></ul>
  <h3>Murallas</h3>
  <p>Cuestan 2 de arcilla y se colocan bajo una ciudad (máximo 3). Cada una aumenta en 2 tu límite de cartas.
  Si la ciudad es saqueada, la muralla se pierde.</p>
  <h3>Mejoras de ciudad y metrópolis</h3>
  <p>Necesitas al menos una ciudad. Cada nivel cuesta tantas mercancías de su color como el nivel (1, 2, 3, 4 y 5):</p>
  <ul><li><b>Comercio</b> (tela): Mercado, Casa de comercio, <b>Gremio de comerciantes</b> (nivel 3: cambias mercancías 2:1), Banco, Gran bolsa.</li>
  <li><b>Política</b> (moneda): Ayuntamiento, Iglesia, <b>Fortaleza</b> (nivel 3: caballeros poderosos), Catedral, Gran asamblea.</li>
  <li><b>Ciencia</b> (papel): Abadía, Biblioteca, <b>Acueducto</b> (nivel 3: si una tirada no te da nada, eliges 1 recurso), Teatro, Universidad.</li></ul>
  <p>El primero que llega al <b>nivel 4</b> de un color convierte una de sus ciudades en <b>metrópolis</b> (4 PV en total, inmune a los bárbaros).
  Si otro jugador llega antes al <b>nivel 5</b>, se la quita. Hay una metrópolis por color.</p>
  <h3>Cartas de progreso (54)</h3>
  <p>Se juegan en tu turno después de tirar (el Alquimista, antes), tantas como quieras, incluso las recién robadas.
  Puedes tener como máximo <b>4</b>; si recibes una quinta fuera de tu turno, descartas una.
  La Imprenta y la Constitución dan 1 PV al instante.</p>
  <ul><li><b>Ciencia:</b> Alquimista, Inventor, Grúa, Irrigación, Ingeniero, Medicina, Minería, Imprenta, Construcción de carreteras, Herrero.</li>
  <li><b>Política:</b> Obispo, Constitución, Desertor, Diplomático, Intriga, Saboteador, Espía, Señor de la guerra, Boda.</li>
  <li><b>Comercio:</b> Puerto comercial, Maestro mercader, Mercader (1 PV mientras lo tengas), Flota mercante, Monopolio de recursos, Monopolio comercial.</li></ul>
  <p class="muted">Pasa el mouse por cada carta en la partida para ver su efecto.</p>`;

  const CITIES56 = `
  <h2>Ciudades y Caballeros — ampliación 5-6 jugadores</h2>
  <ul><li>Tablero de 30 hexágonos de la ampliación 5-6, con 11 puertos.</li>
  <li>Banco de 24 cartas por recurso y 15 por mercancía.</li>
  <li><b>Fase de construcción especial:</b> al terminar cada turno, los demás jugadores pueden construir en orden
  (incluidos caballeros, murallas y mejoras de ciudad), sin comerciar ni jugar cartas.</li>
  <li>Se gana con 13 PV.</li></ul>`;

  const TRADERS = `<h2>Mercaderes y Bárbaros</h2><p>Próximamente. Esta expansión se añadirá cuando apruebes Ciudades y Caballeros.</p>`;
  const EXPLORERS = `<h2>Piratas y Exploradores</h2><p>Próximamente.</p>`;

  const VARIANTS = `
  <h2>Variantes opcionales</h2>
  <ul><li><b>Puntos para ganar:</b> puedes cambiar los PV necesarios para ganar (partidas cortas o largas).</li>
  <li><b>Ladrón amistoso</b> (variante oficial de <i>Mercaderes y Bárbaros</i>): el ladrón no puede colocarse
  junto a un jugador con 2 PV o menos, ni se le puede robar.</li>
  <li><b>Velocidad de la máquina:</b> qué tan rápido juegan los rivales controlados por la máquina.</li></ul>`;

  C.RULES_TEXT = { classic: CLASSIC + VARIANTS, classic56: EXTENDED, extended: EXTENDED, seafarers: SEAFARERS, cities: CITIES, cities56: CITIES56,
    citiesAll: CITIES + CITIES56, traders: TRADERS, explorers: EXPLORERS, variants: VARIANTS };
  C.RULES_TABS = [['classic', 'Juego básico'], ['extended', '5-6 jugadores'], ['seafarers', 'Navegantes'], ['citiesAll', 'Ciudades y Caballeros'],
    ['traders', 'Mercaderes y Bárbaros'], ['explorers', 'Piratas y Exploradores'], ['variants', 'Variantes']];
})(window);
