---
type: project
updated: 2026-10-25
tags: [harmony-helper, plan, recorrido]
---

# Build plan 7 — Ladrillo 1: Recorrido de la pieza

Implementa la sección A de `docs/flujo-de-trabajo.md` ("Tengo una pieza nueva"). Es el esqueleto paso a paso: cada paso abre la herramienta que ya existe y nada más. Donde la herramienta no existe todavía, dice la verdad y da las instrucciones para hacerlo a mano. Es el segundo ejercicio que usa `subscribe` de `src/lib/midi/input.ts` (plan 6).

## 1. Pasos (`src/lib/music/recorrido/steps.ts`)
- Los 11 pasos como datos: día, sala (Entender / Leer / Hablar / Escribir / Oído / Repaso), título, tiempo, 4 instrucciones atómicas, acción y, si hace falta, una línea calma.
- Días: Día 1 (pasos 1–3), Día 2 (4–5), Día 3 (6), Día 4 (7), Día 5 (8), Día 6 (9), Día 7 (10), Siempre (11). El flujo dice "3–4" para el paso 7; se puso en el Día 4.
- Acciones que abren algo:
  - 1 → Ficha con "Tonalidad", "Escala" y "Acordes de la escala" abiertas.
  - 2 → pasa a Tocar y baja el tempo al 60% (recuerda el tempo de antes: "Volver a N bpm"; apretarlo dos veces no baja más).
  - 3 → Ficha en "Escala" + chequeo con el teclado (sección 4).
  - 5 → pasa a Estudiar + "Marcar compás difícil" (sección 3).
  - 6 → lista de los compases marcados (sección 3).
  - 7 → Ficha en "Círculo" con la fuente "Pieza".
- Sin herramienta (4, 8, 9, 10, 11): las instrucciones y "Esta herramienta todavía no existe en la app; por ahora hacelo así." No hay botón falso.
- Los nombres de las funciones son Tón / Subd / Dom, nunca una letra sola. Las notas: "Re (D)".

## 2. Panel (`src/components/recorrido/RecorridoPanel.tsx`)
- Botón "Recorrido" en `TopBar`, antes de "Ficha". Abre un `Sheet` a la **izquierda**, 340 px, `modal={false}`, `overlay={false}`, sin cerrarse al tocar afuera. Convive con la Ficha (derecha). Con el Recorrido abierto, la página se corre 340 px a la derecha (`sm:pl-[340px]` en `ReaderPage`), así la partitura sigue usable.
- Dos vistas, la elegida se guarda:
  - **"De a uno"** (por defecto): una tarjeta con "Anterior", "Listo" y "Siguiente", más 11 puntitos para saltar. "Listo" marca y avanza; si ya está hecho dice "Hecho" y lo desmarca. Sin rachas, sin puntajes, sin castigos.
  - **"Ver todo"**: lista compacta por día con un cuadradito de "hecho"; tocar el nombre abre el paso en "De a uno".
- "Empezar de nuevo" pide confirmación y borra solo el progreso de esa pieza.
- La Ficha acepta ahora un pedido de foco (`focus` en `FichaPanel`): qué secciones abrir y qué fuente tiene el Círculo. Las demás secciones se cierran, así se ve una cosa por vez. `useFicha` también corre con el Recorrido abierto (necesita tonalidad, acordes y compases).

## 3. Compases difíciles
- Modo "Marcar compás difícil" (paso 5): se hace clic en un compás de la partitura y queda marcado; otro clic lo saca. Se apaga solo al salir del paso 5 o al cerrar el panel.
- `ScoreView` dibuja una tercera capa SVG propia (`hardSvgRef`, mismo método que los acordes): un recuadro ámbar con la etiqueta "comp. N" sobre cada compás marcado. Los límites de cada compás salen de las notas: la mitad entre la última nota de un compás y la primera del siguiente, dentro del mismo sistema; la altura va de la línea superior del pentagrama a debajo de la nota más baja. Un compás sin notas (solo silencios) no se puede marcar.
- Lista en el paso 6. Tocar un compás lo **selecciona**: la partitura se desplaza hasta él (Estudiar: scroll de página; Tocar: la banda lo deja bajo la línea "ahora") y se resalta con trazo sólido y pulso.
- **Repetir en bucle:** `playRange(startSec, endSec)` en `scheduler.ts`. Programa solo las notas que empiezan dentro del rango, pone `Transport.loop` con `setLoopPoints` y arranca desde el inicio del compás. `play()` y `stop()` apagan el bucle. El rango sale de `meta.measures` (el mismo `MeasureSpan` de la Ficha). El botón "Repetir" pasa a "Parar".

