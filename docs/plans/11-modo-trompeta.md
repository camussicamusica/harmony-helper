---
type: project
updated: 2026-10-29
status: borrador; espera el OK de Sofia antes de construir del paso 2 en adelante
tags: [harmony-helper, plan, trompeta]
---

# Build plan 11 — Modo "Instrumento: Trompeta"

Decidido con Sofia el 2026-10-29: **un modo dentro de la misma app**, no una copia. Colores por **nota escrita**, con un interruptor para pasar a la nota que suena. Base: `docs/research/trompeta-*.md`, sobre todo `trompeta-prueba-real.md` (7 cosas rotas) y `trompeta-tecnica-y-arquitectura.md` (mapa del código).

## Reglas de construcción
- El instrumento es **configuración**, no un montón de `if`. Un solo objeto `Instrument` con el piano por defecto, así las ~435 pruebas no cambian.
- Lo de trompeta vive en carpetas propias: `src/lib/trumpet/` y `src/components/trumpet/`.
- El micrófono **no se escribe dos veces**: se usa `src/lib/pitch/` de la sesión de canto (`startMic`, ventana de 1024). Esos archivos no se editan sin avisarle (plan 10).
- Iteraciones guardadas, `bun run check` antes de cada commit, captura del navegador antes de decir "listo".

## Paso 1 — Digitaciones y prototipo de pistones (en curso)
- `src/lib/trumpet/fingerings.ts`: digitación por nota escrita, parcial, alternativas, corredera, banda de registro (0 pedal … 4 agudo), serie de cada combinación.
- `tests/trumpetFingerings.test.ts`: todas las notas de Fa♯3 (F♯3) a Do6 (C6) contra la tabla estándar.
- `public/prototipos/pistones.html`: tres pistones que suben y bajan siguiendo la trompeta de Rimsky, la escala o la serie al aire. Dos versiones de color para que Sofia elija:
  - **A:** pistón apretado en el color de su nota, con una barrita gris de registro al lado.
  - **B (su idea):** color por registro, del infrarrojo (grave) al ultravioleta (agudo).
- **La objeción a B:** compite con su sinestesia, porque el mismo Do tendría un color en el piano y otro en la trompeta. Que lo decida viéndolo.
- **Decidido 2026-10-29: Color A.** Los prototipos guardan el botón A/B como iteración; dentro de la app va solo A.
- Prototipo extra: `public/prototipos/escalas-trompeta.html`, ábaco de escalas (solo 12 sonidos) y arpegios que muestra los pistones nota por nota. Usa `public/prototipos/vendor/tonal.min.js`.

## Paso 2 — Escrita y suena (arregla 1 a 5 de la prueba real) — hecho 2026-10-29, sin commit
- Hecho: `src/lib/music/transpose.ts`, `src/lib/colors/colorBy.ts` (`hh.colorBy.v1`), 567 pruebas en verde, probado en el navegador con Rimsky.
- Falta: los chips del panel de nota, el primer plano y los acordes de la ficha todavía suenan en la escrita al hacer clic; el selector manual pasa al paso 3.
- Cada nota guarda `writtenMidi` y `soundingMidi` (escrita + `chromatic` de su parte). El selector de instrumento manda sobre el archivo, porque Audiveris no escribe `<transpose>`.
- Tone.js toca la que suena. El análisis de partituras con varias partes se hace con la que suena (también arregla la orquesta en el modo piano).
- Ficha de la pieza y de la armadura: "escrita en Re mayor · suena en Do mayor".
- Panel de nota: "escrita Sol5 (G5) · suena Fa5 (F5)".
- Interruptor "Color por: escrita / suena".

## Paso 3 — Selector de instrumento y pistones dentro de la app — hecho 2026-10-29
- Hecho: `src/lib/instrument/`, `src/components/trumpet/`, 588 pruebas. Sin pista en el archivo abre como Piano (nunca "el último usado"). Los pistones siguen primero la reproducción y después el mouse. Ya suenan en la nota real los clics del panel de nota, del primer plano y de la ficha (los chips, la escala, los acordes).
- Falta: "Armonía" y "Suenan ahora" siguen visibles para una sola línea; con el panel de una nota fijado, los pistones siguen la reproducción igual.
- `hh.instrument.v1` (piano | trompeta Si♭). Campo opcional `instrument` en cada entrada de la Biblioteca, sin migración.
- Con trompeta: se esconden las manos, el teclado y el aviso de MIDI; aparece el componente de pistones (el del prototipo elegido) que sigue la reproducción y la nota bajo el mouse.
- Panel de nota: pistones dibujados, parcial, alternativas, corredera.

## Paso 4 — Micrófono
- `startMic` de `src/lib/pitch/` con ventana de 1024. Altura que suena + 2 semitonos = escrita.
- Nota por nota: si dio en el blanco y la aguja de afinación en su color. Calma: una cosa prendida, el resto gris.

## Paso 5 — Recorrido de trompeta
- Textos por instrumento en `recorrido/steps.ts` (hoy hablan del teclado).
- Pasos nuevos, de los métodos: cantar antes de tocar (Stamp, Jacobs), ligados de labio por parciales (Irons, Arban), la escala de la pieza con sus digitaciones (Clarke), descanso tanto como tocás.
- Los métodos libres bajados están en `docs/research/metodos-pdf/` (fuera de git).

## Dudas abiertas
- Qué octava cuenta como "la primera" de la trompeta: el plan usa Fa♯3–Si3 para la banda 1.
- La página sobre "la posición del aire" que Sofia iba a pasar.
