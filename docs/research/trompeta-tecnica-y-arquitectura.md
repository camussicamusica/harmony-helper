---
type: reference
updated: 2026-10-29
tags: [harmony-helper, trompeta, tecnica, investigacion]
---

# Trompeta: verificación técnica y decisión de arquitectura

Qué es esto: dos partes. **A** verifica los puntos "(verificar)" de `tecnologia-libre.md` (leyendo `node_modules` y consultando npm/GitHub el 2026-10-29). **B** mapea el código de la app para decidir entre "un modo Instrumento: Trompeta" y "copiar a `~/code/trumpet-helper`".

Lo que no pude probar queda marcado **(verificar)**. No se instaló nada ni se tocó código.

---

## Parte A. Verificaciones

### A1. OSMD 1.9.9 y `<transpose>` (lo más importante)

**Qué se leyó:** `node_modules/opensheetmusicdisplay/build/opensheetmusicdisplay.min.js`, los `.d.ts` en `build/dist/src` y `CHANGELOG.md`. La versión instalada es 1.9.9 (publicada 2026-05-05).

Hallazgos confirmados en el código:

1. **El `<transpose>` del archivo NO cambia lo que se dibuja ni el `Pitch` de cada nota.** El lector de MusicXML (`addAbstractInstruction`) solo hace esto: busca `<transpose>`, lee `<chromatic>` y lo guarda en `Instrument.PlaybackTranspose`. Nada más. La palabra `PlaybackTranspose` aparece solo 3 veces en todo el bundle: el lector, el getter y el setter. O sea: OSMD **no usa** ese valor por sí mismo. Está ahí para que lo use un reproductor.
2. **Entonces `note.Pitch` es la nota ESCRITA** (la que se ve en la partitura). Para una trompeta en Si♭ (B♭), un Do4 escrito sigue siendo Do4 en `Pitch`; suena Si♭3.
3. **La armadura también queda como está escrita.** `KeyInstruction.Key` viene del `<fifths>` del archivo, que en un archivo de trompeta es la armadura escrita.
4. **Existe una transposición propia de OSMD, pero es otra cosa:** `osmd.Sheet.Transpose = n` (semitonos), `Instrument.Transpose` (por instrumento) y el plugin `TransposeCalculator`. Todos están en la 1.9.9 (`MusicSheet.d.ts` línea 177-183, `Instrument.d.ts`, `Plugins/Transpose/TransposeCalculator.d.ts`).
   - **Hay que activarlo a mano:** `osmd.TransposeCalculator = new TransposeCalculator()`. Si no, OSMD escribe en consola "transpose requested, but TransposeCalculator undefined" y no hace nada.
   - Después de cambiar `Transpose` hay que llamar `osmd.updateGraphic()` y `render()`.
   - Eso es para **transponer la hoja entera** (por ejemplo, ver la pieza en otra tonalidad). **No** es lo que lee `<transpose>`.
5. **Trampa importante si algún día se usa `Sheet.Transpose`:** al renderizar con transposición distinta de cero, OSMD sobreescribe `sourceNote.halfTone` y guarda `sourceNote.TransposedPitch` (ver `calculateAccidental` en el bundle). El `Pitch` original no se toca. La app lee `src.Pitch.halfTone` (`parseMusicXml.ts` líneas 50, 112), así que seguiría leyendo la altura sin transponer mientras la partitura se dibuja transpuesta. Hay que decidir de antemano de cuál de los dos leer.
6. **Qué debe usar la app:**
   - **Escrito** = `Pitch` tal cual (lo que la app ya lee hoy). Se usa para colores, panel de nota, cursor, digitaciones, armadura dibujada.
   - **Sonando** = escrito + `Instrument.PlaybackTranspose` (que OSMD ya lee del archivo; en Si♭ es −2). Se usa para Tone.js y para comparar con el micrófono.
   - **Cuidado:** si el archivo trae trompeta **sin** `<transpose>` (por ejemplo, un PDF pasado por Audiveris, que "lee las notas como están impresas"), `PlaybackTranspose` será 0 y habrá que preguntar a Sofia qué instrumento es. Por eso conviene un **selector manual** que gane sobre el archivo.
   - **Detalle:** el valor `<chromatic>` puede traer también `<octave-change>` (por ejemplo, instrumentos que suenan una octava distinta). OSMD lo ignora. Para la trompeta en Si♭ no importa (verificar con un archivo real de otra trompeta).

