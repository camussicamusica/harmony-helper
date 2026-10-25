---
type: project
updated: 2026-10-25
tags: [harmony-helper, plan, midi]
---

# Build plan 6 — Ladrillo 0: teclado MIDI, avisos honestos y app en español

Por qué este ladrillo va primero: en `docs/flujo-de-trabajo.md` cada ejercicio termina en "tocalo en el MIDI". Sin una entrada MIDI compartida, ninguno de los ejercicios futuros (tonos guía, eco, flash de acordes, esperar la nota) puede existir. Se hace una sola vez, bien, y todos la usan.

## 1. Entrada MIDI (`src/lib/midi/input.ts`)
- Almacén externo + hook `useMidiInput()`. Estado: `unsupported | idle | pending | connected | no-devices | denied | error`, más `devices`, `pressed`, `sustain`, `lastNote`, `remembered`, `appSound`.
- `navigator.requestMIDIAccess()` solo se llama desde el clic en "Conectar teclado MIDI". Excepción: si `navigator.permissions.query({name:"midi"})` ya dice "granted", conecta en silencio al abrir. Nunca pide permiso al cargar la página.
- Escucha todas las entradas y `statechange` (enchufar / desenchufar). Si se desenchufa con notas sonando, las apaga.
- Mensajes: note-on, note-off, note-on con velocidad 0 = off, pedal de sustain CC64, "all notes off" (CC120 / CC123). Cualquier canal.
- `pressed` = teclas apretadas + teclas soltadas con el pedal abajo. Cada nota lleva su hora (`performance.now()`, en la práctica `event.timeStamp`, que es la misma línea de tiempo).
- API de eventos para ejercicios futuros: `subscribe(listener)` con `{type: "on" | "off", midi, velocity, time}`. Los eventos son de la tecla física: soltar una tecla con el pedal abajo igual emite "off"; `pressed` es lo que respeta el pedal.
- `localStorage hh.midi.v1 = {granted: true}` después del primer permiso: el botón dice "Reconectar teclado MIDI".
- Solo en desarrollo (`import.meta.env.DEV`): `window.__hhMidi` con `simulate(midi, on, velocity?)`, `sustain(down)`, `setStatus(status, devices?)`, `snapshot()` y `events`.
- Sonido opcional: si "Sonido de la app al tocar" está prendido, las notas suenan por el sampler existente (`getSampler()` de `scheduler.ts`). Apagado de entrada.

## 2. Pantalla
- `src/components/reader/MidiControl.tsx`, en la segunda fila de `TopBar`: ícono de teclado + punto de estado + etiqueta. Etiquetas: "Conectar teclado MIDI" / "Reconectar teclado MIDI" / "Conectando…" / "Teclado: <nombre>" / los tres avisos largos (sin teclado, permiso bloqueado, sin MIDI) / "No pude conectar el teclado MIDI. Apretá de nuevo.".
- Cuadrito (popover) con la lista de teclados y el interruptor "Sonido de la app al tocar".
- Lectura en vivo al lado: "Re (D) · octava 4" (teclas negras con los dos nombres) y, con 3+ notas juntas, el nombre del acorde. `src/lib/midi/readout.ts` usa `chordName` de `naming.ts` (no adivina). Una tecla negra tiene dos grafías; para el acorde se elige la más común (Si♭ mayor, Do# menor, Fa# siempre con sostenido), porque una tecla no dice cuál quiso decir.
- `PianoView`: las teclas que ella aprieta se llenan con su `noteColor` (gris neutro si ese color está apagado) y llevan un borde oscuro + borde blanco interno + un punto. La reproducción de la pieza solo rellena la tecla, así que nunca se confunden. Si coinciden, manda la marca de ella.

## 3. Avisos honestos al abrir archivos
- `omrService.ts`: `.musicxml` / `.xml` se leen como texto; `.mxl` se descomprime; `.pdf` y `.mid/.midi` dan el aviso y **no cargan nada**; cualquier otra cosa también avisa. Si hay un `VITE_OMR_ENDPOINT` real, el camino real del PDF sigue.
- `mockOmr` (la escala falsa de Do mayor) queda en el archivo, exportada y sin uso. No se borra.
- `UploadZone`: el aviso es un cartel legible (varias líneas, con "X"), no una línea cortada. El selector de archivos y el cartel de arrastrar listan solo lo que anda: `.musicxml`, `.xml`, `.mxl`.
- `.mxl`: `src/lib/music/mxl.ts` lee el zip a mano (directorio central + `DecompressionStream("deflate-raw")` de Chrome), busca `META-INF/container.xml` y devuelve el XML de adentro. Sin librerías nuevas. Detecta el zip por los primeros bytes, no por la extensión.

## 4. Todo en español (Argentina)
- Botones, estudio de colores, pestañas, objetivos (Plica, Cabeza de nota, Alteración, Tecla del piano, Cuadrado, Círculo, Franja), paletas, avisos, `aria-label`, tooltips, `<title>` ("Harmony Helper"), `lang="es-AR"`, el "Close" oculto de los paneles.
- Los nombres de los roles guardados (inglés) **no se tocan en el almacenamiento**. La pantalla los traduce por id (`src/lib/colors/labels.ts`). Solo los datos nuevos nacen en español: "Mis colores", "Color nuevo", "copia", "(importada)". Una versión guardada que se llama "My colors" sigue llamándose así.
- Se mantienen "Re (D)" y Tón / Subd / Dom (nunca una letra sola).
- `src/lib/colors` no cambió de comportamiento.

## Cómo se verificó
- `tsc --noEmit` y `bun run build` pasan.
- En el navegador de la app (localhost:5190) con `window.__hhMidi`: teclas con borde y color, lectura de nota, acordes (Fa# menor, Si♭ mayor, Do mayor, Sol séptima…), pedal (las teclas quedan hasta soltar el pedal), nota-on con velocidad 0, los 7 estados del botón, el cuadrito, el interruptor de sonido (sin errores; no se pudo escuchar), reproducción de la pieza al mismo tiempo.
- Archivos soltados en la página: PDF, MIDI, `.txt`, `.xml` roto (todos con aviso y sin cargar nada) y un `.mxl` armado a mano con `META-INF/container.xml` (cargó).
- **No se pudo probar con un teclado real ni escuchar audio.**

## Fuera de este ladrillo
Esperar la nota correcta, repetir un tramo, velocidades 50/75/100%, evaluar timing, importar MIDI como partitura, leer PDF (Audiveris, v2). Mostrar "Fa#" o "Sol♭" según la tonalidad de la pieza en la lectura en vivo (hoy usa la grafía más común).
