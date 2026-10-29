---
type: reference
updated: 2026-10-29
tags: [harmony-helper, investigacion, tecnica]
---

# Tecnología libre para las tres ideas nuevas

**Aviso de honestidad.** Escrito de memoria técnica, sin poder abrir la web en esta sesión. Las URLs son los repositorios o páginas oficiales que conozco, pero las versiones, licencias exactas y el estado de mantenimiento hay que confirmarlos con un vistazo antes de instalar. Lo marcado **(verificar)** es lo menos seguro. Los números de latencia y tamaño son órdenes de magnitud, no mediciones.

## Resumen

| Idea | ¿Se puede gratis? | Mejor herramienta | Dificultad |
|---|---|---|---|
| (b) Canto: oír el micrófono y mostrar nota y afinación | Sí, 100% en el navegador | `pitchy` (MPM) + `tonal` para nota y cents | Media. El algoritmo es fácil; lo difícil es el pulido (ruido, vibrato, UI) |
| (a) Versión trompeta | Sí | `tonal` para transposición, OSMD o Verovio para la partitura, digitaciones calculadas por código y dibujadas en SVG | Media. No hay dataset abierto limpio, pero la tabla se genera con una regla |
| (a) Afinación de trompeta con micrófono | Sí | `pitchy`, ventana más corta | Baja a media |
| (c) Tarjetas de ritmo y lectura | Sí | VexFlow directo + generador propio (unas 100 líneas) | Baja a media |
| (c) Corregir un ritmo tocado o tapeado | Sí con teclado o MIDI; con micrófono es menos preciso | `event.timeStamp` / Web MIDI; `Meyda` o energía para onsets de micrófono | Media |
| Audio a notas (grabarse y recibir notas) | Sí, pero con límites | `@spotify/basic-pitch` (offline); para una sola voz, tu propio detector por cuadros | Alta |
| Sonidos realistas | Sí | Salamander (piano), VSCO-2 CE (trompeta, CC0), FluidR3 vía `smplr` (todo lo demás) | Baja |

---

## 1. Detección de altura (pitch) con el micrófono

**¿Es posible?** Sí. `navigator.mediaDevices.getUserMedia({audio})` entrega un `MediaStream`; se conecta a un `AudioContext` y se lee con `AnalyserNode.getFloatTimeDomainData()` (más simple) o con un `AudioWorklet` (más prolijo, corre en el hilo de audio). No hay servidor ni API de pago. Docs: [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet).

### Algoritmos

