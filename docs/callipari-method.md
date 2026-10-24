---
type: reference
updated: 2026-10-24
tags: [harmony-helper, callipari]
---

# Brian Callipari's visual method — what Harmony Helper takes from it

Sources: Sofia's own copies in `~/Desktop/SOFIA/Books/Music/` — *Illustrated Harmony* (153 pp), *Illustrated Harmony 2* (219 pp), *Illustrated Modes* (190 pp). Modes and Harmony 1 were viewed page by page as images; Harmony 2 about 40 pages as images plus full text. Paraphrased, not copied.

## The three books in one line each
- **Illustrated Harmony** — an atlas of how chords connect: closeness = shared notes, circle of fifths, pivot chords between keys.
- **Illustrated Harmony 2** — composing from chords: inversions, the "glue" index, tension graph, secondary dominants, a real piece analysed (Pachelbel's Canon).
- **Illustrated Modes** — scales and modes: harmonise a scale, the one note that gives each mode its character, a map of 14 modes linked when they differ by one note, how to mix modes.

## The visual language (identical across the books)
- Dark background (~#1C1C1C), white/grey text, green hand-drawn annotations kept on a separate layer from the data.
- **Notes = squares** (outline, no fill), on a dashed line. Between squares, the step: pink **1** = whole tone, blue **1/2** = semitone, amber **1.5** = augmented second.
  - His "notation 2A": no numbers, the *gap itself* is proportional to the step. That is Sofia's "notes as heights" idea, turned sideways.
- **Chords = circles** (outline only), name inside, notes underneath in small caps. Color = chord quality:
  - major pink ~#E8588F · minor light blue ~#6CC4EE · diminished violet ~#A066E0 · augmented green ~#7AC943 · dominant 7 yellow ~#F5C46A
- **Chord → scale wiring**: a chord circle with a colored "bus" line that drops onto its root, 3rd and 5th squares on the scale strip (chords above the strip drop down, chords below rise up, so lines never cross).
- **Mode node tile**: two bands; top band pastel pink (major mode) or pastel blue (minor mode) with the mode name, parent scale tag (Maj / Me / Ar), tension label (add#11, 6, b9…) and the 2 "pillar" chords; bottom band 7 cells with the notes. The note that differs from the reference (Ionian or Aeolian) is lighter + glow if raised, darker + inner shadow if lowered.
- **Mode map**: 14 tiles, a line between two tiles when they differ by exactly one note (compute it, don't hand-draw it).

## The method (teaching order)
1. See the whole map first, then zoom in.
2. **Harmonise a scale**: stack every other note → the 7 chords. The one skill to master first.
3. Compare two scales that differ by one note; **one changed note changes three chords**.
4. A **mode** = rotate the scale *and* feel the new first note as home.
5. Each mode has a **characteristic note** (the one that differs from Ionian/Aeolian): Lydian F#, Mixolydian Bb, Dorian A, Aeolian Eb, Phrygian Db…
6. To make a mode sound like itself: use the chords that contain the characteristic note, drop the chords it shares with the reference, avoid diminished/dominant-7 (their tritone pulls to another key), lean on the tonic, repeat the characteristic note in the melody.
7. **Function from shared notes**: tonic = chords sharing 2 notes with I (I, iii, vi); subdominant = contains the 4th (ii, IV); dominant = contains the tritone (V7, vii°).
8. **Modulation by pivot**: a chord that belongs to both keys is the door. Every triad lives in exactly 3 major keys. **Mixing modes**: the shared chord is the bridge; two modes can also fuse into one new scale (Lydian + Mixolydian → Lydian b7).
9. **Analysing a piece** (Harmony 2, Canon): list the scale's chords → number them 1–7 → map each chord of the piece to a number → group T / SD / D → draw the tension curve → count chord types.

## What his books do NOT give us (Sofia's own contribution)
- Note heights for a *melody* in a real score (he does it for chords and scales only).
- Automatic key/mode detection from a score.
- Pattern finding (repeated motifs) and color-coding them.
- A dedicated borrowed-chord method (only hints: parallel keys, F→Fm→C, harmonic/melodic minor lists).
- Synesthesia note colors.

## Color conflict to solve
His chord colors (pink = major, blue = minor) will sit on the same screen as Sofia's note colors (A = pink, E = celeste…). Rule for the app: **note colors live only on notes (stems, squares, keys); chord colors live only on chord circles (outline, never fill).** Both palettes are editable.
