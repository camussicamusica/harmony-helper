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

### 2. Color & design studio (Sofia's colors rule everything)
Every color in the app comes from one editable layer that Sofia controls from inside the app — never hard-coded, never needing Claude to change it.
- **Color roles, grouped:**
  - *Notes* — 12 pitch classes (C, C#/Db … B), Sofia's synesthesia colors. Default = her current colors.
  - *Chords* — major, minor, diminished, dominant 7, augmented, sus, "outside the scale". Default = her own choice; Callipari's palette is only an optional preset.
  - *Intervals* — m2 … octave (or steps 1/2, 1, 1.5).
  - *Patterns* — A, B, C… for repeated motifs.
  - *Functions / scale degrees* — tonic, subdominant, dominant; degrees 1–7.
  - *Interface* — background, text, highlights, playing note.
- **Add your own roles:** "+ new color" in any group (e.g. a new chord type or category she learns later), with a name and where it applies.
- **Picker:** full color wheel + hex + a library of named swatches (crimson, red, brown, pink, celeste, sky, navy, violet…), and her own saved swatches.
- **Where each color shows** is a setting per role (stem / notehead / accidental / piano key / square / circle outline / band).
- **Live preview:** changes appear immediately on the open score.
- **Clash warning:** if two roles that appear on the same screen are too similar, the studio says so (it doesn't block her).
- **Presets / versions:** save the whole set as "Sofia — October 2026", switch, duplicate, go back to an older one; export/import as a file. Old versions are never deleted.
- *Open question:* notes — same color in every octave, or darker low / lighter high? (The studio can support both; this is only the default.)

### 3. Height view (notes as heights)
- A strip under the score: each note of the selected hand drawn as a **square at its pitch height** (Callipari's notation 2A turned vertical), in your note color, time running left to right in sync with the score.
- Between consecutive notes, the **interval** is written on the connecting line: by default as a name (m2, M2, m3, M3, P4, TT, P5…) and optionally as steps (1/2, 1, 1.5) in Callipari's pink/blue/amber.
- The existing grey contour line on the score becomes this, with a toggle.
- Hover a note → its name, duration ("quarter = 1 beat"), and measure number.

### 4. Pattern finder (color-coded repeats)
- The app looks for **melodic patterns** (same sequence of intervals, even if it starts on another note) and **rhythmic patterns** (same sequence of durations), 2–8 notes long, that repeat.
- Each pattern gets a color band above the measures where it appears (A, B, C…), and a side list: "Pattern A — 4 notes, appears 6 times, measures 1, 3, 9…". Click a pattern → the score highlights every occurrence.
- Pattern colors come from the *Patterns* group in the studio.

### 5. Scale first
- The app detects the piece's **key / scale** from its notes (key signature + which notes appear how often), and shows it as a Callipari scale strip (squares with 1 / 1/2 steps) and as his mode tile when it's a mode (characteristic note lighter/darker).
- It always shows its confidence and the runner-up ("C major, or maybe A minor") — you can override it.
- **Scale practice**: play the scale on your MIDI keyboard up and down; the app waits for each correct note (wait mode), then at 50 / 75 / 100% speed.

### 6. Chords of the scale, then chords of the piece
- **Chords of the scale**: the 7 chords built by stacking every other note, as Callipari-style circles colored by chord type (colors from the studio) with their degree number 1–7, wired to the scale strip.
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
- Test scores (what Sofia is studying, 2026-10-24): Fito Páez *Un vestido y un amor* (A♭ major), Satie *Gnossienne* [which number: to be filled], Satie *Gymnopédie* [which number: to be filled], Pink Floyd *The Great Gig in the Sky*. Plus the bundled Bach excerpt.
  - Satie is public domain: free MusicXML exists. Fito Páez and Pink Floyd are copyrighted: use Sofia's own scores, private use only, never bundled in the app.
  - Gnossiennes have no bar lines and no key signature: a hard test for key detection and measure numbers. Good on purpose.
  - A♭ major (4 flats) tests flat spelling: the app must say A♭, not G#.
- Platform: Mac + Chrome only. iPad later, maybe; keep the layout from ruling it out.

## Open questions for Sofia
1. Note colors: same color in every octave, or shades by octave?
2. Which Gnossienne and which Gymnopédie (No. 1, 2, 3…)? Do you have MusicXML for the Fito Páez and Pink Floyd pieces, or only PDFs?
3. Height view: under the score (my suggestion) or on top of it?
4. Interval labels by default as names (m3, M3) or as steps (1, 1/2)?
