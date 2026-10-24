---
type: project
updated: 2026-10-24
status: draft — waiting for Sofia's approval
tags: [harmony-helper, spec]
---

# Harmony Helper — v1 spec

**One sentence:** upload a score you want to learn, and the app breaks it down so you *see* its structure — note colors, note heights and intervals, repeated patterns, its scale, its chords — and practise each piece of it on your MIDI keyboard before playing the whole thing.

Personal app, runs on Sofia's Mac (`npm run dev`, opens in the browser). No accounts, no server, everything saved locally.

Built on what already exists in `~/code/harmony-helper` (OSMD score rendering, 88-key piano, Tone.js playback, hand isolation, zoom). See `flowkey-study.md` and `callipari-method.md` for where the ideas come from.

---

## In v1

### 1. Score in
- Upload **MusicXML** (`.musicxml`, `.xml`, `.mxl`). Drag and drop or button.
- Remove the fake PDF path. A PDF shows: "PDF import comes in v2 — export MusicXML from MuseScore for now."
- Keep a small library of the scores you uploaded (saved in the browser), so you can come back to them.

### 2. Your note colors (synesthesia palette)
- A palette screen: 12 notes (C, C#/Db … B), each with a full color picker **plus** a row of named swatches (crimson, red, brown, pink, celeste, sky, navy, violet…) so close shades stay distinct.
- Colors apply to: stems + accidentals on the score (as today), the piano keys, the note squares in every view.
- Saved locally; export/import the palette as a small file.
- *Open question:* same color in every octave, or darker low / lighter high?

### 3. Height view (notes as heights)
- A strip under the score: each note of the selected hand drawn as a **square at its pitch height** (Callipari's notation 2A turned vertical), in your note color, time running left to right in sync with the score.
- Between consecutive notes, the **interval** is written on the connecting line: by default as a name (m2, M2, m3, M3, P4, TT, P5…) and optionally as steps (1/2, 1, 1.5) in Callipari's pink/blue/amber.
- The existing grey contour line on the score becomes this, with a toggle.
- Hover a note → its name, duration ("quarter = 1 beat"), and measure number.

### 4. Pattern finder (color-coded repeats)
- The app looks for **melodic patterns** (same sequence of intervals, even if it starts on another note) and **rhythmic patterns** (same sequence of durations), 2–8 notes long, that repeat.
- Each pattern gets a color band above the measures where it appears (A, B, C…), and a side list: "Pattern A — 4 notes, appears 6 times, measures 1, 3, 9…". Click a pattern → the score highlights every occurrence.
- Pattern colors use a separate palette from note colors, so they never clash.

### 5. Scale first
- The app detects the piece's **key / scale** from its notes (key signature + which notes appear how often), and shows it as a Callipari scale strip (squares with 1 / 1/2 steps) and as his mode tile when it's a mode (characteristic note lighter/darker).
- It always shows its confidence and the runner-up ("C major, or maybe A minor") — you can override it.
- **Scale practice**: play the scale on your MIDI keyboard up and down; the app waits for each correct note (wait mode), then at 50 / 75 / 100% speed.

### 6. Chords of the scale, then chords of the piece
- **Chords of the scale**: the 7 chords built by stacking every other note, as Callipari circles (pink major, blue minor, violet diminished, yellow dominant 7, green augmented) with their degree number 1–7, wired to the scale strip.
- **Chords of the piece**: the app names the chord in each beat/measure from the notes sounding together, writes it above the score as a small circle, and marks with a dashed outline any chord that is *outside* the scale (a first hint of borrowing or modulation).
- Click a chord circle → every place it appears lights up; play it on the piano.

### 7. Practice player (from Flowkey)
- MIDI keyboard input (Web MIDI — Chrome supports it).
- **Wait mode** on the score: it advances only when you play the right notes.
- Speeds 50 / 75 / 100%, left / right / both hands, **loop** a selection of measures.
- Real piano sound (sampled grand piano) instead of the current synth.

---

## Not in v1 (planned later, in this order)
1. **v2 — PDF in**: a small Python app around Audiveris (free, open source) that turns your PDF into MusicXML on your Mac; you check it before using it.
2. **v2 — Key changes timeline**: color each measure by its key/mode, find the **pivot chord** at each change (a chord shared by both keys), and list keys each chord belongs to.
3. **v3 — Borrowed chords and mode mixing**: compare with the parallel key (C vs Cm) and neighbouring modes; mark the bridge chord.
4. **v3 — Callipari's mode map** (14 tiles linked by one-note differences), secondary dominants (yellow satellites), tension graph T / SD / D.
5. Later: flashcard drills for reading notes, rhythm drills, iPad layout.

---

## Technical notes (for whoever builds it)
- Keep: React + Vite/TanStack, OpenSheetMusicDisplay, Tone.js. Add `tonal` (free, MIT) for scales/chords/intervals, `Tone.Sampler` with free Salamander piano samples, Web MIDI API.
- Key detection: key signature + pitch-class histogram scored against major/minor profiles and the 14 Callipari modes.
- Pattern finding: compare sequences of (interval, duration) per hand; keep repeats of length ≥ 2 that occur ≥ 2 times, prefer longer.
- Chord naming: group simultaneous notes per beat, match against chord shapes with `tonal`, fall back to "?" rather than guessing.
- Everything runs in the browser; storage = IndexedDB. Remove Lovable-only files.
- Test scores: the bundled Bach excerpt + 2–3 free MusicXML pieces Sofia chooses.

## Open questions for Sofia
1. Note colors: same color in every octave, or shades by octave?
2. Which 2–3 pieces should be the test scores? (Ideally ones you are studying now, as MusicXML.)
3. Height view: under the score (my suggestion) or on top of it?
4. Interval labels by default as names (m3, M3) or as steps (1, 1/2)?
5. Is the Mac + Chrome enough, or do you also want it on the iPad later?
