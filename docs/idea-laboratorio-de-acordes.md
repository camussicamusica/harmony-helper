---
type: project
updated: 2026-10-24
status: idea — en discusión, sin aprobar, nada construido
tags: [harmony-helper, vision, acordes]
---

# Idea: Laboratorio de acordes (otra pestaña)

## Lo que dijo Sofia (2026-10-24, resumido)
- Para cada acorde, ver de dónde viene: "este acorde viene de esta escala, que esta escala viene de esto". Que se abra todo el despliegue. Puede venir de un modo en vez de una escala.
- Una pestaña aparte, con **todos los acordes que yo tenga**: los sacados de la partitura y los que yo construya.
- Construir un acorde y que la app me diga **de qué escala probablemente es**.
- O que me muestre **todas las escalas que existen** y los acordes que pueden salir de cada una.
- Primero discutir si es posible.

## ¿Es posible? Sí
La librería que ya usa la app (`tonal`) trae:
- **92 tipos de escala**, de los cuales 38 tienen 7 notas (mayor, menores, los 7 modos, menor armónica y melódica y sus modos, escalas de jazz, exóticas…).
- **107 tipos de acorde** (tríadas, séptimas, novenas, sus, add, etc.).
- Probado el 2026-10-24: con 12 tónicas posibles, un simple Do mayor (Do-Mi-Sol) **entra en 198 escalas**. Eso es lo central de la discusión (ver abajo).

## Cómo se vería
1. **Pestaña nueva** "Laboratorio" (nombre a definir), al lado de Tocar / Estudiar.
2. **Mis acordes**: una lista guardada.
   - Desde la Ficha: botón "Guardar en mis acordes" en cada acorde de la pieza.
   - Construidos por mí: tocándolos en el **teclado MIDI**, o haciendo clic en las teclas del piano de la pantalla.
   - La app les pone nombre (p. ej. "Fa# menor 7").
3. **El despliegue de un acorde** (de a un paso, como siempre, o todo abierto):
   1. Notas del acorde, con mis colores, y sus intervalos.
   2. **Escalas donde entra**, ordenadas de más probable a menos.
   3. Elijo una escala → **qué grado es el acorde ahí** (I, ii, V…) y su función (Tón / Subd / Dom).
   4. Esa escala → **de dónde viene**: si es un modo, de qué escala "madre" sale (Re dórico = Do mayor empezando en Re).
   5. Cada paso con "ver" (escucharlo, verlo en el piano) y "practicar".
4. **Al revés: Explorador de escalas.** Elijo cualquier escala de la lista → sus notas → todos los acordes que se arman con ella.

## El problema principal: "probablemente"
Un acorde solo no dice de qué escala viene: Do mayor entra en 198 escalas. La app no puede adivinar una sola. Lo que sí puede hacer:
- **Con partitura**: la escala de la pieza va primero ("en esta pieza viene de Sol mayor, es el IV").
- **Sin partitura** (acorde que yo construyo): ordenar por lo común primero. Primero las escalas mayores y menores, después los modos, después la menor armónica y la melódica, y al final las exóticas. Mostrar las primeras 5–7 y un botón "ver todas".
- **Con varios acordes** (por ejemplo, una progresión que construyo): ahí sí se puede achicar mucho, porque solo quedan las escalas que contienen todos.

## Otros límites
- "Todas las escalas del mundo": solo las de 12 sonidos (las teclas del piano). Las escalas con cuartos de tono, como algunas árabes o hindúes, no se tocan en el piano, así que quedan afuera.
- Un mismo grupo de notas puede tener dos nombres. Por ejemplo, Do6 tiene las mismas notas que La menor 7. La app tiene que mostrar los dos, no elegir uno en silencio.
- Muchas escalas exóticas no tienen nombre en español. Hay que decidir si se dejan en inglés o se traducen.

## Preguntas para Sofia
1. ¿Nombre de la pestaña? ("Laboratorio", "Mis acordes", otro).
2. ¿Construir acordes con el MIDI, con clic en el piano de la pantalla, o los dos?
3. ¿El orden "lo común primero" te sirve, o querés elegir qué familias de escalas ver?
4. ¿Escalas exóticas con nombre en inglés está bien?
5. ¿Esto va antes o después de la capa de análisis (clic en una figura de la partitura)? Comparten mucho: el despliegue es el mismo.

## Relación con lo que ya existe
- Usa lo mismo que la Ficha (`src/lib/music/analysis/`): nombres en español, grados, funciones, mis colores.
- Es la mitad "acorde → escala → modo" de [vision-analisis-sintactico.md](vision-analisis-sintactico.md), pero suelta de la partitura.
- Callipari (Illustrated Harmony / Illustrated Modes) para cómo se dibuja: [callipari-method.md](callipari-method.md).
