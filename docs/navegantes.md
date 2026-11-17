# Navegantes (Seafarers) y ampliación 5-6

## Reglas generales oficiales

- **Barcos**: madera + lana; 15 por jugador. Van en aristas entre dos mares o entre mar y tierra (no entre dos
  tierras). Una arista de costa lleva barco **o** carretera, no ambos. Se construyen junto a un poblado/ciudad
  costero propio o a continuación de otro barco propio (pueden ramificarse).
- **Carretera ↔ barco**: solo se conectan a través de un poblado o ciudad propios.
- **Mover barcos**: 1 por turno, en la fase de construcción, no el construido ese turno. Solo un barco del extremo
  de una ruta **abierta** (un extremo sin ninguna otra pieza propia); las rutas **cerradas** (que unen dos
  poblados/ciudades) no se mueven. El destino sigue las reglas normales de colocación.
- **Gran Ruta Comercial**: como la Gran Ruta, contando carreteras y barcos conectados.
- **Construcción de carreteras** (carta): 2 carreteras, 2 barcos o 1 y 1.
- **Oro**: cada poblado/ciudad junto a un río de oro elige 1/2 recursos cualesquiera.
- **Pirata**: con un 7 o un caballero se mueve el ladrón **o** el pirata (solo a mar); se roba a quien tenga un
  barco junto a ese hexágono. No se pueden construir barcos junto al pirata ni mover los que estén junto a él.
- Escenarios sin desierto: el ladrón empieza fuera del tablero.
- **Primera pieza**: si el poblado inicial está en la costa se puede poner un barco en vez de una carretera.
- **Fichas Catan**: marcan puntos especiales (por ejemplo, 2 PV por la primera colonia en una isla nueva).

## Escenarios (3-4 jugadores)

| # | Escenario | Idea | PV |
|---|---|---|---|
| 1 | Hacia nuevas costas | Isla principal + islas pequeñas (2 de oro). 2 PV por la 1.ª colonia en cada isla pequeña. Mapas distintos para 3 y 4 jugadores | 14 |
| 2 | Las cuatro islas | Empiezas en 1 o 2 islas ("islas propias"); 2 PV por la 1.ª colonia en cada isla ajena | 13 |
| 3 | La isla de la niebla | Hexágonos ocultos que se descubren al llegar con barco o carretera (recompensa: 1 recurso del terreno) | 12 |
| 4 | A través del desierto | Franja de desierto; 2 PV por cada zona ajena (islas pequeñas y franja) | 14 |
| 5 | La tribu olvidada | Islas sin producción con fichas de PV, cartas de desarrollo y puertos de regalo | 13 |
| 6 | Tela para Catan | Aldeas que producen tela (2 telas = 1 PV); sin Gran Ruta; fin alternativo al agotarse aldeas | 14 |
| 7 | Las islas piratas | Una ruta de barcos por jugador hacia su fortaleza pirata; flota pirata que da la vuelta; barcos de guerra con caballeros | 10 + fortaleza |
| 8 | Las maravillas de Catan | Construir una maravilla de 4 niveles; 1 PV por la 1.ª colonia en islas pequeñas | maravilla o 10 PV + nivel más alto |
| 9 | Nuevo mundo | Mapa libre al azar | — |

## Ampliación 5-6 (revisión 2023)

- Mismos escenarios adaptados a 5-6, con "Las seis islas" en lugar de "Las cuatro islas".
- Usa los **jugadores en pareja** (ver [juego-base.md](juego-base.md)) en vez de la fase de construcción especial.

## Estado en el juego

Implementado: los **9 escenarios** para 3-4 jugadores y la **ampliación 5-6** con jugadores en pareja
(módulo `src/js/engine/sf.js`, interfaz `src/js/ui/sf-ui.js`, pruebas `tools/test-sf.js`).

### Mapas

- Transcritos de las ilustraciones del reglamento 3-4 (2021) y 5-6 (2023): terrenos, números, posición del ladrón y del
  pirata, puertos, regalos de la tribu, aldeas, fortalezas, recorrido de la flota y cruces marcados.
  Mapas distintos para 3 y 4 jugadores en los escenarios 1-4; uno solo para 3-4 en los escenarios 5-8; uno para 5-6 en cada escenario.
