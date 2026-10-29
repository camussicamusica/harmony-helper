---
type: reference
updated: 2026-10-29
tags: [harmony-helper, investigacion]
---

# Herramientas de estudio musical existentes: qué ideas podemos tomar

Meta de Sofia: "leer una partitura como un idioma". Se toman **ideas**, no código ni imágenes.

**Aviso de confianza.** La búsqueda web devolvió poco para algunos productos. Lo marcado **(verificado)** salió de una fuente que cito. Lo marcado **(conocimiento general)** es lo que sé del producto y no pude confirmar hoy: conviene mirarlo antes de decidir. Los precios son solo para comparar y cambian por país y fecha.

## 1. Relevamiento

### Soundslice
- **Qué hace:** partitura sincronizada con audio o video; reduce la velocidad sin cambiar el tono; repite pasajes arrastrando sobre las notas (el lazo se ajusta a nota, silencio o barra); "entrenamiento de velocidad" que sube el tempo en cada vuelta; modo foco que oculta todo menos los compases elegidos; silenciar o aislar partes (verificado: [features](https://www.soundslice.com/features/), [speed training](https://soundslice.com/blog/215/introducing-speed-training), [practice piano](https://soundslice.com/practice-piano)).
- **A tomar:**
  1. Lazo arrastrando sobre la partitura, con ajuste a la barra.
  2. Entrenamiento de velocidad: cada vuelta un poco más rápido.
  3. Modo foco: solo se ve el trozo que estudiás.
- **Encaje:** hoy hay tempo y navegador de acordes. El lazo por selección y el modo foco se enganchan en `useOccurrenceCursor` y en la vista tira. Es la base de la sala "Leer" (trozos sin parar).
- **Precio:** plan gratis limitado y suscripción paga (valor no verificado; ver [licensing](https://soundslice.com/licensing)).

### Hooktheory (Hookpad y TheoryTab)
- **Qué hace:** colorea notas y acordes según su función en la tonalidad. TheoryTab muestra melodías como grados 1 a 7 y acordes como números romanos, con piano integrado, sincronizado con YouTube. Opción para resaltar qué grados forman cada acorde (verificado: [FAQ](https://www.hooktheory.com/faq), [Musical U](https://musical-u.com/learn/learn-music-theory-the-fun-way-with-hooktheory)).
- **A tomar:**
  1. Ver la melodía como grados, no como nombres.
  2. En cada acorde, distinguir notas estables de disonantes.
  3. Complejidad de armonía y melodía como "ficha" de la pieza.
- **Encaje:** ya tenés el grado en el hover. Falta un modo "melodía en grados" y la ficha de pieza con una medida de complejidad.
- **Precio:** TheoryTab gratis; Hookpad con plan gratis y pago (una nota de terceros dice unos USD 4,99/mes, no confirmado).

### musictheory.net y Tenuto
- **Qué hace:** lecciones cortas e interactivas y ejercicios muy configurables (identificar notas, armaduras, intervalos, escalas, acordes), más calculadoras. Se enfoca en tus puntos débiles. Sin internet (verificado: [Tenuto](https://MusicTheory.net/products/tenuto), [features](https://MusicTheory.net/products/tenuto/features)).
- **A tomar:** (1) ejercicios chiquitos de reconocimiento con la partitura de la pieza como material; (2) repetir lo que fallás; (3) calculadoras de armadura e intervalo.
- **Encaje:** la tarjeta de armadura ya existe; sumar "preguntame" sobre la pieza abierta (sala Repaso).
- **Precio:** sitio gratis; Tenuto cerca de USD 4,99 (verificado).

### Mapping Tonal Harmony (lo más cercano a "Tonal Harmony apps")
- **Qué hace:** mapa interactivo de acordes y escalas. Pegás una progresión y devuelve acordes, escala de cada acorde, números romanos, flechas y corchetes, todo sincronizado. Cambia el mapa a números romanos y reproduce (verificado: [notreble](https://www.notreble.com/?p=27563)). También hay apps gratuitas de práctica de números romanos, como Harmonic Analysis - Theory (verificado en la misma búsqueda).
- **A tomar:** (1) flechas y corchetes sobre la progresión (V-I, ii-V-I); (2) la escala que corresponde a cada acorde; (3) práctica de números romanos sobre un pentagrama.
- **Encaje:** los corchetes ii-V-I son la capa natural de la caja de patrones. La escala por acorde alimenta la sala "Hablar".
- **Precio:** pago por plataforma.

### EarMaster
- **Qué hace:** entrenamiento auditivo, solfeo cantado con micrófono con devolución de afinación y ritmo, curso de 219 lecciones y talleres de jazz (verificado: [tienda](https://earmaster.com/shop/product/earmaster-pro-7.html)).
- **A tomar:** (1) cantar antes de tocar, con feedback; (2) curso en pasos con progreso; (3) ejercicios personalizables.
- **Encaje:** la entrada MIDI ya está; el micrófono sería otra entrada. El camino guiado por pieza copia la idea de curso.
- **Precio:** licencia única cerca de USD 60 (verificado).

### Functional Ear Trainer
- **Qué hace:** método de Alain Benbassat: oís cada nota dentro de una tonalidad establecida, siempre contra una nota de referencia, y la dificultad sube de a poco (verificado en parte: [App Store](https://apps.apple.com/app/id1088761926)). No pude confirmar bordón ni colores.
- **A tomar:** (1) primero se establece la tonalidad con una cadencia, y después se oye el grado; (2) bordón de fondo; (3) progresión de dificultad.
- **Encaje:** coincide con "Oído: grados contra un bordón" de tu flujo. Tone.js ya lo permite.
- **Precio:** gratis con compras dentro de la app (verificado).

### Chordify
- **Qué hace:** (conocimiento general) detecta acordes desde audio o YouTube y los muestra como una tira que sigue la música; permite simplificar y transponer. Precio: unos USD 4 a 8/mes (verificado en una reseña, no estable: [guitarchalk](https://www.guitarchalk.com/chordify-review/)).
- **A tomar:** tira de acordes que avanza con el tiempo; "simplificar" acordes; transponer.
- **Encaje:** tu capa de nombres de acordes ya está en la partitura. Una tira de acordes sincronizada al cursor sirve para ver el esqueleto de la pieza.

### MuseScore (funciones de aprendizaje)
- **Qué hace:** colorea notas (manual o con el plugin "Color Notes", por altura), muestra nombres de nota; hay límites, como no poder colorear una sola cabeza dentro de un acorde (verificado: [foros](https://musescore.org/en/node/338926)). Otras funciones (reproducción, piano virtual): conocimiento general.
- **A tomar:** nada nuevo en color; tu sistema ya es más rico. Lo útil es el aviso de las limitaciones: colorear por cabeza de nota, no por acorde.
- **Precio:** gratis y de código abierto.

### Flowkey y Simply Piano
- **Qué hacen:** Flowkey: canciones con modo "espera por vos" y control de velocidad, poco currículo (verificado: [hackernoon](https://hackernoon.com/best-piano-learning-apps-in-2026-an-in-depth-comparison-of-music-education-technology)). Simply Piano: escucha por micrófono, pensada para celular, juego guiado.
- **A tomar:** (1) "esperá hasta que toque la nota correcta" con MIDI; (2) mano izquierda y derecha por separado; (3) bucles de dificultad creciente.
- **Encaje:** el MIDI ya existe, así que el modo "esperar" es directo. Ya tenés un estudio previo en `docs/flowkey-study.md`.
- **Precio:** Flowkey unos USD 120/año; Simply Piano USD 96 a 150/año (verificado, varía).

### Synthesia y lectores de piano roll
- **Qué hace:** bloques que caen hacia el teclado, con partitura o sin ella; modo de práctica que espera la nota correcta; sugerencias de dedos (verificado: [App Store](https://apps.apple.com/us/app/synthesia/id579518445)).
- **A tomar:** (1) teclado dibujado con las notas que caen sobre las teclas; (2) esperar la nota; (3) dedos sugeridos.
- **Encaje:** es la base de las "cintas de notas" planificadas, pero con tus colores y sobre la partitura, no en lugar de ella.
- **Precio:** pago único, con algunas canciones gratis (verificado).

### Music Animation Machine (Malinowski)
- **Qué hace:** barras de color en vez de partitura, con la altura en el eje vertical. El color puede significar instrumento, tema, tonalidad o clase de nota. En el análisis de La consagración de la primavera usa un color por clase de nota ordenado según el círculo de quintas, y la forma indica la familia de instrumentos (verificado: [futilitycloset](https://futilitycloset.com/2017/03/04/music-animation-machine), [Ludwig-Van](https://www.ludwig-van.com/toronto/2013/04/08/video-translating-the-movement-and-patterns-of-music-into-something-meaningful-and-visual/)).
- **A tomar:** (1) ordenar los colores según las quintas; (2) distinguir con forma o borde lo que el color no cubre (voz, instrumento); (3) resaltar con brillo lo que suena ahora.
- **Encaje:** es tu plan de cintas. Cuidado: su elección de color tiene una lógica (quintas) y la tuya es sinestésica, así que se mantiene la tuya.
- **Precio:** videos gratis; software de pago o donación (conocimiento general).

### Chrome Music Lab
- **Qué hace:** (conocimiento general) experimentos web muy simples: Song Maker (cuadrícula de colores), Harmonics, Arpeggios. Todo se escucha al instante.
- **A tomar:** que cada idea se pueda probar en un clic; cuadrícula de colores como lenguaje de entrada.
- **Encaje:** un modo "probar" en la ficha de acorde. **Precio:** gratis.

### iReal Pro
- **Qué hace:** cuadros de acordes como un "real book" con acompañamiento automático, 51 estilos, transposición a cualquier tonalidad, listas (verificado: [App Store](https://apps.apple.com/gb/app/ireal-pro/id298206806)).
- **A tomar:** (1) vista compacta de la pieza en forma de cuadros de acordes; (2) tocar el acompañamiento mientras vos hacés la melodía; (3) transponer.
- **Encaje:** una "vista esqueleto" nueva junto a página y tira. Pasar a la sala "Hablar" con acompañamiento de fondo.
- **Precio:** USD 19,99 más compras opcionales (verificado).

### Uberchord, Yousician, Sight Reading Factory, Piano Marvel, Noteflight Learn
- **Uberchord:** (conocimiento general) app de guitarra que escucha tu instrumento y marca el acorde que tocás. Poco para piano. Idea: reconocer lo que tocás y mostrar qué acorde es.
- **Yousician:** juego con puntos y rachas; feedback básico (verificado: [hackernoon](https://hackernoon.com/best-piano-learning-apps-in-2026-an-in-depth-comparison-of-music-education-technology)). Idea: racha diaria; ojo, la gamificación no es tu estilo.
- **Sight Reading Factory:** genera ejercicios nuevos según tonalidad, compás y seis niveles de dificultad, con reproducción a cualquier tempo y asignaciones (verificado: [App Store](https://apps.apple.com/us/app/sight-reading-factory/id1046058520)). Idea: generar frases de lectura en la tonalidad de tu pieza.
- **Piano Marvel:** el más fuerte en lectura a primera vista y exámenes; el micrófono es beta, MIDI es más confiable (verificado). Idea: evaluar el MIDI contra la partitura, con puntaje por compás.
- **Noteflight Learn:** (conocimiento general; no pude verificarlo) editor en línea con tareas para aulas. Idea: tareas guiadas que combinan partitura y preguntas.
- **Precio:** todos de suscripción, entre unos USD 100 y 180/año.

### Notación con color y sinestesia
- **Boomwhackers:** (conocimiento general) tubos con color por nota, usados en aulas. Idea: un color fijo por nota, como el tuyo.
- **Figurenotes:** color para la altura y forma para la duración, con pegatinas sobre el teclado. Un estudio de 2024 con diez sistemas de notación encontró que Figurenotes tiene buena discriminación e iconicidad (verificado: [Cheng et al. 2024](https://eprints.whiterose.ac.uk/220861/1/cheng-et-al-2024-exploring-the-comprehensibility-of-ten-different-musical-notation-systems-and-underlying-factors.pdf)). Se usó con niños con dificultades de aprendizaje en Finlandia y Escocia, con un puente hacia la notación tradicional (verificado: [Drake Music Scotland](https://drakemusicscotland.org/figurenotes), [TES](https://www.tes.com/news/music-notation-troubles-staved)). Idea: **el puente**: colores que se pueden ir apagando de a poco hasta leer la partitura sola.
- **Estudio de color en piano infantil:** estudio cualitativo pequeño; el color ayudó a reconocer notas (verificado: [UIN Khas](https://genius.uinkhas.ac.id/index.php/gns/article/view/165)). Evidencia débil.
- **Klavarskribo y Chromatic Notation:** no encontré fuentes hoy. No afirmo nada.
- **Precio:** casi todo gratis o casi gratis.

### Dorico y Sibelius
- No pude verificar funciones de estudio. En general son editores profesionales; su valor es la calidad de la notación, no el aprendizaje. Idea de bajo valor para ahora. (conocimiento general)

### Proyectos de código abierto
- **When in Rome** (Mark Gotham): cerca de 450 análisis con unos 100.000 números romanos, hecho con music21 (verificado: [búsqueda](https://hdl.handle.net/1721.1/137847.2)). Sirve para **probar** tu analizador contra análisis hechos por humanos.
- **music21 `harmonicFunction`:** módulo de función armónica ([docs](https://music21.org/music21docs/moduleReference/moduleAnalysisHarmonicFunction.html)). Es otra vara para comparar.
- **Cintas de tensión (Herremans y Chew):** visualiza tensión tonal como cintas, en la biblioteca partitura de Python ([Eerola](https://tuomaseerola.github.io/emr/Chapter9.1.html)). Idea para las cintas planificadas: **un color de tensión** (cerca o lejos de la tónica).
- **TIV.lib:** descripción tonal de audio, cambio armónico ([arXiv](https://arxiv.org/pdf/2008.11529)). Poco útil para partituras.
- Licencias y mantenimiento sin verificar. Se toma la idea, no el código.

## 2. Las 10 ideas para tomar, ordenadas por valor para "leer una partitura como un idioma"

| # | Idea (de dónde) | Por qué ayuda a leer como idioma | Esfuerzo |
|---|---|---|---|
| 1 | **Esperar la nota correcta** por MIDI (Flowkey, Synthesia) | Leer es reconocer y tocar; esto cierra el ciclo "ver, oír, tocar" | Pequeño |
| 2 | **Lazo por selección + modo foco** en la partitura (Soundslice) | Leer en trozos, sin parar | Mediano |
| 3 | **Entrenamiento de velocidad** que sube de a poco (Soundslice) | Pasar de lento a fluido sin saltos | Pequeño |
| 4 | **Colores que se apagan de a poco** (puente de Figurenotes) | Que el color enseñe y luego se retire, para leer sola | Mediano |
| 5 | **Cintas de notas con tus colores, sobre la partitura** (Malinowski, Synthesia) | Ver ritmo y forma de un vistazo | Grande |
| 6 | **Oráculo en el círculo de quintas**, con flechas V-I y corchetes ii-V-I (Mapping Tonal Harmony) | Ver la gramática: de dónde viene cada acorde | Mediano |
| 7 | **Melodía como grados** y notas estables vs. disonantes en cada acorde (Hooktheory) | Leer función, no nombre | Pequeño |
| 8 | **Bordón + grado contra tonalidad** (Functional Ear Trainer) | Oído antes de ojo; entrenamiento del oído interno | Mediano |
| 9 | **Preguntas sobre la pieza abierta** y repaso de lo que fallás (Tenuto, Piano Marvel) | Repaso espaciado sobre material real | Mediano |
| 10 | **Vista esqueleto de acordes tipo cuadros** con acompañamiento (iReal Pro, Chordify) | Ver la pieza en una hoja y improvisar encima | Mediano |

Para después: cantar con micrófono (EarMaster), frases de lectura generadas (Sight Reading Factory), color de tensión (Herremans y Chew), probar el analizador contra When in Rome.

## 3. Qué hace único a Harmony Helper (para proteger)

Ninguna de las herramientas revisadas junta estas cosas:

1. **Tu paleta sinestésica sobre la partitura real.** Hooktheory colorea por función; Malinowski por instrumento o quintas; Figurenotes por altura en un sistema propio. Nadie pone tu mapa de colores personal sobre un PDF o MusicXML cualquiera.
2. **Una pieza cualquiera como material.** Las apps de curso (Flowkey, Simply Piano, Yousician) y los generadores (Sight Reading Factory) usan su repertorio. Aquí es la pieza que vos elegís.
3. **La carta por objeto** (nota, acorde, tonalidad, pieza), con el mismo formato. No vi nada igual: lo más cercano son los paneles de información, no cartas.
4. **Análisis con Tón/Subd/Dom, navegador de acordes y cajas de patrones sobre la partitura.** Mapping Tonal Harmony analiza texto pegado, no tu partitura; Chordify analiza audio.
5. **Cuatro salas de idioma (Entender, Leer, Hablar, Escribir)** con la regla de que todo termina en el teclado. Las demás apps cubren una sala cada una.
6. **Es tuya y privada**: sin gamificación, sin suscripción, el gusto lo decidís vos.

**A proteger al sumar ideas:**
- Que el color nunca lo decida otra lógica (no pasar a quintas ni a instrumento por defecto).
- Que la gamificación (rachas, puntos) no entre sin que lo pidas.
- Que cada idea nueva se enganche en lo que ya existe: la partitura, el navegador y la carta.
- Que lo prestado se anote como idea y fuente, no como copia.

## 4. Huecos de esta investigación
- No verifiqué precios actuales de Soundslice, Hookpad, Chordify ni Yousician.
- No hallé fuentes sobre Klavarskribo, Chromatic Notation, Uberchord, Chrome Music Lab, Noteflight Learn, Dorico ni Sibelius.
- Las licencias de los proyectos de código abierto no están revisadas.
