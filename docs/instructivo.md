---
type: sop
updated: 2026-10-25
tags: [harmony-helper]
---

# Harmony Helper: Instructivo

Cómo usar tu app de estudio de partituras. Una acción por paso. Los nombres entre comillas son los textos exactos de los botones.

Nota: algunos botones están en inglés (por ejemplo "Play", "Pause", "Stop", "Tempo", "Zoom", "Both Hands", "Right Hand", "Left Hand", "Note colors", "Colors"). Otros están en español. Todo está escrito acá tal cual se ve.

---

## Primera vez: recorrido rápido (5 pasos)

1. Abrí la app (ver sección 1). Ya trae una pieza de ejemplo en Sol mayor.
2. Tocá "Play". Escuchás la pieza y se iluminan las teclas del piano.
3. Tocá "Estudiar" (arriba a la izquierda). Ves la partitura entera.
4. Prendé "Línea melódica". Aparece una línea que une las notas.
5. Tocá "Ficha". Se abre un panel con la tonalidad, la escala y los acordes.

---

## 1. Qué es y cómo abrirla

**Qué es:** una app que vive en tu Mac. Abrís una partitura y la app te muestra sus colores, sus saltos entre notas, su tonalidad y sus acordes. No necesita internet ni cuenta. Lo que configurás se guarda en tu navegador.

**Terminal:** la ventana donde se escriben comandos. Es una ventana de texto.

**Servidor:** un programa que queda corriendo en la Terminal para que la app funcione en el navegador.

Para encenderla:

1. Abrí la Terminal.
2. Escribí `cd ~/code/harmony-helper` y apretá Enter. (Esto te lleva a la carpeta de la app.)
3. Escribí `~/.bun/bin/bun run dev --port 5190` y apretá Enter. (Enciende el servidor.)
4. Esperá a que aparezca `http://localhost:5190`. Usá siempre el puerto 5190: tus colores y ajustes se guardan por dirección, y con otro número la app arranca vacía.
5. Abrí esa dirección en Chrome.
6. Esperá unos segundos: la partitura tarda en dibujarse.

Para apagarla: en la Terminal apretá Ctrl + C.

Si ya está abierta en el navegador, solo recargá (Cmd + R).

Importante: no cierres la ventana de la Terminal mientras usás la app.

---

## 2. Abrir una partitura

**MusicXML:** un tipo de archivo de partitura que entiende la app. Lo exportás desde MuseScore. Termina en `.musicxml` o `.xml`.

1. Tocá "Abrir partitura" (arriba a la derecha).
2. Elegí el archivo `.musicxml` o `.xml`.
3. Esperá a que se dibuje.

También podés arrastrar el archivo y soltarlo en cualquier parte de la página. Aparece el cartel "Soltá la partitura acá (PDF, XML, MIDI)".

**Honestidad sobre lo que NO anda todavía:**
- **PDF:** no funciona. El cartel menciona PDF, pero hoy la app no lee PDF.
- **Peor:** si abrís un PDF o un MIDI, la app espera unos 3 segundos y te pone una escala de Do mayor de ejemplo, como si fuera tu pieza. No es tu pieza. No te avisa.
- **`.mxl`** (MusicXML comprimido): no probado. Por cómo está hecha, es probable que falle. Si falla, exportá de nuevo como `.musicxml`.

Cuando abrís una partitura nueva, se detiene lo que estaba sonando y se reinicia la ficha.

---

## 3. Tocar vs Estudiar

Son dos modos de ver la partitura. Los botones están arriba a la izquierda.

**"Tocar":**
1. La partitura es una sola línea larga que se desliza de costado.
2. Hay una raya vertical fija. Al reproducir, la partitura se mueve y la nota actual pasa por esa raya.
3. El piano queda siempre visible abajo.
4. Cuando está en pausa, podés arrastrar la partitura con el mouse hacia los lados.

**"Estudiar":**
1. Ves la partitura entera, en renglones, como en papel.
2. Para ver más, bajás con la rueda del mouse (se mueve toda la página).
3. El piano está escondido. Para verlo, tocá "Mostrar teclado". Para esconderlo, tocá "Ocultar teclado".

