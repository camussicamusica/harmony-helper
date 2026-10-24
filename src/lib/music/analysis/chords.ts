import { solfegeName } from "../naming";
import type { KeyInfo } from "./key";

export type ChordQuality =
  | "major"
  | "minor"
  | "diminished"
  | "augmented"
  | "dominant7"
  | "major7"
  | "minor7"
  | "halfDim7"
  | "dim7"
  | "sus";

export type ChordFunction = "T" | "SD" | "D";

/** Color role id (see src/lib/colors) for each chord quality. */
export const QUALITY_ROLE: Record<ChordQuality, string> = {
  major: "chord-major",
  major7: "chord-major",
  minor: "chord-minor",
  minor7: "chord-minor",
  diminished: "chord-diminished",
  halfDim7: "chord-diminished",
  dim7: "chord-diminished",
  augmented: "chord-augmented",
  dominant7: "chord-dominant7",
  sus: "chord-sus",
};

export const QUALITY_ES: Record<ChordQuality, string> = {
  major: "mayor",
  minor: "menor",
  diminished: "disminuido",
  augmented: "aumentado",
  dominant7: "7",
  major7: "maj7",
  minor7: "m7",
  halfDim7: "m7♭5",
  dim7: "dim7",
  sus: "sus",
};

export const FUNCTION_ROLE: Record<ChordFunction, string> = {
  T: "function-tonic",
  SD: "function-subdominant",
  D: "function-dominant",
};

export const FUNCTION_ES: Record<ChordFunction, string> = {
  T: "Tónica",
  SD: "Subdominante",
  D: "Dominante",
};

export const isSeventh = (q: ChordQuality) =>
  q === "dominant7" || q === "major7" || q === "minor7" || q === "halfDim7" || q === "dim7";

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Quality from semitones above the root of the 3rd, 5th and (optional) 7th. */
export function qualityFromIntervals(third: number, fifth: number, seventh?: number): ChordQuality | null {
  if (seventh === undefined) {
    if (third === 4 && fifth === 7) return "major";
    if (third === 3 && fifth === 7) return "minor";
    if (third === 3 && fifth === 6) return "diminished";
    if (third === 4 && fifth === 8) return "augmented";
    return null;
  }
  if (third === 4 && fifth === 7 && seventh === 11) return "major7";
  if (third === 4 && fifth === 7 && seventh === 10) return "dominant7";
  if (third === 3 && fifth === 7 && seventh === 10) return "minor7";
  if (third === 3 && fifth === 6 && seventh === 10) return "halfDim7";
  if (third === 3 && fifth === 6 && seventh === 9) return "dim7";
  return null;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

export function romanFor(index: number, q: ChordQuality): string {
  const base = ROMAN[index];
  const lower = q === "minor" || q === "diminished" || q === "minor7" || q === "halfDim7" || q === "dim7";
  const r = lower ? base.toLowerCase() : base;
  switch (q) {
    case "diminished":
      return `${r}°`;
    case "augmented":
      return `${r}+`;
    case "dominant7":
    case "minor7":
      return `${r}7`;
    case "major7":
      return `${r}maj7`;
    case "halfDim7":
      return `${r}ø7`;
    case "dim7":
      return `${r}°7`;
    case "sus":
      return `${r}sus`;
    default:
      return r;
  }
}

/** Function of each scale degree (index 0..6). Callipari: shared notes with I on the relative major. */
const MAJOR_FUNCTIONS: ChordFunction[] = ["T", "SD", "T", "SD", "D", "T", "D"];
export function functionOf(mode: "major" | "minor", index: number): ChordFunction {
  return MAJOR_FUNCTIONS[mode === "major" ? index : (index + 5) % 7];
}

export interface ScaleChord {
  /** 1..7 */
  degree: number;
  /** I, ii, iii, IV, V, vi, vii° */
  roman: string;
  /** Spelled root: "F#". */
  root: string;
  rootPc: number;
  /** "Fa#" */
  rootEs: string;
  quality: ChordQuality;
  /** "menor", "7", "maj7"… */
  qualityEs: string;
  /** "Fa# menor" */
  name: string;
  /** Spelled notes, root first. */
  notes: string[];
  /** Same notes in solfège: "Fa#". */
  notesEs: string[];
  pcs: number[];
  roleId: string;
  fn: ChordFunction;
}

/** The 7 diatonic chords of a key (triads, or 7th chords with `sevenths`). */
export function scaleChords(key: KeyInfo, sevenths = false): ScaleChord[] {
  const out: ScaleChord[] = [];
  for (let i = 0; i < 7; i++) {
    const idx = sevenths ? [0, 2, 4, 6] : [0, 2, 4];
    const notes = idx.map((k) => key.notes[(i + k) % 7]);
    const pcs = idx.map((k) => key.pcs[(i + k) % 7]);
    const root = pcs[0];
    const iv = pcs.slice(1).map((p) => mod12(p - root));
    const quality = qualityFromIntervals(iv[0], iv[1], iv[2]) ?? "major";
    const rootEs = solfegeName(notes[0]);
    const qualityEs = QUALITY_ES[quality];
    out.push({
      degree: i + 1,
      roman: romanFor(i, quality),
      root: notes[0],
      rootPc: root,
      rootEs,
      quality,
      qualityEs,
      name: isSeventh(quality) ? `${rootEs}${quality === "dominant7" ? "7" : " " + qualityEs}` : `${rootEs} ${qualityEs}`,
      notes,
      notesEs: notes.map(solfegeName),
      pcs,
      roleId: QUALITY_ROLE[quality],
      fn: functionOf(key.mode, i),
    });
  }
  return out;
}

/**
 * MIDI notes to play a chord, ascending from the root near middle C.
 * `pcs` are in chord order (root first).
 */
export function voiceChordMidi(pcs: number[], rootBase = 48): number[] {
  const root = rootBase + mod12(pcs[0] - rootBase);
  const out = [root];
  let prev = root;
  for (const pc of pcs.slice(1)) {
    let m = prev + mod12(pc - prev);
    if (m === prev) m += 12;
    out.push(m);
    prev = m;
  }
  // Lift one octave so the chord sits around middle C.
  return out.map((m) => m + 12);
}

/** MIDI for the scale going up from the tonic (8 notes, ending on the octave). */
export function scaleMidi(key: KeyInfo): number[] {
  let base = 60 + key.tonicPc;
  if (base > 66) base -= 12;
  const out = [base];
  for (let i = 1; i <= 7; i++) {
    const pc = key.pcs[i % 7];
    out.push(out[i - 1] + (mod12(pc - out[i - 1]) || 12));
  }
  return out;
}

/** Steps between consecutive scale notes in tones: 1 = tono, 0.5 = semitono. */
export function scaleSteps(key: KeyInfo): number[] {
  const m = scaleMidi(key);
  const steps: number[] = [];
  for (let i = 1; i < m.length; i++) steps.push((m[i] - m[i - 1]) / 2);
  return steps;
}