**Corrección a `tecnologia-libre.md`:** decía "no estoy seguro de cómo trata OSMD el `<transpose>`". Ahora está resuelto: **solo guarda el número para reproducción, no cambia el dibujo ni el `Pitch`**. Y confirmado que `TransposeCalculator` y `Sheet.Transpose` existen en 1.9.9.

**Lo que falta:** probar con un MusicXML real de trompeta (MuseScore, exportado en "altura escrita") que `PlaybackTranspose` valga −2 y que el dibujo muestre la armadura escrita. Es una prueba de 10 minutos. **(verificar)**

### A2. Detección de altura: estado de las librerías

Datos del registro de npm y de la API de GitHub, 2026-10-29:

| Librería | Versión | Licencia | Última publicación | Veredicto |
|---|---|---|---|---|
| `pitchy` | 4.1.0 | MIT en npm (`dependencies`: solo `fft.js`). GitHub la muestra como 0BSD: es la misma familia permisiva; **mirar el archivo LICENSE al instalar** (verificar) | 2024-01-04 | Estable, sin cambios hace casi 2 años. Repo no archivado; último movimiento 2026-10-18. Sirve |
| `ml5` | 1.4.0 | MIT | 2026-08-07 | **Confirmado:** el bundle `ml5.min.js` de la 1.4.0 no contiene "pitchDetection" ni "crepe". En 1.x se retiró. No usar |
| `@spotify/basic-pitch` | 1.0.1 | Apache-2.0 | **2022-08-05** | Sin versión nueva en 4 años. El repo `basic-pitch-ts` tiene su último push en 2023-05. Funciona, pero está abandonado. No es para tiempo real |
| `smplr` | 1.1.0 | MIT (el código) | **2026-09-28** | Muy activo |

**Correcciones a `tecnologia-libre.md`:**
- `pitchy`: "mantenimiento moderado" es correcto; ahora hay fecha concreta.
- `ml5`: pasa de "creo que retiró" a **confirmado**.
- `basic-pitch-ts`: pasa de "poca actividad" a **abandonado desde 2022** (el modelo sigue sirviendo).

### A3. Sonidos de trompeta libres

**VSCO-2 CE (Versilian Studios Community Edition)**
- Licencia: **CC0** (dominio público), confirmada en GitHub (`sgossner/VSCO-2-CE`, SPDX `CC0-1.0`). Su Readme dice que se puede usar "para cualquier propósito", y pide (no obliga) dar crédito y no vender las muestras sueltas.
- Contenido de trompeta: carpeta `Brass/Trumpet/` con tres articulaciones:
  - **`sus`** (sostenida): 10 alturas × 2 intensidades (v1 y v3), un solo `rr` (muestra). Alturas **sonando**: F2, A2, C3, D♯3, G3, A♯3, D4, F4, A4, C5 (verificar que el nombre sea la altura que suena y no la escrita).
  - **`susvib`** (sostenida con vibrato) y **`stac`** (staccato, 3 intensidades × 2 repeticiones).
  - Hay también `harmonM-sus` y `straightM-sus` (con sordina).
- Formato: **WAV**, de 1 a 3,4 MB cada uno. La sostenida v3 (la intensidad media) suma unos 14 MB en WAV para las 10 notas.
- **Estimación de tamaño (no medida):** convertidas a MP3 u OGG a 96-128 kbps, esas 10 notas quedan en **1 a 2 MB**. Para el rango pedido (cada tercera menor entre Fa♯3 y Do6 escritos, que suenan Mi3 a Si♭5) hacen falta unas **9 a 10 muestras**, y VSCO ya trae casi exactamente ese espaciado. El tope sonando de VSCO es Do5; para llegar a Si♭5 sonando (Do6 escrito) Tone.js tendría que estirar la muestra unos 5 semitonos hacia arriba. Es aceptable pero suena "ardilla" en notas agudas. **(verificar de oído).** Si no convence, grabar una muestra propia de Sofia en Do6 sería lo mejor.
- Hay que convertir con una herramienta externa (ffmpeg, no revisé si está instalada) y servir desde `public/`.
- Esto sirve directo con `Tone.Sampler` (el mismo mecanismo de piano de hoy, `scheduler.ts` líneas 59-78): `urls: { "A2": "A2.mp3", ... }`. Tone.js estira las notas intermedias.

