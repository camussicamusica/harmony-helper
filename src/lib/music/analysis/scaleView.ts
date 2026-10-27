import { Note, Scale } from "tonal";
import type { Hand, ScheduledNote } from "../types";
import { solfegeName } from "../naming";
import { noteChipStyle } from "@/lib/colors/noteChip";
import type { Clef, Accidental } from "../staffMath";
import { octaveOf, spelledPitchClass } from "./noteContext";
import type { KeyInfo } from "./key";

/** One note of the drawn scale. */
export interface ScaleStep {
  /** With octave: "C#5". */
  spelled: string;
  midi: number;
  /** 1..7 (the closing tonic is 1 again). */
  degree: number;
  pc: number;
  /** The song uses this pitch class in the passage. */
  used: boolean;
  /** This is the note she opened. */
  hovered: boolean;
}

/** The hovered note when it is not in the scale: drawn as an extra notehead next to the degree it alters. */
export interface ScaleExtra {
  spelled: string;
  midi: number;
  pc: number;
  /** Index in `steps` of the degree it alters; the extra head goes right after it. */
  afterIndex: number;
  /** "n" when the plain letter needs a natural sign (C natural in D major), else its own accidental. */
  accidental: Accidental | "n";
  /** "alterada: Do en vez de Do#" */
  text: string;
}

export interface ScaleView {
  clef: Clef;
  keyLabel: string;
  steps: ScaleStep[];
  extra: ScaleExtra | null;
  /** Index in `steps` of the ringed note; null when the hovered note is an out-of-scale one (the extra is ringed). */
  hoveredIndex: number | null;
  /** Measures the marking is based on (previous, current, next; clipped to the piece). */
  passage: { from: number; to: number };
  legend: string;
  /** Harmonic minor: "(sensible elevada, menor armónica)". */
  note: string | null;
}

export const clefForHand = (hand: Hand): Clef => (hand === "RH" ? "treble" : "bass");

/** Measures [m-1, m+1] clipped to the measures the piece really has. */
export function passageRange(notes: Pick<ScheduledNote, "measure">[], measure: number): { from: number; to: number } {
  let lo = Infinity;
  let hi = -Infinity;
  for (const n of notes) {
    if (n.measure < lo) lo = n.measure;
    if (n.measure > hi) hi = n.measure;
  }
  if (!Number.isFinite(lo)) return { from: measure, to: measure };
  return { from: Math.max(lo, measure - 1), to: Math.min(hi, measure + 1) };
}

/** Pitch classes (0..11, by spelling) of every note, in any staff, in the measures [from, to]. */
export function pitchClassesInPassage(
  notes: Pick<ScheduledNote, "measure" | "spelledName">[],
  from: number,
  to: number,
): Set<number> {
  const out = new Set<number>();
  for (const n of notes) if (n.measure >= from && n.measure <= to) out.add(spelledPitchClass(n.spelledName));
  return out;
}

export function passageLegend(from: number, to: number): string {
  const where = from === to ? `compás ${from}` : `compases ${from}–${to}`;
  return `En color: las que suenan en este pasaje (${where})`;
}

/**
 * Octave of the scale's first tonic that keeps the scale around `midi`: the one whose span (tonic..tonic+12) contains
 * it, else the closest span. `tonicBase` is the tonic spelled without octave.
 */
export function pickTonicOctave(tonicBase: string, midi: number): number {
  let best = 4;
  let bestScore = Infinity;
  for (let oct = 1; oct <= 6; oct++) {
    const lo = Note.midi(`${tonicBase}${oct}`);
    if (lo === null) continue;
    const hi = lo + 12;
    const outside = midi < lo ? lo - midi : midi > hi ? midi - hi : 0;
    const score = outside * 100 + Math.abs((lo + hi) / 2 - midi);
    if (score < bestScore) {
      bestScore = score;
      best = oct;
    }
  }
  return best;
}

