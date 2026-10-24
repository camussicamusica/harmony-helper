---
type: project
updated: 2026-10-24
tags: [harmony-helper, plan]
---

# Build plan 4 — Ficha de la pieza

Implements v1-spec §5 (escala primero) and §6 (acordes de la escala, luego de la pieza). First step of the "recorrido de una pieza" in `vision-analisis-sintactico.md`: "Esta pieza está en X, usa esta escala, estos acordes".

Grammar (Callipari): NOTES = squares filled with her note colors. CHORDS = outline circles, outline color = chord quality role, name inside, degree + function underneath, notes in small text. Dashed outline = outside the scale.

## Analysis (pure functions, `src/lib/music/analysis/`)
- `key.ts`
  - Input: key signature (fifths, from OSMD) + duration-weighted pitch-class histogram (12 values).
  - Pearson correlation against Krumhansl-Kessler major/minor profiles, 24 keys. Key signature is a prior: +0.12 to the major key and the minor key that share it (compared by pitch class, so F# / Gb are the same signature).
  - Output: best, runner-up, confidence 0–1 (margin to the runner-up 60% + absolute fit 40%). Words: >= 0.6 "bastante seguro", else "dudoso: ¿o X?".
  - Spelling with tonal (A♭ major -> La♭ Si♭ Do Re♭ Mi♭ Fa Sol). Minor = natural minor.
  - Extra field `mode`: of the 7 church modes of that note collection, the one whose tonic is the most weighted bass note (final note counts extra). It only differs from major/minor when the candidate beats the key's own tonic by 25%+; otherwise no modal claim.
- `chords.ts`: the 7 diatonic triads (or 7th chords), degree, Spanish name, notes, quality -> color role, function. T/SD/D follows Callipari's shared-notes rule on the relative major: major I iii vi = T, ii IV = SD, V vii° = D; natural minor is the same chords re-read (i III v = T, iv VI = SD, ii° VII = D).
- `pieceChords.ts`: segment by beat (time signature; compound 6/8 etc. = dotted-quarter beats; fallback quarter), pitch classes sounding in each segment (held notes count if they cover >= 20% of the beat or start on it), `tonal` detection, degree in the detected key or "fuera de la escala", merge consecutive identical. A beat with fewer than 3 different notes is joined with the following beats of the same measure until a chord appears. If nothing is found, there is no chord (never guess).
  - Result item: `{startSec, endSec, measure, beat, name, degree|null, quality, notes, inScale, ...}`.

## UI
- `FichaPanel` (Sheet, right, no overlay, `modal={false}`), opened by one "Ficha" button in the top bar. Four collapsible sections: Tonalidad (label, confidence in words, override select of 24 keys saved per score in localStorage keyed by a hash of the XML), Escala (strip + "Escuchar"), Acordes de la escala (7 circles, toggle triadas / séptimas, click = play + highlight everywhere), Acordes de la pieza (list; click = scroll the score there + highlight).
- Score overlay `ChordOverlay`: its own SVG over the score (same coordinate system as the melodic line), small circles above the top staff of each system at each chord change. Toggle "Acordes sobre la partitura" in the panel. Highlight = thicker outline + pulse on the circles and an outline on the noteheads of those segments.
- Audio: existing sampler (`getSampler`), falls back to a simple Tone synth if samples don't load.
- Top bar: only "Ficha" is added. Color mode, "Etiquetas siempre" and the interval strip move to a collapsible "Capas" row, closed by default, state in `hh.layersOpen.v1`.

## Not in this plan
Practice with the MIDI keyboard, neighbor scales / modulations (v2), seek of the audio transport (Tocar only scrolls the band).
