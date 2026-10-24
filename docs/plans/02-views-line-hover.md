---
type: project
updated: 2026-10-24
tags: [harmony-helper, plan]
---

# Build plan 2 — Two views, melodic line, hover labels

Approved by Sofia 2026-10-24. Her complaint: the score sits in a small inner window that has to be scrolled up and down with the mouse wheel, under the piano, so she never sees it whole. She loves Flowkey's layout.

## 1. Two views (toggle in the toolbar: "Tocar" / "Estudiar")
Both views have **no inner vertical scroll window** for the score.
- **Tocar (Flowkey-style)**
  - OSMD option `renderSingleHorizontalStaffline: true`.
  - The score is one big line in a full-width band that scrolls horizontally.
  - A fixed vertical "now" line sits at ~30% from the left. During playback the band scrolls smoothly so the current time stays under that line (use scheduler time + note startSec/x positions; interpolate between notes, requestAnimationFrame).
  - When stopped, she can drag or shift-scroll the band horizontally.
  - The piano is docked at the bottom and the score band fills the rest of the height. The score is vertically centered and sized so both staves are large (auto zoom to fit the band height; zoom slider still works).
- **Estudiar**
  - Normal OSMD page layout, wrapped to the container width, so the whole piece is visible. The page itself scrolls (no nested scroll box).
  - The piano is collapsed by default, with a "Mostrar teclado" toggle.
- Compact the top area: the toolbar is one or two rows max, and the big "Upload Score" drop zone becomes a button in the toolbar ("Abrir partitura") plus drag-and-drop anywhere on the page. Do not remove the upload functionality.
- Remember the chosen view in localStorage (try/catch).

## 2. Melodic line ("Línea melódica", replaces "Contour Lines")
- Overlay SVG on top of the rendered score (pointer-events: none). Notes stay visible.
- One line per hand: a small dot on each notehead center, connected in time order to the next note of the same hand.
  - For chords within one hand, use the top note for RH and the bottom note for LH.
- **Colors from the studio:** each segment uses a gradient from the start note's color to the end note's color (`noteColor(midi)`, so fade-out/disabled notes are plain). Line ~2.5px, dots ~4px radius, slight white halo so it reads over staff lines.
- **Phrase breaks:** the line breaks at rests, and at the end of a slur when slurs exist. It never draws across a system break (Estudiar view).
- Optional per-segment interval label (toggle "Intervalos"): short Spanish names placed at the segment midpoint: 2ª m, 2ª M, 3ª m, 3ª M, 4ª J, tritono, 5ª J, 6ª m, 6ª M, 7ª m, 7ª M, 8ª. Use `tonal` (add the dependency: `bun add tonal`) or a simple semitone table.
- Redraw on render, zoom, view change, color change and isolation change (only the visible hand when isolated).

## 3. Hover labels
- Hovering a notehead shows a small tooltip near the cursor, e.g. **"Re (D) · negra · compás 2"**.
  - Spanish solfège + letter in parentheses: Do (C), Do# (C#) / Re♭ (D♭), following the score's spelling.
  - Duration in Spanish: redonda, blanca, negra, corchea, semicorchea (+ "con puntillo").
  - Measure number.
- When several notes sound together at that moment (both hands, same onset; include notes still held), show a second line with the chord: **"Fa# menor · Fa# · La · Do#"**.
  - Detect it with `tonal` `Chord.detect` on the pitch classes.
  - Translate the quality to Spanish: mayor, menor, disminuido, aumentado, séptima (dominante), maj7, m7, sus2, sus4.
  - If nothing matches, show only the note names; never guess.
- Keep the existing behaviour (lighting the piano key, colouring the note).
- Data needed: extend `ScheduledNote` with `measure`, `durationName`, `spelledName` (from OSMD Pitch: FundamentalNote + AccidentalHalfTones), `isRestBefore`/phrase info and the notehead center coordinates.

## Done when
- Neither view has a nested vertical scroll box. In Tocar, playback keeps the current note under the fixed line.
- The line is visible over the notes in note colors, breaks at rests, and has optional interval labels.
- Hovering a note shows its Spanish name, duration and measure; a 3-note chord shows its name and notes.
- `bun run build` passes.
