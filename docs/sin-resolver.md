# Lo que no se pudo corregir

Puntos donde el juego no puede seguir al reglamento porque falta el dato oficial o porque el texto no contempla el caso.
Ninguno es un error de funcionamiento. Revisado el 18-11-2026 con los reglamentos de 2020-2023 y de 2025 (6.ª edición).

## 1. Cinco fichas de guarida (Piratas y Exploradores)

- Hay 6 fichas de guarida. Al capturar una guarida se da vuelta la ficha y su número pasa a ser el del río de oro.
- El reglamento solo muestra una: el **5** (ejemplo 12 del reglamento 2020). Las otras cinco no aparecen en ningún reglamento
  (2020 ni 2025) ni en las planchas troqueladas de la lista de componentes.
- Las 2 de la ampliación 5-6 sí son oficiales: **9 y 10**.
- El juego usa ahora **4, 6, 8, 10 y 11** para las cinco desconocidas (`PE_LAIR_TOKENS` en `src/js/engine/board.js`).
- **Cómo resolverlo:** con una foto del reverso de esas fichas del juego físico.

## 2. Escenario 1 de Piratas y Exploradores con 5-6 jugadores

- No existe oficialmente: el reglamento 5-6 recomienda no jugarlo y empezar por el escenario 2.
- El juego lo arma con el tablero del escenario 2, con mar en lugar de las guaridas. No hay fuente con la que comprobarlo.

## 3. Casos de Navegantes que el reglamento no contempla

- **«La isla de la niebla»:** el texto habla de descubrir *un* hexágono, pero un barco o una carretera pueden tocar dos zonas de
  niebla a la vez. El juego descubre todos los hexágonos ocultos que tocan los dos cruces de la pieza.
- **«Tela para Catan»:** al conectarte con una aldea tomas 1 tela de su reserva; el texto no dice qué pasa si ya no le quedan.
  El juego la toma de la reserva general.
- **«Las islas piratas»:** el reglamento no dice nada de mover barcos. El juego aplica las reglas generales: solo se mueve el barco
  del extremo de la ruta y solo a otro lado que mantenga la ruta más corta.

Más detalles en [navegantes.md](navegantes.md) («Decisiones propias»).

## 4. Caladeros de Pescadores con 5-6 jugadores (Mercaderes y Bárbaros)

- Para 3-4 están donde los muestra la ilustración del reglamento.
- Para 5-6 no hay ilustración; el texto solo dice «uno en cada espacio de la costa sin puerto». El juego los reparte así,
  espaciados por la costa, pero la posición exacta de cada uno es propia.

## Nota

Los puntos 3 y 4 son decisiones de interpretación: se pueden cambiar si se prefiere otra forma de jugarlos, porque ninguna es
más correcta según el reglamento. Los puntos 1 y 2 solo se resuelven con el juego físico o con una nueva edición del reglamento.
