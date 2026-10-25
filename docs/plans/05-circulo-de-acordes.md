---
type: project
updated: 2026-10-25
tags: [harmony-helper, plan]
---

# Build plan 5 — Círculo de acordes

A new collapsible section "Círculo" in the Ficha panel, between "Escala" and "Acordes de la escala". Inspired by an Instagram post Sofia liked (`docs/references/circulo-mi7-dominante.jpg`, `circulo-la-mayor-tonica.jpg`): the chord drawn on the 12 notes, plus where it sits on the tension arc "casa -> cima". One chord at a time, visual, with her own colors.

## What it shows (pure SVG, `src/components/analysis/ChordCircle.tsx`, ~360 px, responsive)
- **Ring:** the 12 pitch classes in the key's spelling (La♭ mayor shows Re♭, never Do#), clockwise, rotated so the TONIC is at the BOTTOM (angle = 90° + 30° x semitones above the tonic). Scale notes: normal label + small dot. Notes outside the scale: dim.
- **Chord shape:** its notes are dots filled with her note colors (`noteColor`; plain color when a note's color is off), joined in circle order into a polygon. Outline + translucent fill = the chord QUALITY role color (same as the outline of the circles in "Acordes de la escala"). Root dot slightly bigger. Outside the scale: dashed outline.
- **Tritone:** any two chord notes 6 semitones apart get a thin wavy line; hover: "tritono: la tensión".
- **Labels under the circle:** chord name ("Mi7", "La mayor") and the FULL function word (Tónica / Subdominante / Dominante) in a chip painted with the function role color. Never single letters T / SD / D (D is Re for her).
- **Tension arc:** below, left = Subdominante, bottom center = Tónica ("CASA"), right = Dominante. Gradient made of the three color-studio roles `function-subdominant`, `function-tonic`, `function-dominant` (read from the palette, never hard-coded; grey until she paints them). A ball sits at the current chord's function and glides along the arc when the chord changes (rAF; no animation with prefers-reduced-motion). Chord outside the scale: no ball, a small note instead.
- **Resolution arrows (Dominante only):** small curved arrows inside the ring from each chord note to the nearest note of the tonic triad when that is a semitone or a whole tone away (ties are skipped, never guessed). Emphasis (thicker, darker): the leading tone -> tonic, and the 7th -> 3rd of the tonic chord. Neutral color.
- Light theme, no glossy / neon: at most a soft halo on the dots.

## In the panel (`FichaPanel.tsx`)
- State: source ("Escala" | "Pieza") + index per source. Default: Escala, chord I.
- Clicking a circle in "Acordes de la escala" or an item in "Acordes de la pieza" also selects it in Círculo (existing play / highlight / scroll behaviour stays).
- Controls: "◀ Anterior" / "Siguiente ▶" (disabled at the ends); source toggle (Escala = I…vii°, follows the "Con séptima" switch; Pieza = the piece's chords in order, shows "compás N" and highlights / scrolls the score there); "Escuchar"; when the chord is Dominante, "Escuchar la resolución" (the chord, then the tonic chord).
- Key override: the circle takes the key from `ficha.key`, so it re-rotates to the new tonic.

## Code
- `src/lib/colors/roleColor.ts`: the `roleColor` helper that FichaPanel already had, now shared.
- `src/lib/music/analysis/audio.ts`: `playChordsInOrder(chords, gapSec)` (scheduled on the Tone clock).
- `src/lib/music/analysis/circle.ts`: pure geometry / logic (positions, spelling per pitch class, resolution arrows, tritones) so it can be checked without React.

## Not in this plan
Animated rotation when the key changes, showing inversions / bass as a separate dot, other circles (fifths).
