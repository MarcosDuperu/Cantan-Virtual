# Catan Virtual

Colonos de Catan para computadora: contra la máquina o en red local (LAN).

## Cómo jugar (desarrollo)

```bash
npm install      # solo la primera vez
npm start        # abre la aplicación de escritorio (Electron)
```

Para probar en el navegador: `npm run dev` y abre http://localhost:8080.

En Linux, para tener "Catan Virtual" en el menú de aplicaciones con su ícono (y que la barra de tareas
muestre el ícono del juego):

```bash
sh tools/instalar-acceso-directo.sh
```

Nota: en Ubuntu reciente Electron necesita `--no-sandbox` (ya incluido en `npm start` y en el acceso directo).
El ícono está en `build/icon.svg`; para regenerar los PNG: `npx electron tools/render-icon.js --no-sandbox`.

## Modos

- **Clásico** (3-4 jugadores, 10 PV; 5-6 con la ampliación oficial y 2 con «Catan para dos»)
- **Navegantes: Hacia nuevas costas** (barcos, islas, pirata, oro, 14 PV; 3-4 jugadores)
- **Ciudades y Caballeros** (13 PV; 3-4 jugadores, 5-6 con su ampliación): mercancías, dado de eventos,
  bárbaros, caballeros, murallas, mejoras de ciudad, metrópolis y 54 cartas de progreso
- **Piratas y Exploradores** (5 escenarios de 8 a 17 PV; 2 jugadores con piezas neutrales, 3-4, y 5-6 con jugadores
  en pareja): mar sin descubrir, barcos con puntos de movimiento, colonos, oro, barco pirata, guaridas piratas,
  pescado y especias para el Consejo de Catan
- **Mercaderes y Bárbaros** (5 escenarios de 10 a 13 PV; 2-4 jugadores y 5-6 con jugadores en pareja): Pescadores,
  Ríos, Caravanas, Ataque bárbaro y Mercaderes y bárbaros
- **Variantes** (Clásico y Mercaderes y Bárbaros): cartas de evento, Señor del puerto y ladrón amistoso

## LAN

Un jugador elige *Partida en red → Crear partida*. Los demás, en la misma red,
la ven en la lista (búsqueda automática por UDP, puerto 47801) o escriben la IP del anfitrión.
La partida usa el puerto TCP 47800: si no conectan, permite la app en el cortafuegos del anfitrión.
Si un jugador se desconecta, la máquina sigue jugando por él.

## Estructura

- `src/js/engine/` motor de reglas, tablero, IA y nombres (sin dependencias, también corre en Node)
- `src/js/host.js` anfitrión de partida y sesiones (local, anfitrión LAN, cliente LAN)
- `src/js/ui/` tablero SVG, interfaz de partida, sonidos, reglas
- `server/` relé WebSocket y descubrimiento UDP
- `src/js/engine/ck.js` reglas de Ciudades y Caballeros; `src/js/ui/ck-ui.js` su interfaz
- `src/js/engine/pe.js` reglas de Piratas y Exploradores; `src/js/ui/pe-ui.js` su interfaz
- `src/js/engine/tb.js` reglas de Mercaderes y Bárbaros y sus variantes; `src/js/ui/tb-ui.js` su interfaz
- `tools/simulate.js` simula partidas entre bots: `npm run sim -- cities 20` (modos: classic, extended, seafarers, cities, cities56, explorers, explorers56, traders, traders56).
  Para Piratas y Exploradores y Mercaderes y Bárbaros el escenario va después de los jugadores: `npm run sim -- explorers 20 4 5`;
  las variantes, al final: `npm run sim -- traders 10 4 1 events,harbormaster` o `npm run sim -- classic 10 2 0 events`
- `tools/test-ck.js` pruebas de reglas de Ciudades y Caballeros: `node tools/test-ck.js`
- `tools/test-pe.js` pruebas de reglas de Piratas y Exploradores: `node tools/test-pe.js`
- `tools/test-tb.js` pruebas de reglas de Mercaderes y Bárbaros y sus variantes: `node tools/test-tb.js`
