# Mercaderes y Bárbaros: estado del trabajo (en pausa)

Fecha de la pausa: 16-11-2026. El trabajo quedó a mitad de camino por pedido del usuario.
Nada de esto está en un commit todavía (tampoco lo de Piratas y Exploradores de la misma sesión).

Reglas resumidas: [mercaderes-y-barbaros.md](mercaderes-y-barbaros.md). Los datos salen del texto de los reglamentos
oficiales (3-4 de 2015 y ampliación 5-6 de 2023).

## Qué está hecho

### Motor (funciona y está probado con partidas entre bots)

- `src/js/engine/tb.js` (nuevo): toda la lógica de la expansión.
  - **Variantes**, también usables en el modo Clásico:
    - Cartas de evento: mazo de 36 cartas más «Año nuevo», con los 11 eventos.
    - Señor del puerto: +2 PV y +1 a los PV para ganar.
    - Catan para dos: 2 jugadores neutrales, doble tirada, construcción gratis para un neutral y fichas de comercio
      (comercio forzoso, mandar al ladrón, descartar caballero).
  - **Escenario 1, Pescadores:**
    - Lago y caladeros.
    - Fichas de pescado (máx. 7) y la bota vieja.
    - Acciones con pescado: 2, 3, 4, 5 y 7 peces.
  - **Escenario 2, Ríos:**
    - Monedas por construir junto al río y puentes en los 7 sitios.
    - El más rico +1 PV y los más pobres −2 PV.
    - El hexágono con 12 también produce con 2.
  - **Escenario 3, Caravanas:**
    - Oasis con 3 flechas y caravanas que no se bifurcan.
    - Votación con lana y cereal.
    - +1 PV a los edificios entre 2 camellos y las carreteras con camello cuentan doble para la Gran Ruta.
  - **Escenario 4, Ataque bárbaro:**
    - Desembarcos (3 tiradas distintas) y hexágonos y edificios conquistados.
    - Mazo propio que se juega al comprarlo.
    - Caballeros en caminos (3 o 5 movimientos).
    - Expulsión con prisioneros y bajas por orientación.
  - **Escenario 5, Mercaderes y bárbaros:**
    - Hexágonos comerciales con plaza central.
    - Carreta con movimientos y peaje en carreteras ajenas.
    - Mercancías y entregas, tren de equipaje con 5 niveles.
    - 3 bárbaros en caminos y mazo propio (Caballero, Construcción de carreteras, Viaje rápido y 3 PV).
    - Se repiten el 2 y el 12.
  - **Oro:** 2 de oro → 1 recurso, dos veces por turno; 4:1 (3:1 con puerto) → 1 de oro.
  - **5-6 jugadores en pareja:** el jugador 2 solo comercia con el banco. Lo que puede hacer en cada escenario
    sigue la tabla del reglamento.
- `src/js/engine/board.js`: tableros de los 5 escenarios en 3-4 y 5-6.
  - Lago, ríos con pantanos y sitios de puente, oasis, castillo con costa numerada y orden de comprobación.
  - Hexágonos comerciales: la plaza central se agrega al grafo como un cruce más, con sus caminos interiores.
- `src/js/engine/rules.js`:
  - Enganches `s.tb` (como `ck` y `pe`).
  - Modos `traders` (2-4) y `traders56` (5-6 en pareja).
  - El Clásico ahora admite 2 jugadores.
- `src/js/engine/ai.js`: IA para todo lo anterior.
  - Votación, caballeros, carreta, pescado, puentes, oro, neutrales, eventos, Traición y bárbaros.
  - `decide` ahora es un envoltorio de `decideBase`.
- `src/js/host.js` y `tools/simulate.js`: fases de varios jugadores (`TB.waiting`) y fase `tbMove`.
- `src/js/ui/cards.js`: carta «Viaje rápido» y las cartas de PV Herrería, Vidriería y Cantera.

Comprobado con el simulador: los 5 escenarios en 3-4, en 5-6 en pareja, con eventos y Señor del puerto, Catan para dos
(clásico y escenarios 1 y 2) y el clásico 5-6 con eventos. Todas las partidas terminaron, sin errores ni bloqueos, y las
mecánicas propias de cada escenario se usaron de verdad.

### Interfaz (escrita, sin conectar ni probar)

- `src/js/ui/tb-ui.js` (nuevo): paneles, botones, diálogos (votación, entregas, robos, pescado, fichas, oro),
  selección en el tablero, panel flotante de caballero y carreta, carta de evento y mensajes.
