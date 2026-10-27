---
type: sop
updated: 2026-10-25
tags: [harmony-helper]
---

# Harmony Helper: Instructivo

Cómo usar tu app de estudio de partituras. Una acción por paso. Los nombres entre comillas son los textos exactos de los botones.

Nota: toda la app está en español (Argentina). Todo está escrito acá tal cual se ve. (Antes algunos botones estaban en inglés; ya se tradujeron.)

---

## Primera vez: recorrido rápido (5 pasos)

1. Abrí la app (ver sección 1). Ya trae una pieza de ejemplo en Sol mayor.
2. Tocá "Reproducir". Escuchás la pieza y se iluminan las teclas del piano.
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

**MusicXML:** un tipo de archivo de partitura que entiende la app. Lo exportás desde MuseScore. Termina en `.musicxml`, `.xml` o `.mxl` (la versión comprimida).

1. Tocá "Abrir partitura" (arriba a la derecha).
2. Elegí el archivo `.musicxml`, `.xml` o `.mxl`.
3. Esperá a que se dibuje.

También podés arrastrar el archivo y soltarlo en cualquier parte de la página. Aparece el cartel "Soltá la partitura acá (.musicxml, .xml o .mxl)".

**Qué pasa con PDF y MIDI (ya no te engaña):**
1. **PDF:** la app no lo abre. Aparece un aviso con una "X" para cerrarlo: "Todavía no puedo leer PDF. Por ahora, abrí la partitura en MuseScore (gratis) y exportala como MusicXML (.musicxml o .mxl). Leer PDF viene más adelante." No se carga nada y tu partitura actual queda como estaba.
2. **MIDI (`.mid`, `.midi`):** igual, con otro aviso: todavía no se puede abrir un archivo MIDI como partitura.
3. **Otro tipo de archivo, o un `.xml` que no es una partitura:** también avisa y no carga nada.
4. Antes, un PDF o un MIDI esperaba 3 segundos y ponía una escala de Do mayor falsa. Eso ya no pasa. (El código de ese relleno falso sigue guardado en `omrService.ts`, pero nada lo llama.)

**`.mxl` (MusicXML comprimido):** funciona. Un `.mxl` es un zip; la app lo abre por dentro y saca la partitura. Probado con un `.mxl` armado a mano (con `META-INF/container.xml`): cargó bien.

Cuando abrís una partitura nueva, se detiene lo que estaba sonando y se reinicia la ficha.

---

## Pasar un PDF a MusicXML (con Audiveris)

**MusicXML (`.mxl`):** el archivo de música que la app entiende. Un PDF es solo una foto de las notas. Audiveris "lee" esa foto y la convierte en notas. Está instalado en tu carpeta personal de Aplicaciones (`~/Applications/Audiveris.app`).

1. Abrí la Terminal.
2. Escribí `~/code/harmony-helper/scripts/pdf-a-musicxml.sh` y dejá un espacio al final. No apretes Enter todavía.
3. Arrastrá el PDF desde el Finder a la ventana de la Terminal. Se escribe solo el nombre del archivo.
4. Apretá Enter.
5. Esperá: tarda entre 1 y 3 minutos por página. Al final dice **"✓ Listo"** y cuántos compases leyó.
6. El `.mxl` queda en la misma carpeta que el PDF, con el mismo nombre. Si ya había uno, no lo pisa: crea `nombre-2.mxl`.
7. En la app, apretá **"Abrir partitura"** y elegí ese `.mxl`.
8. Revisá las notas: el lector siempre se equivoca en algo.

**Más fácil: con clic derecho en el Finder**
1. En el Finder, hacé clic derecho (o Control + clic) sobre el PDF.
2. Elegí **Acciones rápidas → "Pasar a MusicXML"**. Si no aparece ahí, buscalo en **Servicios**, al final del menú.
3. Arriba a la derecha aparece un aviso: "Leyendo…".
4. Esperá. Cuando termina aparece otro aviso: **"Listo"**. El `.mxl` queda al lado del PDF.
5. Podés elegir varios PDFs a la vez y hacer clic derecho sobre la selección.

Si un día la opción desaparece: abrí la Terminal, escribí `~/code/harmony-helper/scripts/install-finder-action.sh` y apretá Enter.

Qué esperar:
- **PDFs hechos en un programa** (como los de Fito o la Gymnopédie): salen bastante bien.
- **Escaneos borrosos, fotos o partituras a mano:** salen con más errores.
- **Tablaturas de guitarra:** el pentagrama de tablatura aparece vacío. Las notas del pentagrama normal sí se leen.
- Podés pasar varios PDFs de una vez: arrastrá varios en el paso 3.

## 3. Tocar vs Estudiar

Son dos modos de ver la partitura. Los botones están arriba a la izquierda.

**"Tocar":**
1. La partitura es una sola línea larga que se desliza de costado.
2. Hay una raya vertical fija. Al reproducir, la partitura se mueve y la nota actual pasa por esa raya.
3. El piano se ve abajo, centrado. Podés esconderlo (ver 3.1).
4. Cuando está en pausa, podés arrastrar la partitura con el mouse hacia los lados.

