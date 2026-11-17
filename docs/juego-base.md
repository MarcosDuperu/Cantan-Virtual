# Juego básico (3-4) y ampliación 5-6

## Reglas oficiales (3-4 jugadores)

- **Tablero**: 19 terrenos (4 bosque, 4 pasto, 4 campo, 3 colina, 3 montaña, 1 desierto) dentro de un marco de mar con
  9 puertos (4 genéricos 3:1 y 5 de 2:1, uno por recurso). Fichas 2-12 (sin 7); en la colocación oficial se ponen
  en espiral alfabética (A…R) saltando el desierto. Variante: al azar sin 6 y 8 adyacentes.
- **Preparación**: cada jugador coloca poblado + carretera; luego, en orden inverso, el segundo poblado + carretera.
  El segundo poblado da 1 recurso por cada terreno adyacente.
- **Turno**: tirar dados → producción (poblado 1, ciudad 2; si el banco no alcanza para todos los que piden un
  recurso, nadie lo recibe, salvo que solo lo pida un jugador) → comercio (con el jugador en turno o con el banco
  4:1 / 3:1 / 2:1) → construcción. Se pueden mezclar comercio y construcción.
- **Costes**: carretera (madera + arcilla), poblado (madera + arcilla + lana + cereal), ciudad (2 cereal + 3 mineral),
  carta de desarrollo (lana + cereal + mineral). Límite: 15 carreteras, 5 poblados, 4 ciudades.
- **Regla de distancia**: ningún poblado junto a otro. Los poblados deben tocar una carretera propia.
- **El 7**: quien tenga más de 7 cartas descarta la mitad (redondeo hacia abajo); el jugador en turno mueve el
  ladrón y roba 1 carta a alguien con edificio junto a ese terreno.
- **Cartas de desarrollo (25)**: 14 caballeros, 5 puntos de victoria, 2 construcción de carreteras, 2 descubrimiento
  (año de abundancia), 2 monopolio. Una por turno, no la comprada en el mismo turno (los PV se pueden revelar
  para ganar).
- **Gran Ruta Comercial** (5+ tramos seguidos, 2 PV) y **Gran Ejército** (3+ caballeros, 2 PV).
- **Victoria**: 10 PV en tu propio turno.

## Ampliación 5-6 (revisión 2022)

- **Tablero**: +11 terrenos (1 desierto, 2 de cada uno de los demás) = 30 hexágonos; 28 fichas propias
  (A…Y, ZA, ZB, ZC) en espiral; 2 marcos pequeños con puertos (2:1 lana y 3:1) → 11 puertos.
- **Suministro**: +25 cartas de recurso (24 de cada) y +9 cartas de desarrollo (34 en total:
  20 caballeros, 5 PV, 3 de cada carta de progreso).
- **Jugadores en pareja** (reemplaza a la fase de construcción especial):
  - El jugador inicial es el **jugador 1**; el tercero a su izquierda es el **jugador 2**.
  - Jugador 1: tira los dados, comercia con todos y con el banco, construye y juega 1 carta.
  - Después, jugador 2: **solo comercia con el banco**, construye y juega 1 carta (puede ganar con PV).
  - Luego ambos marcadores pasan a la izquierda.
  - Si los dos llegan a la victoria en el mismo turno, gana el jugador 1.
- Ediciones anteriores: **fase de construcción especial** (al terminar cada turno, los demás pueden construir
  en orden, sin comerciar ni jugar cartas).

## Estado en el juego

- Implementado: todo lo anterior para 3-4, y la ampliación 5-6 con **jugadores en pareja** (regla de 2022). La antigua
  **fase de construcción especial** se puede elegir como opción en el menú.
- Con 2 jugadores se usa «Catan para dos» (variante de Mercaderes y Bárbaros).
- Las fichas numéricas del tablero 3-4 se colocan en **espiral alfabética** (A…R) desde una esquina; se prueba desde
  otra esquina si quedaran dos fichas rojas juntas. El primer jugador se decide **tirando los dados** (los empatados
  vuelven a tirar). Pruebas: `node tools/test-base.js`.
- Diferencias:
  - En el tablero 5-6 las fichas se reparten al azar sin 6/8 adyacentes: no se conocen los valores de las fichas
    A…ZC de la ampliación.
  - Los puertos se reparten de forma espaciada por la costa (no en las posiciones fijas del marco).
- Variantes extra ya implementadas: ladrón amistoso (de Mercaderes y Bárbaros) y PV para ganar configurables.
