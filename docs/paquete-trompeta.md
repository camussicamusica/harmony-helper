---
type: project
updated: 2026-10-29
status: paquete para una conversación nueva; nada construido
tags: [harmony-helper, trompeta, paquete]
---

# Paquete: Harmony Helper para la trompeta

Este archivo es para abrir una **conversación nueva**. Contiene lo que hace Harmony Helper, cómo se construyó, cómo trabaja Sofia, y el pedido: hacer lo mismo para la **trompeta**.

## El pedido, en palabras de Sofia (2026-10-29)
> "Necesito de alguna manera explicar esta app para que otro chat… replique esto, pero para la trompeta. Primero que investigue sobre la trompeta, que mande a gente a entenderlo."

## 1. Qué es Harmony Helper (la versión piano)
Es una app web personal para estudiar partituras de piano, en `~/code/harmony-helper`.
- **Stack:** TanStack Start, React 19, Vite, Tailwind v4, shadcn/ui, OpenSheetMusicDisplay (OSMD) 1.9.9, Tone.js, `tonal`. Usa bun en `~/.bun/bin/bun`.
- **Cómo prenderla:** `bun run dev --port 5190 --strictPort`, siempre en el **puerto 5190**, porque los colores de Sofia se guardan por dirección.
- **Pruebas:** `bun run check` (tsc + bun test, ~435 pruebas). Corre sola antes de cada commit.
- **Repositorio:** git local. Sin servidor, sin cuenta, sin internet.

**La meta de Sofia:** "Leer una partitura y sentir que estoy manejando un idioma." Con músicos formados (Berklee, conservatorio) se siente "re pichi".