**"Estudiar":**
1. Ves la partitura entera, en renglones, como en papel.
2. Para ver más, bajás con la rueda del mouse (se mueve toda la página).
3. El piano se ve abajo, centrado, pegado al borde de la pantalla mientras bajás. Podés esconderlo (ver 3.1).

La app recuerda el modo que elegiste la última vez.

### 3.1 Más lugar para la partitura: esconder el menú y el piano

**Menú de arriba:**
1. Arriba a la derecha, tocá "Ocultar menú" (tiene una flecha hacia arriba). También podés apretar la tecla "m".
2. El menú se achica a una sola línea fina. Quedan: el nombre "Harmony Helper", "Tocar" / "Estudiar", "Reproducir" / "Pausa", "Detener" y el tempo con "−", "♩ = número" y "+".
3. La partitura crece y usa el lugar libre.
4. Para volver, tocá "Mostrar menú" (flecha hacia abajo) o apretá "m" otra vez.
5. Para usar "Zoom", "Línea melódica", "Capas", "Recorrido", "Ficha" o "Colores", primero tocá "Mostrar menú".

**Piano:**
1. Arriba del teclado hay una barra finita que dice "Piano" con una flecha. Tocala. También podés apretar la tecla "p".
2. El teclado se esconde y queda solo la barra "Piano". La partitura crece.
3. Para volver, tocá la barra "Piano" otra vez, o apretá "p".
4. Ya no existe el botón "Mostrar teclado" / "Ocultar teclado": esta barra lo reemplaza, en "Tocar" y en "Estudiar".

**Piano centrado:** en una ventana ancha las teclas se agrandan (hasta un tope) y el teclado queda en el medio. En una ventana angosta el teclado se desliza de costado y arranca centrado en el Do del medio.

**Atajos:** "m" y "p" no funcionan si estás escribiendo en un cuadro de texto. "−" y "+" siguen cambiando el tempo.

La app recuerda si dejaste el menú y el piano escondidos o visibles.

### 3.2 La última partitura se recuerda

1. Abrí una partitura con "Abrir partitura".
2. Si recargás la página, la app vuelve a abrir esa misma partitura.
3. Si el archivo es muy grande (más de 2 millones de letras), no se guarda y al recargar vuelve la partitura de ejemplo.

---

## 4. Reproducir, tempo, manos

1. "Reproducir": empieza a sonar. Se convierte en "Pausa".
2. "Pausa": pausa.
3. "Detener": para y vuelve al principio.
4. "Dos manos": suenan y se ven las dos manos.
5. "Mano derecha": solo la mano derecha.
6. "Mano izquierda": solo la mano izquierda.
7. "Zoom": barra o botones "−" y "+". Agranda o achica la partitura (de 50% a 250%).

### Tempo (la velocidad)

**bpm** = golpes por minuto; más alto = más rápido. En la barra de arriba, al lado de "Detener", está el grupo "Tempo de la partitura". Va de 20 a 220 bpm.

**Bajar la velocidad**

1. Tocá el botón "−" (aria-label "Bajar tempo"). Baja 5 bpm.
2. Si querés bajar de a 1 bpm, mantené apretada la tecla Shift y tocá "−".
3. Para subir, tocá el botón "+" ("Subir tempo"). Sube 5 bpm. Con Shift, sube 1.
4. Atajo de teclado: la tecla "−" baja 5 y la tecla "+" (o "=") sube 5. No funcionan si estás escribiendo en un cuadro de texto.

**Escribir un número**

1. Tocá el valor "♩ = 72" (el ♩ es la negra; 72 es cuántas negras por minuto).
2. Escribí el número que quieras, por ejemplo 60.
3. Apretá Enter. Con Escape cancelás.

**Usar la barra**

1. Arrastrá la barra "Tempo de la partitura". Cuando la soltás (o a los 150 milisegundos de dejar de moverla), el tempo se aplica.

**Los botones 50%, 75% y 100%**

1. Tocá "50%" para tocar a la mitad del tempo de la partitura.
2. Tocá "75%" para tocar a tres cuartos.
3. Tocá "100%" para volver al tempo de la partitura.
4. El botón activo se ve oscuro. Si el tempo no coincide con ninguno, no hay ninguno activo.

**De dónde sale el tempo de la partitura**

1. Si la partitura trae un tempo escrito (por ejemplo ♩ = 66), la app empieza ahí.
2. Si no trae ninguno, la app empieza en 72 y aparece "(sin tempo escrito)". El 100% es 72.
3. La app recuerda el tempo que dejaste en cada partitura. Cuando la volvés a abrir, está el tuyo.

**Cambiar el tempo mientras suena**

1. Con la pieza sonando, tocá "−", "+", un porcentaje o escribí un número.
2. No hace falta apretar "Detener". La música sigue desde el mismo punto de la pieza, más lenta o más rápida.
3. Si estás repitiendo un compás (Recorrido, paso 6), la repetición sigue con el tempo nuevo.
4. Si estaba en "Pausa", al tocar "Reproducir" sigue desde donde pausaste, con el tempo nuevo.

Piano de abajo: las teclas se iluminan con el color de la nota que suena. Si apagaste el color de esa nota, se ilumina con el color de la mano.

