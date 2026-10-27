---
type: project
updated: 2026-10-27
status: idea — paquete para una conversación nueva; nada construido
tags: [harmony-helper, idea, interfaz]
---

# Idea: la "tele" de estudio (Harmony Helper como un Ableton para aprender música)

## En palabras de Sofia (2026-10-27, dictado)
> "Como si fuese una carta tipo un Pokémon… el dibujito en el medio y todas las características abajo. Hay que hacer eso, pero con la nota."

> "Yo paso el mouse por la nota musical y a mi derecha hay como una pequeña tele que me muestra esa nota en profundidad… para que se me quede visualmente."

> "La tele se puede quedar, se puede correr, se puede sacar, como si fuese un panel en un Ableton de aprender música."

> "Vamos a tener que entrar en… reverse engineer anything, y vamos a hacerlo con Ableton, pero para la educación."

## El concepto
Un panel lateral, "la tele", que espeja lo que tenés debajo del mouse y te lo muestra en profundidad, como una carta.

### Carta de nota (pasás el mouse por una nota)
- **Arriba, el dibujito:** un pentagrama chico con esa nota sola, grande, en tu color.
- **Abajo, las características:**
  - el nombre: "Sol (G)", octava;
  - el color;
  - dónde está en el teclado;
  - qué grado es en la tonalidad de la pieza: "4.º grado de Re mayor";
  - la escala de la pieza con esa nota marcada.
- Su función, y en qué acordes de la pieza aparece.
- **Botón "+":** fija la carta en la tele para que no cambie al mover el mouse.

### Carta de acorde (pasás el mouse por un acorde o por su cajita)
- El acorde escrito en un pentagrama: como aparece en tu pieza y en su forma "de manual".
- El acorde dentro de la escala: qué grado es y la función (Tón / Subd / Dom).
- Si es de afuera de la escala: de dónde viene (dominante secundaria, préstamo o modulación).
- Sus notas en tu color. Pasás el mouse por cada una y la tele te muestra la carta de esa nota.
- **"+"** para fijarlo.

### La tele como panel tipo Ableton
- Se puede **acoplar** a la derecha, **mover**, **achicar** o **cerrar**.
- Recuerda dónde la dejaste.
- Ableton ya tiene algo parecido: el **Info View**, un recuadro abajo a la izquierda que explica lo que estás señalando con el mouse. La tele es eso, pero para aprender música.

## Cómo encararlo en la conversación nueva
1. **Estudiar Ableton:** cómo arma sus paneles (Browser, Detail View, Info View, acoplar y plegar), con la habilidad "reverse-engineer-anything".
   - Se estudia **el diseño y la forma de trabajar**, no se copia su código ni sus imágenes.
2. **Diseñar en papel:** la carta de nota, la carta de acorde y el panel. Sofia aprueba antes de construir.
3. **Construir la tele** en Harmony Helper, reusando lo que ya existe:
   - el análisis de tonalidad y acordes;
   - los colores;
   - el navegador de acordes por la partitura.

## Un formato que se repite: la ficha de cada objeto (Sofia, 2026-10-27)
> "Yo paso el mouse por una nota y se me abre una ficha de esa nota. Como si fuese un programa de los 90."

> "Como si fuese esa cartita de Digimon que tiene la fotito y la descripción."

Ella nota que el mismo formato le aparece en distintas escalas: la Ficha de la pieza, la carta de nota, la carta de acorde. Es una regla de diseño, no una pantalla suelta.

**Todo objeto que se observa a fondo tiene su carta, con el mismo formato:**
- arriba, la fotito: el dibujo en un pentagrama chico;
- abajo, la descripción.

Esto vale para la nota, el acorde, la tonalidad, el compás y la pieza.

- **Primer paso posible:** la burbuja del hover se convierte en carta y suma la fotito de la nota en un pentagrama chico.
- **Estética "programa de los 90":** cartas con borde, título y fotito. Ojo: memoria ViDeus dice "sin brillo 2000"; esto es otro proyecto y el gusto lo decide Sofia, pero preguntarle si quiere el look retro de verdad o solo el formato de carta.

## Oráculo de quintas: los grados de la pieza viven en el círculo (Sofia, 2026-10-27)
> "Esta es tipo cuarta más 7, primera más 7, tercera, quinta, segunda, séptima. Todo eso me gustaría verlo del círculo… esa información que se cliquea afecta el círculo de alguna manera."

