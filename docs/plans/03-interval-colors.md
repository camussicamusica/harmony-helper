---
type: project
updated: 2026-10-24
tags: [harmony-helper, plan]
---

# Build plan 3 — Interval colors

Grammar: NOTES = circles (rings) and stems. INTERVALS = the line plus a filled pill label.

## Line color mode
- Segmented control "Color de la línea: Notas / Intervalos / Ambos" next to "Línea melódica" (`src/lib/music/lineMode.ts`, localStorage `hh.lineMode.v1`, try/catch).
- Notas: as before (gradient between note colors, optional labels).
- Intervalos: segment in the interval role color, 3.5px, label in a filled pill (black or white text by contrast). Rings are neutral dark grey (`RING_NEUTRAL_COLOR`).
- Ambos: same segments and pills, rings keep note colors.
- Interval = simple interval, semitones mod 12; 12 -> P8; 0 -> unison (`interval-P1`, neutral grey, new built-in role).
- The old label switch is renamed "Etiquetas" and only works in Notas; in Intervalos/Ambos pills always show.
- Stems are drawn by OSMD and keep note colors in every mode.

## Legend
`IntervalLegend`: bottom-right of the score, pointer-events-none, only the intervals present in the visible hands, shown in Intervalos/Ambos.

## Interval strip ("Un salto a la vez")
`IntervalStrip` in the top bar (Intervalos/Ambos): chips 2ª m … 8ª, Todos / Ninguno, and "Estudiar de a uno" (leaves one interval on, each click moves to the next, shows the active one). A disabled interval is a 1.5px light-grey segment with no pill. Free mode (all on) and one-at-a-time both work; the unison is never toggled.

## Default colors
P1 #9CA3AF (grey), m2 #7B1E3A, M2 #E4572E, m3 #F2A33A, M3 #D4B106, P4 #7CB342, TT #00897B, P5 #1E88E5, m6 #3949AB, M6 #8E24AA, m7 #EC407A, M7 #795548, P8 #00ACC1. Hers to repaint in the studio.

## Migration
`mergeDefaults` in `store.ts` (runs on load, import and version sanitize): an interval role whose color still equals its old grey placeholder (`OLD_INTERVAL_GREYS`) gets the new default. Repainted roles are untouched. The new `interval-P1` role is added by the normal missing-role merge.
