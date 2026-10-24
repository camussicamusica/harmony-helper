---
type: reference
updated: 2026-10-24
tags: [harmony-helper, conservatorio, bot]
---

# Astorito (@TyPMusBot): qué hace y cómo llevarlo a Harmony Helper

Bot de Telegram hecho por un alumno del Conservatorio "Astor Piazzolla" para la materia Teoría y Práctica (TyP). Lo recorrimos el 2026-10-24, con permiso de Sofia, desde su Telegram: todos los botones menos "Reportá" y "Programa" (que es un link externo). En Drive no había ninguna exportación del bot: los `message_1.html` que encontramos son mensajes directos de Instagram.

> ⚠️ La descripción pública del bot hoy dice "BEST CASINO MINI-APP" y linkea a otro bot. Eso no lo puso el alumno: alguien cambió la descripción o tomó el bot. **No abrir ese link.** El contenido de los botones sigue siendo el original de TyP.

## Cómo está construido (lo que se ve desde afuera)
- **No conversa.** Es un bot de botones con respuestas armadas, no una IA. Ante texto libre contesta (resumido): "no te entiendo, todavía no sé conversar pero tengo muchos botones", y te manda a /start.
- Personalidad: un robot ("el droide de Asr", "As2d2 procesando…"), con emojis y saluda por el nombre.
- Todo es un árbol de menús (botones inline). Los contenidos son **archivos pregrabados**: audios, imágenes de partituras y PDFs.
- Cada respuesta termina con navegación: Atrás / Home / Terminar.
- Varias categorías dicen "No tengo materiales en esa categoría". El contenido quedó incompleto.

## Menú principal y qué hay en cada rama

| Botón | Camino | Qué entrega |
|---|---|---|
| **Dictados** | Melódicos / Rítmicos → año (I, II, II Vde, III, IV, I 2024) → número 1–12 | 5 audios: la obra **completa**, después "compases 1, 2 y primer sonido del 3", "3, 4 y primer sonido del 5", "5, 6 y primer sonido del 7", "7 y 8". Botones: **Tonalidad y/o compás** (pista: "Está en Mi Mayor y en 3/4") y **Solución** (imagen de la partitura). |
| **Hindemith** | capítulos III–X | Probé el III y el VI: "no tengo materiales". (Libro: Hindemith, *Adiestramiento elemental para músicos*.) |
| **Melo Castillo** | capítulos II–XI → número de ejercicio (p. ej. 46, 51) | Audio de referencia del ejercicio de lectura (~27 s). |
| **Lecturas** | Melódicas / Rítmicas → año | Rítmicas año I: "no tengo materiales". |
| **Solfeos** | libro (Suffern) → lección 1, 2, 3, 4, 6, 8, 9, 12 | **Dos audios por lección: "Piano y voz" y "Piano solo"**, para escuchar el modelo y después cantar sobre el acompañamiento. |
| **Teoría** | Apuntes → PDFs (acordes mayores y menores, aumentados y disminuidos, V7, V9, VII7…) · Ejercicios → Acordes → "por tonalidad" (por año) / "sobre un bajo" | Ejercicio: "Escribí el siguiente acorde, invertilo, cifralo y si corresponde resolvelo" + imagen con la consigna + botón Solución. |
| **Bibliografía** | lista de libros | Atlas de la Música I (A y B), Copland *Cómo escuchar la música*, Cordantonopulos *Teoría*, Cuadernillo de Audioperceptiva, Hindemith, Melo Castillo, Olazábal *Acústica*, Ropartz 2b, Suffern, Zamacois *Formas*. (PDFs de libros con copyright: no los descargamos.) |
| **Secuencias** | Melódicas / Rítmicas → fundamental (A, Ab, B, Bb, C, C#, D, Db, E, Eb, F, F#, G, Gb) → modo | Primero **manda la escala** en audio ("Do Mayor: Do, Re, Mi…") y después la secuencia melódica en esa tonalidad. |
| **Reconocimientos** | Acordes / Escalas → año | Un audio corto (~5 s) y "cuando lo tengas pedime la solución". Solución en texto, p. ej. "Quinta disminuida". Botón "Otro!!". |
| Programa | link externo | No abierto. |
| Reportá | | No usado. |

## Qué llevar a Harmony Helper (y cómo mejorarlo con el teclado MIDI)
1. **Dictado por fragmentos con solape**: completo, después de a dos compases + "primer sonido del siguiente". Es muy buena didáctica. La app lo genera desde **cualquier partitura** (Tone.js) en vez de audios fijos. Sofia contesta **tocando en el MIDI**, la app corrige nota por nota y muestra la solución sobre la partitura, con sus colores.
2. **Pistas escalonadas**: primero tonalidad y compás, después la solución. Que se pueda pedir de a una pista (encaja con "de a uno").
3. **Escala antes que la secuencia**: es exactamente "escala primero" del spec. Se elige la fundamental (12 tonos) y el modo.
4. **Reconocimiento con "Otro!!"**: bucle infinito de intervalos, acordes y escalas, con la respuesta a demanda. La app puede pedir la respuesta **tocándola** o eligiéndola, y llevar la cuenta.
5. **Ejercicio de acordes "escribí, invertí, cifrá, resolvé"**: en la app, la consigna aparece ("V7 de Fa mayor, 1ª inversión") y Sofia lo toca en el MIDI. La app valida notas e inversión y muestra la resolución (V7 → I) en el panel de análisis.
6. **Solfeo "piano y voz" / "piano solo"**: modo acompañamiento. La app toca una mano o el acompañamiento y Sofia toca o canta la otra parte.
7. **Organización por año (I–IV) y por libro**: se puede usar como "nivel", cruzándolo con la progresión del conservatorio (ver conservatorio.md).
8. **Tono amable con personaje**: un asistente con nombre que saluda y alienta. Sin infantilizar.

## Qué no conviene copiar
- Contenido fijo e incompleto (muchos "no tengo materiales"): la app genera los ejercicios.
- Libros en PDF con copyright: la app cita la bibliografía, no la reparte.
- Respuesta solo "a ojo": la app puede corregir de verdad con el MIDI.