**FluidR3_GM / MusyngKite (vía `midi-js-soundfonts` y `smplr`)**
- `trumpet-mp3.js` de FluidR3: **2,9 MB** (medido con HEAD). MusyngKite: 2,9 MB. OGG de FluidR3: 2,85 MB.
- **Licencias, corrección a `tecnologia-libre.md`:** decía "MIT (verificar)". El README de `midi-js-soundfonts` dice:
  - FluidR3_GM: **CC BY 3.0** (atribución).
  - MusyngKite: **CC BY-SA 3.0** (atribución y compartir igual).
  - Para una app personal no molesta. Si algún día se publica, hay que dar crédito, y MusyngKite obligaría a compartir igual.
- `smplr` 1.1.0: `Soundfont(context, { instrument: "trumpet", kit: "FluidR3_GM" })`. MusyngKite es el kit por defecto. Descarga de GitHub Pages en el momento (necesita internet, igual que el piano de hoy, que baja de `tonejs.github.io`).
- Con `smplr` se puede usar sin Tone.js, pero **el piano actual está en Tone.Sampler**, así que lo más simple es otro `Tone.Sampler` con muestras de VSCO, o los archivos de soundfont como `urls`. Mezclar dos librerías de audio sin necesidad no vale la pena.

**Recomendación para sonido:** empezar con FluidR3/MusyngKite (cero trabajo, 3 MB, suena a trompeta), pasar a VSCO sustained si quiere algo más realista. VSCO-2 CE es la mejor opción de licencia (CC0).

### A4. Micrófono (`getUserMedia`) en localhost:5190

1. **Contexto seguro:** `http://localhost` cuenta como seguro, así que `getUserMedia` funciona en `localhost:5190` sin HTTPS. En Chrome está confirmado. En Safari, `localhost` se trata como contexto seguro para esto **(verificar en su Mac)**.
2. **Permiso por origen:** el permiso se guarda por dirección completa (`localhost:5190`). Es la misma razón por la que los colores viven en el puerto 5190. Si cambia de puerto, vuelve a preguntar.
3. **Las tres restricciones:** `{ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }`. Por defecto las tres están en `true` en Chrome, Firefox y Safari, y deforman un tono sostenido (el control de ganancia mueve el volumen, la supresión de ruido puede "comerse" una nota larga).
   - **Chrome (Mac): funciona** para desactivarlas.
   - **Safari:** historial flojo. Un informe de WebKit de 2017 decía que las restricciones no tenían efecto y otro de 2018 decía lo mismo para la cancelación de eco en macOS. Un hilo reciente del foro de desarrolladores de Apple (Safari 26, macOS) cuenta que con `echoCancellation: false` graba en estéreo aunque se pida `channelCount: 1`. **Conclusión: no tengo confirmación de que Safari desactive las tres en macOS 14.5.** Recomendación: **usar Chrome** para esta función y, si hace falta Safari, probar y comprobar con `track.getSettings()` qué quedó realmente activado. **(verificar)**
4. **Contexto de audio:** `AudioContext` solo arranca tras un gesto (un clic); ya pasa con Tone en la app (`Tone.start()`).
5. **Pedir al abrir el modo micrófono, no al cargar la app.** Es el mismo patrón que MIDI en `src/lib/midi/input.ts` (`requestMIDIAccess` solo en un clic).
6. **Atención con el altavoz:** si la app hace sonar la guía mientras Sofia toca, el micrófono oye ambos. Con la cancelación de eco apagada, hay que usar auriculares o pausar la guía al escuchar. Es una decisión de pantalla, no de tecnología.

### A5. Resumen de correcciones a `tecnologia-libre.md`