- `src/js/ui/game-ui.js`: enganches `isTB()` / `tb*` ya agregados.
- `src/js/ui/board-view.js`: dibujo de los terrenos nuevos, ríos, puentes, caladeros, flechas del oasis, camellos,
  bárbaros, hexágonos conquistados, caballeros en caminos, bárbaros en caminos y carretas.

**Ojo:** `tb.js` y `tb-ui.js` todavía **no están en `src/index.html`**. Hasta que se agreguen, el juego en pantalla no
carga nada de esto. Además, `game-ui.js` ya llama a `this.isTB()` en todos los modos, así que hay que agregar
`tb-ui.js` antes de usar el juego en el navegador.

## Qué falta

1. **`src/index.html`:** agregar `js/engine/tb.js` (después de `pe.js`) y `js/ui/tb-ui.js` (después de `pe-ui.js`).
2. **Menú (`src/js/app.js`):**
   - Habilitar la tarjeta «Mercaderes y Bárbaros» (hoy dice «Próximamente»).
   - Selector de escenario con los PV por defecto (10, 10, 12, 12, 13) y opciones «Cartas de evento» y
     «Señor del puerto», también en Clásico.
   - Con 2 jugadores, solo el Clásico y los escenarios 1 y 2.
   - Pasar `scenario`, `events` y `harbormaster` en las opciones (partida local y LAN).
3. **Reglas en pantalla (`src/js/ui/rules-text.js`):** escribir el texto de `traders` (hoy dice «Próximamente») y
   agregar las variantes.
4. **Estilos (`src/css/style.css`):** `.tb-panel`, `.event-card` (`.ec-n`, `.ec-t`), `.r-fish`, `.r-token` y la
   carretera dañada (`.piece.damaged`).
5. **Pruebas de reglas:** crear `tools/test-tb.js` al estilo de `test-ck.js` y `test-pe.js`, con un caso por regla
   de cada escenario y variante.
6. **Navegador:** jugar cada escenario con clics.
   - Votación, Traición, colocar y mover caballeros, carreta, bárbaros, pescado, puentes, neutrales y eventos.
   - LAN con dos pestañas.
   - Revisar el diseño con 5-6 jugadores.
7. **Documentación:**
   - Actualizar la sección «Estado en el juego» de `mercaderes-y-barbaros.md`, `docs/README.md` y `README.md`
     (modos, `traders`/`traders56` en el simulador, `test-tb.js`).
   - Borrar este archivo al terminar.
8. **Regresión:** volver a correr `node tools/test-ck.js`, `node tools/test-pe.js` y el simulador en todos los modos.

## Decisiones propias (el reglamento no las da en el texto)

- **Tren de equipaje (escenario 5):**

  | Nivel | Movimientos | Oro por entrega | Ahuyenta con | Coste |
  |---|---|---|---|---|
  | 1 | 4 | 1 | — | — |
  | 2 | 5 | 2 | 6 | madera + cereal |
  | 3 | 5 | 3 | 5-6 | lana + cereal + mineral |
  | 4 | 6 | 4 | 5-6 | madera + cereal + 2 mineral |
  | 5 | 6 | 5 | 4-6 | lana + 2 cereal + 2 mineral (+1 PV) |

- **Formas de los mapas:** ríos trazados al azar desde la costa hacia el interior, posición de caladeros, castillo y
  desierto, hexágonos comerciales en esquinas alternas y bárbaros iniciales al azar en caminos.
- **Fichas de las pilas de mercancías:** mitad y mitad de cada tipo; en 5-6 las pilas de cantera y vidriería son 1,5
  veces más grandes.
- **Simplificaciones:**
  - Terremoto: la carretera dañada se elige sola (un extremo de la red).
  - Intriga: el hexágono se elige solo (el que más amenaza tus edificios).
  - Fusión de caravanas: la otra caravana termina.
  - Los neutrales construyen la misma pieza que tú; no se construye para ellos con las carreteras gratis.
  - El oro no se ofrece en el comercio entre jugadores.
  - En 5-6, el jugador 2 no puede comprar con oro en el escenario 5 (el texto lo dice; la tabla resumen dice lo
    contrario).
  - Catan para dos: no se usa en los escenarios 3-5.

## Cómo retomar

```bash
node tools/simulate.js traders 5 4 3              # escenario 3, 5 partidas, 4 jugadores
node tools/simulate.js traders56 3 5 4            # escenario 4 con 5 jugadores en pareja
node tools/simulate.js traders 4 4 1 events,harbormaster
node tools/simulate.js classic 4 2 0 events       # Catan para dos con cartas de evento
```

Después seguir la lista de «Qué falta» en orden. El paso 1 es imprescindible antes de abrir el juego en el navegador.