La app recuerda el modo que elegiste la última vez.

---

## 4. Reproducir, tempo, manos

1. "Play": empieza a sonar. Se convierte en "Pause".
2. "Pause": pausa.
3. "Stop": para y vuelve al principio.
4. "Tempo": deslizá la barra. Va de 40 a 180 bpm (**bpm** = golpes por minuto; más alto = más rápido). Si cambiás el tempo mientras suena, se detiene. Tocá "Play" de nuevo.
5. "Both Hands": suenan y se ven las dos manos.
6. "Right Hand": solo la mano derecha.
7. "Left Hand": solo la mano izquierda.
8. "Zoom": barra o botones "−" y "+". Agranda o achica la partitura (de 50% a 250%).

Piano de abajo: las teclas se iluminan con el color de la nota que suena. Si apagaste el color de esa nota, se ilumina con el color de la mano.

Seek (saltar a un compás con el mouse): no existe todavía.

---

## 5. Colores

### 5.1 La fila "Note colors" (apagar colores de a uno)

Sirve para ir sacando los colores de a poco, hasta leer la partitura en negro.

1. Mirá la fila de 12 círculos de colores (Do, Do#, Re ... Si).
2. Tocá un círculo. Queda vacío (borde gris) y esa nota pasa a negro en la partitura.
3. Tocá el círculo de nuevo. Vuelve el color.
4. "None": apaga las 12 de una vez.
5. "All": prende las 12 de una vez.

Cada círculo muestra su letra (C, D, E...) cuando está apagado. Los sostenidos no muestran letra.

### 5.2 El estudio de colores: botón "Colors"

**Rol:** un nombre que tiene un color. Por ejemplo, el rol "C" (la nota Do) tiene su color.

1. Tocá "Colors" (arriba a la derecha). Se abre "Color studio" a la derecha. La partitura queda visible al lado: ves los cambios en vivo.
2. Arriba hay pestañas: "Notes", "Chords", "Intervals", "Patterns", "Functions", "Interface".
3. Cada fila es un rol. Cambiás su color de tres formas:
   - Tocá el cuadradito de color: se abre una paleta de colores con nombre.
   - Escribí el código en la casilla (se llama **hex**, por ejemplo `#E53935`).
   - Usá la rueda de color (el cuadradito al lado del hex).
4. En la paleta, "Save this color" guarda ese color en "My swatches" (tus colores favoritos). Para sacar uno: clic derecho sobre él.
5. Los botones debajo de cada fila ("Stem", "Notehead", "Accidental", "Piano key", "Square", "Circle", "Band") son los **targets**: dónde se pinta ese color. Azul oscuro = prendido.
   - Stem = palito de la nota. Notehead = la cabeza de la nota. Accidental = el # o ♭. Piano key = la tecla. Square = cuadrado. Circle = círculo. Band = franja.
   - No todos los targets están conectados todavía a algo en pantalla. Los que se ven hoy: Stem, Accidental, Piano key y Square (probado en la pestaña "Notes").
6. En las notas, el interruptor de la derecha apaga ese color (igual que los círculos de "Note colors").
7. "New color" (abajo de cada pestaña): crea un rol nuevo.
8. El ojo tachado en un rol nuevo lo oculta. No se borra nunca.
9. Si dos colores se parecen mucho, arriba aparece un aviso: "X and Y look almost the same". Es solo un aviso.

### 5.3 Versiones

**Versión:** una foto de todos tus colores. Se llama "My colors" al principio.

1. Para renombrar la versión actual: escribí en la casilla de arriba y salí de la casilla (clic afuera).
2. "Versions": menú para cambiar de versión ("Switch to"), "Duplicate this one" o "Save as new version…".
3. Las versiones no se borran.

### 5.4 Presets, Export, Import

1. "Presets": hoy hay uno, "Callipari chords". Cambia solo los colores de los acordes.
2. "Export": baja un archivo `.json` con tus colores. Es tu copia de seguridad.
3. "Import": subís un `.json`. Entra como una versión nueva, con "(imported)" en el nombre.

No probado: export, import, presets y guardar versiones. Los vi en el código, pero no los usé para no tocar tu configuración.

### 5.5 Color de la línea

Mirá la sección 6.

---

## 6. Línea melódica y etiquetas

**Línea melódica:** una línea que une cada nota con la siguiente, una por mano.

1. Prendé el interruptor "Línea melódica". Se ve la línea sobre la partitura.
2. Los círculos alrededor de las notas y la línea toman los colores de tus notas.
3. La línea se corta en los silencios y en los saltos de renglón.

### La fila "Capas"

1. Tocá "Capas". Se abre o se cierra una fila extra. Empieza cerrada.
2. Para usar sus opciones, "Línea melódica" tiene que estar prendida. Si no, aparece el aviso "Prendé la línea melódica para usar estas opciones."

Dentro de "Capas":

1. "Color de la línea:" tiene tres opciones.
   - "Notas": la línea toma los colores de las notas (degradé de una nota a la otra).
   - "Intervalos": la línea toma el color del salto entre las dos notas. Los círculos quedan gris oscuro.
   - "Ambos": la línea con el color del salto, y los círculos con el color de cada nota.
2. **Intervalo:** la distancia entre dos notas. Se escribe así: "2ª m" (segunda menor), "2ª M" (segunda mayor), "3ª m", "3ª M", "4ª J" (cuarta justa), "tritono", "5ª J", "6ª m", "6ª M", "7ª m", "7ª M", "8ª" (octava), "unísono" (misma nota).
3. "Etiquetas siempre": apagado, las etiquetas de los saltos aparecen solo cuando pasás el mouse por la línea. Prendido, se ven todas todo el tiempo.
4. "Un salto a la vez" (solo en "Intervalos" o "Ambos"): fila de botones, uno por tipo de salto.
   - Tocá un botón para apagar o prender ese salto. Apagado = línea gris finita, sin etiqueta.
   - "Todos": prende todos. "Ninguno": apaga todos.
   - "Estudiar de a uno": deja un solo salto prendido. Cada vez que lo tocás, pasa al siguiente.
5. En "Intervalos" y "Ambos", abajo a la derecha de la partitura aparece una leyenda con los saltos que hay en la pieza y sus colores.

Los colores de los saltos se cambian en "Colors", pestaña "Intervals".

---

## 7. Hover

**Hover:** poner el mouse encima de algo, sin hacer clic.

1. Poné el mouse sobre una nota. Aparece un cartelito, por ejemplo: "Sol (G) · corchea · compás 1". Dice nombre de la nota (con la letra en inglés entre paréntesis), duración y número de compás.
2. Si suenan varias notas juntas (las dos manos), el cartelito agrega una segunda línea con el nombre del acorde, por ejemplo "Fa# menor · Fa# · La · Do#". Si la app no está segura, muestra solo las notas. No adivina.
3. Con la línea melódica prendida: poné el mouse sobre un tramo de la línea. Aparece la etiqueta del salto (por ejemplo "5ª J").

---

## 8. Ficha de la pieza

1. Tocá "Ficha" (arriba a la derecha). Se abre "Ficha de la pieza" a la derecha.
2. Para cerrarla: la "X" arriba a la derecha del panel, o volvé a tocar "Ficha".
3. Cada sección tiene un título con una flecha. Tocá el título para cerrarla o abrirla.
4. Si no hay partitura: "Abrí una partitura para ver su ficha."

### 8.1 Tonalidad

**Tonalidad:** la "casa" de la pieza. Por ejemplo: "Sol mayor".

1. Arriba ves la tonalidad que detectó la app, en grande.
2. Debajo dice qué tan segura está: "bastante seguro" o "dudoso: ¿o X?" (X = la segunda opción).
3. A veces aparece "Modo que mejor encaja: ..." si la pieza parece estar en un modo.
4. Ves también el compás, por ejemplo "Compás 3/4".
5. **Para corregir la tonalidad:** tocá el menú de abajo ("Detectada: ...") y elegí otra de la lista.
6. Al elegir otra, dice "elegida por vos". Se actualizan la escala, el círculo y los acordes.
7. Para volver a la detectada: abrí el menú y elegí "Detectada: ...".
8. La corrección se guarda para esa partitura.

### 8.2 Escala

**Escala:** las 7 notas de la tonalidad, en orden.

1. Ves 7 cuadrados con el color de cada nota. Debajo, el número de grado (1 a 7).
2. Entre cuadrados: "1" = salto de un tono. "½" = salto de medio tono.
3. Tocá un cuadrado: suena esa nota.
4. "Escuchar": suena la escala subiendo y bajando. Mientras suena, el botón dice "Parar". Tocalo para detenerla.

### 8.3 Círculo

Muestra un acorde a la vez sobre las 12 notas, en círculo.

1. Arriba a la izquierda: "Escala" y "Pieza".
   - "Escala": recorre los 7 acordes de la escala.
   - "Pieza": recorre los acordes de tu pieza, en orden. Muestra "compás N". Si no hay acordes de la pieza, está apagado.
2. "◀ Anterior" y "Siguiente ▶": pasan al acorde anterior o siguiente. Se apagan en los extremos.
3. En el círculo: la tónica (la "casa") está abajo. Las notas de la escala son más oscuras; las que no son de la escala, más claras.
4. Las notas del acorde son puntos con el color de la nota, unidos por una figura.
5. Si el acorde no es de la escala, la figura tiene borde punteado y aparece un aviso.
6. Debajo del círculo ves el nombre del acorde y su función: "TÓNICA", "Subdominante" o "Dominante".
7. **El arco:** debajo hay un arco con "Subdominante" a la izquierda, "CASA" (la tónica) abajo en el medio, y "Dominante" a la derecha. Una bolita marca dónde está el acorde actual.
8. Los colores del arco vienen de "Colors", pestaña "Functions". Si no los pintaste, el arco se ve gris.
9. **Las flechas** (solo en acordes Dominante): muestran hacia dónde se mueve cada nota para llegar a "casa". La flecha más gruesa es la que más empuja.
10. "Escuchar": suena el acorde.
11. "Escuchar la resolución" (solo en acordes Dominante): suena el acorde y después el acorde de la tónica.
12. Si cambiás la tonalidad (8.1), el círculo gira para poner la nueva tónica abajo.
13. Si tocás un acorde en las secciones de abajo, el círculo lo muestra.

### 8.4 Acordes de la escala

**Acorde:** varias notas sonando juntas. Los de la escala se arman apilando notas de la escala de a saltos.

1. Ves 7 círculos, uno por grado. Cada uno muestra el nombre (por ejemplo "Sol mayor"), el número romano (I, ii, iii, IV, V, vi, vii°) y las tres notas.
2. Tocá un círculo: suena el acorde, se marca y se muestra en el "Círculo". Tocá el mismo de nuevo para sacar la marca.
3. La bolita negra "×N" en el borde dice cuántas veces aparece ese acorde en tu pieza.
4. "Con séptima": prendido, los acordes suman una cuarta nota (la séptima).
5. Los cartelitos de abajo de cada círculo:
   - "Tón" = tónica = la casa, estable.
   - "Subd" = subdominante = un paso afuera de casa.
   - "Dom" = dominante = tensión que pide volver a casa.
6. El color del borde del círculo depende del tipo de acorde (mayor, menor, disminuido). Se cambia en "Colors", pestaña "Chords".

### 8.5 Acordes de la pieza

1. Lista, en orden, de los acordes que la app encontró en tu pieza. Ejemplo: "comp. 2·2  Re7 /Fa#  V7". Eso significa compás 2, tiempo 2, acorde Re7, con Fa# en el bajo, quinto grado.
2. Tocá un acorde de la lista: suena, la partitura se desplaza hasta ahí y lo marca. También se muestra en el "Círculo" (en modo "Pieza").
3. Si un acorde no es de la escala, tiene borde punteado y dice "fuera de la escala".
4. Si dice "No encontré acordes completos (hay pocas notas juntas).", la pieza no tiene suficientes notas juntas. Pasa con melodías de una sola voz.

### 8.6 Acordes sobre la partitura

1. En "Acordes de la pieza", prendé el interruptor "Acordes sobre la partitura".
2. Aparecen circulitos con el nombre del acorde, arriba de cada renglón de la partitura, cada vez que cambia el acorde.
3. Apagá el interruptor para esconderlos.

La app adivina los acordes por las notas que suenan. Si se equivoca, la pieza puede estar usando notas de paso. Es una guía, no una verdad.

---

## 9. Teclado MIDI

**Teclado MIDI:** tu piano o teclado electrónico, conectado a la compu con un cable.

**Hoy no funciona.** Revisé el código: no hay nada que escuche tu teclado.

Lo que sí existe:
1. El piano de la pantalla se ilumina cuando suena la pieza.
2. En la Ficha, podés tocar cuadrados y círculos para escuchar notas y acordes.

Lo que no existe todavía:
1. Que la app te escuche tocar en tu teclado.
2. Esperar a que toques la nota correcta antes de avanzar.
3. Repetir un tramo (loop).
4. Velocidades fijas de 50 / 75 / 100% (solo está la barra "Tempo").

Si conectás el teclado y no pasa nada: es normal.

---

## 10. Problemas comunes

1. **La pantalla está en blanco, o no se ve la partitura:**
   1. Esperá 5 segundos. Tarda en dibujar.
   2. Recargá con Cmd + R.
2. **Dice "No se puede acceder al sitio" o no abre:** el servidor está apagado. Repetí los pasos de la sección 1.
3. **Cambié algo y no se actualiza:** recargá con Cmd + R.
4. **Abrí un PDF y apareció otra pieza:** es el ejemplo falso (sección 2). Exportá la partitura como `.musicxml` desde MuseScore.
5. **No suena:** apretá "Play" una vez más. El navegador pide un clic antes de dejar sonar. Subí el volumen de la Mac. (No probado: no pude escuchar audio.)
6. **La tonalidad está mal:** corregila en "Ficha", sección "Tonalidad" (8.1).
7. **No veo las etiquetas de los saltos:** pasá el mouse por la línea, o prendé "Etiquetas siempre" dentro de "Capas".
8. **No veo la fila "Capas":** tocá "Capas". Empieza cerrada. Y "Línea melódica" tiene que estar prendida.
9. **La barra de arriba tapa la partitura:** en ventanas angostas ocupa mucho lugar. Hacé la ventana del navegador más ancha, o cerrá "Capas".
10. **La Ficha tapa la partitura:** el panel se abre sobre la derecha. Hacé la ventana más ancha, o cerrá la Ficha con la "X".
11. **Perdí mis colores:** están guardados en este navegador. Si abrís la app en otro navegador o con otra dirección (otro número de puerto), no aparecen. Por eso conviene usar "Export" de vez en cuando.
12. **El piano no aparece:** en "Estudiar" está escondido. Tocá "Mostrar teclado".

---

## 11. Lo que todavía no existe

1. **Círculo de quintas:** no existe. El "Círculo" de la Ficha es otra cosa: muestra un acorde sobre las 12 notas.
2. **Laboratorio de acordes:** es una idea guardada. No está hecho.
3. **Análisis que se despliega al hacer clic:** idea guardada. No está hecho.
4. **Leer PDF:** no existe (sección 2).
5. **Teclado MIDI:** no existe (sección 9).
6. **Buscador de patrones** (motivos que se repiten): estaba en el plan inicial. No lo encontré en la pantalla. Solo existen los colores "Patterns" en el estudio, sin uso visible.
7. **Biblioteca de partituras guardadas:** estaba en el plan inicial. No existe. Cada vez que abrís la app, vuelve a aparecer la pieza de ejemplo.
8. **Saltar a un compás durante la reproducción:** no existe. En "Tocar", la partitura solo se mueve sola.
