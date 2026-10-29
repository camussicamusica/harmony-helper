---
type: reference
updated: 2026-10-29
tags: [harmony-helper, investigacion]
---

# Más ideas pedagógicas para Harmony Helper (lo que NO está en la primera investigación)

Complementa `metodos-lectura-e-improvisacion.md` (2026-10-25). Allá ya están: chunking y eye-hand span, audiación de Gordon, Kodály/do móvil, Dalcroze, Benbassat, Barry Harris, partimento/esquemas, espaciado, intercalado, práctica deliberada (Macnamara), color en notación, carga cognitiva. **No lo repito.** Acá va lo nuevo.

Cómo leerlo: casi todo lo vi en resúmenes de búsqueda y abstracts, no en el texto completo. Evidencia: **fuerte / moderada / débil / solo opinión o marketing**. Donde no hay estudios lo digo.

---

## 1. Ideas nuevas

### 1.1 Armonía como idioma nativo: aprendizaje implícito y "¿qué viene?"
**Qué es.** Los oyentes aprenden la gramática de la armonía sin que nadie se la explique, solo por exposición: el cerebro registra qué acorde suele seguir a cuál. Huron (*Sweet Anticipation*) dice lo mismo: las expectativas musicales son hábitos estadísticos aprendidos. Los músicos "formados" no saben más reglas: tienen más horas de exposición con atención y nombran lo que esperan.
**Evidencia.**
- Tillmann, Bharucha y Bigand (2000, *Psychological Review*): una red neuronal expuesta solo a combinaciones de notas llega a internalizar la estructura de la música tonal. **Moderada** (es un modelo computacional). https://lead.ube.fr/wp-content/uploads/2023/09/000123-implicit-learning-of-tonality-a-self-organizing-approach.pdf
- Jonaitis y Saffran (2009, *Cognitive Science*): adultos aprenden estadísticas de acordes de un sistema inventado, parecido al aprendizaje estadístico del lenguaje. **Moderada** (laboratorio). https://api.philpapers.org/rec/JONLHT-2
- Rohrmeier y Cross ("Tacit tonality") y Huron: argumentan que el conocimiento armónico es en gran parte implícito. **Moderada**, teórica.
- Lo que **no** hay: estudios de que un juego de "adiviná el próximo acorde" mejore la lectura o la improvisación. Es una inferencia razonable, no un resultado.
**En la app.** Modo "¿Qué viene?" en el navegador de acordes de la Ficha: la app muestra los acordes hasta el compás N, Sofia elige o toca el siguiente (en la capa de cifrado, con el círculo cromático para responder) y después se revela. Marca "sorpresa" en los acordes que rompen lo esperable (dominantes secundarias, préstamos). Versión grande: porcentajes tipo "después de I, V aparece ~31%" a partir de un corpus; Hooktheory publica esos datos de ~40.000 canciones (https://www.hooktheory.com/blog/trends-tool/index.html), **pero no verifiqué licencia ni acceso por API**. Versión chica y segura: las estadísticas de su propia biblioteca de partituras.
**Esfuerzo.** Chico (solo dentro de la pieza) a grande (corpus).
**Color.** Muy buen encaje: cada acorde ya tiene sus notas en su color, así que "esperar" se vuelve "esperar este racimo de colores".

### 1.2 Doble capa: color por altura Y señal por grado
**Qué es.** Los colores de Sofia son por clase de altura (Do siempre es el mismo color). Los músicos formados piensan en **grados** (el 4 de la tonalidad, sin importar cuál sea). Es la diferencia más probable entre su forma de oír y la de ellos. En vez de cambiar colores, se agrega una segunda señal.
**Evidencia.** Es la lógica del entrenamiento funcional y de Kodály (ya en la primera investigación, con evidencia de opinión). Lo nuevo es el diseño: no encontré estudios sobre mostrar a la vez altura absoluta y grado. Un estudio con adultos que entrenaron altura con colores y feedback mejoró (19% a 54,9%), pero el grupo con color no superó al grupo sin color de forma significativa (Journal of Vision, 2022, entrenamiento corto de 210 pruebas): https://vbn.aau.dk/en/publications/training-pitch-discrimination-using-colors/ . **Débil.** Y Itoh y Nakada (2018) sugieren que la sinestesia color-altura sigue el **nombre** de la nota más que el sonido, lo que apoya que su color funcione como etiqueta del nombre (no hace falta oído absoluto): https://bvbvf1.bib-bvb.de/vufind/PrimoRecord/cdi_proquest_miscellaneous_2101276583
**En la app.** El relleno de la cabeza de nota sigue siendo su color. Un **anillo o borde** muestra el grado en la tonalidad de la pieza (1 a 7; grosor o forma = fuerte/débil, tónica con doble anillo). Un interruptor "ver por grado" repinta la pieza como si estuviera en Do/La menor, para ver que dos tonalidades distintas tienen la misma forma. Se conecta con la tarjeta de armadura y la Ficha.
**Esfuerzo.** Medio.
**Color.** Respeta su sistema y le suma lo que le falta (la función). Riesgo: sobrecargar la vista (ver 1.4).

### 1.3 Capas de ostinato (Orff + "tocar primero")
**Qué es.** Orff y los métodos "playing-based" (Suzuki, Simply Music) arrancan tocando y entienden después. La técnica de Orff que se puede copiar es construir **capas**: primero un bordón, después un patrón de bajo repetido (ostinato), después los acordes, y sobre eso se improvisa con pocas notas permitidas, que se amplían de a poco.
**Evidencia.** Débil, y hay que decirlo claro.
- Orff: un cuasi-experimento chico (21 vs 21 alumnos de 4.º grado, 6 semanas) mostró más creatividad musical en el grupo con improvisación; un estudio cualitativo de 6 docentes concluyó que se puede enseñar a improvisar restringiendo las opciones al principio y ampliándolas. No hay revisión sistemática. https://aosa.org/?p=16135 (y otras fuentes de la búsqueda)
- Suzuki: dos revisiones sistemáticas chicas (7 a 12 estudios) reportan efectos positivos en habilidades instrumentales y percepción auditiva. La analogía de la "lengua materna" es una premisa teórica, **no está probada**. https://doaj.org/article/17c545b4bb0c46c5a041c4353fe4c846
- Simply Music: **no encontré investigación independiente**; todo lo que hay es descripción de la empresa y notas de prensa. No usarlo como argumento.
- Tocar de oído no perjudica la lectura (Comeau, uOttawa): https://piano.uottawa.ca/wp-content/uploads/2016/04/Publications/Methods/Suzuki%20Method/Playingbyear...Suzukimethod.pdf
**En la app.** Las **cajas de patrones** ya detectan repeticiones. Con un clic, la app reproduce el bajo repetido de la pieza (la caja) como ostinato en loop, y Sofia suma capas con el teclado MIDI: bordón, 5.ª, bajo, acordes, y recién después su improvisación. La app va habilitando más notas (solo 1-3-5, después la escala). Cada capa en su color.
**Esfuerzo.** Medio.
**Color.** Encaja: las capas se ven como pilas de colores.

### 1.4 Colores que se apagan solos (desvanecimiento adaptativo)
**Qué es.** Los apoyos que ayudan al principio estorban cuando ya sabés (efecto de inversión de la pericia, Kalyuga). La solución estándar es **quitar el apoyo de a poco** ("fading"), y mejor aún si depende de cómo le va a la persona.
**Evidencia.** Sweller/Kalyuga y Renkl-Atkinson (educación general, **moderada**); Salden et al. (2009): el desvanecimiento adaptativo superó al fijo y a resolver problemas sin ayuda en un tutor, pero en el aula la réplica fue más débil (https://link.springer.com/doi/10.1007/s11251-009-9107-8). **No hay estudios en notación musical.** La primera investigación ya propone atenuar en etapas; lo nuevo es hacerlo **automático con MIDI**.
**En la app.** Si Sofia toca un trozo bien 3 veces en distintos días, los colores de ese trozo pasan a 50%, después solo a las notas clave, después nada. Si falla, vuelven. Un panel muestra "este compás ya lo leés sin color". Se conecta con la capa de degradé y con el modo baja carga.
**Esfuerzo.** Medio (necesita guardar historial por compás).
**Color.** Es el punto central: su herramienta externa se vuelve temporal a propósito, así no queda dependiente.

### 1.5 Vocabulario rítmico con sílabas (Takadimi, Kodály) y conteo
**Qué es.** Los músicos formados *dicen* los ritmos en voz alta con sílabas ("ta ka di mi" o "ta-ti-ti"); no cuentan "1 y 2 y". Es una parte del "idioma" que la app no cubre: todo lo de color es altura. Takadimi nombra **dónde cae el ataque dentro del pulso**, no el valor de la figura.
**Evidencia.** Un metaanálisis de intervenciones de lectura rítmica (46 estudios) halló efectos pequeños (https://journals.sagepub.com/doi/abs/10.1177/0305735615610925); entre lo que funcionó están sistemas de conteo y movimiento. Takadimi en particular: solo estudios chicos y tesis, sin comparación rigurosa. **Débil-moderada** para "sistemas de conteo ayudan"; **débil** para Takadimi sobre otros.
**En la app.** Debajo de cada compás, una línea opcional con las sílabas del ritmo (la pieza dicha en voz alta), con audio de la sílaba al pasar el mouse, y un modo "decilo y después tocalo" donde el MIDI evalúa solo el ritmo en una nota. Se conecta con la tarjeta de figura que ya existe en el hover.
**Esfuerzo.** Chico a medio.
**Color.** **No usar el color de altura para el ritmo**: compite. Usar forma o posición (marcas de pulso en gris).

### 1.6 Práctica mental estructurada ("tapar y oír")
**Qué es.** Imaginar el sonido y el movimiento sin tocar. Highben y Palmer (2004) en piano: la práctica mental rinde más que no practicar y menos que practicar de verdad; las personas con buen oído se benefician más de imaginar el sonido. Bernardi et al. (2013): imaginar el movimiento mejoró velocidad y coordinación; **analizar la estructura sin más** la empeoró.
**Evidencia.** **Moderada-débil** (estudios chicos; no encontré un metaanálisis específico de música). https://scholars.duke.edu/individual/pub1468113
**En la app.** Botón "Tapar": oculta el compás siguiente (o el teclado de ayuda), Sofia lo imagina cantando o con los dedos, lo toca, y se compara con lo escrito. Parte de la primera investigación (3.6 "audiar primero"), pero sumando la parte motriz.
**Esfuerzo.** Chico.
**Color.** Neutral: al revelar, los colores muestran la comparación.

### 1.7 Aprendizaje informal: sacar de oído con red de seguridad
**Qué es.** Lucy Green (Musical Futures): los músicos populares aprenden copiando grabaciones, de a poco, con amigos. La primera investigación ya menciona transcribir (Berliner); lo nuevo es el formato guiado.
**Evidencia.** **Débil**: gran parte de los resultados son observaciones de los propios autores y de sus socios; la literatura crítica señala tensiones y que mucho aprendizaje popular es solitario y desordenado. https://discovery-pp.ucl.ac.uk/10001104/1/Green2005Music27.pdf
**En la app.** "Sacar un compás": la app toca 1 compás en bucle, lento; Sofia lo reproduce por MIDI; la app responde solo "más agudo / más grave" y la primera nota correcta, no la solución. Es una variante de "Eco". **Esfuerzo.** Medio. **Color.** Las notas acertadas se encienden en su color.

---

## 2. Lo que se investigó y no recomiendo como función propia

- **Gamificación.** Lo mejor que encontré es una revisión de 32 estudios sobre juegos serios en música que afirma efectos positivos en interés y habilidades (https://vufind.katalog.k.utb.cz/SummonRecord/FETCH-LOGICAL-c2980-ed7fe3f9454e1e13394e8cdb1b5254b2cff168680f70cfd736660441a273cf1f3), pero no son estudios sobre adultos y muchos juegos ya no existen. Una tesis sobre una app de guitarra sugiere que el **feedback negativo daña la motivación**. **Débil.** Conclusión: nada de puntos, ranking ni vidas. Sí: marcar lo que ya dominó (progreso visible) y feedback que diga qué estuvo bien primero.
- **Notas que caen (piano roll, estilo Synthesia / las cintas ya planeadas).** No encontré ningún estudio controlado sobre transferencia a la lectura; lo que hay son reseñas comerciales y opiniones. Sirve para empezar a tocar rápido, no está probado que enseñe a leer. Mantenerlas como complemento **alineado con la partitura**, no como vista principal.
- **Señas de mano (Kodály/Curwen).** Hay estudios chicos con niños (50 niños, 2 semanas) y la propia literatura admite que casi no hay investigación sobre efecto en la precisión vocal. No vale una función.
- **Entrenar oído absoluto.** Hay programas en línea de varias semanas que logran buenos resultados en parte de los adultos, pero no es lo que le falta a Sofia (oído funcional) y es mucho tiempo.

---

## 3. Top 5, ordenado por cuánto ayuda a dejar de sentirse perdida con músicos formados

1. **"¿Qué viene?" (1.1).** Es lo que más separa a un músico formado: *esperan* el siguiente acorde y se sorprenden cuando falla. Entrena justo la sensación de "manejar el idioma", sirve con cualquier pieza y puede empezar chico (dentro de la pieza, sin corpus). Evidencia de base: moderada; que rinda en su caso es hipótesis.
2. **Doble capa color + grado (1.2).** Le da el vocabulario que ellos usan (grados) sin tirar su sistema. Es el puente entre cómo ve ella y cómo hablan ellos. Cuesta poco probarla: es un anillo sobre lo que ya existe.
3. **Capas de ostinato para improvisar (1.3).** Con novatos improvisa bien; con formados se pierde porque no tiene base armónica estable debajo. Las capas le dan esa base y limitan las opciones al principio. Evidencia débil, pero el principio (restringir y ampliar) tiene sentido pedagógico y encaja con "improvisar con 3 reglas" ya propuesto.
4. **Colores que se apagan solos (1.4).** No es lo que más la acerca hoy a los formados, pero evita que su mejor herramienta se vuelva muleta y mide su progreso real (cuánto lee sin color). Es la única forma de saber si los colores ayudan.
5. **Vocabulario rítmico hablado (1.5).** Los formados se comunican en voz alta con sílabas de ritmo y solfeo. Hoy la app no cubre eso. Evidencia débil-moderada, pero es barato.

Quedan fuera del top por razones de ranking, no por malas: práctica mental (1.6) y sacar de oído (1.7), que se pueden sumar como botones chicos dentro de funciones existentes.

---

## 4. Qué NO hacer

1. **No adoptar Simply Music (ni sus "35 a 50 piezas en un año") como método.** No hay investigación independiente; es marketing. Sí se puede robar la idea de "tocar un patrón antes de nombrarlo", que aparece en Suzuki y Orff.
2. **No agregar puntos, rachas, ranking ni mensajes de error.** Evidencia débil a favor, señales de daño con feedback negativo, y Sofia tiene memoria poco confiable y baja tolerancia a la carga.
3. **No hacer de las notas que caen la vista principal.** Nadie probó que enseñen a leer; ya hay riesgo de que mire el color en vez de la nota.
4. **No afirmar "tu sinestesia te ayuda a aprender".** No hay estudios sobre eso; lo único que hay es que las asociaciones de color son estables dentro de una persona, y un único estudio de entrenamiento donde el color no ganó de forma significativa. Tratar los colores como hipótesis que la app mide (idea 1.4).
5. **No usar el color de altura también para el ritmo, las funciones y las cajas.** Cada tipo de información necesita su propio canal (color, forma, posición, borde) o la pantalla se vuelve ilegible.
6. **No reabrir do fijo vs. do móvil.** Ya está resuelto en la primera investigación (nombres fijos, números para funciones); la capa de grados (1.2) lo implementa.
7. **No bajar el corpus de Hooktheory sin revisar términos de uso.** No verifiqué si lo permiten.
8. **No presentar la "lengua materna" de Suzuki ni a Gordon como hechos científicos.** Son teorías influyentes, no probadas etapa por etapa.

---

## 5. Límites de esta investigación
- Vi resúmenes de búsqueda y abstracts, no textos completos. Las cifras (21 vs 21 alumnos, 19% a 54,9%, 46 estudios) las tomo de esos resúmenes.
- No encontré metaanálisis específicos de música sobre práctica mental ni sobre aplicaciones gamificadas.
- Dalcroze, Kodály, Gordon, Benbassat y Harris no se tocaron: están en la primera investigación.
- Casi nada de lo que figura acá se probó con **adultos que ya tocan piano y quieren dejar de sentirse perdidos con músicos formados**. Todo es hipótesis razonable; la forma de saberlo es medirlo en su propio uso (ver 1.4).
