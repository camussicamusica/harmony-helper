import { Interval } from "tonal";
import type { ScheduledNote } from "../types";
import { noteLabel, solfegeName, soundingAt } from "../naming";
import { FUNCTION_SHORT, functionOf, isSeventh, romanFor, type ChordFunction, type ChordQuality } from "./chords";
import type { KeyInfo } from "./key";
import { detectChordParts, type PieceChord } from "./pieceChords";
import { figureOf, momentOf, type Figure, type Moment } from "./noteFigure";

const EPS = 1e-3;
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const BASE_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Pitch class of a spelled name without octave ("F#" -> 6, "Cb" -> 11). */
export function spelledPitchClass(spelled: string): number {
  let pc = BASE_PC[spelled[0]?.toUpperCase()] ?? 0;
  for (const ch of spelled.slice(1)) pc += ch === "#" ? 1 : ch === "b" ? -1 : 0;
  return mod12(pc);
}

/** Scientific octave following the spelling: B#3 is midi 60, Cb4 is midi 59. */
export function octaveOf(midi: number, spelled: string): number {
  let acc = 0;
  for (const ch of spelled.slice(1)) acc += ch === "#" ? 1 : ch === "b" ? -1 : 0;
  return Math.floor((midi - acc) / 12) - 1;
}

export const DEGREE_NAMES_MAJOR = ["tónica", "supertónica", "mediante", "subdominante", "dominante", "superdominante", "sensible"];
export const DEGREE_NAMES_MINOR = ["tónica", "supertónica", "mediante", "subdominante", "dominante", "superdominante", "subtónica"];

export interface KeyRole {
  keyLabel: string;
  /** 1..7 when the note is in the key's scale, else null. */
  degree: number | null;
  /** "subdominante", "sensible"… (also for the raised 7th of a minor key). */
  degreeName: string | null;
  inScale: boolean;
  /** "alteración: Do# en vez de Do", when out of the scale and easy to explain. */
  alteration: string | null;
  /** The full sentence for the panel. */
  text: string;
}

export type ChordRoleId = "fundamental" | "tercera" | "quinta" | "septima" | "novena" | "suspension" | "paso";

export interface ChordRole {
  name: string;
  tones: string[];
  ownIndex: number;
  /** Where the chord came from: the piece's chord analysis, or the notes sounding together. */
  source: "pieza" | "juntas";
  role: ChordRoleId;
  roleLabel: string;
  roman: string | null;
  fn: ChordFunction | null;
  /** "IV · Subd", or null when the chord is outside the key. */
  degreeText: string | null;
  inKey: boolean | null;
}

export interface MelodyStep {
  /** "La (A)" */
  label: string;
  direction: "sube" | "baja" | "igual";
  /** "4.ª justa"; null for the same note. */
  interval: string | null;
  /** "viene de La (A): sube una 4.ª justa" */
  text: string;
}

export interface NoteContext {
  pitch: { spelled: string; label: string; octave: number; octaveLabel: string };
  keyRole: KeyRole | null;
  /** The figure printed with the note: same staff, same onset. */
  figure: Figure;
  chord: ChordRole | null;
  /** Everything sounding at that instant in both hands (held notes marked). */
  moment: Moment;
  melody: { prev: MelodyStep | null; next: MelodyStep | null };
}

// ---------- key ----------

export function keyRoleOf(spelled: string, key: KeyInfo): KeyRole {
  const pc = spelledPitchClass(spelled);
  const exact = key.notes.indexOf(spelled);
  const idx = exact >= 0 ? exact : key.pcs.indexOf(pc);
  const names = key.mode === "major" ? DEGREE_NAMES_MAJOR : DEGREE_NAMES_MINOR;
  if (idx >= 0) {
    const degreeName = names[idx];
    return {
      keyLabel: key.label,
      degree: idx + 1,
      degreeName,
      inScale: true,
      alteration: null,
      text: `${idx + 1}.º grado de ${key.label} · ${degreeName}`,
    };
  }
  // Out of the scale: same letter in the scale gives the easy explanation ("Do# en vez de Do").
  const sameLetter = key.notes.find((n) => n[0] === spelled[0]);
  const alteration = sameLetter ? `alteración: ${solfegeName(spelled)} en vez de ${solfegeName(sameLetter)}` : null;
  const raisedSeventh = key.mode === "minor" && pc === mod12(key.tonicPc - 1);
  const parts = [`fuera de la escala de ${key.label}`];
  if (raisedSeventh) parts.push("sensible (7.º grado elevado)");
  if (alteration) parts.push(alteration);
  return {
    keyLabel: key.label,
    degree: null,
    degreeName: raisedSeventh ? "sensible" : null,
    inScale: false,
    alteration,
    text: parts.join(" · "),
  };
}

