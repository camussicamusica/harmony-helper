import { Key, Note, Scale } from "tonal";
import { solfegeName } from "../naming";

/** Krumhansl-Kessler key profiles (index 0 = tonic). */
export const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
export const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

export type KeyMode = "major" | "minor";

/** Spellings of each tonic pitch class, preferred first (the second is the enharmonic twin). */
const MAJOR_SPELLINGS: string[][] = [
  ["C"], ["Db", "C#"], ["D"], ["Eb"], ["E"], ["F"], ["F#", "Gb"], ["G"], ["Ab"], ["A"], ["Bb"], ["B", "Cb"],
];
const MINOR_SPELLINGS: string[][] = [
  ["C"], ["C#", "Db"], ["D"], ["Eb", "D#"], ["E"], ["F"], ["F#"], ["G"], ["G#", "Ab"], ["A"], ["Bb", "A#"], ["B"],
];

export const MODE_NAMES_ES = ["jónico", "dórico", "frigio", "lidio", "mixolidio", "eolio", "locrio"];

export interface KeyInfo {
  /** "Ab major", "F# minor" (tonal-style, ASCII accidentals). */
  id: string;
  tonic: string;
  tonicPc: number;
  mode: KeyMode;
  /** Spanish label: "La♭ mayor". */
  label: string;
  /** The 7 scale notes, spelled (natural minor for minor keys). */
  notes: string[];
  /** Pitch classes of the 7 notes, in scale order. */
  pcs: number[];
  /** Key signature in sharps (+) / flats (-). */
  fifths: number;
}

export interface KeyCandidate {
  key: KeyInfo;
  /** Pearson correlation with the profile. */
  r: number;
  /** r plus the key-signature prior. */
  score: number;
}

export interface ModeInfo {
  tonic: string;
  tonicPc: number;
  /** "jónico" … "locrio". */
  name: string;
  /** "Re dórico". */
  label: string;
  /** True when it is not the key's own major/minor reading. */
  differs: boolean;
}

export interface KeyResult {
  best: KeyCandidate;
  runnerUp: KeyCandidate;
  /** 0..1. */
  confidence: number;
  confidenceWord: "bastante seguro" | "dudoso";
  mode: ModeInfo;
}

export interface KeyOptions {
  /** Key signature from the score (sharps positive, flats negative), if known. */
  fifths?: number | null;
  /** Duration-weighted pitch-class histogram of the lowest note at each onset. */
  bass?: number[];
  /** Pitch class of the final bass note. */
  finalPc?: number | null;
}

const PRIOR = 0.12;

function mod12(n: number) {
  return ((n % 12) + 12) % 12;
}

/** Sharps (+) or flats (−) in the key signature. Note.get() has no fifths for a bare pitch class, so ask Key. */
function signatureOf(tonic: string, mode: KeyMode): number {
  return mode === "major" ? Key.majorKey(tonic).alteration : Key.minorKey(tonic).alteration;
}

/** Build the key info for a tonic name + mode. */
export function keyInfo(tonic: string, mode: KeyMode): KeyInfo {
  const scale = Scale.get(`${tonic} ${mode}`);
  const notes = scale.notes;
  return {
    id: `${tonic} ${mode}`,
    tonic,
    tonicPc: mod12(Note.chroma(tonic) ?? 0),
    mode,
    label: `${solfegeName(tonic)} ${mode === "major" ? "mayor" : "menor"}`,
    notes,
    pcs: notes.map((n) => mod12(Note.chroma(n) ?? 0)),
    fifths: signatureOf(tonic, mode),
  };
}

/** Pick the spelling of a tonic pc: the one matching the score's key signature, else the preferred one. */
function spell(pc: number, mode: KeyMode, fifths: number | null | undefined): string {
  const options = (mode === "major" ? MAJOR_SPELLINGS : MINOR_SPELLINGS)[pc];
  if (fifths !== null && fifths !== undefined) {
    const hit = options.find((o) => signatureOf(o, mode) === fifths);
    if (hit) return hit;
  }
  return options[0];
}

/** "C major" … the 24 keys in a fixed order (majors then minors, by pitch class), preferred spellings. */
export const ALL_KEY_IDS: string[] = [
  ...MAJOR_SPELLINGS.map((o) => `${o[0]} major`),
  ...MINOR_SPELLINGS.map((o) => `${o[0]} minor`),
];

