---
type: sop
updated: 2026-10-25
tags: [harmony-helper, pruebas, tests]
---

# Pruebas automáticas: cómo chequeamos que esto realmente funciona

## Qué son

Una prueba es una **pregunta guardada con la respuesta que ya sabemos**. Por ejemplo: "¿Fa#-La-Do# se llama Fa# menor?" La respuesta correcta es "sí". La computadora le hace la pregunta al programa, mira lo que contesta y compara. Si coincide, la prueba **pasa** (pass). Si no coincide, **falla** (fail).

Hoy hay 212 preguntas guardadas. Se corren solas en un segundo. Sirven para que, cuando agregamos algo nuevo, no se rompa en silencio algo que ya andaba.

Las pruebas viven en la carpeta `tests/` del proyecto. Cubren la lógica musical (tonalidades, acordes, nombres, círculo, teclado MIDI, ejercicios del Recorrido, archivos .mxl, colores, cajas de patrones y degradé y tempo). No cubren cómo se ve la pantalla.

## Cómo correrlas

1. Abrí la Terminal.
2. Escribí `cd ~/code/harmony-helper` y apretá Enter. Esto te lleva a la carpeta del proyecto.
3. Escribí `~/.bun/bin/bun run check` y apretá Enter.
4. Esperá unos segundos. `check` hace dos cosas seguidas: primero revisa que el código esté bien escrito (tsc) y después corre las 212 preguntas.
5. Mirá las últimas líneas del resultado (ver la sección siguiente).

Si querés correr solo las preguntas, sin la revisión de escritura, usá `~/.bun/bin/bun test` en el paso 3.

## Qué significa lo que aparece

1. **Todo bien.** Las últimas líneas dicen algo así:
   - `212 pass`
   - `0 fail`

   Quiere decir que las 212 respuestas coinciden. Podés seguir tranquila.
2. **Algo falló.** Aparece `(fail)` con el nombre de la pregunta, la respuesta esperada (`Expected`) y la que dio el programa (`Received`). Quiere decir que algo que antes andaba dejó de andar. No lo arregles a mano: copiá ese texto y pegáselo a Claude.
3. **Error de escritura (tsc).** Si antes de las pruebas aparece una lista de errores con nombres de archivo y números de línea, es la revisión de escritura. Las pruebas ni empiezan hasta que eso se arregle.
4. **`skip` o `todo`.** Una pregunta anotada como pendiente: sabemos de un problema, está explicado en un comentario dentro de la prueba y todavía no se arregló. Hoy no hay ninguna.

## El seguro automático antes de guardar

Cada vez que se hace un `commit` (guardar una versión en git), un guardia corre `check` antes. Si algo falla, el commit **no se hace** y aparece el mensaje "Alguna prueba falló". Es el seguro para no guardar algo roto.

Se instala una sola vez por copia del proyecto:

1. Abrí la Terminal.
2. Escribí `cd ~/code/harmony-helper` y apretá Enter.
3. Escribí `sh scripts/install-hooks.sh` y apretá Enter.
4. Tiene que decir "Listo: hook instalado". (Ya está instalado en esta copia.)

## Qué cosas protegen las pruebas

