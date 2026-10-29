import { Note } from "tonal";
import type { KeyMode } from "./key";
import { letterName, solfegeName } from "../naming";

/** "F#" -> "Fa♯" (the naming helpers keep "#"; this screen writes the real sign). */
export const noteEs = (n: string) => solfegeName(n).replace(/#/g, "♯");
/** "F#" -> "Fa♯ (F♯)". */
export const noteEsLabel = (n: string) => `${noteEs(n)} (${letterName(n).replace(/#/g, "♯")})`;

/** The four function labels, exactly as written in the app (never T / SD / D). */
export type OctaveFn = "Tón" | "Subd" | "Dom" | "Dom de la Dom";

export interface OctaveStep {
  /** 0..15: 8 going up, then 8 coming down. */
  index: number;
  dir: "sube" | "baja";
  /** Scale degree of the bass (1..8; the French sixth sits on 6). */
  bassDegree: number;
  /** Spelled bass note without octave ("F#"). */
  bass: string;
  /** All chord notes, spelled: the bass first, then the rest going up from it. */
  notes: string[];
  /** The notes above the bass (what her right hand plays). */
  upper: string[];
  /** "La7/Mi". */
  name: string;
  /** Figured bass: "5/3", "6", "6/4", "7", "6/5", "4/3", "4/2", "♯6/4/3". */
  figure: string;
  /** Roman numeral with the figure: "V4/3", "I6", "V4/3 de V". */
  roman: string;
  fn: OctaveFn;
  /** Only for "Dom de la Dom": the spelled note it leads to (the dominant). */
  leadsTo?: string;
}

type Q = "maj" | "min" | "dom7" | "m7" | "m7b5";

const TONES: Record<Q, string[]> = {
  maj: ["1P", "3M", "5P"],
  min: ["1P", "3m", "5P"],
  dom7: ["1P", "3M", "5P", "7m"],
  m7: ["1P", "3m", "5P", "7m"],
  m7b5: ["1P", "3m", "5d", "7m"],
};

const SUFFIX: Record<Q, string> = { maj: "", min: " menor", dom7: "7", m7: " m7", m7b5: " m7♭5" };

/** Figured bass of a chord by its inversion (0 = root position). */
const FIGURE: Record<"triad" | "seventh", string[]> = {
  triad: ["5/3", "6", "6/4"],
  seventh: ["7", "6/5", "4/3", "4/2"],
};

/** One step as a table row. `root` is an interval above the tonic; `inv` 0..3. */
interface Row {
  root: string;
  q: Q;
  inv: number;
  fn: OctaveFn;
  /** Roman numeral without the figure ("V", "ii", "I"). */
  rn: string;
  /** Written figure over the numeral, when it is not the plain one ("6", "4/3"). */
  rnFig?: string;
  /** Replaces the whole roman text (secondary dominants). */
  romanText?: string;
}

/** The French sixth: literal intervals above a bass that is not a chord root. */
interface Literal {
  literal: { bassIv: string; above: string[]; figure: string; name: string };
  fn: OctaveFn;
  roman: string;
  bassDegree: number;
}

type Entry = Row | Literal;
const isLiteral = (e: Entry): e is Literal => "literal" in e;

const R = (root: string, q: Q, inv: number, fn: OctaveFn, rn: string, rnFig?: string, romanText?: string): Row => ({
  root, q, inv, fn, rn, rnFig, romanText,
});

// bass degrees going up are 1..8; coming down they are 8..1 (minor: natural bass, except the French sixth on 6).
const MAJOR_UP: Entry[] = [
  R("1P", "maj", 0, "Tón", "I"),
  R("5P", "dom7", 2, "Dom", "V", "4/3"),
  R("1P", "maj", 1, "Tón", "I", "6"),
  R("2M", "m7", 1, "Subd", "ii", "6/5"),
  R("5P", "maj", 0, "Dom", "V"),
  R("4P", "maj", 1, "Subd", "IV", "6"),
  R("5P", "dom7", 1, "Dom", "V", "6/5"),
  R("1P", "maj", 0, "Tón", "I"),
];
const MAJOR_DOWN: Entry[] = [
  R("1P", "maj", 0, "Tón", "I"),
  R("5P", "maj", 1, "Dom", "V", "6"),
  R("2M", "dom7", 2, "Dom de la Dom", "V", "4/3", "V4/3 de V"),
  R("5P", "maj", 0, "Dom", "V"),
  R("5P", "dom7", 3, "Dom", "V", "4/2"),
  R("1P", "maj", 1, "Tón", "I", "6"),
  R("5P", "dom7", 2, "Dom", "V", "4/3"),
  R("1P", "maj", 0, "Tón", "I"),
];
const MINOR_UP: Entry[] = [
  R("1P", "min", 0, "Tón", "i"),
  R("5P", "dom7", 2, "Dom", "V", "4/3"),
  R("1P", "min", 1, "Tón", "i", "6"),
  R("2M", "m7b5", 1, "Subd", "iiø", "6/5"),
  R("5P", "maj", 0, "Dom", "V"),
  R("4P", "maj", 1, "Subd", "IV", "6"),
  R("5P", "dom7", 1, "Dom", "V", "6/5"),
  R("1P", "min", 0, "Tón", "i"),
];
const MINOR_DOWN: Entry[] = [
  R("1P", "min", 0, "Tón", "i"),
  R("5P", "min", 1, "Dom", "v", "6"),
  {
    literal: { bassIv: "6m", above: ["3M", "4A", "6A"], figure: "♯6/4/3", name: "6.ª aumentada (francesa)" },
    fn: "Dom de la Dom",
    roman: "♯6/4/3 (6.ª aumentada francesa)",
    bassDegree: 6,
  },
  R("5P", "maj", 0, "Dom", "V"),
  R("5P", "dom7", 3, "Dom", "V", "4/2"),
  R("1P", "min", 1, "Tón", "i", "6"),
  R("5P", "dom7", 2, "Dom", "V", "4/3"),
  R("1P", "min", 0, "Tón", "i"),
];

const tr = (from: string, iv: string) => Note.transpose(from, iv);

function build(tonic: string, mode: KeyMode, entry: Entry, index: number): OctaveStep {
  const dir = index < 8 ? "sube" : "baja";
  const pos = index % 8; // 0..7 within the half
  const dominant = tr(tonic, "5P");
  if (isLiteral(entry)) {
    const bass = tr(tonic, entry.literal.bassIv);
    const upper = entry.literal.above.map((iv) => tr(bass, iv));
    return {
      index,
      dir,
      bassDegree: entry.bassDegree,
      bass,
      notes: [bass, ...upper],
      upper,
      name: `${noteEs(bass)} ${entry.literal.name}`,
      figure: entry.literal.figure,
      roman: entry.roman,
      fn: entry.fn,
      leadsTo: dominant,
    };
  }
  const root = tr(tonic, entry.root);
  const tones = TONES[entry.q].map((iv) => tr(root, iv));
  const notes = [...tones.slice(entry.inv), ...tones.slice(0, entry.inv)];
  const bass = notes[0];
  const seventh = tones.length === 4;
  const figure = FIGURE[seventh ? "seventh" : "triad"][entry.inv];
  const name = `${noteEs(root)}${SUFFIX[entry.q]}${entry.inv ? `/${noteEs(bass)}` : ""}`;
  const degreeOfBass = dir === "sube" ? pos + 1 : 8 - pos;
  return {
    index,
    dir,
    bassDegree: degreeOfBass,
    bass,
    notes,
    upper: notes.slice(1),
    name,
    figure,
    roman: entry.romanText ?? `${entry.rn}${entry.rnFig ?? ""}`,
    fn: entry.fn,
    ...(entry.fn === "Dom de la Dom" ? { leadsTo: dominant } : {}),
  };
}

/** The 16 steps of the rule of the octave in a key: 8 going up, 8 coming down. */
export function ruleOfOctave(key: { tonic: string; mode: KeyMode }): OctaveStep[] {
  const tables = key.mode === "major" ? [MAJOR_UP, MAJOR_DOWN] : [MINOR_UP, MINOR_DOWN];
  return [...tables[0], ...tables[1]].map((e, i) => build(key.tonic, key.mode, e, i));
}

// ---------------------------------------------------------------------------------------------------------------

export interface OctaveVoicing {
  /** MIDI of the bass (octave 2–3). */
  bass: number;
  /** MIDI of the upper notes, ascending (octave 3–4). */
  upper: number[];
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const pcOf = (spelled: string) => Note.chroma(spelled) ?? 0;

/**
 * Where to play each step. Bass: the tonic in octave 2, walking up and then down by the shortest way.
 * Upper notes: close position, the inversion (and octave) whose middle is nearest to the previous chord's middle,
 * all inside C3–B4 (48–71). Deterministic; ties go to the lower voicing.
 */
export function voiceRuleOfOctave(steps: readonly OctaveStep[], tonic: string): OctaveVoicing[] {
  const out: OctaveVoicing[] = [];
  let bass = 36 + pcOf(tonic); // C2..B2
  let prevBass = bass;
  let prevMid = 60;
  steps.forEach((s, i) => {
    const pc = pcOf(s.bass);
    if (i === 0) bass = 36 + pc;
    else if (s.dir === "sube") bass = prevBass + (mod12(pc - prevBass) || 12);
    else bass = prevBass - (mod12(prevBass - pc) || 12);
    if (i === 8) bass = prevBass; // the top tonic is played again as the way down begins
    prevBass = bass;

    const pcs = s.upper.map(pcOf);
    let best: number[] | null = null;
    let bestDist = Infinity;
    for (let r = 0; r < pcs.length; r++) {
      const order = [...pcs.slice(r), ...pcs.slice(0, r)];
      for (let shift = 48; shift <= 60; shift += 12) {
        const stack: number[] = [];
        let prev = shift + mod12(order[0] - shift);
        stack.push(prev);
        for (const p of order.slice(1)) {
          prev = prev + (mod12(p - prev) || 12);
          stack.push(prev);
        }
        if (stack[0] < 48 || stack[stack.length - 1] > 71) continue;
        const dist = Math.abs(stack.reduce((a, b) => a + b, 0) / stack.length - prevMid);
        if (dist < bestDist - 1e-9) {
          best = stack;
          bestDist = dist;
        }
      }
    }
    const upper = best ?? pcs.map((p) => 60 + p);
    prevMid = upper.reduce((a, b) => a + b, 0) / upper.length;
    out.push({ bass, upper });
  });
  return out;
}

/** Spelled note with octave from a MIDI number and its spelling ("F#", 54 -> "F#3"; handles B#, Cb). */
export function spelledWithOctave(spelled: string, midi: number): string {
  const ref = Note.midi(`${spelled}4`) ?? 60;
  return `${spelled}${4 + Math.round((midi - ref) / 12)}`;
}

/** Does what she holds (MIDI numbers) cover the step? Every upper pitch class must be down; the bass is optional and extra notes are fine. */
export function stepSatisfied(step: OctaveStep, held: Iterable<number>): boolean {
  const pcs = new Set<number>();
  for (const m of held) pcs.add(mod12(m));
  return step.upper.every((n) => pcs.has(pcOf(n)));
}
