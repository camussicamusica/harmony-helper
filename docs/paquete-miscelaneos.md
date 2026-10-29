---
type: project
updated: 2026-10-29
status: paquete para una conversación nueva; nada construido
tags: [harmony-helper, juegos, canto, paquete]
---

# Paquete: Misceláneos (cartas de lectura y ritmo, y canto con micrófono)

Este archivo es para abrir una **conversación nueva**. Son dos juegos de estudio que Sofia quiere sumar a su mundo de Harmony Helper.

## El pedido, en palabras de Sofia (2026-10-29)
> "Cartitas, una carta, dos cartas… para que salgan notas, figuras… dictado rítmico… leer las notas."

> "Después lo mismo con el canto… partitura que te diga qué tenés que cantar… micrófono… escucha en qué nota va. Yo creo que se puede, ¿no es cierto? O hay que pagar algo."

**Respuesta a su pregunta:** sí se puede, y **gratis**.
- El navegador ya escucha el micrófono, con tu permiso (getUserMedia + Web Audio).
- Una librería libre, por ejemplo `pitchy` (algoritmo McLeod), dice qué nota estás cantando, muchas veces por segundo.
- Todo corre en su Mac, sin internet, sin cuenta y sin pagar nada.
- El límite: con ruido de fondo o con voz muy aireada, la detección duda. Por eso hay que mostrar "no te escucho bien" en vez de marcar error.

## Antes de leer: reglas de trabajo con Sofia
Son las mismas que en `paquete-trompeta.md`, sección 2: español en pasos numerados, reflejar antes de construir, argumentar, trabajo con subagentes, verificar con captura, nunca escribir `hh.colors.v1`, puerto 5190, guardar todas las iteraciones, interfaz más callada que los colores.

**Investigación ya hecha (leer primero):**
- `docs/research/tecnologia-libre.md`: micrófono, detección de altura, cartas de ritmo, sonidos.
- `docs/research/mejoras-pedagogia.md`: métodos de enseñanza (Kodály, Gordon, solfeo, dictado).
- `docs/research/herramientas-existentes.md`: qué hacen otras apps y qué copiar de la idea.

## Juego 1: Cartas de lectura y de ritmo
**La idea:** como sacar cartas de un mazo. Elegís **1, 2, 3, 4 o 5 cartas** y salen al azar.

- **Mazo de notas (lectura):**
  - Cada carta tiene una nota en un pentagrama, en clave de sol o de fa.
  - La decís, la tocás en el teclado MIDI o la cantás.
  - La carta se da vuelta y muestra su nombre, "Re (D)", en su color.
- **Mazo de figuras (ritmo):**
  - Cada carta es un compás o un pedazo de ritmo: negra, corcheas, silencio, puntillo…
  - Sacás 4 cartas y queda una frase rítmica para leer con metrónomo.
- **Dictado rítmico (al revés):**
  - La app toca un ritmo; vos elegís qué cartas sonaron.
  - Arranca con 1 carta y figuras simples, y sube de a poco.
- **Niveles:** el mazo empieza chico (pocas notas, solo negras y blancas) y suma cartas a medida que acertás, como Kodály: de lo simple a lo complejo.
- **Formato:** respetar la "carta" de Harmony Helper: fotito arriba, descripción abajo (ver `idea-tele-de-estudio.md`).

## Juego 2: Partitura para cantar con micrófono
**La idea:**
1. La app te muestra una melodía corta.
2. Te da la primera nota.
3. Vos cantás.
4. La app escucha y te muestra en vivo en qué nota estás: una línea de tu color que sube y baja sobre el pentagrama.
5. Si estás afinada, la nota escrita se prende. Si estás un poco alta o baja, te lo muestra con una aguja, sin castigo.

**Partes:**
- **Afinador en vivo:** nota más centésimas (cuánto te pasás o te falta).
- **Seguimiento:** la partitura avanza cuando das la nota, o con metrónomo.
- **Melodías:** empezar por intervalos (2.ª, 3.ª, 5.ª), después escalas, después frases de sus piezas.
- **Su registro:** primero la app mide tu nota más grave y más aguda, y transpone las melodías a tu voz.
- **Bonus:** sirve también para la trompeta (ver `paquete-trompeta.md`), porque la detección es la misma.

## ¿App aparte o dentro de Harmony Helper?
- **Mi recomendación:** **una pestaña "Juegos" dentro de Harmony Helper.** Reusa los colores, el pentagrama chico (`MiniStaff`), el sonido (Tone.js), el MIDI y las pruebas.
- **La objeción:** la app crece. Si Sofia quiere usar los juegos en el celular, conviene una página aparte, más liviana.
- **Que decida ella** después de ver la investigación.

## Cómo encararlo en la conversación nueva
1. Leer este archivo, el de la trompeta (sección 2) y los 3 de `docs/research/`.
2. Reflejarle a Sofia lo que entendiste, con un dibujo de cada pantalla, y esperar su OK.
3. Construir **un juego por vez**. Arrancar por el Mazo de notas, que es el más simple.
4. Probar el micrófono con su voz real: no adivinar la afinación con pruebas sintéticas solamente.

## Cómo arrancar la conversación nueva
Pegá esto en un chat nuevo:
> Hola. Leé `~/code/harmony-helper/docs/paquete-miscelaneos.md` entero y seguí sus reglas. Quiero las cartas de lectura y ritmo, y el canto con micrófono. Antes de construir, mostrame cómo lo entendiste.
