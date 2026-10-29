---
type: reference
updated: 2026-10-29
tags: [harmony-helper, trompeta, prueba]
---

# Prueba real: una partitura de trompeta en la app actual

**Qué se probó.** El ejemplo N.º 94 de *Principios de orquestación* de Rimsky-Kórsakov (*Snegúrochka*), de Project Gutenberg (dominio público). Bajado de `gutenberg.org/cache/epub/33900/music/094.xml`, 107 KB.
- `partituras-prueba/rimsky-094-snegurochka-orquesta.musicxml`: el original, sin tocar.
- `partituras-prueba/rimsky-094-trompeta-1.musicxml`: recorte con solo la "Trumpet in Bb 1" (9 compases, 24 notas). Trae `<transpose>` con `diatonic -1` y `chromatic -2`, y armadura escrita de 2 ♯.

Se abrieron las dos en `localhost:5190` (navegador interno), sin cambiar código. Las notas se oyeron a partir del código, no con el oído.

## Lo que anduvo sin tocar nada
1. Abre el archivo y dibuja la trompeta con su nombre y su armadura escrita.
2. Los colores siguen a la nota **escrita**, que es lo que Sofia eligió.
3. La etiqueta "Sol (G)" y el panel de nota: NOTA Sol5, figura, "5.º grado de Do mayor · dominante", la escala chica.
4. La ficha de la armadura ("Re mayor · 2 ♯") y la ficha de la pieza (tonalidad, escala, círculo).

## Lo que se rompe o falta (7 cosas)
1. **Suena 2 semitonos arriba.** Ningún archivo de `src/` lee `<transpose>` ni `PlaybackTranspose`, así que Tone.js toca la nota escrita (verificado con `grep`; no escuchado).
2. **El piano de abajo marca la nota escrita.** Al pasar por Sol5 se prende G5, pero suena Fa5 (F5).
3. **La ficha de la pieza no dice "suena en".** Detecta Do mayor con las notas escritas; lo que suena es Si♭ mayor (B♭).
4. **La ficha de la armadura no dice "suena en".** Dice "Re mayor · 2 ♯" y nada más. Ojo: este pasaje usa la armadura de Re pero con becuadros, así que la ficha de la pieza (Do mayor) y la de la armadura (Re mayor) no coinciden. Es de la música, no un error, pero la trompeta va a tener más de estos casos.
5. **En partituras de varios instrumentos se mezclan escritas y reales.** En la versión de orquesta, el clarinete y la trompeta (escritos) quedan pintados distinto del fagot (real) aunque suenen la misma nota, y "Suenan ahora", los acordes y la tonalidad mezclan las dos cosas. Acá la detección dio Si♭ mayor, que es lo correcto, pero fue por mayoría.
6. **Controles de piano que no sirven para trompeta:** "Dos manos / Mano derecha / Mano izquierda", el teclado y el aviso de MIDI.
7. **Textos del Recorrido que hablan del teclado** (según el mapa del código, `recorrido/steps.ts`; no se abrió en esta prueba).

Esto es nuevo, no roto: digitaciones, parciales, micrófono y el Recorrido de trompeta.

## Veredicto
Son 7 problemas, y el umbral era unos 15. **El modo dentro de la misma app se sostiene.** Los arreglos 1 a 5 salen de un solo lugar: guardar por nota la altura escrita y la que suena (`escrita + chromatic`), y que cada parte sepa su transposición. Además, el punto 5 ya es un error de la versión de piano con cualquier partitura de orquesta.

## Efecto en los datos de prueba
Abrir los dos archivos los sumó a la Biblioteca del navegador interno y cambió la "última partitura". No se tocaron los colores (`hh.colors.v1`).