// ---------- chord ----------

/** Semitones above the root of each chord tone, in order: root, third, fifth, seventh. */
const CHORD_TONES: Record<ChordQuality, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  dominant7: [0, 4, 7, 10],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  halfDim7: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  sus: [0, 5, 7],
};

const ROLE_LABEL: Record<ChordRoleId, string> = {
  fundamental: "fundamental",
  tercera: "tercera",
  quinta: "quinta",
  septima: "séptima",
  novena: "novena",
  suspension: "suspensión (sustituye a la tercera)",
  paso: "nota de paso / no es del acorde",
};

/** Role of a pitch class inside a chord of `quality` built on `rootPc`. */
export function chordRoleOf(pc: number, rootPc: number, quality: ChordQuality): ChordRoleId {
  const d = mod12(pc - rootPc);
  const tones = CHORD_TONES[quality];
  if (quality === "sus") {
    if (d === 0) return "fundamental";
    if (d === 7) return "quinta";
    if (d === 2 || d === 5) return "suspension";
    return "paso";
  }
  const i = tones.indexOf(d);
  if (i === 0) return "fundamental";
  if (i === 1) return "tercera";
  if (i === 2) return "quinta";
  if (i === 3) return "septima";
  if (d === 2) return "novena";
  return "paso";
}

function chordForNote(note: ScheduledNote, all: ScheduledNote[], key: KeyInfo | null, chords: PieceChord[]): ChordRole | null {
  const pc = spelledPitchClass(note.spelledName);
  const t = note.startSec;
  const pieceChord = chords.find((c) => t >= c.startSec - EPS && t < c.endSec - EPS);
  if (pieceChord) {
    const role = chordRoleOf(pc, pieceChord.rootPc, pieceChord.quality);
    const inKey = key ? pieceChord.inScale : null;
    return {
      name: pieceChord.name,
      tones: pieceChord.notes,
      ownIndex: Math.max(0, pieceChord.notes.indexOf(note.spelledName)),
      source: "pieza",
      role,
      roleLabel: ROLE_LABEL[role],
      roman: pieceChord.roman,
      fn: pieceChord.fn,
      degreeText: pieceChord.roman && pieceChord.fn ? `${pieceChord.roman} · ${FUNCTION_SHORT[pieceChord.fn]}` : null,
      inKey,
    };
  }
  // No piece chord at this moment: try the notes sounding together.
  const group = soundingAt(note, all);
  const parts = detectChordParts(group.map((n) => n.spelledName));
  if (!parts) return null;
  const rootPc = spelledPitchClass(parts.root);
  const pcs = [...new Set(group.map((n) => n.midi % 12))].map((p) => p);
  const spelled: string[] = [];
  for (const n of group) if (!spelled.includes(n.spelledName)) spelled.push(n.spelledName);
  const role = chordRoleOf(pc, rootPc, parts.quality);
  let roman: string | null = null;
  let fn: ChordFunction | null = null;
  let inKey: boolean | null = null;
  if (key) {
    const idx = key.pcs.indexOf(rootPc);
    inKey = idx >= 0 && pcs.every((p) => key.pcs.includes(p));
    if (inKey) {
      roman = romanFor(idx, parts.quality);
      fn = functionOf(key.mode, idx);
    }
  }
  const rootEs = solfegeName(parts.root);
  const q = parts.quality;
  const qEs = { major: "mayor", minor: "menor", diminished: "disminuido", augmented: "aumentado", dominant7: "7", major7: "maj7", minor7: "m7", halfDim7: "m7♭5", dim7: "dim7", sus: "sus" }[q];
  const name = isSeventh(q) ? (q === "dominant7" ? `${rootEs}7` : `${rootEs} ${qEs}`) : `${rootEs} ${qEs}`;
  return {
    name,
    tones: spelled,
    ownIndex: Math.max(0, spelled.indexOf(note.spelledName)),
    source: "juntas",
    role,
    roleLabel: ROLE_LABEL[role],
    roman,
    fn,
    degreeText: roman && fn ? `${roman} · ${FUNCTION_SHORT[fn]}` : null,
    inKey,
  };
}

// ---------- melody ----------