| Pregunta | Respuesta |
|---|---|
| ¿Un Do mayor completo en la tonalidad de Do se reconoce como Do mayor? | Sí |
| ¿La menor se detecta como La menor y no como su relativa Do mayor? | Sí |
| ¿La♭ mayor tiene armadura de −4 (cuatro bemoles)? | Sí |
| ¿Mi mayor tiene armadura de +4 (cuatro sostenidos)? | Sí |
| ¿La partitura de ejemplo (el Minueto de Bach) se detecta en Sol mayor, con 1 sostenido? | Sí |
| ¿Las 24 tonalidades tienen la armadura correcta (Fa# mayor +6, Sol♭ mayor −6, Do menor −3, etc.)? | Sí |
| ¿Si la música no deja claro la tonalidad, el programa dice "dudoso" en vez de afirmar? | Sí |
| ¿La♭ mayor se escribe La♭ Si♭ Do Re♭ Mi♭ Fa Sol, sin ningún Sol#? | Sí |
| ¿Los acordes de Sol mayor son Sol, La menor, Si menor, Do, Re, Mi menor, Fa# disminuido (I ii iii IV V vi vii°)? | Sí |
| ¿Los acordes de La menor son La menor, Si disminuido, Do, Re menor, Mi menor, Fa, Sol (i ii° III iv v VI VII)? | Sí |
| ¿Los acordes con séptima tienen el nombre y el número romano correctos (Re7 es V7, Fa# m7♭5 es viiø7)? | Sí |
| ¿En mayor las funciones son Tón Subd Tón Subd Dom Tón Dom? | Sí |
| ¿En menor las funciones son Tón Dom Tón Subd Dom Subd Dom? | Sí |
| ¿En menor, el acorde v (quinto grado) es Dominante, como decidiste el 2026-10-24? | Sí |
| ¿Las etiquetas cortas son "Tón", "Subd" y "Dom", nunca una sola letra que se confunda con la nota Re (D)? | Sí |
| ¿Un acorde sostenido durante un compás se detecta como un solo acorde? | Sí |
| ¿Si el mismo acorde se repite pulso tras pulso, se junta en uno solo que dura todo el tiempo? | Sí |
| ¿Cuando cambia el acorde, aparece uno nuevo (Sol mayor y después Do mayor, I y IV)? | Sí |
| ¿Un acorde que no es de la tonalidad (Mi♭ mayor en Sol mayor) queda marcado como "fuera de la escala"? | Sí |
| ¿Un acorde invertido se nombra por su fundamental y avisa cuál es el bajo? | Sí |
| ¿Con solo dos notas, o con un racimo de notas pegadas, el programa se abstiene de inventar un acorde? | Sí |
| ¿El círculo gira para que la tónica quede siempre abajo? | Sí |
| ¿El círculo escribe bemoles en Fa mayor y sostenidos en Sol mayor? | Sí |
| ¿En Re7 dentro de Sol, el Fa# sube a Sol (la sensible) y el Do baja a Si (la séptima)? | Sí |
| ¿Para la nota La del Re7 (a igual distancia de Sol y de Si) el programa NO dibuja flecha? | Sí |
| ¿Se detecta el tritono de Re7 (Fa# y Do) y no aparece ninguno en un acorde mayor? | Sí |
| ¿Re se muestra como "Re (D)", Do# como "Do# (C#)" y Re♭ como "Re♭ (D♭)"? | Sí |
| ¿Los intervalos se nombran bien, de 2ª m a 8ª, incluido el tritono? | Sí |
| ¿Un intervalo de décima se cuenta como una tercera? | Sí |
| ¿Fa#-La-Do# se llama Fa# menor? | Sí |
| ¿Do-Mi-Sol se llama Do mayor, y Mi-Sol-Do se llama Do mayor con bajo en Mi? | Sí |
| ¿Sol-Si-Re-Fa se llama Sol séptima (dominante)? | Sí |
| ¿Una tecla negra suelta muestra sus dos nombres (Do# / Re♭)? | Sí |
| ¿La tecla 62 se muestra como "Re (D) · octava 4"? | Sí |
| ¿Si♭-Re-Fa se lee Si♭ mayor, y Do#-Mi-Sol# se lee Do# menor? | Sí |
| ¿Al apretar una tecla del teclado MIDI, queda registrada como apretada? | Sí |
| ¿Al soltarla, deja de estar apretada? | Sí |
| ¿Una "nota encendida con fuerza cero" cuenta como soltar la tecla? | Sí |
| ¿Con el pedal de sustain abajo, las teclas soltadas siguen sonando hasta que se levanta el pedal? | Sí |
| ¿Si todavía tenés una tecla apretada cuando levantás el pedal, esa sigue sonando? | Sí |
| ¿El mensaje "todas las notas apagadas" limpia todo? | Sí |
| ¿Ejercicio de la escala de Sol mayor: tocarla en orden, en cualquier octava, termina después de la octava (8 notas)? | Sí |
| ¿Una nota equivocada da una pista amable y no te hace empezar de cero? | Sí |
| ¿Repetir la nota anterior no da pista ni retrocede? | Sí |
| ¿Ejercicio del acorde de tónica: Sol-Si-Re vale en cualquier inversión y con cualquier distribución? | Sí |
| ¿Si falta una nota o sobra una, el programa lo avisa? | Sí |
| ¿Un archivo .mxl (comprimido o sin comprimir) devuelve la partitura que tiene adentro? | Sí |
| ¿Un .mxl roto o sin partitura da el mensaje claro en español en vez de trabarse? | Sí |
| ¿Al actualizar una paleta vieja se conservan los colores que elegiste? | Sí |
| ¿Se agregan los colores nuevos que faltaban sin pisar los tuyos? | Sí |
| ¿Los grises viejos de los intervalos que nunca pintaste se cambian por los colores nuevos, y los que pintaste vos no se tocan? | Sí |
| ¿Guardar, duplicar y cambiar de versión de colores solo agrega versiones y nunca borra ninguna? | Sí |
| ¿Importar una paleta agrega una versión nueva sin pisar las otras, y un archivo inválido no cambia nada? | Sí |
| ¿Un color propio que "borrás" queda oculto en lugar de destruirse? | Sí |
| ¿Un compás que aparece dos veces es un patrón con dos apariciones, y uno que aparece una sola vez no es patrón? | Sí |
| ¿Los silencios cuentan: un compás que arranca con silencio no es igual a uno que arranca con la nota? | Sí |
| ¿Una nota ligada que solo continúa no cuenta como nota nueva? | Sí |
| ¿En la pieza de ejemplo, 1=3=5 es un patrón (A) y 2=6 otro (B), y el 4, el 7 y el 8 no tienen caja? | Sí |
| ¿Un tramo de 2 a 4 compases que se repite se marca como un solo grupo, y el más largo gana? | Sí |
| ¿Si un compás del tramo también aparece suelto en otro lado, se marcan los compases de a uno? | Sí |
| ¿"Ambas manos", "Mano derecha" y "Mano izquierda" comparan lo que corresponde? | Sí |
| ¿"Incluir parecidos" apagado no muestra nada, y prendido muestra el compás transportado con el color y la letra de su patrón (B′)? | Sí |
| ¿Un compás con otro ritmo, o con otros saltos entre notas, no se toma por transportado? | Sí |
| ¿Los colores de las cajas son suaves, quedan bien separados en el círculo de colores y dos cajas vecinas nunca tienen tonos parecidos? | Sí |
| ¿La misma partitura conserva sus colores al recargar y otra partitura saca otros? | Sí |
| ¿"Otra combinación" cambia los colores solo de esa partitura y mueve el primer tono lejos del anterior? | Sí |
| ¿"Me gusta esta" guarda la combinación sin repetirla, y nada la borra salvo "Quitar"? | Sí |
| ¿Las combinaciones del prototipo se importan una sola vez y el original queda intacto? | Sí |
| ¿Una combinación guardada aplicada a una partitura se conserva, y si faltan colores se completan con otros lejanos? | Sí |
| ¿Si el almacenamiento falla o tiene basura, no se rompe nada? | Sí |
| ¿Las dos capas arrancan apagadas y recuerdan lo que elegiste? | Sí |
| ¿El degradé pone cada color en la posición de la cabeza de su nota, sin importar cuánto dura? | Sí |
| ¿Un acorde da un solo color (el promedio de sus notas) en su lugar? | Sí |
| ¿El degradé se corta en los saltos de renglón y en un silencio largo, pero no mientras una nota sigue sonando? | Sí |
| ¿Una nota con el color apagado no agrega color al degradé? | Sí |
| ¿Con la intensidad de fábrica (35%) las notas negras se leen con contraste 4,5:1 o más sobre los 12 colores? | Sí |
| ¿Si un color es muy oscuro, la intensidad se limita sola para que las notas negras se lean? | Sí |
| ¿El tempo se queda entre 20 y 220 bpm, y un valor raro (no es número) vuelve a 72? | Sí |
| ¿"+" y "−" mueven 5 bpm, y con Shift 1 bpm, sin salirse del rango? | Sí |
| ¿Un `<sound tempo="66"/>` de la partitura se lee como 66 negras por minuto? | Sí |
| ¿Una indicación de metrónomo se pasa a negras (blanca = 60 son 120; blanca con puntillo = 40 son 120; negra con puntillo = 60 son 90; corchea = 144 son 72)? | Sí |
| ¿Si hay dos indicaciones de tempo, gana la primera del archivo? | Sí |
| ¿Si la partitura no escribe tempo (como la de ejemplo), se devuelve "sin tempo"? | Sí |
| ¿50%, 75% y 100% se calculan sobre el tempo de la partitura (o sobre 72 si no tiene), y el botón activo es el correcto? | Sí |
| ¿Se usa primero el tempo guardado, después el escrito, y por último 72? | Sí |
| ¿El tempo se guarda y se lee por partitura, y un guardado roto se ignora? | Sí |
| ¿Cambiar el tempo mientras suena mantiene el mismo punto de la pieza (12 s a 60 bpm son 6 s a 120 bpm)? | Sí |

## Qué no cubren

- Cómo se ve la pantalla, los colores en pantalla o el sonido del piano. Eso se sigue mirando a ojo.
- Teclados MIDI reales: las pruebas simulan los mensajes, no usan hardware.
- Leer la partitura con el lector visual (OSMD): las pruebas usan notas armadas a mano.

## Cuando se agrega algo nuevo

1. Pedile a Claude que agregue pruebas para lo nuevo, con la respuesta correcta que vos sabés.
2. Corré `~/.bun/bin/bun run check` (pasos de arriba).
3. Si todo da `pass`, recién ahí se guarda con commit.