/** Parse "Ab major" -> KeyInfo; null if the id is not a valid key. */
export function keyFromId(id: string): KeyInfo | null {
  const [tonic, mode] = id.split(" ");
  if (!tonic || (mode !== "major" && mode !== "minor")) return null;
  if (Note.get(tonic).empty) return null;
  return keyInfo(tonic, mode);
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/**
 * Detect the key from a pitch-class histogram (index 0 = C) plus, optionally,
 * the key signature as a prior and bass information for the mode.
 */
export function detectKey(hist: number[], opts: KeyOptions = {}): KeyResult {
  const fifths = opts.fifths ?? null;
  // The key signature names one major and one minor key (compared by pitch class).
  const sigMajorPc = fifths === null ? -1 : mod12(fifths * 7);
  const sigMinorPc = fifths === null ? -1 : mod12(fifths * 7 + 9);

  const cands: KeyCandidate[] = [];
  for (const mode of ["major", "minor"] as KeyMode[]) {
    const prof = mode === "major" ? KK_MAJOR : KK_MINOR;
    for (let pc = 0; pc < 12; pc++) {
      const rotated = prof.map((_, i) => prof[mod12(i - pc)]);
      const r = pearson(hist, rotated);
      const prior = (mode === "major" ? sigMajorPc : sigMinorPc) === pc ? PRIOR : 0;
      cands.push({ key: keyInfo(spell(pc, mode, fifths), mode), r, score: r + prior });
    }
  }
  cands.sort((a, b) => b.score - a.score);
  const [best, runnerUp] = cands;
  const margin = best.score - runnerUp.score;
  const confidence = clamp01(0.6 * clamp01(margin / 0.15) + 0.4 * clamp01((best.r - 0.45) / 0.4));
  return {
    best,
    runnerUp,
    confidence,
    confidenceWord: confidence >= 0.6 ? "bastante seguro" : "dudoso",
    mode: detectMode(best.key, opts.bass, opts.finalPc),
  };
}

/** Which of the 7 church modes of the key's note collection fits best. Tonic candidate = most weighted bass note. */
export function detectMode(key: KeyInfo, bass?: number[], finalPc?: number | null): ModeInfo {
  // Index in the major-scale rotation: major tonic = 0 (jónico), natural minor tonic = 5 (eolio).
  const offset = key.mode === "major" ? 0 : 5;
  const own = (i: number): ModeInfo => ({
    tonic: key.notes[i],
    tonicPc: key.pcs[i],
    name: MODE_NAMES_ES[(i + offset) % 7],
    label: `${solfegeName(key.notes[i])} ${MODE_NAMES_ES[(i + offset) % 7]}`,
    differs: i !== 0,
  });
  if (!bass || bass.every((v) => v <= 0)) return own(0);
  const total = bass.reduce((a, b) => a + b, 0);
  const scoreOf = (i: number) => bass[key.pcs[i]] + (finalPc === key.pcs[i] ? 0.15 * total : 0);
  let bestI = 0;
  for (let i = 1; i < 7; i++) if (scoreOf(i) > scoreOf(bestI)) bestI = i;
  // Only claim a modal reading when it clearly beats the key's own tonic.
  if (bestI !== 0 && scoreOf(bestI) > scoreOf(0) * 1.25) return own(bestI);
  return own(0);
}

// ---------- histograms from notes ----------

export interface NoteLike {
  midi: number;
  startSec: number;
  durationSec: number;
}

/** Duration-weighted pitch-class histogram (index 0 = C). */
export function pitchClassHistogram(notes: NoteLike[]): number[] {
  const h = new Array(12).fill(0);
  for (const n of notes) h[mod12(n.midi)] += n.durationSec;
  return h;
}

/** Duration-weighted histogram of the lowest note at each onset, plus the final bass pitch class. */
export function bassInfo(notes: NoteLike[]): { bass: number[]; finalPc: number | null } {
  const byOnset = new Map<number, NoteLike[]>();
  for (const n of notes) {
    const k = Math.round(n.startSec * 1000);
    const arr = byOnset.get(k) ?? [];
    arr.push(n);
    byOnset.set(k, arr);
  }
  const bass = new Array(12).fill(0);
  let lastK = -Infinity;
  let finalPc: number | null = null;
  for (const [k, arr] of byOnset) {
    const low = arr.reduce((a, b) => (b.midi < a.midi ? b : a));
    bass[mod12(low.midi)] += low.durationSec;
    if (k > lastK) {
      lastK = k;
      finalPc = mod12(low.midi);
    }
  }
  return { bass, finalPc };
}

/** Convenience: detect straight from notes. */
export function detectKeyFromNotes(notes: NoteLike[], fifths?: number | null): KeyResult {
  const { bass, finalPc } = bassInfo(notes);
  return detectKey(pitchClassHistogram(notes), { fifths, bass, finalPc });
}
