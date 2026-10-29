import { Note } from "tonal";
import { letterName, solfegeName } from "./naming";

/**
 * Written vs sounding pitch. A score is printed in WRITTEN pitch; a transposing instrument sounds
 * `<transpose><chromatic>` semitones away (B♭ trumpet = -2). `ScheduledNote.midi` stays the written
 * pitch, `soundingMidi` = midi + its part's transpose.
 */
export type TransposeKind = "none" | "uniform" | "mixed";

export interface TransposeInfo {
  /** Chromatic transpose of each part, in score order (0 = concert pitch). */
  parts: number[];
  /** none: every part at concert pitch. uniform: every part has the same non-zero transpose (a trumpet alone). mixed: anything else (an orchestra). */
  kind: TransposeKind;
  /** The shared transpose when `kind` is "uniform", else 0. */
  semitones: number;
}

export const NO_TRANSPOSE: TransposeInfo = { parts: [], kind: "none", semitones: 0 };

export function summarizeTranspose(parts: number[]): TransposeInfo {
  const clean = parts.map((p) => (Number.isFinite(p) ? Math.round(p) : 0));
  if (clean.every((p) => p === 0)) return { parts: clean, kind: "none", semitones: 0 };
  const first = clean[0];
  if (clean.every((p) => p === first)) return { parts: clean, kind: "uniform", semitones: first };
  return { parts: clean, kind: "mixed", semitones: 0 };
}

/**
 * Semitones to add to a pitch that analysis or the panels show (the written notes of a uniform score) to hear it.
 * A mixed score is analysed at concert pitch already, so its panels need no shift.
 */
export function playbackShift(info?: TransposeInfo | null): number {
  return info?.kind === "uniform" ? info.semitones : 0;
}

/** Sounding pitch of a note (its written pitch when the score does not transpose). */
export function soundingOf(n: { midi: number; soundingMidi?: number }): number {
  return n.soundingMidi ?? n.midi;
}

const UP_INTERVALS = ["1P", "2m", "2M", "3m", "3M", "4P", "4A", "5P", "6m", "6M", "7m", "7M"];

/** Tonal interval for a number of semitones: -2 -> "-2M", 3 -> "3m", -14 -> "-9M". */
export function intervalForSemitones(semitones: number): string {
  const s = Math.abs(Math.round(semitones));
  const octaves = Math.floor(s / 12);
  const base = UP_INTERVALS[s % 12];
  const name = octaves ? `${Number(base[0]) + 7 * octaves}${base.slice(1)}` : base;
  return semitones < 0 ? `-${name}` : name;
}

/** "G5" -> "F5" and "G" -> "F" for -2; keeps the octave when there is one. Double accidentals are simplified. */
export function transposeSpelled(spelled: string, semitones: number): string {
  if (!semitones) return spelled;
  const out = Note.transpose(spelled, intervalForSemitones(semitones));
  if (!out) return spelled;
  return Math.abs(Note.get(out).alt) > 1 ? Note.simplify(out) : out;
}

/** Display label of a key whose tonic sounds `semitones` away: ("D", "major", -2) -> "Do mayor". */
export function soundingKeyLabel(tonic: string, mode: "major" | "minor", semitones: number): string {
  return `${solfegeName(transposeSpelled(tonic, semitones))} ${mode === "major" ? "mayor" : "menor"}`;
}

/** Scientific octave following the spelling: B#3 is midi 60, Cb4 is midi 59. */
function octaveOf(midi: number, spelled: string): number {
  let acc = 0;
  for (const ch of spelled.slice(1)) acc += ch === "#" ? 1 : ch === "b" ? -1 : 0;
  return Math.floor((midi - acc) / 12) - 1;
}

/** "Sol5 (G5)" for a spelled name and the midi that fixes its octave. */
export function labelWithOctave(spelled: string, midi: number): string {
  const oct = octaveOf(midi, spelled);
  return `${solfegeName(spelled)}${oct} (${letterName(spelled)}${oct})`;
}

/** Written and sounding label of a note, or null when it sounds as written. */
export function writtenAndSounding(n: { midi: number; soundingMidi?: number; spelledName: string }): { written: string; sounding: string } | null {
  const diff = soundingOf(n) - n.midi;
  if (!diff) return null;
  return {
    written: labelWithOctave(n.spelledName, n.midi),
    sounding: labelWithOctave(transposeSpelled(n.spelledName, diff), soundingOf(n)),
  };
}

/** A note as it sounds: midi and spelling at concert pitch. */
export function toConcert<T extends { midi: number; soundingMidi?: number; spelledName: string }>(n: T): T {
  const diff = soundingOf(n) - n.midi;
  if (!diff) return n;
  return { ...n, midi: soundingOf(n), spelledName: transposeSpelled(n.spelledName, diff) };
}

/**
 * Notes to run key / chord analysis on. Parts that all transpose alike (or not at all) are analysed as written:
 * the printed signature and notes agree with each other. Mixed parts only agree at concert pitch, so they are
 * mapped to what sounds. The same array comes back when nothing changes.
 */
export function analysisNotes<T extends { midi: number; soundingMidi?: number; spelledName: string }>(
  notes: T[],
  info?: TransposeInfo | null,
): T[] {
  if (!info || info.kind !== "mixed") return notes;
  return notes.map(toConcert);
}

/** The printed signature is only a hint for the written pitches; at concert pitch of a mixed score it is not. */
export function analysisFifths(fifths: number | null | undefined, info?: TransposeInfo | null): number | null | undefined {
  return info?.kind === "mixed" ? null : fifths;
}