| Punto | Antes | Ahora |
|---|---|---|
| OSMD y `<transpose>` | No estoy seguro | Solo lo guarda en `PlaybackTranspose`; no cambia dibujo ni `Pitch` |
| `TransposeCalculator` / `Sheet.Transpose` | Existen, creo | Confirmados en 1.9.9; hay que crear el calculador a mano |
| `pitchy` | MIT, moderado | v4.1.0, 2024-01, MIT (GitHub dice 0BSD; mirar LICENSE) |
| `ml5` | Creo que retiró `pitchDetection` | Confirmado: no está en el bundle 1.4.0 |
| `basic-pitch-ts` | Poca actividad | Abandonado desde 2022-08 |
| FluidR3 | MIT | **CC BY 3.0** |
| VSCO-2 CE | "Cientos de MB a GB" | Trompeta: carpeta `Brass/Trumpet`, WAV, la sostenida son 10 notas (~14 MB en WAV, ~1-2 MB convertida; estimado) |
| Safari y las restricciones | Distinto, probar | Historial flojo; usar Chrome |

---

## Parte B. Mapa del código

Todas las rutas son relativas a `~/code/harmony-helper`. "Líneas" son las que revisé; no leí cada archivo entero. Los archivos gigantes (`ScoreView.tsx` 2813 líneas, `ReaderPage.tsx` 562) los revisé solo por búsquedas.

### B1. Dónde viven los supuestos de piano