**Idea:** los grados que hoy lista "Acordes de la pieza" (IVmaj7, Imaj7, iii, vi, ii7, "fuera de la escala") se dibujan en el círculo de quintas.
- **Anillo de afuera:** acordes mayores. **Anillo de adentro:** sus relativos menores.
- En Re mayor, los acordes de la escala forman una **porción contigua**:
  - afuera: Sol (IV), Re (I), La (V);
  - adentro: Mi m (ii), Si m (vi), Fa# m (iii).

  La tonalidad se ve como un "barrio".
- Cada acorde de la pieza se dibuja en su lugar, con su número romano y su cantidad (×8). El tamaño o el brillo puede mostrar cuánto se usa.
- **Clic en un acorde de la lista:** se prende su lugar en el círculo, con la flecha a donde quiere ir. A la vez, el navegador lo marca en la partitura (ya existe: `useOccurrenceCursor`).
- **Clic en una porción del círculo:** el mismo navegador recorre la partitura.
- **Acordes de afuera de la escala:** aparecen fuera del barrio, y el círculo muestra de qué vecina vienen. Por ejemplo, La menor en Re mayor está al lado del barrio, hacia Sol/Do. Esto responde visualmente su pregunta de "¿con qué escala modula?", junto con la explicación (dominante secundaria / préstamo / modulación).
- **Base que ya existe:**
  - `pieceChords`;
  - los grados y funciones de la Ficha;
  - `findChordOccurrences(chords, query)`, que acepta una lista o un predicado;
  - el Círculo cromático (`ChordCircle`), para la forma de cada acorde.

## Cintas de notas (Sofia, 2026-10-27): construir las dos, A y B, como capas separadas
> "Como si la nota es naranja, el recorrido es naranja y vamos viendo cómo se entrelazan esas notas con las otras, cuando vuelven a aparecer, cuando empiezan, cuando terminan."

> "Como si las notas… las pudiera ver… desde el piso de arriba. Entonces veo como las notas se chorrean hacia la siguiente."

Viene de cómo veía la música cuando tenía sinestesia: cada nota con su color, moviéndose como cintas. Ahora la quiere **afuera**, como herramienta, no adentro.

- **A. Hilos por nota:** un hilo por cada nota (todos los Sol = un hilo color Sol). Muestra cuándo aparece, cuánto dura, cuándo vuelve.
- **B. Cintas por voz:** la melodía, el bajo y las voces del medio como cintas que pasan de una nota a la siguiente, con degradé de color. Muestran cómo se entrelazan y se cruzan.
- **Dónde:** una franja debajo de la partitura, alineada compás por compás: la misma música, vista "desde arriba".
- **Cuidado (lo dijo ella):** los colores en exceso la saturan. Arranca calmo: tocás una nota y se prende solo su hilo, lo demás en gris. Después sumás más, y hay un botón "todas".
- **Referencia:** Music Animation Machine (Stephen Malinowski). Estudiar la idea, no copiarla.
- **Ya existe y sirve de base:**
  - la capa "Línea melódica";
  - el "Degradé de notas";
  - los colores de cada nota;
  - el tiempo de cada nota (`ScheduledNote`).

## Ideas abiertas que se conectan con esto
- **Oráculo de quintas:** una pestaña donde tocás una porción del círculo y se prenden los compases de la partitura que viven ahí.
- **Mapa de saberes:** los escalones en orden, de notas a intervalos, escala, tríadas, grados, funciones, círculo, séptimas, dominantes secundarias y modulación. Cada herramienta dice en qué escalón está.
- **De la Ficha:**
  - la partiturita del acorde;
  - "de dónde viene" cada acorde de afuera;
  - las escalas con las que se cruza la pieza ("todo su universo").

## Estado del código al empaquetar
- Repositorio: `~/code/harmony-helper`. App en `http://localhost:5190`; siempre ese puerto, porque ahí viven sus colores.
- Ya hecho:
  - menú y piano plegables;
  - piano centrado;
  - recuerda la última partitura.
- En curso en la conversación anterior:
  - la burbuja del acorde con las notas en color;
  - el navegador de acordes ("compás 3, tiempo 2 · 3 de 9").
