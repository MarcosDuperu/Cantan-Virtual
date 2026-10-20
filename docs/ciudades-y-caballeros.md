# Ciudades y Caballeros (Cities & Knights) y ampliación 5-6

## Reglas oficiales (3-4 jugadores)

- **Victoria**: 13 PV. Sin cartas de desarrollo ni Gran Ejército; sí Gran Ruta.
- **Preparación**: poblado + carretera, y en la 2.ª ronda **ciudad** + carretera (1 recurso por terreno adyacente).
- **Mercancías** (36: 12 papel, 12 tela, 12 moneda). Ciudad en bosque: madera + papel; en pasto: lana + tela;
  en montaña: mineral + moneda; en campo/colina: 2 recursos.
- **Dados**: rojo + amarillo (producción) + dado de eventos (3 barcos y 3 puertas: amarilla comercio,
  azul política, verde ciencia). Primero se resuelve el evento, luego la producción.
  - Barco: avanza el barco bárbaro (7 casillas); al llegar, ataque.
  - Puerta: roba carta de progreso de ese color quien tenga mejora de ese color con un dado rojo cubierto
    (nivel 1: 1-2, nivel 2: 1-3, … nivel 5: 1-6). Se roba en orden empezando por quien tiró.
- **El 7**: descarte si tienes más de 7 cartas (+2 por muralla). El ladrón (y el Obispo y ahuyentar al ladrón)
  no se usan **hasta el primer ataque bárbaro**.
- **Ataque**: fuerza bárbara = ciudades + metrópolis en juego; defensa = fuerza de los caballeros **activos**.
  - Si ganan los bárbaros: quien(es) menos fuerza aportaron pierden 1 ciudad (vuelve a poblado; pierde la muralla).
    No cuentan quienes no tienen ciudades o solo tienen metrópolis.
  - Si gana Catan: el único con más fuerza recibe **Defensor de Catan** (1 PV); si hay empate, cada empatado
    roba 1 carta de progreso del mazo que elija.
  - Después, todos los caballeros quedan inactivos y el barco vuelve al inicio.
- **Caballeros** (2 por nivel): reclutar (lana + mineral, básico 1), activar (cereal), ascender (lana + mineral;
  1 nivel por turno; a poderoso (3) solo con Fortaleza). Se colocan en un cruce libre unido a tus carreteras y
  cortan las rutas rivales. Acciones (solo activos, no el turno en que se activaron; quedan inactivos):
  moverse por tus carreteras (pueden pasar por tus piezas), desalojar a un caballero rival más débil (su dueño lo
  mueve a un cruce conectado por sus carreteras o lo retira), ahuyentar al ladrón si está en un terreno adyacente.
  Para construir un poblado donde hay un caballero propio, primero hay que moverlo.
- **Murallas**: 2 arcilla, máximo 3, +2 al límite de cartas cada una.
- **Mejoras de ciudad** (requieren una ciudad): nivel *n* cuesta *n* mercancías del color.
  Comercio/tela: Mercado, Casa de comercio, **Gremio de comerciantes** (mercancías 2:1), Banco, Gran bolsa.
  Política/moneda: Ayuntamiento, Iglesia, **Fortaleza** (caballeros poderosos), Catedral, Gran asamblea.
  Ciencia/papel: Abadía, Biblioteca, **Acueducto** (si una tirada que no es 7 no te da nada, tomas 1 recurso),
  Teatro, Universidad.
- **Metrópolis**: el primero en llegar al nivel 4 de un color convierte una ciudad en metrópolis (+2 PV, inmune);
  si otro llega antes al nivel 5, se la quita. Se pueden tener varias.
- **Cartas de progreso** (54; 18 por color). Se juegan en tu turno después de tirar (el Alquimista, antes),
  tantas como quieras. Máximo 4 en la mano; Imprenta y Constitución se revelan al instante (1 PV) y no cuentan.
  - Ciencia: Alquimista ×2, Inventor ×2, Grúa ×2, Irrigación ×2, Ingeniero ×1, Medicina ×2, Minería ×2,
    Imprenta ×1, Construcción de carreteras ×2, Herrero ×2.
  - Política: Obispo ×2, Constitución ×1, Desertor ×2, Diplomático ×2, Intriga ×2, Saboteador ×2, Espía ×3,
    Señor de la guerra ×2, Boda ×2.
  - Comercio: Puerto comercial ×2, Maestro mercader ×2, Mercader ×6, Flota mercante ×2,
    Monopolio de recursos ×4, Monopolio comercial ×2.

## Ampliación 5-6 (revisión 2023)

- Tablero de la ampliación 5-6 del juego básico.
- **+18 mercancías** (6 de cada una → **18 por tipo**), +2 Defensor de Catan, piezas para 2 colores.
- **Jugadores en pareja** (sustituyen la fase de construcción especial). Jugador 1: tira, comercia con todos,
  construye, caballeros, mejoras, cartas de progreso. Jugador 2: lo mismo pero **solo comercia con el banco**.
- Un caballero activado durante la parte del jugador 2 puede actuar en el siguiente turno de su dueño.

## Estado en el juego

Implementado: todo lo anterior para 3-4 y 5-6 (este último con la fase de construcción especial, regla antigua).
Pruebas: `node tools/test-ck.js` y `node tools/simulate.js cities` / `cities56`.

Diferencias o pendientes detectados al contrastar con el reglamento:
1. **5-6: las mercancías deberían ser 18 por tipo**; el juego usa 15 (`commodities: 15` en `rules.js`, modo `cities56`).
2. **Desertor**: el rival debería elegir qué caballero retira; el juego retira automáticamente el más débil.
   Si no tienes un caballero de ese nivel, el reglamento permite poner uno básico; el juego no lo hace.
3. **Intriga** y **desalojo**: el dueño debería elegir a dónde mueve su caballero; el juego elige el primer cruce libre.
4. **Puerto comercial**: tú eliges qué recurso das a cada rival y cada rival elige qué mercancía entrega;
   el juego lo hace automático (das el recurso más abundante, recibes su mercancía más abundante).
5. **Empate de defensores**: cada empatado debería elegir el mazo de progreso; el juego elige el de su mejora más alta.
6. **Herrero**: el reglamento limita a 1 ascenso por caballero y turno; la carta no lo comprueba.
7. **Diplomático**: una carretera con un caballero propio en el extremo no es "abierta"; el juego no considera caballeros.
8. **Quinta carta de progreso**: el reglamento solo dice "nunca más de 4". El juego obliga a descartar fuera de
   tu turno y te deja jugarla en tu turno antes de terminarlo (interpretación de ediciones anteriores).
9. **Ciudad saqueada**: el juego elige automáticamente la de menor producción.