| Pieza | Dónde | Qué supone | Clasificación |
|---|---|---|---|
| **Teclado en pantalla** | `src/components/reader/PianoView.tsx` (205 líneas): 52 teclas blancas, Do central 60, `buildKeyboardGeometry` en `src/lib/music/midiUtils.ts`. Montado en `ReaderPage.tsx:519` y tecla "p" en `ReaderPage.tsx:337` | Es un piano, de A0 a C8 | **Solo piano.** En modo trompeta se oculta o se reemplaza por el diagrama de pistones. Componente nuevo |
| **Entrada MIDI** | `src/lib/midi/input.ts` (305 líneas), `readout.ts`, `src/components/reader/MidiControl.tsx`; usado en `PianoView.tsx:34` y `RecorridoPanel.tsx:21,423` | Notas con tecla pulsada; polifonía | **Compartido tal cual** como almacén de eventos. La trompeta necesita una **segunda fuente de eventos** (micrófono) con la misma forma `{midi, on/off}`. El diseño de "tienda externa compartida" ya lo permite (el propio archivo dice que futuros ejercicios se suscriben) |
| **Sonido (Tone.js)** | `src/lib/music/scheduler.ts:59-78`: `Tone.Sampler` de Salamander, `baseUrl` de tonejs.github.io, fijo. `scheduleNotes` (líneas 211-228) toca `note.midi` | Un único instrumento, cableado. Toca `midi` escrito | **Necesita interruptor.** `getSampler()` pasa a depender del instrumento; `scheduleNotes` debe sumar la transposición (escrito + `PlaybackTranspose`). Es un cambio chico y concentrado (~30 líneas) |
| **Manos (RH/LH)** | `src/lib/music/types.ts:1` (`Hand`), `parseMusicXml.ts:112-126` (pentagrama 1 = RH; si hay un solo pentagrama, `midi >= 60` = RH). Se usa en `ScoreView.tsx` (líneas 679, 693, 772, 1283-1296, 1403, 1566), `melodicLine.ts`, `scheduler.ts`, `noteContext.ts`, `noteFigure.ts`, `patterns.ts`, `scaleView.ts` | Dos manos, dos pentagramas | **Necesita interruptor.** Una trompeta es una sola línea. Más simple: todas las notas son "RH". Pero el tipo `Hand` está sembrado por 10 archivos. La opción barata es usar siempre `"RH"` y esconder los controles de mano |
| **Panel de nota** | `ScoreView.tsx` (etiqueta y panel), `src/lib/music/analysis/noteContext.ts` (`noteContext`, `keyRoleOf`, `chordRoleOf`, líneas 83-287), `noteFigure.ts`, `closeup.ts`, `src/components/music/MiniStaff.tsx` | La nota se explica por su función en la tonalidad y en el acorde que suena. Para un piano es lógico; para una melodía sola, el "acorde" es implícito | **Mayormente compartido** (nombre, figura, función en la escala, foto). Hay que **agregar**: digitación, parcial, nota escrita vs sonando. "Suenan ahora" y "Armonía" tienen menos sentido con una sola línea |
| **Armadura (ficha)** | `src/components/reader/KeyPanel.tsx` (109), `src/lib/music/analysis/keySignature.ts` (187 líneas): `fifths`, `majorTonicOf`, `signatureTrick`, `whichKeyText` | Lee `fifths` del archivo y lo trata como la tonalidad real | **Necesita interruptor.** Para trompeta debe decir "escrita en Re mayor, suena en Do mayor". Se resuelve con una función `concertFifths = writtenFifths - 2` (para Si♭) y un texto doble. La lógica pura se reutiliza |
| **Detección de tonalidad** | `src/lib/music/analysis/key.ts` (239): `detectKey(hist)`, `pitchClassHistogram(notes)`, `detectKeyFromNotes(notes, fifths)`; lo llama `useFicha.ts` | Histograma de clases de altura de `ScheduledNote.midi` | **Compartido tal cual** si se le da la altura **escrita** (la armadura escrita y las notas escritas son coherentes entre sí). Solo se agrega la traducción a "suena en..." al final. Esto es limpio |
| **Colores por clase de altura** | `src/lib/colors/store.ts:166-181`: `noteColor(midi)` = rol `note-${midi % 12}`. Almacenado en `hh.colors.v1` (clave de la que no hay que escribir) | Color por clase de altura de la `midi` que recibe | **Compartido tal cual.** Hoy `parseMusicXml.ts:50,112` le pasa el `Pitch` de OSMD, es decir **la altura escrita**. Si se mantiene así, las notas se pintan por lo que Sofia lee en la hoja |
| **Biblioteca** | `src/lib/library/store.ts` (IndexedDB `hh-library`, versión 1, línea 25-32), `entry.ts` (`LibraryEntry`: `id`=hash del xml, `xml`, `title`, `keyLabel`...), `useLibrary.ts` | Una partitura = un XML | **Compartido.** Hay que agregar un campo `instrument?` a `LibraryEntry`. Como el esquema está en JS puro (sin migración de IndexedDB necesaria para un campo opcional), el costo es bajo |
| **Recorrido (11 pasos)** | `src/lib/music/recorrido/steps.ts` (194), `useRecorrido.ts` (108), `midiChecks.ts` (75), `RecorridoPanel.tsx` (572) | Texto con "tocalo en el teclado" (steps.ts líneas 68, 83, 127, 186); comprobación de escala con MIDI | **Necesita interruptor** (otro texto en los pasos 3, 4, 8, 10 más o menos) y **trompeta-nuevo** (lip slurs, escala con digitaciones). La estructura (días, salas, progreso por pieza) es compartida |
| **Almacenamiento de ajustes** | `localStorage` con claves `hh.*.v1`: `hh.colors.v1`, `hh.view.v1`, `hh.lastScore.v1`, `hh.tempo.v1`, `hh.recorrido.v1`, `hh.patterns.*`, `hh.keyOverride.v1:`, `hh.ui.v1`, `hh.lineMode.v1`, etc. | Un solo perfil | **Compartido.** Una clave nueva `hh.instrument.v1`. Colores y patrones son por pieza o globales y valen para los dos instrumentos |
| **Tema, tempo, zoom, vistas (Tocar/Estudiar/Hoja)** | `tempo.ts`, `theme.ts`, `ScoreView.tsx` | Neutros | **Compartido** |
| **Capas** (cajas de patrones, degradé, nombres de acordes, línea melódica) | `src/lib/music/analysis/patterns*.ts`, `degrade.ts`, `chordNames.ts`, `melodicLine.ts` | Patrones de compases repetidos: neutros. Nombres de acordes y círculo: piano | Patrones y degradé **compartidos**; acordes y círculo **menos útiles** en una línea (se ocultan, no se borran) |
| **Pruebas** | `tests/` 31 archivos `.test.ts`; `bun run check` = `tsc --noEmit && bun test` | Lógica pura, sin navegador | **Compartidas.** Las nuevas pruebas (transposición, digitaciones, micrófono → nota) son archivos aparte. Ninguna de las pruebas existentes debería romperse si el modo piano queda como valor por defecto |