const splitOct = (n: string) => /^(.*?)(-?\d+)$/.exec(n)!;

/** Her stored note color for a pitch class, even when colors are off on the score; black only if the role has no color. */
export function headFill(pc: number, roles: Parameters<typeof noteChipStyle>[1]): string {
  const st = noteChipStyle(pc, roles);
  return st.neutral ? "#111111" : st.background;
}

/**
 * The whole ascending scale of the piece's key (tonic to tonic, 8 notes), with the hovered note ringed and the
 * notes the song uses around this measure marked. Null if the scale cannot be built.
 */
export function buildScaleView(
  note: Pick<ScheduledNote, "midi" | "spelledName" | "hand" | "measure">,
  key: KeyInfo,
  all: Pick<ScheduledNote, "measure" | "spelledName">[],
): ScaleView | null {
  const tonicBase = key.tonic;
  const hoveredPc = spelledPitchClass(note.spelledName);
  const raised7 = key.mode === "minor" && hoveredPc === (key.tonicPc + 11) % 12 && !key.pcs.includes(hoveredPc);
  const oct = pickTonicOctave(tonicBase, note.midi);
  const tonic = `${tonicBase}${oct}`;
  const scale = Scale.get(`${tonic} ${key.mode === "major" ? "major" : raised7 ? "harmonic minor" : "minor"}`);
  if (scale.empty || scale.notes.length !== 7) return null;
  const names = [...scale.notes, Note.transpose(tonic, "8P")];
  const { from, to } = passageRange(all, note.measure);
  const used = pitchClassesInPassage(all, from, to);

  const steps: ScaleStep[] = names.map((spelled, i) => {
    const midi = Note.midi(spelled) ?? 0;
    return {
      spelled,
      midi,
      degree: (i % 7) + 1,
      pc: spelledPitchClass(splitOct(spelled)[1]),
      used: used.has(spelledPitchClass(splitOct(spelled)[1])),
      hovered: false,
    };
  });

  let hoveredIndex: number | null = null;
  let extra: ScaleExtra | null = null;
  const inScale = steps.some((s) => s.pc === hoveredPc);
  if (inScale) {
    // Same pitch class; the tonic appears twice, so take the one closest in pitch.
    let bestD = Infinity;
    steps.forEach((s, i) => {
      if (s.pc !== hoveredPc) return;
      const d = Math.abs(s.midi - note.midi);
      if (d < bestD) {
        bestD = d;
        hoveredIndex = i;
      }
    });
    if (hoveredIndex !== null) steps[hoveredIndex].hovered = true;
  } else {
    const letter = note.spelledName[0].toUpperCase();
    // Nearest scale step with the same letter (the tonic's letter appears twice).
    let idx = -1;
    let bestD = Infinity;
    steps.forEach((s, i) => {
      if (s.spelled[0] !== letter) return;
      const d = Math.abs(s.midi - note.midi);
      if (d < bestD) {
        bestD = d;
        idx = i;
      }
    });
    if (idx >= 0) {
      const base = steps[idx];
      const own = /^[A-G](##|#|bb|b)?/.exec(note.spelledName)?.[1] ?? "";
      const baseName = splitOct(base.spelled)[1];
      const extraOct = splitOct(base.spelled)[2];
      const spelled = `${letter}${own}${extraOct}`;
      extra = {
        spelled,
        midi: Note.midi(spelled) ?? note.midi,
        pc: hoveredPc,
        afterIndex: idx,
        accidental: own ? (own as Accidental) : "n",
        text: `alterada: ${solfegeName(note.spelledName)} en vez de ${solfegeName(baseName)}`,
      };
    }
  }

  return {
    clef: clefForHand(note.hand),
    keyLabel: key.label,
    steps,
    extra,
    hoveredIndex,
    passage: { from, to },
    legend: passageLegend(from, to),
    note: raised7 ? "(sensible elevada, menor armónica)" : null,
  };
}

export { octaveOf };