- **Autocorrelación simple.** Rápida y fácil, pero comete errores de octava (el pico del doble de período engaña). Sirve para prototipos.
- **YIN** ([paper](http://audition.ens.fr/adc/pdf/2002_JASA_YIN.pdf)). Autocorrelación corregida con una diferencia normalizada y un umbral. Muy buena para voz; baja tasa de errores de octava.
- **McLeod (MPM)** ([paper](http://miracle.otago.ac.nz/tartini/papers/A_Smarter_Way_to_Find_Pitch.pdf)). Parecida a YIN, pero devuelve un valor de **claridad** (confianza) muy útil para descartar ruido y consonantes. Pensada para instrumentos y voz.
- **CREPE** ([repo](https://github.com/marl/crepe)). Red neuronal. La más robusta con ruido, pero pesada y con latencia mayor.

### Librerías

| Librería | Algoritmo | Voz | Trompeta | Latencia | Tamaño | Licencia | Estado |
|---|---|---|---|---|---|---|---|
| [`pitchy`](https://github.com/ianprime0509/pitchy) | MPM, devuelve pitch y clarity | Muy buena | Muy buena | Una ventana de 1024 a 2048 muestras (23 a 46 ms a 44,1 kHz) | Pocos KB, sin dependencias, con tipos TS | MIT | Pequeña y estable, mantenimiento moderado (verificar) |
| [`pitchfinder`](https://github.com/peterkhayes/pitchfinder) | YIN, AMDF, ACF2+, MPM, wavelet | Buena (YIN) | Buena | Igual que arriba | Pocos KB | MIT | Prácticamente sin mantenimiento (verificar); el código sigue sirviendo |
| [ml5.js + CREPE](https://ml5js.org/) | CREPE en TF.js | Excelente con ruido | Buena | 60 a 100 ms o más, según la máquina | Varios MB de modelo más TF.js | MIT | Dudoso: creo que ml5 1.x retiró `pitchDetection` (verificar). No lo recomiendo para un M1 de 8 GB |
| [Essentia.js](https://mtg.github.io/essentia.js/) | PitchYin, PitchYinProbabilistic (pYIN), Melodia, etc. en WASM | Excelente (pYIN, Melodia) | Buena | Pensada para análisis por lotes, no tan simple para tiempo real | WASM de unos MB | **AGPL-3.0**, o licencia comercial. Es libre, pero si publicás la app tenés que liberar su código. Compatible si todo lo tuyo es abierto | Activa, universidad Pompeu Fabra (MTG) |
| [aubio](https://aubio.org/) / [aubiojs](https://github.com/qiuxiang/aubiojs) | YIN, YINFFT, etc. y detección de onsets | Buena | Buena | Baja | WASM pequeño | **GPL-3.0** | aubio casi sin cambios hace años; aubiojs es un puerto personal (verificar) |
| [Spotify Basic Pitch](https://github.com/spotify/basic-pitch-ts) | Red neuronal polifónica a MIDI | Mediocre en monofónico con vibrato | Aceptable | Offline, no pensada para tiempo real | Modelo chico (menos de 1 MB) más TF.js (varios MB) | Apache-2.0 | Poca actividad (verificar). Ver sección 2 |

### Trampas conocidas

- **Procesamiento del navegador.** Por defecto Chrome aplica cancelación de eco, supresión de ruido y control de ganancia, que deforman el sonido. Pedí `{audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}}`. Es el cambio que más mejora el resultado. Ver [constraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints).
- **Ruido de fondo.** Poné una **compuerta de volumen** (RMS mínimo) y exigí `clarity > 0.9` (MPM). Sin eso, el detector inventa notas con el ruido de la habitación.
- **Vibrato.** La voz oscila de 50 a 100 cents a 5 o 7 Hz. Mostrar la nota "cruda" marea. Usá la mediana de las últimas 100 a 200 ms para la aguja y mostrá aparte la altura central. Para afinación, ese promedio es lo que importa.
- **Errores de octava.** Aparecen al empezar una nota y en voces graves. Remedio: rango válido por tipo de voz o de instrumento, y descartar saltos de más de una octava entre cuadros contiguos. MPM y YIN los reducen, no los eliminan.
- **Ventana y rango.** Voz grave de unos 80 Hz: período de 12,5 ms, entonces una ventana de 2048 muestras (46 ms) alcanza. Trompeta aguda (Do6 escrito = Si♭5 sonando, unos 932 Hz): 1024 muestras alcanzan y bajan la latencia.
- **Permisos y localhost.** `getUserMedia` solo funciona en **contexto seguro**: HTTPS o `localhost`. En desarrollo, `http://localhost:5173` anda. Desde el celular a `http://192.168.x.x:5173` **no** anda: usá [`@vitejs/plugin-basic-ssl`](https://github.com/vitejs/vite-plugin-basic-ssl) o un túnel. Si denegás el permiso una vez, Chrome lo recuerda; hay que resetearlo en el candado de la barra.
- **iOS / Safari.** El `AudioContext` solo arranca tras un gesto del usuario (un toque); hay que llamar `resume()`. El permiso del micrófono se vuelve a pedir con más frecuencia, y Safari puede cortar el audio al bloquear la pantalla. Probá en un iPhone real **(verificar el comportamiento en PWA instalada)**.
- **Bluetooth.** Los auriculares con micrófono bajan la calidad del audio y suman cientos de ms de latencia. Para canto o afinación, usar el micrófono de la compu o uno con cable.
- **Latencia total.** Entre el sonido y lo que se ve hay entrada + buffer + dibujo: 50 a 150 ms es normal. Alcanza para afinar, no para medir un ritmo con precisión.

### Recomendación

- **Voz:** `pitchy` con ventana de 2048, `clarity > 0.9`, compuerta de volumen, mediana de 5 cuadros y conversión a nota y cents con `tonal` (`Note.fromFreq`, `Note.midi`; los cents salen de `1200*log2(f/f_objetivo)`). Rango válido de 70 a 1100 Hz. Si más adelante el ruido ambiente molesta, probar un modelo neuronal tipo CREPE tiny solo como extra.
- **Trompeta:** lo mismo con `pitchy` y ventana de 1024. El timbre es rico en armónicos pero el fundamental es fuerte, así que MPM anda bien. Dos detalles propios: (1) el detector devuelve altura **sonando**; para mostrar la nota escrita hay que sumar la transposición (sección 4); (2) las notas altas "saltan" entre parciales, y el detector ve el salto antes de que Sofi lo note, lo cual en sí es una buena función pedagógica.
- Evitar Essentia y aubio salvo que quieras sus onsets o pYIN: tienen licencia copyleft fuerte.

---

## 2. Audio a notas (polifónico o grabarse y recibir notas)

- **Basic Pitch** ([spotify/basic-pitch](https://github.com/spotify/basic-pitch), [versión TS para navegador](https://github.com/spotify/basic-pitch-ts), [demo](https://basicpitch.spotify.com/)). Apache-2.0, corre 100% en el navegador con TF.js. Entrega notas con inicio, duración, altura y *pitch bend*, y se exporta a MIDI. Uso razonable: grabar, procesar offline (unos segundos por minuto de audio en un M1, **sin medir**) y mostrar el piano roll.
- **Límites reales.**
  - Es instrumento-agnóstica: con una sola voz con vibrato produce notas fantasma y fragmenta las largas.
  - Da tiempos en segundos, no en negras: para llegar a partitura hay que cuantizar contra un metrónomo conocido.
  - Los octavos y las síncopas se desordenan si la grabación no fue con click.
  - El paquete de npm tiene poca actividad (verificar).
- **Alternativa para una sola voz o la trompeta (más sencilla y más fiel):** correr `pitchy` cuadro a cuadro sobre la grabación, agrupar los cuadros estables en notas (mediana de altura, mínimo 80 ms) y cuantizar con el click. Es menos "mágico" que Basic Pitch pero se controla entero.
- **Otras opciones:** pYIN en Essentia.js (AGPL), Magenta Onsets and Frames (solo piano; el proyecto magenta.js está archivado, **verificar**). Los transcriptores grandes (MT3 y similares) no son viables en 8 GB y sin GPU.
- **Del MIDI a partitura:** cuantizar y dibujar con VexFlow, o exportar MusicXML y abrirlo en OSMD. MuseScore (gratis) también convierte MIDI a partitura localmente, pero la transcripción rítmica automática siempre necesita revisión manual.

---

## 3. Tarjetas aleatorias de ritmo y lectura

### Render: VexFlow directo vs OSMD

- **VexFlow** ([repo](https://github.com/vexflow/vexflow), MIT): dibuja compases sueltos desde código. Control total de cada nota (colorearla al acertar o fallar), sin pasar por XML. Es lo que conviene para tarjetas de 1 a N compases. OSMD ya usa VexFlow por dentro.
- **OSMD** ([repo](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay), BSD-3): pensado para partituras completas en MusicXML. Para una tarjeta habría que generar un MusicXML por cada sorteo, lo cual es pesado y lento. Reservalo para las piezas reales.
- **Verovio** ([sitio](https://www.verovio.org/), LGPL-3.0, WASM de unos MB) es una tercera opción de render; ver también su opción `transpose` en la sección 4.
- Para las tarjetas de ritmo, usar `StaveNote` con la nota fija en una línea (percusión, clave neutral) y `Beam.generateBeams()` para agrupar los octavos; para tarjetas de lectura, notas reales dentro de una tonalidad y rango.

### Generar ritmos aleatorios pero válidos

No hay una librería popular de "generación de ritmos con notación". El algoritmo es corto:

1. Medir el compás en unidades pequeñas (por ejemplo semicorcheas: 4/4 = 16 unidades).
2. Mientras haya espacio libre, elegir **con pesos** una duración que quepa: negra = 4, corchea = 2, semicorchea = 1, blanca = 8, con puntillo, silencios.
3. Respetar los límites de pulso: una figura que cruza el medio del compás en 4/4 se corta o se liga. Para compases compuestos (6/8) agrupar de a tres corcheas.
4. Parámetros de dificultad: pesos por figura, probabilidad de silencio, síncopas permitidas, tresillos (usar `Tuplet` de VexFlow).
5. Evitar compases idénticos seguidos y validar que la suma sea exactamente el compás.
6. Para ritmos "tipo patrón" (clave, euclidianos) sirve [`@tonaljs/rhythm-pattern`](https://github.com/tonaljs/tonal/tree/main/packages/rhythm-pattern), que trabaja con secuencias binarias, no con notación.

Para las **notas** aleatorias: `tonal` (`Scale.get("C major").notes`, `Range.numeric`) con un rango dado y limitando saltos grandes entre notas.

### Corregir un ritmo tocado

- **Teclado:** `event.timeStamp` del `keydown` es un `DOMHighResTimeStamp`, mejor que `Date.now()`. Latencia del teclado: unos pocos ms. Es lo más práctico.
- **MIDI** ([Web MIDI](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)): `MIDIMessageEvent.timeStamp` es el más preciso. Ideal si se usa teclado o pad MIDI.
- **Micrófono (aplausos o golpes):** necesita detección de onsets. Opciones libres: energía por cuadros con umbral adaptativo, flujo espectral con [Meyda](https://github.com/meyda/meyda) (MIT), u onsets de aubio (GPL). Latencia y jitter de 20 a 60 ms o más: sirve para ritmos lentos o medios, mal para ritmos finos.
- **Cómo comparar:**
  1. Mapear el reloj de audio al reloj de eventos con `audioContext.getOutputTimestamp()`.
  2. Dar una cuenta previa (count-in) y alinear los golpes al primer pulso.
  3. Emparejar cada golpe con el onset objetivo más cercano (voraz o programación dinámica), dejando los sobrantes como "golpes de más" y los no emparejados como "faltantes".
  4. **Ventanas de tolerancia** como fracción del pulso, no en ms fijos: por ejemplo ±10% del pulso "perfecto", ±20% "bien", ±30% "aceptable" (a 60 bpm eso es ±100, ±200 y ±300 ms; a 120 bpm la mitad). Valores razonables de partida, a ajustar probando.
  5. Ofrecer una **calibración de latencia** (tocar al compás del click) y restar el promedio.

---

## 4. Tecnología específica de trompeta

### Transposición

- **La trompeta en Si♭** suena una segunda mayor **más grave** que lo escrito. Para pasar de escrito a sonando: bajar 2M (Do4 escrito suena Si♭3). En MusicXML se codifica así: `<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>` dentro de `<attributes>`. Otras trompetas: Do (sin transposición), Re, Mi♭, y la piccolo en Si♭ o La.
- **`tonal`** ([repo](https://github.com/tonaljs/tonal)): `Note.transpose("C4", "-2M")` da `"Bb3"`; en sentido inverso, `Note.transpose("Bb3", "2M")` da `"C4"`. Para la tonalidad, `Key` y `transposeFifths` (sumar 2 sostenidos a la armadura al pasar de sonando a escrito). `Note.midi()` y `Note.freq()` para el audio.
- **MusicXML:** el elemento `<transpose>` es parte del estándar ([referencia](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/transpose/)). Los archivos de MuseScore, Finale o Sibelius para instrumentos transpositores traen las notas **escritas** más `<transpose>`, salvo que se exporten en "altura de concierto". Audiveris no lo agrega solo: lee notas como están impresas.
- **OSMD:** tiene `TransposeCalculator` (módulo experimental) y `osmd.Sheet.Transpose = n` seguido de `osmd.updateGraphic()` y `render()`. Sobre cómo trata el `<transpose>` del archivo para la reproducción y el dibujo, **no estoy seguro: hay que probarlo con un archivo real de trompeta** (verificar en la versión instalada y en los issues del repo). Regla de oro: lo que se **dibuja** es lo escrito; lo que se **reproduce con Tone.js** debe ser lo sonando (escrito + `chromatic`). No mezclar ambas capas.
- **Verovio** tiene opción `transpose` nativa ("M2", "-M2" o una tonalidad), algo más madura que la de OSMD, a costa de pasar de MusicXML a MEI/SVG.

### Digitaciones (válvulas)

- **Dataset abierto:** no conozco ninguno limpio y reutilizable en formato máquina. Las imágenes de Wikimedia Commons (buscar "trumpet fingering chart") son útiles como referencia, no como datos. **La tabla se genera con una regla, no se copia.**
- **Regla:** válvula 2 baja medio tono, 1 baja un tono, 3 baja un tono y medio. Combinaciones: 1+2 = 3 semitonos, 2+3 = 4, 1+3 = 5, 1+2+3 = 6. En semitonos: `{ 0:"", 1:"2", 2:"1", 3:"12", 4:"23", 5:"13", 6:"123" }`. Para cada nota escrita, buscar el **parcial abierto inmediatamente superior** y restar los semitonos hasta llegar a ella. Ejemplo: Fa♯3 escrito = parcial Do4 menos 6 semitonos = 1-2-3. Ojo con las notas donde hay alternativas (Do♯5, Sol♯4...) y con los parciales 7 y 11, que son desafinados (ver abajo).
- **Dibujo:** SVG con tres círculos para las válvulas (rellenos si están presionadas). Un componente React de 20 líneas. VexFlow solo pone números como `FretHandFinger` sobre la nota, no tiene diagramas de trompeta.

### Serie armónica y parciales

Para la Si♭ abierta, el fundamental (pedal) es Si♭1 ≈ 58,27 Hz y el parcial *n* es `n × 58,27 Hz`. En escrito, los parciales abiertos son: 2 = Do3, 3 = Sol3, 4 = Do4, 5 = Mi4, 6 = Sol4, 7 = Si♭4 (baja unos 31 cents), 8 = Do5, 9 = Re5, 10 = Mi5, 11 = Fa5/Fa♯5 (cerca de 49 cents de desvío), 12 = Sol5, 16 = Do6. Los desvíos de los parciales 5, 7, 10, 11 y 13 respecto de la afinación temperada se calculan con `1200*log2(n / (2^(k/12)))`; conviene calcularlos por código y no tomar estos números de memoria. Eso da el material para la pantalla "serie armónica" y para un afinador que avise "este Mi5 siempre sale bajo, compensá con la lengua o la bomba 3".

**Rango:** habitual del Fa♯3 al Do6 escrito, ampliable según el nivel. Fijalo como configuración.

---

## 5. Sonidos libres para Tone.js

| Fuente | Contenido | Licencia | Notas |
|---|---|---|---|
| [Salamander Grand Piano](https://sfzinstruments.github.io/pianos/salamander/) (Alexander Holm) | Piano de cola. Los samples listos para Tone.js están en [tonejs.github.io/audio/salamander/](https://tonejs.github.io/audio/salamander/) | CC-BY 3.0 (hay que dar crédito) | Unos 30 archivos. Se usa con `Tone.Sampler` |
| [VSCO-2 CE](https://github.com/sgossner/VSCO-2-CE) y [VCSL](https://github.com/sgossner/VCSL) | Orquesta libre: trompeta y otros metales, cuerdas, maderas, coros (verificar el contenido exacto de cada versión) | **CC0** (dominio público) | Muy grande (cientos de MB a GB). Hay que elegir pocas notas y convertir a MP3 u OGG. Vía [`smplr`](https://github.com/danigb/smplr) se accede a parte de la colección |
| [Sonatina Symphonic Orchestra](https://sso.mattiaswestlund.net/) | Orquesta con trompeta | Creative Commons Sampling Plus 1.0 (verificar; no es CC0 y tiene restricciones de uso comercial sobre los samples sueltos) | Documentación y formatos antiguos, más trabajo que VSCO |
| FluidR3 GM ([sitio](https://member.keymusician.com/Member/FluidR3/index.html)) | Soundfont General MIDI completo. Trompeta (programa 56), coro "Aahs" (52) y "Oohs" (53) | MIT (licencia permisiva; verificar el texto) | Calidad correcta, no realista. Listo vía [`soundfont-player`](https://github.com/danigb/soundfont-player) y [`midi-js-soundfonts`](https://github.com/gleitz/midi-js-soundfonts) |
| [`smplr`](https://github.com/danigb/smplr) | Wrapper de Web Audio (MIT) con piano, soundfonts, Versilian, mellotron, baterías | MIT el código; cada banco, su propia licencia | Sucesor de `soundfont-player`, mismo autor. Funciona sin Tone.js o junto a él |

Consejos:
- Para **cantar**, el mejor "sonido de referencia" no es un coro realista: es una onda simple (`Tone.Synth` triangular) o un piano claro. La referencia tiene que ser fácil de imitar.
- Para la trompeta como guía, FluidR3 sirve de arranque y VSCO-2 CE es la mejora si el tamaño no es un problema. Servirlo desde `public/` o por CDN propio; nada pesado en el repositorio.
- Cada banco CC-BY exige mostrar el crédito en la app.

---

## 6. Otras cosas útiles y libres

- **Metrónomo.** `Tone.Transport` ya programa los eventos contra el reloj de audio con *lookahead* (por defecto 100 ms), que es lo correcto: [A Tale of Two Clocks](https://web.dev/articles/audio-scheduling). `AudioWorklet` no hace falta para el click; sí para el análisis (detector de pitch) sin bloquear la interfaz. Para sincronizar lo visual, usar `Tone.Draw`. Desfase de salida: leer `audioContext.outputLatency` y `baseLatency`; con Bluetooth puede pasar de 200 ms, así que ofrecer calibración.
- **MIDI por Bluetooth.** Web MIDI funciona en Chrome, Edge y Opera de escritorio y Android; Firefox lo tiene con permiso explícito (desde la 108, verificar). **Safari y todos los navegadores de iOS no lo soportan** ([caniuse](https://caniuse.com/midi)). En Mac se empareja primero el dispositivo BLE-MIDI desde "Configuración de Audio MIDI → Configurar dispositivo Bluetooth", y recién entonces Chrome lo ve. Librería cómoda: [WebMidi.js](https://webmidijs.org/) (MIT).
- **PWA / uso sin conexión.** [`vite-plugin-pwa`](https://github.com/vite-pwa/vite-plugin-pwa) (MIT, Workbox) con *precache* de la app, OSMD y los samples elegidos. Requiere HTTPS. Con TanStack Start y SSR puede ser más enredado que con una SPA pura: considerar modo SPA para las apps de práctica. iOS puede borrar el almacenamiento de sitios no usados en Safari tras unos días; la PWA instalada es más estable (verificar). Para guardar grabaciones: IndexedDB.
- **Licencias, resumen práctico.** Todo lo recomendado arriba (pitchy, tonal, VexFlow, OSMD, Tone.js, smplr, Meyda, vite-plugin-pwa) es MIT, BSD o Apache. Los casos a vigilar son Essentia.js (AGPL) y aubio (GPL), y la atribución de Salamander (CC-BY).

## Siguientes pasos sugeridos

1. Prototipo de afinador de voz: `pitchy` + `tonal` + aguja en cents. Una tarde de trabajo.
2. Tarjetas de ritmo con VexFlow y el generador por pesos, con corrección por teclado.
3. Tabla de digitaciones por regla y diagrama SVG. Probar con un MusicXML real de trompeta cómo trata OSMD el `<transpose>`.
4. Dejar la transcripción (Basic Pitch) para el final: es lo más costoso y lo menos fiable.