Seek (saltar a un compás con el mouse): no existe todavía.

---

## 5. Colores

### 5.1 La fila "Colores de las notas" (apagar colores de a uno)

Sirve para ir sacando los colores de a poco, hasta leer la partitura en negro.

1. Mirá la fila de 12 círculos de colores (Do, Do#, Re ... Si).
2. Tocá un círculo. Queda vacío (borde gris) y esa nota pasa a negro en la partitura.
3. Tocá el círculo de nuevo. Vuelve el color.
4. "Ninguna": apaga las 12 de una vez.
5. "Todas": prende las 12 de una vez.

Cada círculo muestra su letra (C, D, E...) cuando está apagado. Los sostenidos no muestran letra.

### 5.2 El estudio de colores: botón "Colores"

**Rol:** un nombre que tiene un color. Por ejemplo, el rol "C" (la nota Do) tiene su color.

1. Tocá "Colores" (arriba a la derecha). Se abre "Estudio de colores" a la derecha. La partitura queda visible al lado: ves los cambios en vivo.
2. Arriba hay pestañas: "Notas", "Acordes", "Intervalos", "Patrones", "Funciones", "Interfaz".
3. Cada fila es un rol (con nombre en español: "Do (C)", "Mayor", "2ª menor", "Tónica"…). Cambiás su color de tres formas:
   - Tocá el cuadradito de color: se abre una paleta de colores con nombre.
   - Escribí el código en la casilla (se llama **hex**, por ejemplo `#E53935`).
   - Usá la rueda de color (el cuadradito al lado del hex).
4. En la paleta, "Guardar este color" guarda ese color en "Mis colores guardados" (tus colores favoritos). Para sacar uno: clic derecho sobre él.
5. Los botones debajo de cada fila ("Plica", "Cabeza de nota", "Alteración", "Tecla del piano", "Cuadrado", "Círculo", "Franja") son los **targets**: dónde se pinta ese color. Azul oscuro = prendido.
   - Plica = palito de la nota. Cabeza de nota = el círculo de la nota. Alteración = el # o ♭. Tecla del piano = la tecla. Cuadrado, Círculo y Franja = formas.
   - No todos los targets están conectados todavía a algo en pantalla. Los que se ven hoy: Plica, Alteración, Tecla del piano y Cuadrado (probado en la pestaña "Notas").
6. En las notas, el interruptor de la derecha apaga ese color (igual que los círculos de "Colores de las notas").
7. "Color nuevo" (abajo de cada pestaña): crea un rol nuevo.
8. El ojo tachado en un rol nuevo lo oculta. No se borra nunca.
9. Si dos colores se parecen mucho, arriba aparece un aviso: "X y Y se ven casi iguales". Es solo un aviso.

### 5.3 Versiones

**Versión:** una foto de todos tus colores. Se llama "Mis colores" al principio. (Si ya tenías una versión guardada con el nombre en inglés, "My colors", conserva ese nombre: no se renombra sola.)

1. Para renombrar la versión actual: escribí en la casilla de arriba y salí de la casilla (clic afuera).
2. "Versiones": menú para cambiar de versión ("Cambiar a"), "Duplicar esta" o "Guardar como versión nueva…".
3. Las versiones no se borran.

### 5.4 Paletas, Exportar, Importar

1. "Paletas": hoy hay una, "Acordes Callipari". Cambia solo los colores de los acordes.
2. "Exportar": baja un archivo `.json` con tus colores. Es tu copia de seguridad.
3. "Importar": subís un `.json`. Entra como una versión nueva, con "(importada)" en el nombre.

No probado: exportar, importar, paletas y guardar versiones. Los vi en el código, pero no los usé para no tocar tu configuración.

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

Los colores de los saltos se cambian en "Colores", pestaña "Intervalos".

### Cajas de patrones

**Patrón:** un compás (o 2 a 4 compases seguidos) que se repite igual. La caja lo pinta de fondo; todas las repeticiones del mismo patrón llevan el mismo color y la misma letra.

1. Tocá "Capas" para abrir la fila.
2. Prendé el interruptor "Cajas de patrones". Empieza apagado.
3. Aparece una caja de color detrás de cada compás repetido, con una letra ("A", "B", "C") arriba a la izquierda.
4. Si no hay compases repetidos, aparece el aviso "Esta partitura no tiene compases que se repitan." (La pieza de ejemplo no tiene repeticiones.)
5. Pasá el mouse por una caja: se resaltan todas las repeticiones de ese patrón y las demás se apagan un poco.
6. Hacé clic en una caja: la partitura va a la siguiente repetición de ese patrón.
7. Los colores se eligen al azar la primera vez que ves una partitura y se guardan: al recargar, esa partitura tiene los mismos colores. Otra partitura saca otros.
8. Con "Marcar compás difícil" prendido (Recorrido, paso 5), el clic marca el compás; no salta.

Para cambiar algo, tocá "Ajustes de las cajas":
1. "Alcance": "Ambas manos" (por defecto), "Mano derecha" o "Mano izquierda". La caja cubre solo los pentagramas elegidos.
2. "Incluir parecidos (transportados)": apagado por defecto. Prendido, un compás con el mismo ritmo y los mismos saltos pero en otra altura lleva borde de rayitas y la letra con comilla (por ejemplo "B′"), con el color de su patrón.
3. "Intensidad": qué tan fuerte es el color de fondo. Empieza en 25%.
4. "Otra combinación": saca colores nuevos al azar para esta partitura.
5. "Me gusta esta": guarda estos colores. Dice "Guardada." o "Ya la tenías guardada."
6. "Usar una combinación guardada": tocá "Usar" al lado de la que quieras. Se aplica a esta partitura.
7. "Quitar": pide confirmación ("¿Quitar esta combinación guardada?"); tocá "Quitar" para confirmar o "Cancelar". Es lo único que borra una combinación guardada.
8. Las combinaciones que guardaste en el prototipo (`mezcla-de-colores.html`) aparecen solas, una sola vez.

Partitura de prueba: `public/prototipos/patrones-ejemplo.musicxml`. En la barra, tocá "Abrir partitura" y elegila (en tu Mac, dentro de la carpeta del proyecto: `public/prototipos`). Tiene 8 compases: 1, 3 y 5 iguales; 2 y 6 iguales; el 7 es el 2 subido una quinta.

### Degradé de notas

1. En la fila "Capas", prendé "Degradé de notas". Empieza apagado.
2. Detrás de cada pentagrama aparece una franja suave. Sus colores están justo debajo de cada nota y se mezclan de una nota a la siguiente. Arriba van las notas de la mano derecha; abajo, las de la izquierda.
3. Un acorde da un solo color: el promedio de sus notas.
4. La franja se corta en los saltos de renglón y en los silencios largos (un compás entero), y se desvanece en los bordes.
5. Una nota con el color apagado en "Colores" no pone color en la franja.
6. "Intensidad": empieza en 35%. Si un color es muy oscuro, la app baja sola la intensidad y avisa "Se muestra al X% para que las notas negras se lean bien."
7. Se puede usar junto con las cajas de patrones, la línea melódica y los acordes. Cada capa se apaga sola con su interruptor.

---

## 7. Hover

**Hover:** poner el mouse encima de algo, sin hacer clic.

1. Poné el mouse sobre una nota, o cerca de ella: cada nota tiene una zona invisible a su alrededor (un poco más ancha que la cabeza, y como dos espacios del pentagrama hacia arriba y hacia abajo).
2. Si el mouse está dentro de esa zona, la nota se enciende: su cabeza toma su color y todo el dibujo de la nota se rodea de un borde blanco.
3. Al lado de la nota aparece una etiqueta con el nombre de la nota (por ejemplo "Sol (G)"), pintada con el color de esa nota. Solo eso: no se abre ninguna cajita grande.
4. En un acorde, la nota que se enciende es la que está más cerca del mouse en altura. Si el mouse está lejos de todas las notas, no pasa nada.
5. **Para ver el detalle:** llevá el mouse desde la nota hasta su etiqueta.
6. Del costado de la etiqueta se despliega un panel, como un menú que se desliza. Se abre hacia la derecha; si no hay lugar, hacia la izquierda. Queda pegado a la etiqueta y siempre entra en la pantalla.
7. Mientras el mouse esté sobre la etiqueta o sobre el panel, no se cierra y la nota no cambia, aunque el mouse ya esté fuera de la zona de la nota.
8. Para cerrarlo: sacá el mouse de la etiqueta y del panel. Se cierra solo después de un cuarto de segundo, y vuelve el hover normal.
9. **Para dejarlo fijo:** hacé clic en la etiqueta. El panel queda abierto aunque muevas el mouse.
10. Para soltarlo: apretá Esc, o hacé clic en cualquier otro lugar.
11. Si tu computadora está configurada para reducir el movimiento, el panel aparece sin animación.

El panel tiene estas secciones, cada una con su título en letras chicas:

11b. **La foto (arriba de todo, sin título), pegada a la etiqueta de color:** una "foto" de la partitura alrededor de tu nota, agrandada: todo el pentagrama de la nota, las notas apiladas con ella y lo que cuelga arriba o abajo. Solo la cabeza de tu nota está pintada con su color; el resto queda como está impreso.
12. **NOTA:** la nota en grande con su color, la octava (por ejemplo "Re4"), la duración (por ejemplo "negra con puntillo") y "compás N · tiempo M".
12b. **SU FIGURA:** las otras notas de la misma figura: las del mismo pentagrama que empiezan en el mismo instante (el acorde o intervalo escrito junto a tu nota). Cajitas con la tuya marcada, y el nombre del acorde o el intervalo. Si está sola dice "Nota sola (sin otras notas en su figura)". No incluye el bajo que viene sosteniéndose ni la otra mano.
13. **EN LA TONALIDAD:** el grado de la nota en la tonalidad de la pieza, con su nombre. Por ejemplo: "4.º grado de Re mayor · subdominante". Los nombres son: tónica, supertónica, mediante, subdominante, dominante, superdominante y sensible (en menor, el 7.º grado natural se llama subtónica).
14. Si la nota no es de la escala, dice "fuera de la escala de Re mayor" y, si se puede, qué cambió: "alteración: Do# en vez de Do". En menor, el 7.º elevado se marca como "sensible (7.º grado elevado)".
15. La tonalidad es la de la Ficha. Si la elegiste a mano en la Ficha, usa esa. Con la Ficha cerrada, la app la detecta sola.
16. **Más ▸:** por defecto ves la foto, NOTA, SU FIGURA y EN LA TONALIDAD. Tocá "Más" para abrir ARMONÍA, SUENAN AHORA y MELODÍA (queda recordado). Si el panel no entra en la pantalla, la foto no se mueve: baja solo la parte de abajo.
16b. **ARMONÍA:** el acorde que suena en ese momento (el de "Acordes de la pieza" de la Ficha; si no hay, el que forman las notas que suenan juntas), con una cajita de color por cada nota del acorde y la tuya marcada con borde grueso. Es la armonía, no lo que está impreso junto a tu nota.
17. Debajo dice qué es tu nota dentro del acorde: fundamental, tercera, quinta, séptima, novena, o "nota de paso / no es del acorde".
18. Después, el grado y la función del acorde en la tonalidad, por ejemplo "IV · Subd" (Tón = tónica, Subd = subdominante, Dom = dominante). Si el acorde no es de la tonalidad, dice "acorde fuera de la tonalidad".
19. Si no hay un acorde claro, dice "Sin un acorde claro en este momento". La app no adivina.
20. **SUENAN AHORA (las dos manos):** aparece plegado, solo si es distinto de "Su figura"; tocá el título para abrirlo. Es un compás chiquito, con barras a los costados y el número de compás arriba a la izquierda. Adentro, una cajita por cada nota que suena en ese instante: las que empiezan justo ahí en las dos manos y las que vienen de antes y siguen sonando (el bajo largo, por ejemplo), que se marcan como "sostenidas". Abajo, el nombre del acorde o, si son dos notas, el intervalo.
21. **MELODÍA:** la nota anterior y la siguiente de la misma mano, con el salto y su dirección. Por ejemplo: "viene de La (A): sube una 4.ª justa" y "va a Si (B): sube una 2.ª mayor". Si no hay nota anterior o siguiente, esa línea no aparece.
22. En "Tocar", la etiqueta y el panel siguen pegados a la nota mientras la partitura se mueve sola.

23. Con la línea melódica prendida: poné el mouse sobre un tramo de la línea. Aparece la etiqueta del salto (por ejemplo "5ª J").
24. La cabeza de la nota (la parte redonda) se enciende con su color de "Colores de las notas", aunque ese color esté apagado. Solo se enciende esa nota, no el resto del acorde ni la plica.

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
8. Los colores del arco vienen de "Colores", pestaña "Funciones". Si no los pintaste, el arco se ve gris.
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
6. El color del borde del círculo depende del tipo de acorde (mayor, menor, disminuido). Se cambia en "Colores", pestaña "Acordes".

### 8.5 Acordes de la pieza

**Acorde:** varias notas que suenan juntas. La app los encuentra sola en tu pieza.

1. Abrí la "Ficha" (botón arriba a la derecha).
2. Bajá hasta la sección "Acordes de la pieza".
3. Vas a ver una lista con cada acorde distinto y cuántas veces aparece. Ejemplo: "Sol mayor ×5".
4. Al lado del nombre aparece el grado. Ejemplo: "I", "V7".
5. Abajo de cada acorde hay una cajita por cada nota, con TU color de esa nota. Ejemplo: "Sol (G)", "Si (B)", "Re (D)".
6. Si apagaste el color de una nota en "Colores", su cajita sale blanca, sin color.
7. Si un acorde no es de la escala, tiene borde punteado y dice "fuera de la escala".
8. Si dice "No encontré acordes completos (hay pocas notas juntas).", la pieza no tiene suficientes notas juntas. Pasa con melodías de una sola voz.

### 8.6 Recorrer un acorde por la partitura

1. En "Acordes de la pieza", tocá el botón de un acorde. Ejemplo: "Sol mayor ×5".
2. El acorde suena.
3. La partitura se desplaza hasta la 1ª aparición de ese acorde.
4. Sobre la partitura aparece una caja suave, del color del acorde, alrededor de ese lugar.
5. Al lado del botón aparece una cajita con la posición. Ejemplo: "compás 1, tiempo 1 · 1 de 5".
6. Esa cajita dice: compás 1, tiempo 1 del compás, es la aparición 1 de 5.
7. Tocá el mismo botón otra vez: va a la 2ª aparición. Ejemplo: "compás 2, tiempo 1 · 2 de 5".
8. Tocalo otra vez: 3ª aparición. Y así.
9. Después de la última, vuelve a la 1ª.
10. Para ir para atrás, tocá "◀". Para ir para adelante, tocá "▶".
11. Si tocás el botón de otro acorde, empieza desde su 1ª aparición.
12. En "Tocar" la partitura se mueve hacia el costado. En "Estudiar" se mueve hacia abajo o arriba.
13. En "Estudiar", con la Ficha abierta, la partitura se acomoda en el espacio que queda a la izquierda de la Ficha, así nada queda tapado.
14. Al ir a una aparición, el sistema entero (los dos pentagramas, con las notas de arriba y de abajo) queda a la vista, centrado entre la barra de arriba y el piano.
15. El número de compás es el impreso en la partitura. Si la pieza tiene repetición o casillas ("1." y "2."), cada lugar impreso cuenta una sola vez.
16. Si un acorde se reconoce un tiempo después de empezar (por ejemplo, una nota de paso de la melodía lo tapa en el tiempo 2), la caja cubre desde que empieza a sonar. Si el acorde cambia de nombre solo por una nota de la melodía (Si m7 y después Si menor), la caja incluye las notas que siguen sonando.
17. La caja queda hasta que toques otro acorde o abras otra partitura.
18. Cada cajita de nota debajo del acorde se puede tocar: suena esa nota sola, en la misma octava en que suena el acorde. Pasá el mouse por encima: se levanta un poco. No cambia la aparición del acorde.

**Tiempo:** el golpe del compás. En 4/4 hay 4 tiempos: 1, 2, 3, 4.

### 8.7 Cajitas de notas al pasar el mouse

1. En la partitura, pasá el mouse sobre una nota que suena junto con otras.
2. Aparece un globito con la nota, su duración, el compás y, si son 3 o más notas, el nombre del acorde.
3. Debajo hay una cajita por cada nota del acorde, con tu color. Ejemplo: "Re (D)", "Fa# (F#)", "La (A)", "Do (C)".
4. Si apagaste el color de esa nota en "Colores", la cajita sale blanca.
5. Las mismas cajitas aparecen en "Acordes de la escala" y en "Acordes de la pieza" de la Ficha.

La app adivina los acordes por las notas que suenan. Si se equivoca, la pieza puede estar usando notas de paso. Es una guía, no una verdad.

---

## 9. Teclado MIDI

**Teclado MIDI:** tu piano o teclado electrónico, conectado a la compu con un cable USB.

**Lo que hace hoy:** la app te escucha tocar. Las teclas que apretás se iluminan en el piano de la pantalla y la app te dice qué nota tocaste y, si tocás 3 o más juntas, qué acorde es.

**Lo que hace además:** en el "Recorrido de la pieza" (paso 3) la app escucha si tocás la escala y el acorde de tónica de tu pieza.

**Lo que no hace todavía:** esperar a que toques la nota correcta antes de avanzar, repetir un tramo cualquiera (solo repite un compás marcado, en el paso 6 del Recorrido), velocidades fijas de 50 / 75 / 100% (solo está la barra "Tempo"). Eso viene después.

Usá **Chrome**. Otros navegadores no tienen MIDI.

### 9.1 Conectar el teclado (la primera vez)

1. Enchufá el teclado a la Mac con el cable USB y prendelo.
2. Abrí la app en Chrome (sección 1).
3. Buscá el botón "Conectar teclado MIDI" (en la segunda fila de arriba, a la derecha de "Colores de las notas").
4. Tocá "Conectar teclado MIDI". Dice "Conectando…" un segundo.
5. Si Chrome te pregunta si permitís usar tus dispositivos MIDI, tocá "Permitir".
6. El botón pasa a "Teclado: " con el nombre de tu teclado, y aparece un puntito verde.

### 9.2 Ver lo que tocás

1. Si el piano está escondido, tocá la barra "Piano" (abajo, arriba del teclado) para mostrarlo.
2. Apretá una tecla de tu teclado.
3. En el piano de la pantalla esa tecla se llena con el color de la nota (el de tu estudio de colores) y tiene un borde oscuro con un punto blanco. Es distinto de cuando suena la pieza: ahí solo se llena, sin borde.
4. Si apagaste el color de esa nota, la tecla se pone gris.
5. Al lado del botón aparece lo último que tocaste, por ejemplo "Re (D) · octava 4".
6. Las teclas negras tienen dos nombres posibles (Do# o Re♭). La app muestra los dos: "Do# (C#) / Re♭ (D♭) · octava 4".
7. Apretá 3 notas juntas (por ejemplo Fa#, La y Do#). Aparece el nombre del acorde: "Fa# menor". Si las notas no forman un acorde conocido, no dice nada (no adivina).
8. Si usás el pedal de sustain, aparece la palabra "pedal" y las teclas quedan iluminadas mientras el pedal está apretado, aunque sueltes los dedos. Al soltar el pedal se apagan.

### 9.3 Sonido de la app

1. Tocá el botón con el nombre de tu teclado. Se abre un cuadrito con la lista de teclados conectados.
2. El interruptor "Sonido de la app al tocar" está **apagado** de entrada. Tu teclado probablemente ya suena solo.
3. Si lo prendés, la app suena además del teclado, con su piano de muestras. Si escuchás todo doble, apagalo.

### 9.4 Avisos del botón

1. "No encuentro ningún teclado. Enchufalo y apretá de nuevo.": la app no ve ningún teclado. Revisá el cable, prendé el teclado y tocá el aviso.
2. "Chrome bloqueó el permiso. Hacé clic en el candado de la barra de direcciones → MIDI → Permitir.": hacé eso y recargá con Cmd + R.
3. "Este navegador no tiene MIDI. Usá Chrome.": abrí la app en Chrome.
4. "Reconectar teclado MIDI": ya lo conectaste antes en este navegador. Tocalo para volver a conectar. Si Chrome ya recuerda el permiso, se conecta solo al abrir la app.
5. Si desenchufás el teclado, el botón vuelve a "No encuentro ningún teclado…". Al enchufarlo de nuevo se reconecta solo.

**No probado con un teclado real.** Lo probé con un simulador (notas, acordes, pedal, sonido, avisos), no con tu teclado. Si algo no responde, contame qué teclado es y qué pasa.

---

## Recorrido de la pieza

**Recorrido:** un camino de 11 pasos para una pieza nueva, de a uno. Cada paso abre la herramienta justa. No hace falta hacerlo todo el mismo día. Saltear un paso o un día no rompe nada.

El panel se abre a la **izquierda** y no tapa la partitura: la empuja hacia la derecha. Se puede tener abierto a la vez que la Ficha.

### Abrirlo

1. Tocá "Recorrido" (arriba a la derecha, al lado de "Ficha").
2. Se abre el panel "Recorrido de la pieza".
3. Para cerrarlo, tocá la "X" del panel o tocá "Recorrido" otra vez.

### Dos formas de verlo

1. Arriba del panel hay dos botones: "De a uno" y "Ver todo".
2. **"De a uno"** (es la que viene prendida): muestra un solo paso, con su título, la sala (Entender / Leer / Hablar / Escribir / Oído / Repaso), el tiempo sugerido y 4 instrucciones numeradas.
3. Abajo del paso hay tres botones: "Anterior", "Listo" y "Siguiente". "Listo" marca el paso como hecho y pasa al próximo. Si el paso ya está hecho, el botón dice "Hecho"; tocalo para sacar la marca.
4. Arriba del paso hay 11 puntitos. Tocá uno para saltar a ese paso. Verde = hecho. El que tiene aro negro es el actual.
5. **"Ver todo"**: una lista chica con todos los pasos, agrupados por día (Día 1, Día 2 … y "Siempre"). Cada fila tiene un cuadradito para tildar "hecho". Tocá el nombre de un paso para abrirlo en "De a uno".

### Qué se guarda

1. La app guarda, para cada partitura, los pasos hechos, el paso actual y los compases difíciles que marcaste.
2. Se guarda en este navegador. Si abrís otra partitura, ves su propio recorrido.
3. Para borrar solo el recorrido de esta pieza: tocá "Empezar de nuevo" (abajo del panel) y confirmá con "Empezar de nuevo". Las otras piezas no se tocan.

### Los pasos que abren una herramienta

1. **Paso 1, "Mirar la Ficha, sin tocar":** tocá "Abrir la Ficha". Se abre la Ficha con "Tonalidad", "Escala" y "Acordes de la escala" abiertas.
2. **Paso 2, "Solo el ritmo":** tocá "Ir a Tocar al 60%". Pasa a "Tocar" y baja el tempo al 60% del que tenías. Aparece "Tempo: 54 bpm (antes 90)" y un botón "Volver a 90 bpm".
3. **Paso 3, "Escala y acorde de tónica":** tocá "Abrir la escala". Se abre la Ficha en "Escala". Más abajo, en el panel, está el chequeo con el teclado (ver abajo).
4. **Paso 5, "Leer toda la pieza en trozos":** tocá "Ir a Estudiar". Después usá "Marcar compás difícil" (ver abajo).
5. **Paso 6, "Solo los puntos difíciles":** el panel lista tus compases marcados (ver abajo).
6. **Paso 7, "Los acordes de la pieza":** tocá "Abrir el Círculo". Se abre la Ficha en "Círculo", con "Pieza" elegida.

### Marcar un compás difícil (paso 5)

1. En el paso 5, tocá "Marcar compás difícil". El botón pasa a decir "Listo de marcar".
2. Tocá un compás de la partitura. Se le dibuja un recuadro ámbar con "comp. 2" (o el número que sea).
3. Tocá el mismo compás otra vez para sacar la marca. También podés tocar la "X" de su etiqueta en la lista del panel.
4. Tocá "Listo de marcar" cuando termines.
5. Con 2 o 3 compases alcanza.

Los compases marcados se ven en "Tocar" y en "Estudiar". Un compás que solo tiene silencios no se puede marcar.

### Practicar los compases marcados (paso 6)

1. En el paso 6 ves "Tus compases difíciles".
2. Tocá el nombre de uno ("compás 4"). La partitura se mueve hasta ese compás y se lo ve resaltado.
3. Tocá "Repetir". Ese compás suena una y otra vez. El botón pasa a decir "Parar".
4. Tocá "Parar" (o "Detener" arriba) para cortar.
5. Si no marcaste ninguno, el panel te lo dice y tiene un botón "Ir al paso 5".

### Chequeo con el teclado (paso 3)

Es el primer ejercicio donde la app te escucha. Hay dos tareas, una abajo de la otra.

1. Conectá el teclado MIDI (sección 9). Si no está conectado, el panel tiene el botón "Conectar teclado MIDI".
2. **Primera tarea:** "Tocá la escala de Sol mayor subiendo, una octava." (dice la tonalidad de tu pieza).
3. Tocá las notas de la escala, una por una, de abajo para arriba. Sirve cualquier octava y cualquier mano.
4. Cada nota correcta ilumina su cuadradito, con tu color de nota. Hay 7 grados más el 8, la tónica de arriba.
5. Si tocás una nota que no va, sale un aviso amable, por ejemplo "Esa es Fa (F); la escala usa Fa# (F#)." No se borra lo que ya tocaste: seguí desde donde estabas.
6. Termina cuando tocás del 1 al 7 y la tónica de arriba, en orden. Aparece "Salió la escala."
7. **Segunda tarea:** "Tocá el acorde de tónica (Sol mayor) todo junto."
8. Apretá las tres notas a la vez. Sirve cualquier orden de las notas y cualquier octava.
9. Si falta o sobra una nota, el panel lo dice ("Falta: Re (D)"). Termina cuando las notas que suenan son justo las del acorde: "Salió el acorde."
10. "Otra vez" repite la tarea.
11. **Sin teclado:** tocá "Lo hice ✓" debajo de cada tarea.

### Pasos que todavía no tienen herramienta

Los pasos 4 (oído interno), 8 (improvisar), 9 (sacar un motivo), 10 (componer) y 11 (tarjetas) muestran sus 4 instrucciones para hacer a mano y esta línea: "Esta herramienta todavía no existe en la app; por ahora hacelo así."

---

## 10. Problemas comunes

1. **La pantalla está en blanco, o no se ve la partitura:**
   1. Esperá 5 segundos. Tarda en dibujar.
   2. Recargá con Cmd + R.
2. **Dice "No se puede acceder al sitio" o no abre:** el servidor está apagado. Repetí los pasos de la sección 1.
3. **Cambié algo y no se actualiza:** recargá con Cmd + R.
4. **Abrí un PDF o un MIDI y no pasó nada, salvo un aviso:** es lo correcto (sección 2). Exportá la partitura como `.musicxml` o `.mxl` desde MuseScore.
5. **No suena:** apretá "Reproducir" una vez más. El navegador pide un clic antes de dejar sonar. Subí el volumen de la Mac. (No probado: no pude escuchar audio.)
6. **La tonalidad está mal:** corregila en "Ficha", sección "Tonalidad" (8.1).
7. **No veo las etiquetas de los saltos:** pasá el mouse por la línea, o prendé "Etiquetas siempre" dentro de "Capas".
8. **No veo la fila "Capas":** tocá "Capas". Empieza cerrada. Y "Línea melódica" tiene que estar prendida.
9. **La barra de arriba tapa la partitura:** en ventanas angostas ocupa mucho lugar. Hacé la ventana del navegador más ancha, o cerrá "Capas".
10. **La Ficha tapa la partitura:** el panel se abre sobre la derecha. Hacé la ventana más ancha, o cerrá la Ficha con la "X". El "Recorrido" se abre a la izquierda y corre la partitura, pero con los dos abiertos queda poco lugar.
11. **Perdí mis colores:** están guardados en este navegador. Si abrís la app en otro navegador o con otra dirección (otro número de puerto), no aparecen. Por eso conviene usar "Exportar" de vez en cuando.
12. **El piano no aparece:** en "Estudiar" está escondido. Tocá "Mostrar teclado".

---

## 11. Lo que todavía no existe

1. **Círculo de quintas:** no existe. El "Círculo" de la Ficha es otra cosa: muestra un acorde sobre las 12 notas.
2. **Laboratorio de acordes:** es una idea guardada. No está hecho.
3. **Análisis que se despliega al hacer clic:** idea guardada. No está hecho.
4. **Leer PDF:** no existe (sección 2). La app te lo dice.
5. **Esperar tu nota (modo "esperar"), repetir un tramo cualquiera y velocidades 50/75/100%:** no existen (sección 9). El teclado MIDI ya se conecta y se ve. Lo único que se repite es un compás marcado como difícil (paso 6 del Recorrido).
6. **Buscador de patrones:** ahora existe como "Cajas de patrones" (sección 6). Solo compara compases enteros; no busca motivos más cortos que un compás.
7. **Biblioteca de partituras guardadas:** estaba en el plan inicial. No existe. Cada vez que abrís la app, vuelve a aparecer la pieza de ejemplo.
8. **Saltar a un compás durante la reproducción:** no existe. En "Tocar", la partitura solo se mueve sola.
9. **Herramientas del Recorrido que faltan** (el Recorrido ya existe; estos pasos todavía se hacen a mano):
   - Paso 4: **oído interno** (cantar el primer compás por dentro).
   - Paso 7: **flash de acordes** y **tonos guía**. Hoy el paso solo abre el Círculo.
   - Paso 8: **improvisar con 3 reglas**.
   - Paso 9: **eco y esquemas** (sacar un motivo y cambiarlo).
   - Paso 10: **componer 4 compases**.
   - Paso 11: **tarjetas** que se tocan, repetidas a días espaciados.
10. **Ubicar la pieza en el círculo de quintas** (parte del paso 3): no existe, ver el punto 1.
