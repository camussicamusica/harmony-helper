import { assignModifiers, type HeadBox, type ModBox } from "./closeup";

/** Pure helpers: which note does each printed accidental belong to (so it can wear that note's color). */

export type KeySigClef = "treble" | "bass";

export interface KeySigGlyph {
  /** Sharp or flat. */
  kind: "#" | "b";
  /** Pitch class of the altered note (F# -> 6, Bb -> 10). */
  pc: number;
  /** Staff position, in half-spaces from the bottom line (0 = bottom line, 1 = first space, 8 = top line). */
  step: number;
}

// Order of appearance, with the pitch class of the *altered* note and its line in each clef.
const SHARPS: Array<{ pc: number; treble: number; bass: number }> = [
  { pc: 6, treble: 8, bass: 6 }, // F#
  { pc: 1, treble: 5, bass: 3 }, // C#
  { pc: 8, treble: 9, bass: 7 }, // G#
  { pc: 3, treble: 6, bass: 4 }, // D#
  { pc: 10, treble: 3, bass: 1 }, // A#
  { pc: 5, treble: 7, bass: 5 }, // E#
  { pc: 0, treble: 4, bass: 2 }, // B#
];
const FLATS: Array<{ pc: number; treble: number; bass: number }> = [
  { pc: 10, treble: 4, bass: 2 }, // Bb
  { pc: 3, treble: 7, bass: 5 }, // Eb
  { pc: 8, treble: 3, bass: 1 }, // Ab
  { pc: 1, treble: 6, bass: 4 }, // Db
  { pc: 6, treble: 2, bass: 0 }, // Gb
  { pc: 11, treble: 5, bass: 3 }, // Cb
  { pc: 4, treble: 1, bass: -1 }, // Fb
];

/** The glyphs of a key signature, left to right, with the note each one alters. fifths > 0 sharps, < 0 flats. */
export function keySigAccidentals(fifths: number, clef: KeySigClef): KeySigGlyph[] {
  const n = Math.max(0, Math.min(7, Math.abs(Math.round(fifths))));
  const table = fifths >= 0 ? SHARPS : FLATS;
  return table.slice(0, n).map((e) => ({ kind: fifths >= 0 ? "#" : "b", pc: e.pc, step: clef === "treble" ? e.treble : e.bass }));
}

type Mod = ModBox & { h?: number };
/** A dot is small both ways; a narrow sharp or flat is still tall. */
const isDotMod = (m: Mod, sp: number) => m.w < 0.7 * sp && (m.h ?? 0) < 0.9 * sp;

/** Owner head of every modifier (accidentals and dots), -1 for none. Same rule as the close-up, with the narrow-sharp fix. */
export function modifierOwners(heads: readonly HeadBox[], mods: readonly Mod[], sp: number): number[] {
  return assignModifiers(
    heads,
    mods.map((m) => ({ cy: m.cy, left: m.left, right: m.right, w: isDotMod(m, sp) ? m.w : Math.max(m.w, 0.7 * sp) })),
    sp,
  );
}

/** Printed accidentals only (dots excluded): for each modifier, the index of the head it belongs to, or -1. */
export function accidentalOwners(heads: readonly HeadBox[], mods: readonly Mod[], sp: number): number[] {
  return modifierOwners(heads, mods, sp).map((o, i) => (isDotMod(mods[i], sp) ? -1 : o));
}

/** The MIDI note with pitch class `pc` that lies nearest to `ref` (ties go up). Used to play a chip that only knows its name. */
export function nearestMidiForPc(pc: number, ref: number): number {
  const p = ((pc % 12) + 12) % 12;
  let best = ref - (((ref % 12) + 12) % 12) + p; // same octave block as ref
  if (best - ref > 6) best -= 12;
  if (ref - best > 6) best += 12;
  return best;
}
