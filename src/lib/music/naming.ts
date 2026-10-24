import { Chord } from "tonal";
import type { ScheduledNote } from "./types";

const SOLFEGE: Record<string, string> = {
  C: "Do",
  D: "Re",
  E: "Mi",
  F: "Fa",
  G: "Sol",
  A: "La",
  B: "Si",
};

function accidentalGlyph(acc: string): string {
  return acc.replace(/b/g, "♭");
}

/** "F#" -> "Fa#", "Db" -> "Re♭". */
export function solfegeName(spelled: string): string {
  const letter = spelled[0]?.toUpperCase() ?? "";
  return `${SOLFEGE[letter] ?? letter}${accidentalGlyph(spelled.slice(1))}`;
}

/** "F#" -> "F#", "Db" -> "D♭". */
export function letterName(spelled: string): string {
  return `${spelled[0] ?? ""}${accidentalGlyph(spelled.slice(1))}`;
}

/** "Re (D)", "Do# (C#)", "Re♭ (D♭)". */
export function noteLabel(spelled: string): string {
  return `${solfegeName(spelled)} (${letterName(spelled)})`;
}

const NOTE_TYPES: Array<[number, string]> = [
  [4, "breve"],
  [1, "redonda"],
  [1 / 2, "blanca"],
  [1 / 4, "negra"],
  [1 / 8, "corchea"],
  [1 / 16, "semicorchea"],
  [1 / 32, "fusa"],
  [1 / 64, "semifusa"],
];

/** Spanish duration name from a length in whole notes (1 = redonda). */
export function durationNameFromWhole(len: number): string {
  let best = "negra";
  let bestErr = Infinity;
  for (const [base, name] of NOTE_TYPES) {
    for (const [mult, suffix] of [
      [1, ""],
      [1.5, " con puntillo"],
      [1.75, " con doble puntillo"],
    ] as Array<[number, string]>) {
      const err = Math.abs(base * mult - len);
      if (err < bestErr - 1e-9) {
        bestErr = err;
        best = name + suffix;
      }
    }
  }
  return best;
}

const INTERVALS = [
  "8ª", // 0 handled separately (unísono)
  "2ª m",
  "2ª M",
  "3ª m",
  "3ª M",
  "4ª J",
  "tritono",
  "5ª J",
  "6ª m",
  "6ª M",
  "7ª m",
  "7ª M",
];

/** Short Spanish interval name between two MIDI notes (absolute distance; compound intervals fold into the octave). */
export function intervalLabel(fromMidi: number, toMidi: number): string {
  const d = Math.abs(toMidi - fromMidi);
  if (d === 0) return "unísono";
  if (d % 12 === 0) return "8ª";
  return INTERVALS[d % 12];
}

const QUALITY_ES: Record<string, string> = {
  major: "mayor",
  minor: "menor",
  diminished: "disminuido",
  augmented: "aumentado",
  "dominant seventh": "séptima (dominante)",
  "major seventh": "maj7",
  "minor seventh": "m7",
  "suspended second": "sus2",
  "suspended fourth": "sus4",
};

function pcOf(spelled: string): string {
  return spelled;
}

/**
 * Chord name in Spanish, or null when nothing matches (never guesses).
 * `spelledLowToHigh` are note names without octave, lowest note first.
 */
export function chordName(spelledLowToHigh: string[]): string | null {
  const seen = new Set<string>();
  const pcs: string[] = [];
  for (const n of spelledLowToHigh) {
    const p = pcOf(n);
    if (!seen.has(p)) {
      seen.add(p);
      pcs.push(p);
    }
  }
  if (pcs.length < 3) return null;
  let symbols: string[] = [];
  try {
    symbols = Chord.detect(pcs);
  } catch {
    return null;
  }
  for (const sym of symbols) {
    const [main, bass] = sym.split("/");
    const c = Chord.get(main);
    if (c.empty || !c.tonic) continue;
    const q = QUALITY_ES[c.type];
    if (!q) continue;
    const root = solfegeName(c.tonic);
    return bass && bass !== c.tonic ? `${root} ${q} (bajo ${solfegeName(bass)})` : `${root} ${q}`;
  }
  return null;
}

/** Notes sounding at the moment `note` starts (same onset, plus notes still held), deduplicated, low to high. */
export function soundingAt(note: ScheduledNote, all: ScheduledNote[]): ScheduledNote[] {
  const eps = 1e-3;
  const t = note.startSec;
  const out: ScheduledNote[] = [];
  const seen = new Set<number>();
  for (const n of [...all].sort((a, b) => a.midi - b.midi)) {
    if (n.startSec <= t + eps && n.startSec + n.durationSec > t + eps) {
      if (seen.has(n.midi)) continue;
      seen.add(n.midi);
      out.push(n);
    }
  }
  return out;
}

export interface HoverText {
  line1: string;
  line2: string | null;
}

export function hoverText(note: ScheduledNote, all: ScheduledNote[]): HoverText {
  const line1 = `${noteLabel(note.spelledName)} · ${note.durationName} · compás ${note.measure}`;
  const group = soundingAt(note, all);
  let line2: string | null = null;
  const distinct = new Set(group.map((n) => n.midi % 12));
  if (group.length >= 2 && distinct.size >= 2) {
    const names = group.map((n) => solfegeName(n.spelledName));
    const chord = chordName(group.map((n) => n.spelledName));
    line2 = chord ? `${chord} · ${names.join(" · ")}` : names.join(" · ");
  }
  return { line1, line2 };
}