const Q_ES: Record<string, string> = { P: "justa", M: "mayor", m: "menor", A: "aumentada", d: "disminuida" };

/** "4.ª justa" for the step between two notes (octaves included), or null if tonal cannot name it. */
export function melodicIntervalEs(from: ScheduledNote, to: ScheduledNote): string | null {
  const a = `${from.spelledName}${octaveOf(from.midi, from.spelledName)}`;
  const b = `${to.spelledName}${octaveOf(to.midi, to.spelledName)}`;
  const i = Interval.get(Interval.distance(a, b));
  if (i.empty || typeof i.num !== "number") return null;
  const q = Q_ES[i.q];
  if (!q) return null;
  return `${Math.abs(i.num)}.ª ${q}`;
}

/** Without voice information, a step larger than an octave is almost surely a jump between lines: show nothing. */
const MAX_STEP = 12;

/**
 * Previous (dir -1) / next (dir 1) note of the same melodic line: same hand (staff) and, when the score says, the same
 * voice; never the other hand. In the nearest earlier/later figure, a top note follows the top note and any other
 * note follows the nearest pitch. Null when there is none or the step is bigger than an octave.
 */
function neighbour(note: ScheduledNote, all: ScheduledNote[], dir: -1 | 1): ScheduledNote | null {
  const sameLine = (n: ScheduledNote) =>
    n.id !== note.id &&
    n.hand === note.hand &&
    (note.voice === undefined || n.voice === undefined || n.voice === note.voice) &&
    !n.tieContinuation;
  let bestDt = Infinity;
  for (const n of all) {
    if (!sameLine(n)) continue;
    const dt = (n.startSec - note.startSec) * dir;
    if (dt > EPS && dt < bestDt) bestDt = dt;
  }
  if (!Number.isFinite(bestDt)) return null;
  const figure = all.filter((n) => sameLine(n) && Math.abs((n.startSec - note.startSec) * dir - bestDt) <= EPS);
  const own = all.filter((n) => n.hand === note.hand && (note.voice === undefined || n.voice === undefined || n.voice === note.voice) && Math.abs(n.startSec - note.startSec) <= EPS);
  const isTop = own.every((n) => n.midi <= note.midi);
  const pick = isTop
    ? figure.reduce((a, b) => (b.midi > a.midi ? b : a))
    : figure.reduce((a, b) => (Math.abs(b.midi - note.midi) < Math.abs(a.midi - note.midi) ? b : a));
  // Known to be one voice: a big leap is a real leap. Unknown voices: a leap over an octave is probably another line.
  const ambiguous = note.voice === undefined || pick.voice === undefined;
  return ambiguous && Math.abs(pick.midi - note.midi) > MAX_STEP ? null : pick;
}

function stepOf(note: ScheduledNote, other: ScheduledNote, dir: -1 | 1): MelodyStep | null {
  // prev: other -> note; next: note -> other.
  const from = dir === -1 ? other : note;
  const to = dir === -1 ? note : other;
  const label = noteLabel(other.spelledName);
  const lead = dir === -1 ? "viene de" : "va a";
  if (from.midi === to.midi) {
    return { label, direction: "igual", interval: null, text: `${lead} ${label}: repite la misma nota` };
  }
  const interval = melodicIntervalEs(from, to);
  if (!interval) return null;
  const direction = to.midi > from.midi ? "sube" : "baja";
  return { label, direction, interval, text: `${lead} ${label}: ${direction} una ${interval}` };
}

// ---------- main ----------

/**
 * Everything the hover panel says about one note. Pure: depends only on its arguments.
 * `key` null = no key known (the section is left out); `chords` = the piece's chord analysis (may be empty).
 */
export function noteContext(note: ScheduledNote, all: ScheduledNote[], key: KeyInfo | null, chords: PieceChord[]): NoteContext {
  const octave = octaveOf(note.midi, note.spelledName);
  const prev = neighbour(note, all, -1);
  const next = neighbour(note, all, 1);
  const figure = figureOf(note, all);
  return {
    figure,
    moment: momentOf(note, all, figure),
    pitch: {
      spelled: note.spelledName,
      label: noteLabel(note.spelledName),
      octave,
      octaveLabel: `${solfegeName(note.spelledName)}${octave}`,
    },
    keyRole: key ? keyRoleOf(note.spelledName, key) : null,
    chord: chordForNote(note, all, key, chords),
    melody: {
      prev: prev ? stepOf(note, prev, -1) : null,
      next: next ? stepOf(note, next, 1) : null,
    },
  };
}

