---
type: reference
updated: 2026-10-24
tags: [harmony-helper, conservatorio, bot]
---

# Bot de teoría musical del Conservatorio Piazzolla: resultado de la búsqueda

## Veredicto

No encontrado. En el Drive de Sofia (camussisofia@gmail.com) no hay exportaciones de Telegram, y no hay ningún bot de teoría musical en los archivos revisados. No hay nada que documentar sobre comandos, ejercicios ni feedback del bot.

## Por qué los archivos `message_1.html` no son de Telegram

Son exportaciones de mensajes directos de **Instagram**, no de Telegram:

- Telegram Desktop exporta `messages.html` dentro de una carpeta `ChatExport_...`. Instagram exporta `message_1.html` dentro de `messages/inbox/<usuario>_<id>/`.
- Las carpetas padre tienen el formato de Instagram, usuario seguido de un número. Todas cuelgan de una carpeta `inbox`.
- El HTML que se abrió incluye el logo de Instagram y enlaces a instagram.com.

Carpetas padre identificadas (solo nombre, sin leer contenido personal):

| Carpeta | Observación |
|---|---|
| `conservatoriodemusicaastorpiazzolla_1498045901600972` (2 copias, 04-20 y 04-24) | Hilo de DM con la cuenta de Instagram del conservatorio. No leído. |
| `noticiasdelpiazzolla_8028576963821995` | Hilo de DM con una cuenta de noticias. No leído, probablemente no sea un bot. |
| `astor_766951541377082` | Chat personal con una persona llamada Astor. Leído lo mínimo para descartarlo: conversación entre personas sobre poesía. No es un bot. |
| `sebastianmisuraca_235596911639902` (823 KB) | No relacionado. No leído. |
| `facundosaldunvides_1725749095497317` (2 copias) | No relacionado. No leído. |
| `1bey_1254200202652211` (2 copias) | No relacionado. No leído. |

Quedan sin abrir los demás ids de partida. Comparten carpeta `inbox` y formato Instagram, así que casi seguro son DMs. No se profundizó en ellos.

## Qué se buscó

- Títulos con "Piazzol" y "Astor": aparecen la carta `Carta al Piazzolla`, PDFs de inscripción al Conservatorio Superior de Música Astor Piazzolla y las carpetas de Instagram de arriba. No hay chat de bot.
- Búsqueda de texto completo "Piazzolita" o "Astorito": sin coincidencias que sean un bot. Las coincidencias son exportaciones de Instagram y Substack no relacionadas.
- Búsqueda de texto "Conservatorio" en HTML: solo devolvió `message_1.html` de Instagram.
- La búsqueda por título "ChatExport" o "Telegram" falló por error del conector ("Operation is not implemented"). No se pudo completar. Convendría repetirla.
- En Drive también hay material teórico del conservatorio en PDF, que sí sirve como contenido pedagógico para Harmony Helper:
  - "TyP2" (Teoría y Práctica 2): material de repaso sobre intervalos, escalas, tipos de inicio, funciones tonales y cadencias, más ejercitación de solfeo y ritmo.
  - Apreciación Musical.
  - Programas SADE nivel medio.

## Qué puede hacer Sofia para encontrar el bot

1. Abrir Telegram y buscar `Piazzol`, `Astor` y `bot teoría` en la búsqueda global.
2. Revisar los chats con "BotFather" no sirve: el bot lo creó otra persona. Mejor preguntar a la compañera o compañero del conservatorio, o buscar el enlace en grupos del Conservatorio (WhatsApp o Telegram).
3. Si lo encuentra, exportar el chat desde Telegram Desktop (menú de tres puntos, "Export chat history", formato HTML) y subirlo al Drive.
4. Con esa exportación, se puede completar este documento (comandos, tipos de ejercicio, feedback, dificultad, manejo de audio y notación).

## Mientras tanto: ideas del material del conservatorio para Harmony Helper

Son hipótesis propias, no del bot:

- Secuenciar la dificultad con el temario del TyP2: intervalos, escalas, funciones tonales, cadencias.
- Ejercicios de intervalos y escalas tocados en el teclado MIDI, con colores de notación como feedback inmediato.