## 4. Chequeo con el teclado (paso 3)
- Lógica pura en `src/lib/music/recorrido/midiChecks.ts`, panel en `RecorridoPanel`. Escucha con `subscribe` y con `useMidiInput().pressed`.
- **a. Escala:** "Tocá la escala de <Sol mayor> subiendo, una octava." Se cuentan los note-on; solo importa la clase de nota, así que vale cualquier octava y cualquier mano. 8 cuadraditos (7 grados + la tónica de arriba) con los colores de nota de ella; cada uno se ilumina al tocar la nota que sigue. Una nota que no va da un aviso amable ("Esa es Fa (F); la escala usa Fa# (F#)." o "…; ahora va X.") y **no reinicia**. Repetir la nota anterior se ignora sin aviso. Termina con 1→7 y la tónica.
- **b. Acorde de tónica:** termina cuando las clases de nota apretadas son exactamente las de la tríada (cualquier inversión o duplicación). Si hay 3 o más notas y no coincide: "Falta: …" / "Sobra: …". Una vez logrado, queda logrado.
- Sin teclado: aviso, botón "Conectar teclado MIDI" y "Lo hice ✓" en cada tarea.
- Nombres de notas: `pcLabel` usa la grafía de la tonalidad si la nota es de la escala; si no, sostenidos (bemoles en tonalidades con bemoles). Una tecla negra no dice cuál grafía quiso.

## 5. Guardado
- `localStorage hh.recorrido.v1` = `{ mode: "uno" | "todo", scores: { [hash]: { done: number[], current: number, hard: number[] } } }`. El hash es el mismo de la Ficha (`hashText(xml)`), así que son los mismos "por partitura". Se lee después de montar (igual que `hh.view.v1`) y cada escritura relee el almacén para no pisar las otras piezas.
- No toca `hh.colors.v1`.

## Archivos
Nuevos: `src/lib/music/recorrido/{steps,useRecorrido,midiChecks}.ts`, `src/components/recorrido/RecorridoPanel.tsx`. Cambiados: `TopBar.tsx`, `ReaderPage.tsx`, `ScoreView.tsx`, `FichaPanel.tsx`, `scheduler.ts`.

## Cómo se verificó
- `tsc --noEmit` y `bun run build` pasan.
- En el navegador de la app (localhost:5190) con `window.__hhMidi.simulate`: escala en orden (Sol La Si Do Re Mi), nota equivocada (Fa y Do#, con los dos avisos y sin reinicio), Fa#, Sol de arriba → "Salió la escala"; acorde con Re# (Falta/Sobra), acorde en otra inversión y octava → "Salió el acorde"; los dos estados sin teclado (botón de conectar y "Lo hice ✓").
- Pasos 1, 2 (90 → 54 bpm y volver), 3, 5 (marcar dos compases con clic real, aparecen los recuadros y las etiquetas), 6 (seleccionar, scroll en Tocar y en Estudiar), "Ver todo", "Empezar de nuevo" (el almacén queda sin esa pieza).
- Bucle: el Transport queda en `loop` entre el inicio y el fin del compás y vuelve al inicio al llegar al final (visto en `Tone.getTransport().seconds`).
- **No se pudo probar con un teclado real ni escuchar el audio del bucle.** Además, en el panel del navegador de la app el resaltado de las notas que suenan (clase `note-playing`, que depende de `Tone.Draw`) no se actualizaba ni con la reproducción normal; no es de este ladrillo.

## Fuera de este ladrillo
Las herramientas de los pasos 4, 7 (flash de acordes y tonos guía), 8, 9, 10 y 11; el círculo de quintas en el paso 3; compases solo con silencios; piezas con varias voces por sistema donde el compás tiene límites raros; recordar el último compás repetido entre sesiones.