### B2. Cómo se construyó la app (git)

- **39 commits en 6 días** (24 al 29 de octubre de 2026): 12, 5, 4, 17 y 1 por día.
- Tamaño de los commits grandes (según `git log --shortstat`):
  - "Ladrillo 1: Recorrido": ~11 pasos como funcionalidad completa.
  - "Cajas de patrones y Degradé": 16 archivos, +2093 líneas.
  - Último gran paquete (arrastrar, temas, Biblioteca, vistas): 26 archivos, +1787 líneas.
  - La mayoría de los commits: 1 a 10 archivos y 100 a 800 líneas.
- **Lectura honesta:** se agregan funciones completas con interfaz en el orden de **un paquete grande cada pocas horas**, con las pruebas corriendo antes de cada commit. Eso hace barato agregar piezas dentro de una base viva, y también quiere decir que la base **cambia rápido**: una copia se desactualiza en días.

### B3. Esfuerzo y complejidad de las dos opciones

Los números son estimaciones mías, **no mediciones**; las doy como órdenes de magnitud en "paquetes" de los que ya hace esta app.

**Opción 1 — Modo "Instrumento: Trompeta" dentro de la misma app**

Trabajo necesario (en orden):
1. Un selector de instrumento (`hh.instrument.v1`, por pieza con valor por defecto). Un archivo nuevo `src/lib/instrument/` con la configuración: `{ id, transposeSemitones, sampler, notaMasGrave, notaMasAguda }`. **1 paquete chico.**
2. Transposición: escrito + `PlaybackTranspose` en `scheduleNotes`; sampler por instrumento. **1 paquete chico** (el riesgo es del lado de A1).
3. Armadura y ficha: texto doble "escrita / suena". **1 paquete chico.**
4. Panel de nota con digitación (tabla por regla, SVG de 3 pistones). **1 paquete mediano.** Es lo más trompeta-específico.
5. Micrófono → nota, con `pitchy`: nuevo hook, aguja de afinación, comparación con la nota esperada. **1 a 2 paquetes grandes.** Es independiente de la opción elegida.
6. Ocultar piano, manos y acordes en modo trompeta. **1 paquete chico, pero disperso** (10 archivos con `Hand`).
7. Recorrido para trompeta. **1 paquete mediano** (contenido pedagógico, no código).

Total: unos **7 a 9 paquetes**, de los cuales los puntos 4, 5 y 7 son trabajo que haría falta en cualquiera de las dos opciones.

**Opción 2 — Copia en `~/code/trumpet-helper`**

1. Copiar y renombrar: ~1 hora. Hay que cambiar nombres de claves de almacenamiento (`hh.*`) y de la base de IndexedDB (`hh-library`) para no pisar la app original. Mismo puerto distinto (por ejemplo 5191), si no, comparten `localStorage`. Los colores se copian de `hh.colors.v1` solo a mano y por única vez (sin escribir la clave de la app original).
2. Sacar el piano, las manos y los acordes **de verdad** (se puede borrar código, lo que lo hace más simple que ocultar). **1 paquete mediano.**
3. Los puntos 2 a 5 y 7 de la opción 1, igual, pero **sin** el cuidado de no romper el modo piano. **Algo más barato en cada uno**, no mucho.

Total: unos **6 a 8 paquetes** al principio. **Casi el mismo trabajo**, con la diferencia de que (a) no hace falta conservar el modo piano y (b) cada mejora posterior, de colores, de paneles o de análisis, **se hace dos veces o se queda atrás**.

**Comparación**

| | Un solo modo | Copia aparte |
|---|---|---|
| Esfuerzo inicial | Un poco más (cuidar los dos modos) | Un poco menos |
| Esfuerzo a 3 meses | Menor (mejoras compartidas) | Mayor (portar a mano) |
| Pruebas (~435) | Se reutilizan; el piano queda protegido | Se copian y empiezan a divergir |
| Riesgo de romper el piano | Real, pero lo cubren las pruebas | Cero |
| Colores de Sofia (`hh.colors.v1`) | Una sola fuente | Dos copias que se desfasan |
| Biblioteca | Única | Dos |
| Claridad mental | Una app con un interruptor | Dos apps simples |

