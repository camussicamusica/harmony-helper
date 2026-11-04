---
type: project
updated: 2026-10-29
status: aprobado por Sofia ("Dentro de Juegos", 2026-10-29); paso 1 en construcción
tags: [harmony-helper, juegos, canto, microfono]
---

# Plan 10: Juegos → Cantar (paso 1: registro y afinador)

Juego 2 de `docs/paquete-miscelaneos.md`. Se construye en tres partes, una por vez: (1) registro y afinador, (2) intervalos, (3) melodías. Este plan es solo la parte 1.

## Decisiones tomadas
- **Dónde:** dentro de `/juegos`, en el botón "Cantar" (hasta ahora gris). De `GamesPage.tsx` solo se cambia eso; todo lo demás va en archivos nuevos (el chat de las cartas trabaja en los otros).
- **Detector compartido con la trompeta:** `src/lib/pitch/` no sabe nada de canto; ventana y rango son parámetros.
- **Micrófono crudo:** `echoCancellation`, `noiseSuppression` y `autoGainControl` en `false`.
- **Filtros:** claridad de `pitchy` > 0.9, compuerta de volumen (RMS), rango 70–1100 Hz, mediana de unos 150 ms, saltos de más de una octava descartados salvo que duren.
- **Color calmo:** la línea es gris mientras te movés; toma el color de tu paleta (`noteColor`) recién cuando te quedás unos 150 ms en la misma nota. Aguja en gris. La nota objetivo se prende en su color cuando estás a ±15 cents un rato.
- **Referencia sin eco:** mientras suena la nota de referencia la app no escucha (más 250 ms de cola).
- **Sin castigo:** sin puntos ni rojo; si no se oye bien, "no te escucho bien" en gris.
- **Registro guardado** en `localStorage` con la clave `hh.voz.v1` (nunca `hh.colors.v1`).

## Pantalla
```
 [Mazo de notas] [Cantar] ...
 (1 Tu registro) (2 Afinador)

 1 Tu registro
   Cantá un "uuu" que baje hasta tu nota más grave, sin forzar.  [🎤 Escuchar] [Listo]
   Ahora uno que suba hasta la más aguda.                        [🎤 Escuchar] [Listo]
   Tu registro cómodo: La3 (A3) a Mi5 (E5)   (pentagrama chico)  [Medir de nuevo]

 2 Afinador
   Nota objetivo: [◀] Re4 (D4) [▶]  [▶ Escuchar la nota]   [🎤 Escuchar]
   ┌ pentagrama ─────────────────────────────┐
   │  objetivo ●     tu línea ~~~~╱‾‾‾‾      │  (últimos ~6 s)
   └─────────────────────────────────────────┘
        Re (D)  −12 cents   ◀──|──●──▶        gris: "no te escucho bien"
```

## Registro: cómo se calcula
- Solo cuentan los cuadros firmes (claridad, volumen, estables ≥ 150 ms).
- Grave = percentil 5 de la fase grave; agudo = percentil 95 de la fase aguda. Los extremos (gallitos, soplidos) quedan afuera.
- Hace falta al menos ~1 s de cuadros firmes por fase; si no, "no te escuché lo suficiente, probá de nuevo".
- La clave del afinador sale del centro del registro: Sol si es Do4 o más, Fa si no.

## Archivos
- `src/lib/pitch/pitchMath.ts`: frecuencia → MIDI y cents, mediana, seguidor estable, percentiles del registro (lógica pura).
- `src/lib/pitch/micPitch.ts`: micrófono + `AnalyserNode` + `pitchy`, en marcha/pausa.
- `src/lib/pitch/voiceRange.ts`: leer y guardar `hh.voz.v1`.
- `tests/pitchMath.test.ts` (incluye senos sintéticos pasados por `pitchy`).
- `src/components/games/SingGame.tsx`, `VoiceRangeStep.tsx`, `TunerStep.tsx`, `PitchTrace.tsx`.
- Botón "Cantar" en `src/components/games/GamesPage.tsx`.

## Cambios durante la construcción
- **La escucha sigue el reloj del audio, no el de la pantalla** (un `ScriptProcessor` cada 1024 muestras, unas 43 veces por segundo). Con `requestAnimationFrame` el navegador la frenaba a 2–4 cuadros por segundo con la ventana oculta o tapada, y el registro fallaba. Así anda aunque Sofia cante mirando otra ventana.
- **La pastilla de la nota objetivo queda siempre gris.** Cuando estás afinada se prende la nota del pentagrama; prender también la pastilla repetía el mismo color.

## Prueba
Tests y tipos; después en el navegador interno, y **con la voz real de Sofia**. Lo que se pruebe solo con sonidos sintéticos se dice.
