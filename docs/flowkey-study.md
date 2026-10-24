---
type: reference
updated: 2026-10-24
tags: [harmony-helper, flowkey]
---

# Flowkey study — what to borrow for Harmony Helper

Studied 2026-10-24 in the logged-in web app (app.flowkey.com). The Mac "app" is only a Chrome web-app shortcut to the same site.

## How Flowkey works inside

| Piece | What they use | What it means for us |
|---|---|---|
| Score + playback engine | Own compiled engine (`FlowPlayerWasm`, WebAssembly) drawing on `<canvas>` | Not reusable. We keep OSMD (renders any MusicXML), which is what we need for *your* scores. |
| Song data | Own binary format per song (`.fkdl`, "FKDL" header, packed numbers) made by their editors | Flowkey only works with songs they prepared by hand. They cannot open your PDFs. Our app must read any score: MusicXML now, PDF via Audiveris later. |
| Video | Filmed real piano from above (mp4) synced to the score | Nice, but needs a recording per piece. Skip; our virtual keyboard does the job. |
| Sound | Real grand piano samples, 4 loudness layers, about every 3rd key (pitch-shifted between) | Upgrade from Tone.js synth: use a sampled piano (e.g. Salamander samples via Tone.Sampler). |
| Listening to you | Microphone + an AI model (`tflite` WebAssembly) that detects notes; MIDI also supported | You have a MIDI keyboard: use Web MIDI (free, exact, no AI needed). |
| Data API | GraphQL with persisted queries | Irrelevant for a personal app. |

## Player features worth copying

1. **Wait Mode** — the score stops on each note until you play it (needs MIDI). Best single feature for learning to read.
2. **Speed steps** — 50% / 75% / original.
3. **Hand buttons** — left / right hand on or off.
4. **Loop** — drag handles to pick a passage and repeat it.
5. **One-line scrolling score** with a fixed "now" line, instead of pages.
6. **Two levels per piece** — beginner (simplified) and advanced.

## How their courses teach reading (structure to adapt)

- *Music Reading Training*: 8 weeks, a few notes per week (C-D-E right hand → F-G → C-B-A left hand → bass clef), each week = 1 short video + small exercises per note + one "guided song" that only uses those notes.
- *Intro to Music Reading*: pitch & piano → staff → treble clef → notes above → bass clef → notes below → accidentals.
- *Rhythm Basics*: note values → new values → pickup & dotted half → quarter rest & tie.
- *Major/Minor Scales*, *Mastering Chords* (4 basic chords → build any major/minor chord → inversions), *Improvising with Chords* (accompaniment patterns, 4-note chords, 6th/add9).

The pattern: **learn a tiny piece of theory → drill it alone → use it in a real piece.** Harmony Helper flips it to fit Sofia: **start from the real piece she uploads → the app extracts its scale, chords, patterns → drills exactly those → back to the piece.**

## What Flowkey does NOT do (Harmony Helper's reason to exist)

- No uploading your own scores.
- No interval names, height graph or melodic contour.
- No pattern detection / color-coding of repeated motifs.
- No key/scale detection, chord analysis, modulations or pivot chords for a piece.
- No custom note colors.