### B4. La objeción más fuerte a cada opción

**Contra el modo único:** el tipo `Hand` y la idea de "dos pentagramas" están sembrados en unos 10 archivos, y la pantalla está pensada alrededor del teclado (el piano plegable es parte de la interfaz). Si en vez de "ocultar" hay que ir poniendo `if (instrument === "trumpet")` por todos lados, la app se llena de ramas, y cada función nueva de piano obliga a preguntar "¿y en trompeta?". Una app que sale de dos instrumentos con tres modos de vista cada uno puede volverse difícil de razonar, y Sofia ya vio que el exceso de color la satura; el exceso de modos podría pasar igual. Esto es real: `ScoreView.tsx` ya tiene 2813 líneas.

**Contra la copia:** duplicar es lo que Sofia dice no querer. La app **cambia todos los días** (17 commits el 27/10), y la mitad de lo que se agregue (colores, patrones, biblioteca, temas, arrastrar) vale igual para ambos. En un mes la copia tendría las pruebas de otra versión del código y las dos apps se pisarían en las mejoras de color. Y hay un riesgo propio: dos apps comparten el mismo `localhost` si no se cambian los puertos y las claves, y ahí se pueden pisar los datos.

### B5. Recomendación

**Un solo modo, con una regla de diseño que baja la objeción:** el instrumento es **configuración**, no ramas.

1. Crear un único objeto `Instrument` (`piano` y `trumpet-bb`) con transposición, sampler, rango, si tiene teclado y si tiene dos manos.
2. El código existente pregunta a la configuración, no a un `if` con el nombre. El valor por defecto es piano, así que las 435 pruebas no cambian.
3. **Poner la trompeta como "una sola mano"** (`"RH"` para todo) en lugar de eliminar `Hand`. Eso evita tocar los 10 archivos.
4. Lo trompeta-específico (digitaciones, micrófono, recorrido) vive en carpetas nuevas (`src/lib/trumpet/`, `src/components/trumpet/`), no mezclado.
5. **Antes de comprometerse**, un día de prueba: abrir un MusicXML real de trompeta en la app hoy, ver qué se rompe y qué dice `PlaybackTranspose`. Si el listado de roturas es corto (lo que espero), se confirma la opción 1. Si lo que sale son más de ~15 puntos de rotura reales, la copia gana.

**Objeción más fuerte a esta recomendación:** que la separación "por configuración" es una promesa de disciplina, no un hecho. En 6 días la app hizo 39 commits de funciones; si cada uno olvida preguntar a la configuración, el modo trompeta se llena de excepciones. La copia no tiene ese riesgo y sale más rápida de entrada. **Contra-respuesta:** las pruebas existentes más una prueba nueva "cada archivo de `src/lib/music` no menciona un instrumento por nombre" (una verificación con `grep` en `bun test`) lo hacen verificable.

**Si Sofia prefiere simpleza sobre mantenimiento**, la copia es defendible solo si se acepta que será una app **congelada**: se usa hoy, y las mejoras de piano no llegan. Eso hay que decirlo en voz alta antes de elegirla.

---

## Pendientes que quedan (verificar)

1. Probar un MusicXML real de trompeta Si♭: ¿`PlaybackTranspose` = −2? ¿Armadura escrita dibujada?
2. Confirmar que los nombres de nota de VSCO son la altura que suena.
3. Oír el estiramiento de la muestra de Do5 hacia Si♭5.
4. Safari: comportamiento real de las tres restricciones de micrófono en macOS 14.5.
5. Texto exacto de la licencia de `pitchy` (npm dice MIT, GitHub 0BSD).
6. Si hay `ffmpeg` en la Mac para convertir WAV a MP3/OGG.

Fuentes consultadas: registro de npm (pitchy, ml5, @spotify/basic-pitch, smplr), API de GitHub (VSCO-2-CE, pitchy, basic-pitch-ts, smplr, ml5-library), README de `gleitz/midi-js-soundfonts` y `danigb/smplr`, código y CHANGELOG de `opensheetmusicdisplay` 1.9.9 instalado, WebKit Bugzilla 179411 y el foro de desarrolladores de Apple (hilo 804765).
