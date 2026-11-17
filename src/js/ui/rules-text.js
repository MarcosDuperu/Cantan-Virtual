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

  const TRADERS = `
  <h2>Mercaderes y Bárbaros (2-6 jugadores)</h2>
  <p>Cinco escenarios de campaña que se juegan sobre el juego básico (con sus cartas de desarrollo, salvo donde se indica).
  Se gana con los PV del escenario, en tu propio turno. Las variantes (cartas de evento, Señor del puerto, Catan para dos)
  se describen en la pestaña <b>Variantes</b> y también se pueden usar en el Clásico.</p>
  <table class="rules-table"><tr><th>#</th><th>Escenario</th><th>Jugadores</th><th>PV</th></tr>
  <tr><td>1</td><td>Los pescadores de Catan</td><td>2-6</td><td>10</td></tr>
  <tr><td>2</td><td>Los ríos de Catan</td><td>2-6</td><td>10</td></tr>
  <tr><td>3</td><td>Las caravanas</td><td>3-6</td><td>12</td></tr>
  <tr><td>4</td><td>Ataque bárbaro</td><td>3-6</td><td>12</td></tr>
  <tr><td>5</td><td>Mercaderes y bárbaros</td><td>3-6</td><td>13</td></tr></table>
  <h3>1. Los pescadores de Catan</h3>
  <ul><li>Un <b>lago</b> reemplaza al desierto: produce pescado con 2, 3, 11 y 12. En la costa hay 6 <b>caladeros</b> (4, 5, 6, 8, 9, 10)
  que tocan 3 cruces cada uno.</li>
  <li>Al salir su número, cada poblado junto a un caladero o al lago roba 1 ficha de pescado de la bolsa (ciudad, 2). Las fichas valen 1, 2 o 3 peces.
  Puedes tener como máximo 7 fichas. No son recursos: no se descartan con el 7 ni se roban.</li>
  <li>Acciones (en tu turno, después de tirar; sin cambio): <b>2</b> peces sacan al ladrón del tablero, <b>3</b> roban 1 recurso a un jugador,
  <b>4</b> toman 1 recurso del banco, <b>5</b> construyen una carretera gratis y <b>7</b> dan una carta de desarrollo.</li>
  <li><b>La bota vieja:</b> está en la bolsa. Quien la saca necesita 1 PV más para ganar. Después de tirar puede pasársela a un jugador con
  tantos o más PV.</li>
  <li>El ladrón empieza fuera del tablero.</li></ul>
  <h3>2. Los ríos de Catan</h3>
  <ul><li>Dos <b>ríos</b> cruzan la isla y desembocan en <b>pantanos</b> (sin número; el ladrón empieza en uno).</li>
  <li>Cada carretera o poblado que construyes junto a un río te da <b>1 moneda</b> de oro (mejorar a ciudad no da).</li>
  <li><b>Puentes</b> (2 arcilla + 1 madera, máximo 3): solo en los sitios de puente sobre el río. Cuentan como carretera y dan <b>3 monedas</b>.</li>
  <li>Dos veces por turno puedes cambiar <b>2 monedas por 1 recurso</b> del banco. También puedes vender 4 recursos iguales (3 con puerto genérico) por 1 moneda.</li>
  <li>El jugador con más monedas (si es el único) gana <b>1 PV</b>; el o los que menos tienen pierden <b>2 PV</b>. Las monedas no se roban.</li></ul>
  <h3>3. Las caravanas</h3>
  <ul><li>En el centro hay un <b>oasis</b> con 3 flechas, de las que salen 3 caravanas de camellos por los caminos (sin bifurcarse).</li>
  <li>Al terminar un turno en el que alguien construyó un poblado o una ciudad, se <b>vota</b>: cada jugador elige hacia dónde avanza el camello
  y ofrece lana y cereal. Gana la opción con mayoría; los votos se pagan al banco. Si nadie ofrece nada, decide quien terminó el turno.</li>
  <li>Un poblado o ciudad entre <b>2 camellos</b> vale <b>+1 PV</b>. Las carreteras con camello cuentan <b>doble</b> para la Gran Ruta.</li></ul>
  <h3>4. Ataque bárbaro</h3>
  <ul><li>El <b>castillo</b> está en el centro. La segunda pieza inicial es una <b>ciudad</b>. No hay ladrón ni Gran Ejército: un 7 solo obliga a descartar.</li>
  <li>Cada poblado nuevo (o ciudad mejorada) provoca <b>3 desembarcos</b>: se tiran 3 números distintos (sin 7) y llega 1 bárbaro a cada hexágono
  costero con ese número. Con <b>3 bárbaros</b> el hexágono queda <b>conquistado</b>: no produce, y un edificio rodeado solo de hexágonos conquistados
  no da puntos.</li>
  <li>Mazo propio que se juega al comprarlo: <b>Caballería</b> (un caballero en un camino del castillo), <b>Caballero veloz</b> (en cualquier camino),
  <b>Traición</b> (2 oro y mueves 2 bárbaros) e <b>Intriga</b> (un bárbaro pasa a ser tu prisionero).</li>
  <li><b>Fase de movimiento:</b> cada caballero recorre hasta 3 caminos (5 pagando 1 cereal). Deben salir de los caminos del castillo.</li>
  <li>Al terminar tu turno, en cada hexágono costero rodeado por <b>más caballeros que bárbaros</b>, estos son expulsados y se reparten como
  prisioneros (<b>2 prisioneros = 1 PV</b>; quien queda sin prisionero recibe 3 oro). Luego un dado elige una orientación de caminos y los
  caballeros en ella caen (cada uno da 3 oro a su dueño).</li>
  <li>Oro: 2 oro → 1 recurso (2 veces por turno); 4 iguales (3 con puerto genérico) → 1 oro.</li></ul>
  <h3>5. Mercaderes y bárbaros</h3>
  <ul><li>Hay 3 hexágonos comerciales: el <b>castillo</b>, la <b>cantera</b> y la <b>vidriería</b>, con una plaza en el centro. No hay ladrón ni Gran Ruta.
  Se empieza con un poblado y una ciudad. Si sale 2 o 12 se vuelve a tirar.</li>
  <li>Cada jugador tiene una <b>carreta</b>. En la fase de movimiento recorre caminos: cuesta 2 movimientos sin carretera, 1 por tu carretera,
  1 + 1 oro (para su dueño) por carretera ajena y +2 si hay un bárbaro. Con 1 cereal gana 2 movimientos (una vez por turno).
  En una plaza se detiene.</li>
  <li><b>Mercancías:</b> en cada plaza cargas una (si vas vacío) y la llevas a su destino: vidrio y mármol al castillo, herramientas a la cantera
  y arena a la vidriería. Cada entrega da <b>1 PV</b> y oro según tu tren de equipaje.</li>
  <li><b>Tren de equipaje</b> (5 niveles): más movimientos, más oro por entrega y la posibilidad de <b>ahuyentar bárbaros</b> con el dado
  (nivel 2: un 6; 3-4: 5-6; 5: 4-6). El nivel 5 vale 1 PV.</li>
  <li>Hay 3 <b>bárbaros</b> en caminos. El mazo propio tiene <b>Caballero</b> (mueves un bárbaro y robas a quien tenga carretera ahí),
  <b>Construcción de carreteras</b>, <b>Viaje rápido</b> (tu carreta vuelve a moverse) y 3 cartas de 1 PV.</li></ul>
  <h3>2 jugadores</h3>
  <p>Con 2 jugadores se usa <b>Catan para dos</b> (ver Variantes) y solo se pueden jugar los escenarios 1 y 2.</p>
  <h3>Ampliación 5-6: jugadores en pareja</h3>
  <ul><li>Tableros más grandes (2 lagos, más pantanos, 2 castillos en el escenario 4, 3 canteras y 3 vidrierías en el 5) y banco de 24 cartas.</li>
  <li>El <b>jugador 1</b> (el de turno) tira, comercia con todos, construye y mueve. Después juega el <b>jugador 2</b> (el tercero a su izquierda):
  <b>solo comercia con el banco</b>, construye y mueve sus caballeros o su carreta. También puede ganar en ese momento.</li>
  <li>Las votaciones de camellos y la expulsión de bárbaros se resuelven al terminar cada una de las dos partes.</li>
  <li>En el escenario 5 no se repiten el 2 y el 12, y el jugador 2 no puede comprar con oro.</li></ul>
  <p class="muted">Adaptación: la forma de los ríos, la posición de caladeros, castillo y hexágonos comerciales, el reparto de mercancías y la
  tabla del tren de equipaje son propios (el reglamento solo los muestra en las ilustraciones). El terremoto elige solo la carretera dañada,
  la Intriga elige el hexágono que más te amenaza y el oro no se ofrece en el comercio entre jugadores.</p>`;
  const EXPLORERS = `
  <h2>Piratas y Exploradores (2-6 jugadores)</h2>
  <p>Una campaña de 5 escenarios. Empiezas en la isla del juego básico; al este hay dos zonas <b>sin descubrir</b>
  (norte y sur, separadas por mar) que se revelan navegando. Se gana con los PV del escenario, en tu propio turno.</p>
  <table class="rules-table"><tr><th>#</th><th>Escenario</th><th>Misiones</th><th>Ocultos (3-4 / 5-6)</th><th>PV</th></tr>
  <tr><td>1</td><td>¡Tierra a la vista!</td><td>Solo explorar y colonizar (sin pirata)</td><td>16 / 20</td><td>8</td></tr>
  <tr><td>2</td><td>Guaridas piratas</td><td>Guaridas piratas</td><td>22 / 28</td><td>12</td></tr>
  <tr><td>3</td><td>Pescado para Catan</td><td>Guaridas + Pescado</td><td>22 / 32</td><td>15</td></tr>
  <tr><td>4</td><td>Especias para Catan</td><td>Pescado + Especias</td><td>26 / 32</td><td>15</td></tr>
  <tr><td>5</td><td>Exploradores y piratas</td><td>Las tres</td><td>32 / 40</td><td>17</td></tr></table>
  <h3>Diferencias con el juego básico</h3>
  <ul><li><b>No hay</b> ciudades, cartas de desarrollo, Gran Ruta, Gran Ejército ni ladrón. Con un 7 se sigue descartando la mitad si tienes más de 7 cartas.</li>
  <li><b>Oro:</b> empiezas con 2. Si una tirada (que no sea 7) no te da nada, recibes <b>1 oro</b>. Los ríos de oro liberados dan <b>2 oro</b> por poblado.
  El oro no cuenta para el límite de 7 cartas.</li>
  <li><b>Comercio:</b> no hay puertos; siempre <b>3:1</b> con el banco, o 3 iguales → 1 oro. Dos veces por turno puedes cambiar <b>2 oro → 1 recurso</b>.
  Con otros jugadores se comercia como siempre.</li></ul>
  <h3>Preparación</h3>
  <p>En orden, cada jugador coloca un <b>poblado portuario</b> en la costa de la isla inicial y un <b>poblado</b> (recibe los recursos de este).
  Después, empezando por quien puso el último poblado, cada uno coloca una <b>carretera</b> junto a su poblado y un <b>barco con un colono</b>
  junto a su poblado portuario.</p>
  <h3>El turno</h3>
  <ol><li><b>Producción:</b> tira los dados.</li>
  <li><b>Comercio y construcción.</b></li>
  <li><b>Movimiento</b> (botón «Mover barcos»): ya no puedes comerciar ni construir, salvo fundar un poblado con un barco colono.</li></ol>
  <h3>Piezas y costes</h3>
  <ul><li><b>Carretera</b> (madera + arcilla) y <b>poblado</b> (madera + arcilla + lana + cereal): como siempre, pero nunca junto a hexágonos sin descubrir.</li>
  <li><b>Poblado portuario</b> (2 cereal + 2 mineral): mejora un poblado de la costa. Vale <b>2 PV</b> y produce 1 recurso. Tiene un <b>muelle</b>
  para 1 pieza grande (colono, pescado) o 2 pequeñas (tripulaciones, especias).</li>
  <li><b>Barco</b> (madera + lana, máximo 3): en una ruta marítima junto a tu poblado portuario. Su bodega es como un muelle.</li>
  <li><b>Colono</b> (como un poblado, máximo 2) y <b>tripulación</b> (mineral + lana, máximo 9): se colocan en un muelle o en un barco junto a él.</li></ul>
  <h3>Barcos y exploración</h3>
  <ul><li>Cada barco tiene <b>4 movimientos</b> por turno; pagando 1 lana, +2 (una vez por barco y turno). Avanza de arista en arista por el mar
  (máximo 2 barcos por ruta; se puede pasar por rutas ocupadas).</li>
  <li><b>Descubrir:</b> si un extremo del barco llega a una esquina de un hexágono oculto, se revela. Un terreno recibe una ficha de la pila de su zona
  y te da 1 recurso; cualquier otro hexágono te da 2 oro. Descubrir termina el movimiento de ese barco.</li>
  <li><b>Fundar:</b> un barco con colono que apunta a una esquina de tierra funda allí un poblado gratis (respetando la distancia).
  El barco y el colono vuelven a tu reserva. Así se llega a las islas nuevas.</li>
  <li><b>Transbordo:</b> con el barco junto a tu poblado portuario puedes cargar y descargar el muelle.</li></ul>
  <h3>El barco pirata (escenarios 2-5)</h3>
  <ul><li>Quien saca un 7 coloca o mueve <b>su</b> barco pirata (solo hay uno en el tablero) en un mar que no toque la isla inicial ni el borde,
  y roba 1 carta (o 1 oro) a un dueño de barco junto a él. Si cae en un banco de pesca, su pescado desaparece.</li>
  <li>Pasar por una ruta del hexágono pirata cuesta <b>1 oro de tributo</b> por barco y turno (salvo al dueño del pirata).</li>
  <li><b>Ahuyentar:</b> un barco que no se movió este turno y apunta al hexágono pirata tira un dado; con un <b>6</b> echa al pirata,
  colocas el tuyo y robas. El barco ya no se mueve ese turno.</li></ul>
  <h3>Misiones</h3>
  <ul><li><b>Guaridas piratas:</b> los ríos de oro aparecen con una guarida (no producen ni se construye junto a ellos hasta capturarla).
  Lleva tripulaciones en barco y desembárcalas allí; con la <b>3.ª</b> se captura: cada participante recibe 2 oro y avanza 1.
  El <b>héroe</b> (dado + número de sus tripulaciones; en empate, quien puso más; si sigue, se repite) avanza 1 más y devuelve una
  tripulación a su reserva. Las demás quedan junto a la guarida y cada dueño puede recogerlas con un barco.
  El río de oro recibe el número de la ficha de guarida.</li>
  <li><b>Pescado:</b> los bancos de pesca tienen un número del 1 al 6. Al empezar la fase de movimiento se tira un dado y aparece pescado
  en ese banco (si quedan cargas). Un barco vacío que apunta al banco lo carga (ocupa toda la bodega); entregarlo en el <b>Consejo de Catan</b>
  (la isla junto a la costa este de la isla inicial) avanza 1.</li>
  <li><b>Especias:</b> en cada isla de especias puedes dejar 1 tripulación (se queda allí) y cargar 1 especia; entregarla en el Consejo avanza 1.
  Desde entonces tienes la ventaja de esa aldea y puedes construir en sus esquinas. Hay dos aldeas de cada ventaja (una por zona):
  <b>Viaje rápido</b> (+1 movimiento a todos tus barcos por aldea), <b>Bonificación pirata</b> (una aldea añade el 4 y otra el 5 a los
  números que ahuyentan al pirata) y <b>Oro rápido</b> (en tu fase de comercio vendes 1 recurso por 1 oro, una vez por aldea).</li>
  <li><b>Puntos de misión:</b> cada pista da 1, 1, 2, 2, 3, 3, 4 PV según la casilla (1 a 7). Quien va más adelantado tiene la carta de la misión (+1 PV);
  en empate la conserva quien llegó primero.</li></ul>
  <h3>2 jugadores</h3>
  <p>Después de colocar sus poblados portuarios, cada jugador coloca un <b>poblado portuario neutral</b> y luego un <b>poblado neutral</b> (grises).
  Son obstáculos: no producen ni dan puntos.</p>
  <h3>Ampliación 5-6: jugadores en pareja</h3>
  <ul><li>Se juega con una isla inicial de 21 hexágonos, banco de 24 cartas por recurso, 8 guaridas, 8 cargas de pescado y zonas inexploradas más grandes.</li>
  <li>El <b>jugador 1</b> (el de turno) tira los dados, comercia con todos, construye y mueve sus barcos.</li>
  <li>Después juega el <b>jugador 2</b> (el tercero a su izquierda): <b>solo comercia con el banco</b>, construye y mueve sus barcos.
  También puede ganar en ese momento.</li>
  <li>Luego el turno pasa al siguiente jugador. Se recomienda empezar por el escenario 2.</li></ul>
  <p class="muted">Adaptación: la composición de las zonas, las cantidades y las reglas siguen el reglamento oficial; las posiciones exactas de las fichas
  de la isla inicial, los sitios marcados para portuarios, el tipo de las 12 losetas estándar, los valores de las fichas y la tabla de PV de misión
  solo aparecen en las ilustraciones, así que aquí son propios. La colocación es libre en todos los escenarios.</p>`;

  const VARIANTS = `
  <h2>Variantes opcionales</h2>
  <ul><li><b>Puntos para ganar:</b> puedes cambiar los PV necesarios para ganar (partidas cortas o largas).</li>
  <li><b>Ladrón amistoso</b> (variante oficial de <i>Mercaderes y Bárbaros</i>): el ladrón no puede colocarse
  junto a un jugador con 2 PV o menos, ni se le puede robar.</li>
  <li><b>Cartas de evento</b> (<i>Mercaderes y Bárbaros</i>; Clásico y Mercaderes y Bárbaros): en vez de tirar los dados se roba una carta
  del mazo de 36. Cada carta indica el número que produce y, a veces, un evento: <i>¡El ladrón ataca!</i> (el 7), <i>Epidemia</i>
  (las ciudades producen 1), <i>Terremoto</i> (cada jugador tiene 1 carretera dañada hasta repararla con madera + arcilla),
  <i>Buenos vecinos</i>, <i>Torneo</i>, <i>Ventaja comercial</i>, <i>Mar en calma</i>, <i>Huye el ladrón</i>, <i>Ayuda vecinal</i>,
  <i>Conflicto</i> y <i>Año de abundancia</i>. Pasa el mouse sobre la carta para ver su efecto. Cuando sale <i>Año nuevo</i>
  (a 5 cartas del final) se baraja todo otra vez.</li>
  <li><b>Señor del puerto</b> (Clásico y Mercaderes y Bárbaros): cada poblado en un puerto da 1 punto de puerto y cada ciudad 2.
  El primero con 3 puntos recibe la carta (<b>2 PV</b>) y la pierde si otro lo supera. Se necesita <b>1 PV más</b> para ganar.</li>
  <li><b>Catan para dos</b> (automática con 2 jugadores en el Clásico y en los escenarios 1 y 2): hay 2 jugadores <b>neutrales</b>
  con un poblado cada uno. Se tira <b>dos veces</b> por turno (la segunda debe dar otro número). Cada vez que construyes una carretera
  o un poblado, construyes también uno gratis para un neutral. Cada jugador tiene <b>fichas de comercio</b> (5 al empezar; +1 por cada
  poblado en la costa y +2 junto al desierto; descartar un caballero jugado da 2) para un <b>comercio forzoso</b> (robas 2 cartas
  al rival y le das 2) o para <b>mandar al ladrón al desierto</b>. Cuestan 1 ficha si vas por detrás o empatado y 2 si vas por delante.
  En los Pescadores se usa pescado en vez de fichas.</li>
  <li><b>Velocidad de la máquina:</b> qué tan rápido juegan los rivales controlados por la máquina.</li></ul>`;

  C.RULES_TEXT = { classic: CLASSIC + VARIANTS, classic56: EXTENDED, extended: EXTENDED, seafarers: SEAFARERS, cities: CITIES, cities56: CITIES56,
    citiesAll: CITIES + CITIES56, traders: TRADERS, explorers: EXPLORERS, variants: VARIANTS };
  C.RULES_TABS = [['classic', 'Juego básico'], ['extended', '5-6 jugadores'], ['seafarers', 'Navegantes'], ['citiesAll', 'Ciudades y Caballeros'],
    ['traders', 'Mercaderes y Bárbaros'], ['explorers', 'Piratas y Exploradores'], ['variants', 'Variantes']];
})(window);