**El corazón:** su sinestesia. Antes de 9 Vipassanas veía la música como cintas de colores. La app trae esos patrones **afuera**, como herramienta que prende y apaga. Cada clase de altura (Do, Do#, Re…) tiene su color.

**Lo que ya hace la versión piano:**
- **Partitura:**
  - Abre MusicXML y .mxl.
  - Hay un script de PDF a MusicXML con Audiveris, y una acción de clic derecho "Pasar a MusicXML" en el Finder.
  - Tres vistas: Tocar (tira horizontal que avanza), Estudiar (renglones) y Hoja (páginas como el papel).
  - Zoom, arrastrar, "Centrar", menú y piano plegables.
- **Colores:**
  - Cabezas de nota, plicas, alteraciones y armadura en el color de su nota.
  - "Colores de las notas" apaga el color solo en la partitura. Etiquetas, pastillitas y paneles quedan **siempre** en color.
- **Pasar el mouse por una nota:**
  - La nota se prende, con borde blanco, y aparece una etiqueta de color pegada a la nota.
  - Pasar el mouse por la etiqueta despliega un panel con:
    - la foto (close-up de la nota sola en su pentagrama);
    - NOTA;
    - SU FIGURA;
    - EN LA TONALIDAD, con la escala en un pentagrama chico y el grado marcado;
    - "Más ▸": Armonía, Suenan ahora, Melodía.
  - Clic fija el panel y hace sonar la nota.
- **Armadura:** pasar el mouse muestra su ficha: los sostenidos en color, qué tonalidad, la escala, los trucos (último sostenido + medio tono = tónica, orden Fa Do Sol Re La Mi Si) y botones para tocar.
- **Ficha de la pieza:**
  - tonalidad (Krumhansl-Kessler + armadura);
  - escala;
  - acordes de la escala con funciones **Tón / Subd / Dom**;
  - "Acordes de la pieza" con el navegador: cada clic te lleva a la siguiente aparición, "compás 3, tiempo 2 · 3 de 9";
  - Círculo cromático del acorde.
- **Capas:** Línea melódica, Cajas de patrones (lo que se repite), Degradé de notas, Nombres de acordes (cifrado).
- **Otras herramientas:**
  - Recorrido de la pieza: 11 pasos por días.
  - Entrada MIDI.
  - Tempo −/+.
  - Biblioteca de partituras (IndexedDB, con exportar/importar).
  - Tema claro "papel y tinta" y oscuro "estudio grafito".

**Documentos para leer en la carpeta `docs/` de la app:**
- `instructivo.md`: el manual, paso a paso.
- `flujo-de-trabajo.md`: las 4 salas (Entender / Leer / Hablar / Escribir) y el orden de construcción.
- `research/metodos-lectura-e-improvisacion.md`: la investigación pedagógica.
- `research/mejoras-pedagogia.md`, `research/herramientas-existentes.md` y `research/tecnologia-libre.md`: la investigación nueva (2026-10-29), que incluye la técnica para micrófono y trompeta.
- `idea-tele-de-estudio.md`: ideas grandes pendientes (Oráculo de quintas, cintas de notas, la "tele" tipo Ableton, el mapa de saberes, el formato carta).

## 2. Reglas de trabajo con Sofia (respetarlas desde el primer mensaje)
1. **Idioma:** español rioplatense, en pasos numerados, una acción por paso. Definir la jerga entre paréntesis.
2. **Funciones:** escribir "Tón / Subd / Dom", nunca T/SD/D, porque "D" para ella es la nota Re.
3. **Nombres de notas:** primero en español y después la letra: "Re (D)".
4. **Dictado:** Sofia dicta con Wispr Flow y los nombres llegan cambiados. Ante una duda, citar su frase y preguntar. No adivinar.
5. **Antes de algo grande:** reflejar lo que entendiste, el plan y las dudas, y esperar su OK. Nombrar la objeción más fuerte, no solo estar de acuerdo.
6. **Trabajo agéntico:** el modelo principal planea y verifica; los subagentes Sonnet investigan y construyen.
7. **Verificar antes de decir "listo":** probar en el navegador interno y mostrar una captura. Decir qué no se probó.
8. **Colores:** nunca escribir `hh.colors.v1`, que tiene sus colores. Nunca apretar "Todas" o "Ninguna" en pruebas.
9. **Interfaz:** siempre más callada que los colores de las notas. Las cosas de color nuevas arrancan calmas: una cosa prendida y el resto gris, porque el exceso de color la satura.
10. **Iteraciones:** guardarlas todas; no borrar versiones.
11. **Antes de escribir en su Drive:** decir la cuenta y la carpeta: camussisofia@gmail.com, `Sofi's Second Brain/03-PROJECTS/…`.
12. **Su Mac:** M1, 8 GB de RAM, poco disco. Nada pesado.

## 3. El pedido para la conversación nueva: Harmony Helper para la trompeta

### Paso 1: investigar la trompeta, antes de construir nada
Mandar 2 o 3 subagentes Sonnet a investigar, con fuentes, y guardar el resultado en `docs/research/trompeta-*.md`:
- **Cómo se lee y se estudia la trompeta:**
  - La trompeta en Si♭ **transpone**: suena un tono más grave de lo escrito.
  - Cómo afecta eso a la armadura, a los colores (¿color por nota escrita o por nota que suena?) y al análisis.
  - Las digitaciones de los 3 pistones y las posiciones alternativas.
  - La serie de armónicos (parciales) y el registro.
  - Las articulaciones y la respiración.
  - Por qué leer un instrumento de una sola línea es distinto de leer piano: no hay acordes, la armonía está implícita.
- **Pedagogía de trompeta:**
  - Arban, Clarke, Schlossberg, Stamp, Caruso, Irons.
  - Cómo se enseña a leer, a afinar (el oído antes que el pistón) y a improvisar en vientos (jazz: tonos guía, arpegios, Barry Harris).
  - Qué le falta a un trompetista para "manejar el idioma" con músicos formados.
- **Técnica:** ver `research/tecnologia-libre.md`. Cubre:
  - transposición en OSMD y `tonal`;
  - detección de altura por micrófono, gratis (getUserMedia + Web Audio);
  - sonidos de trompeta libres para Tone.js.

### Paso 2: decidir con Sofia cómo se arma
- **Mi recomendación:** **un modo "Instrumento: Trompeta" dentro de la misma app** y no una copia aparte.
  - Comparte los colores, la biblioteca, el análisis, los paneles y las pruebas.
  - Lo propio de la trompeta se suma encima: transposición, digitaciones, micrófono en vez de MIDI, armónicos.
- **La objeción:** una app más grande es más compleja.
- **La otra opción:** copiar `harmony-helper` a `~/code/trumpet-helper` y adaptarla. Es más simple al principio, pero duplica todo y cada mejora habría que hacerla dos veces.
- **Que decida ella**, después de ver la investigación.

### Paso 3: ideas de pantallas para trompeta (a discutir, no construir sin OK)
- **Panel de nota:**
  - la digitación de esa nota: 3 pistones dibujados, los apretados en su color;
  - en qué parcial está;
  - las digitaciones alternativas;
  - la nota escrita y la que suena.
- **Micrófono:** toca la frase y la app marca nota por nota si dio en el blanco y si está afinada (aguja de afinador en su color).
- **Recorrido para trompeta:** cantar antes de tocar, *lip slurs* (ligados de labio) por parciales, la escala de la pieza con sus digitaciones.
- **Armadura y transposición:** la ficha de la armadura dice "escrita en Re mayor, suena en Do mayor".

## 4. Cómo arrancar la conversación nueva
Pegá esto en un chat nuevo:
> Hola. Leé `~/code/harmony-helper/docs/paquete-trompeta.md` entero y seguí sus reglas. Quiero hacer Harmony Helper para la trompeta. Arrancá por el Paso 1: mandá investigadores a entender la trompeta, y después contame lo que encontraron antes de construir.
