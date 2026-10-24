---
type: project
updated: 2026-10-24
tags: [harmony-helper, plan]
---

# Build plan 1 — Color & design studio

Implements v1-spec §2. Goal: no color is hard-coded anywhere in the reader; every color is a role Sofia edits in the app.

## Data model — `src/lib/colors/`
- `types.ts`
  - `ColorGroup = "notes" | "chords" | "intervals" | "patterns" | "functions" | "interface"`
  - `ColorTarget = "stem" | "notehead" | "accidental" | "pianoKey" | "square" | "circleOutline" | "band" | "cssVar"`
  - `ColorRole { id: string; group: ColorGroup; name: string; color: string /* #rrggbb */; targets: ColorTarget[]; builtIn: boolean; hidden?: boolean }`
  - `Palette { id: string; name: string; createdAt: string; updatedAt: string; roles: ColorRole[]; swatches: string[] /* her saved swatches */ }`
- `defaults.ts` — the built-in roles:
  - notes: `note-0` … `note-11` (C, C#/Db … B). Naturals = her current colors (C #E53935, D #F9C81E, E #7EC8F2, F #8B5A2B, G #1E5FBF, A #F06292, B #8E24AA). Sharps start as a darker shade of the natural below (placeholder; she will repaint them) — they must no longer be identical to the natural. Targets: stem, accidental, pianoKey, square.
  - chords: major, minor, diminished, dominant7, augmented, sus, outsideScale. Defaults are neutral greys/soft tones (her choice later), NOT Callipari.
  - intervals: m2, M2, m3, M3, P4, TT, P5, m6, M6, m7, M7, P8.
  - patterns: A–F.
  - functions: tonic, subdominant, dominant, degree-1 … degree-7.
  - interface: background, text, highlight, playingNote, rightHand, leftHand (target cssVar → map to `--background`, `--foreground`, `--accent`, ..., `--rh`, `--lh`).
  - `NAMED_SWATCHES`: ~30 named colors incl. crimson, scarlet, red, brick, brown, chocolate, rose, pink, salmon, coral, amber, gold, yellow, olive, green, teal, celeste, sky, cornflower, blue, navy, indigo, violet, purple, lavender, grey, black, white.
  - `presets.ts`: "Callipari chords" preset = only chord roles (major #E8588F, minor #6CC4EE, diminished #A066E0, augmented #7AC943, dominant7 #F5C46A). Applying it changes only those roles.
- `store.ts` — tiny external store (no new dependency): `getPalette()`, `subscribe(fn)`, `useColors()` hook via `useSyncExternalStore`, `setRoleColor`, `addRole(group, name)`, `renameRole`, `hideRole` (custom roles are hidden, never destroyed), `saveVersion(name)` (snapshot copy; versions are never deleted), `listVersions()`, `switchVersion(id)`, `duplicateVersion`, `applyPreset`, `exportJson()`, `importJson(text)` (validates; imported palette becomes a new version). Persist in `localStorage` key `hh.colors.v1` with try/catch; missing built-in roles get merged in from defaults on load (so future roles appear without wiping hers).
- `color.ts` helpers: hex↔OKLab, `distance(a,b)` (ΔE OK), `darken/lighten`, `similarPairs(roles, threshold)` for the clash warning (compare within the same group and notes vs chords).
- `noteColor(midi)` — reads `note-(midi%12)` from the current palette. `src/lib/music/midiUtils.ts` `pitchClassColor` delegates to it (keep the export name; delete the hard-coded map).

## Wiring
- `ScoreView` / `parseMusicXml.applyStemColors`: subscribe to the store; on change, re-apply note colors (stems need an OSMD re-render — debounce ~150 ms; accidentals/`--note-color` can update without re-render). Only paint targets the role has switched on.
- `PianoView`: active key fill uses the note color when the note role has `pianoKey`, else RH/LH color.
- Interface roles write CSS variables on `document.documentElement`.

## Studio UI — `src/components/studio/ColorStudio.tsx`
- Opened by a "Colors" button (Palette icon) in `TopBar`; shadcn `Sheet` from the right so the score stays visible = live preview.
- Header: current version name (editable), dropdown of versions (switch / duplicate / "Save as new version…"), Export, Import, Presets menu.
- Tabs per group. Each role row: swatch button, name (editable for custom), hex input, native `<input type="color">`, a popover with the named-swatch grid + her saved swatches (+ "save this color"), target chips (toggle where it shows), and for custom roles a "hide" button.
- "+ New color" at the bottom of every tab.
- Clash banner at the top of a tab: "C# and D look almost the same" (warn, never block).
- Plain English labels; note names show both spellings (C#/D♭).

## Done when
- No `#rrggbb` literals left in reader code outside `src/lib/colors/`.
- Changing a note color in the studio repaints stems/accidentals on the open score within a second.
- Reload keeps changes; versions list survives; export → import round-trips.
- `bun run build` passes.

## Fade-out mode
Lets Sofia drop colors gradually as she learns to read, down to a plain black score.
- `ColorRole.enabled: boolean` (default true), separate from `hidden`. A disabled note role paints plain black (`PLAIN_COLOR`) on stem, accidental and square. On the piano, a disabled note falls back to the RH/LH hand color so the active key stays visible.
- TopBar "Note colors" strip: 12 round chips (C … B). Filled with the note color when on, grey outline when off. Click toggles, the score repaints live. "All" / "None" buttons sit beside it.
- Studio Notes tab: the same on/off switch on every note row.
- Saved versions keep the on/off state, so sets like "only C E A" are just versions. Persisted in `localStorage` with the colors.