- El mapa se dibuja **como en el reglamento**: hexágonos de lado plano y el norte arriba. Internamente el tablero se arma
  con hexágonos de punta girados 90° y al final solo se giran las coordenadas de dibujo (la topología no cambia).
- Alrededor del mapa hay un anillo de mar del **marco**: sirve para barcos y puertos de la costa, pero allí no van el ladrón
  ni el pirata, y no se navega entre dos casillas del marco.
- En «Hacia nuevas costas» 5-6 la isla grande se arma al azar con los terrenos y fichas del juego básico 5-6 (como dice el reglamento).
- «Nuevo mundo» rellena el marco al azar (se repite si no sale ninguna isla de 4 o más hexágonos). Antes de los poblados,
  empezando por el primer jugador y siguiendo a la izquierda, cada uno toma el puerto de arriba de la pila y lo coloca en un lado
  entre tierra y mar (la máquina elige el lado donde más rinde).

### Decisiones propias (datos que el reglamento solo muestra en dibujos o deja al jugador)

- **Puertos**: los tipos se barajan en las posiciones del dibujo (regla general del reglamento). En el escenario 4 para 5-6 el dibujo
  muestra 10 posiciones para 11 fichas: se usan 10. En «Tela para Catan» 5-6 hay 12 posiciones para 11 fichas: la que sobra es 3:1.
  En «Nuevo mundo» y con los puertos regalados, un puerto no puede tocar un cruce que ya tenga puerto.
- **Islas y zonas**: la bonificación cuenta islas (componentes de tierra). En «A través del desierto» el desierto no pertenece a
  ninguna zona, así que la franja tras él es una zona ajena aunque esté unida a la isla principal por el desierto.
- **Las maravillas**: la bonificación de 1 PV es por el primer poblado en cada isla pequeña (como en los demás escenarios).
  La Gran Muralla pide **dos** poblados en cruces marrones («Settlements», en plural). El Monumento mide un tramo de 5 carreteras/barcos
  cuyos cruces intermedios no tienen bifurcaciones propias. Empezar una maravilla usa un barco del jugador (se pone sobre la carta).
  Los cruces «!» y los cuadros solo restringen la colocación inicial.
- **Las islas piratas** (revisado contra el reglamento): la flota ataca al jugador que tiró, que es el «you» del texto («cada vez que
  tiras… si la flota termina junto a uno de tus poblados te ataca»). El reglamento no prohíbe mover barcos, así que se aplican las
  reglas generales con las de la ruta: solo se mueve el barco del extremo de la ruta (el resto queda entre él y el poblado inicial)
  y solo a otro lado que mantenga la ruta más corta; un barco de guerra movido sigue siendo de guerra. La ruta solo puede crecer por
  lados que dejen el extremo un paso más cerca del destino (primero el cruce de su color, luego la fortaleza); tampoco se ponen
  barcos junto a la flota. No se puede poner un barco en la colocación inicial (ya hay uno). La fortaleza conquistada no gasta una
  pieza de poblado. Si la flota pierde, el recurso ganado se elige como el oro.
- **La tribu olvidada**: quien recibe un puerto elige en qué lado de la costa junto a uno de sus poblados lo pone (sin tocar otro
  puerto); si no tiene sitio, queda guardado y lo coloca cuando construya un poblado en la costa. La máquina, y un puerto ganado
  en la colocación inicial, lo ponen solos donde más rinde. Una carta de PV regalada se guarda como carta oculta.
- **Tela para Catan**: el pirata roba una tela si quien mueve lo elige (o si la víctima no tiene recursos). Al llegar a una aldea
  vacía se toma la tela de la reserva general.
- **La isla de la niebla**: se descubren todos los hexágonos ocultos que tocan los dos cruces del barco o carretera construidos (o del
  barco movido). Descubrir un río de oro deja elegir 1 recurso.

### Pendiente

- No se revisaron las diferencias de la 6.ª edición (2025).
