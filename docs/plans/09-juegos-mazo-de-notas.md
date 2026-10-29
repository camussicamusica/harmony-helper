---
type: project
updated: 2026-10-29
status: aprobado por Sofia ("Sí, arrancá", 2026-10-29); en construcción
tags: [harmony-helper, juegos, mazo-de-notas]
---

# Plan 09: Juegos → Mazo de notas

Primer juego de `docs/paquete-miscelaneos.md`. Los otros (Mazo de figuras, Dictado rítmico, Cantar) se construyen después, uno por vez.

## Decisiones tomadas
- **Dónde:** una página aparte dentro de la misma app, `/juegos`, en el puerto 5190 (así lee los mismos colores). Botón "Juegos" en la barra de arriba del lector; en la página de juegos, "← Partitura" para volver.
- **Sofia no contestó las dudas**, así que van los valores por defecto y todos se pueden cambiar en pantalla:
  - Clave: **Sol** por defecto; también Fa y "Las dos".
  - Respuesta: **clic** para dar vuelta la carta, o **teclado MIDI**.
- **Frente de la carta en tinta negra; dorso en su color.** Así lee la nota, no el color.
- **Sin puntos, rachas, vidas ni rojo de error.** Una nota equivocada en el MIDI no castiga: solo muestra en gris qué tocó.
- **Interfaz callada:** todo gris; el único color en pantalla es el de las cartas ya dadas vuelta.

## Pantalla
```
 ← Partitura    Juegos
 [Mazo de notas] [Mazo de figuras·] [Dictado rítmico·] [Cantar·]   (· = próximamente, gris, deshabilitado)

 Cartas: (1)(2)(3)(4)(5)   Clave: Sol | Fa | Las dos   Nivel: [1 ▾] "Do Re Mi"
┌────────┐ ┌────────┐ ┌────────┐
│  𝄞     │ │  𝄞     │ │ Re (D) │
│ ──●──  │ │ ──●──  │ │ ──●──  │  ← dada vuelta: cabeza en su color + pastilla con el nombre
└────────┘ └────────┘ └────────┘
 Clic en una carta = se da vuelta y suena. O tocá la nota en el teclado MIDI.
 [Sacar de nuevo]  [Dar vuelta todas]
```

## Niveles (notas naturales salvo el 6)
| Nivel | Clave de Sol | Clave de Fa |
|---|---|---|
| 1 | Do4 Re4 Mi4 | Fa3 Sol3 La3 |
| 2 | + Fa4 Sol4 | + Do3 Re3 Mi3 |
| 3 | + La4 Si4 Do5 | + Sol2 La2 Si2 |
| 4 | + Re5 Mi5 Fa5 Sol5 | + Fa2 Si3 Do4 |
| 5 | + La3 Si3 La5 Si5 Do6 (líneas adicionales) | + Do2 Re2 Mi2 Re4 Mi4 |
| 6 | + sostenidos y bemoles de todas las anteriores | ídem |

Cada nivel incluye los anteriores.

## Reglas de sorteo
- N cartas (1 a 5) del mazo del nivel y la clave elegidos.
- Sin repetir dentro de una tirada si el mazo alcanza; si no, se permite repetir pero nunca dos iguales seguidas.
- "Las dos": cada carta elige clave al azar.
- En el nivel 6, alrededor de 1 de cada 3 cartas lleva alteración.
- La tirada nueva evita repetir exactamente la anterior.

## MIDI
- Al tocar una tecla, se da vuelta la **primera carta boca abajo** (de izquierda a derecha) si coincide la **clase de altura** (cualquier octava; Re♭ = Do#).
- Si no coincide: no pasa nada con las cartas; debajo aparece en gris "Tocaste Mi (E)".
- Si coincide pero en otra octava: se da vuelta y abajo, en gris chico, "en otra octava".

## Archivos
- `src/lib/games/noteDeck.ts`: niveles, sorteo y comparación con MIDI (lógica pura, con rng inyectable).
- `tests/noteDeck.test.ts`.
- `src/components/games/NoteCard.tsx`, `src/components/games/NoteDeckGame.tsx`, `src/components/games/GamesPage.tsx`.
- `src/routes/juegos.tsx`.
- Botón "Juegos" en `src/components/reader/TopBar.tsx`.
- Sección nueva en `docs/instructivo.md`.
