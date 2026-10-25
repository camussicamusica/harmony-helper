import { noteLabel } from "@/lib/music/naming";
import type { KeyInfo } from "@/lib/music/analysis/key";

const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** "F#" for a pitch class: the key's own spelling if it belongs to the scale, otherwise flats in flat keys. */
export function pcSpelled(pc: number, key: KeyInfo): string {
  const i = key.pcs.indexOf(pc);
  if (i >= 0) return key.notes[i];
  return (key.fifths < 0 ? FLAT : SHARP)[mod12(pc)];
}

/** "Fa# (F#)" for a pitch class. */
export function pcLabel(pc: number, key: KeyInfo): string {
  return noteLabel(pcSpelled(pc, key));
}

/** The 8 pitch classes to play: degrees 1–7, then the tonic again (octave). */
export function scaleTargets(key: KeyInfo): number[] {
  return [...key.pcs, key.pcs[0]];
}

export interface ScaleStep {
  /** How many of the 8 targets have been played in order. */
  idx: number;
  /** A gentle hint, or null. */
  hint: string | null;
}

/**
 * One note-on of the "play the scale upward" task. Any octave, either hand, only the pitch class matters.
 * A wrong note gives a hint and never resets. Playing the previous note again is ignored (no hint).
 */
export function advanceScale(key: KeyInfo, idx: number, midi: number): ScaleStep {
  const targets = scaleTargets(key);
  if (idx >= targets.length) return { idx, hint: null };
  const pc = mod12(midi);
  if (pc === targets[idx]) return { idx: idx + 1, hint: null };
  if (idx > 0 && pc === targets[idx - 1]) return { idx, hint: null };
  const played = pcLabel(pc, key);
  const wanted = pcLabel(targets[idx], key);
  const sameLetter = letterOf(pc, key) === letterOf(targets[idx], key);
  return {
    idx,
    hint: sameLetter
      ? `Esa es ${played}; la escala usa ${wanted}.`
      : `Esa es ${played}; ahora va ${wanted}.`,
  };
}

const letterOf = (pc: number, key: KeyInfo): string => pcSpelled(pc, key)[0];

/** Pitch classes of the tonic triad (degrees 1, 3, 5). */
export function tonicTriadPcs(key: KeyInfo): number[] {
  return [key.pcs[0], key.pcs[2], key.pcs[4]];
}

export interface ChordCheck {
  done: boolean;
  /** Triad notes (as pitch classes) not pressed yet. */
  missing: number[];
  /** Pressed pitch classes that are not in the triad. */
  extra: number[];
}

/** The pressed set's pitch classes must equal the tonic triad: any inversion or voicing. */
export function checkTonicChord(key: KeyInfo, pressed: ReadonlySet<number>): ChordCheck {
  const target = new Set(tonicTriadPcs(key));
  const have = new Set([...pressed].map(mod12));
  const missing = [...target].filter((p) => !have.has(p));
  const extra = [...have].filter((p) => !target.has(p));
  return { done: pressed.size >= 3 && missing.length === 0 && extra.length === 0, missing, extra };
}
