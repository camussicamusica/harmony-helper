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
