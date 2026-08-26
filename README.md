# Vía Combusta

> **Estado: Congelado** — experimento terminado, sin trabajo previsto.

Juego de puzzles construido sobre **tu propia carta natal**. Se calcula la carta de verdad
—posiciones planetarias con VSOP87, casas, dignidades— y de ahí salen las pruebas: ninguna
respuesta está escrita a mano, todas se derivan del cálculo. Cada prueba deja una explicación,
así errar también enseña algo.

El nombre es el de la franja del zodíaco entre 15° de Libra y 15° de Escorpio, la "vía quemada"
de la astrología medieval.

## Cómo está armado

| Carpeta | Qué hay |
|---|---|
| `js/astro` | Efemérides VSOP87, cálculo de la carta, dignidades y lugares |
| `js/game` | Motor del juego, generador de pruebas, relato y rueda |
| `test` | Pruebas de las efemérides, la carta y el juego |

HTML y JavaScript puro, sin dependencias ni build: se abre `index.html` y anda.
