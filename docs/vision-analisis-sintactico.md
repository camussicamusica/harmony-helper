---
type: project
updated: 2026-10-24
status: visión — dicha por Sofia, sin plan técnico todavía
tags: [harmony-helper, vision]
---

# Visión: análisis sintáctico de la oración musical

## La idea, en palabras de Sofia (resumida)
Igual que en lengua se analiza una oración (sujeto, predicado, objeto directo…), la app analiza una partitura. Cada compás tiene una estructura, y cada figura se puede **cliquear y desplegar**: este acorde → de qué escala viene → "ver escala" → de qué modo viene → "ver modo". Es todo lo que hace Brian Callipari, pero **alrededor de la partitura**. La meta es estudiar bien una pieza concreta, no la teoría porque sí.

El para qué: dejar de estudiar de memoria. La memoria a veces anda y a veces no. Entender la lógica de la pieza sí queda. Todo tiene que ser interactivo y pensado para su neurodivergencia: un paso a la vez, visual, con color, y la libertad de hacer lo que quiera.

## El recorrido de una pieza (ejemplo: una Gnossienne)
1. **Ficha de la pieza**: "Esta pieza está en X. Usa estas escalas: A, B, C, D."
2. **Escala principal**: estas son sus notas, practicala (con el teclado MIDI).
3. **Escalas vecinas / modulaciones**: en el compás N aparece la escala B. Practicala.
4. **Cómo se tocan entre sí**: qué notas y qué acordes tienen en común. El punto en común es la puerta (acorde pivote, nota pivote).
5. **Acordes de cada escala que aparecen en la pieza**: marcarlos en la partitura, verlos, practicarlos, entender sus alteraciones.
6. **Resumen**: "Para entender este tema necesitás entender estas 4 escalas y cómo se conectan."

## Interacciones clave
- **Hover**: nombre de la nota, duración y compás (hecho), y el acorde con sus notas (hecho).
- **Clic en una figura o un acorde → panel que despliega capas**: nota → intervalo con la anterior → acorde → función (T / SD / D) → escala → modo. Cada capa tiene un botón "ver" y otro "practicar".
- **Etiquetas por compás**, como en el análisis sintáctico: grado del acorde, función y frase, en una franja sobre la partitura que se prende y se apaga.
- **Dos modos de estudio**, siempre los dos:
  - **libre**: todo prendido, hago lo que quiero;
  - **de a uno**: un intervalo, una escala o un acorde por vez, como en el modo de ir apagando colores.

## Fuentes
- Brian Callipari, cómo se muestra todo: [callipari-method.md](callipari-method.md).
- Conservatorio Astor Piazzolla, ejercicios y progresión: research/conservatorio.md (en curso).
- Bot de Telegram de un alumno (Piazzolita / Astorito, nombre a confirmar): research/telegram-bot.md (en curso).

## Relación con el spec
Esta visión agrupa §5 (escala primero) y §6 (acordes) del v1, más v2 (modulaciones, pivotes) y v3 (modos, préstamos), bajo una sola interfaz: **desplegar la partitura**. Cuando estén leídas las fuentes del conservatorio, se escribe el plan técnico.
