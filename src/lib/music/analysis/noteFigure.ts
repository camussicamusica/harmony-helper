import type { ScheduledNote } from "../types";
import { chordName, intervalNameEs } from "../naming";

const EPS = 1e-3;

export interface FigureNote {
  spelled: string;
  midi: number;
}

/** The musical figure a note is printed in: the notes of the same staff that start at the same instant. */
export interface Figure {
  /** Spelled notes, low to high. */
  tones: string[];
  ownIndex: number;
  /** "Fa# menor" for 3+ notes that make a chord, else null. */
  chord: string | null;
  /** "3.ª menor" for exactly two notes, else null. */
  interval: string | null;
  /** True when the note is printed alone (no other note in its figure). */
  alone: boolean;
}

/** What sounds at the instant the note starts, across both hands: onsets plus notes still held from before. */
export interface Moment {
  tones: string[];
  /** Parallel to `tones`: true when that note started earlier and is still held ("sostenida"). */
  held: boolean[];
  ownIndex: number;
  name: string | null;
  interval: string | null;
  /** False when this is the same set of pitches as the figure (then the panel does not repeat it). */
  differsFromFigure: boolean;
}

const sameStaff = (a: ScheduledNote, b: ScheduledNote) => a.hand === b.hand && (a.system ?? 0) === (b.system ?? 0);

function describe(tones: string[]) {
  return {
    chord: tones.length >= 3 ? chordName(tones) : null,
    interval: tones.length === 2 ? intervalNameEs(tones[0], tones[1]) : null,
  };
}

/** Same staff, same onset: the stacked chord or interval printed with `note`, low to high, one entry per pitch. */
export function figureOf(note: ScheduledNote, all: readonly ScheduledNote[]): Figure {
  const byMidi = new Map<number, ScheduledNote>();
  for (const n of all) {
    if (n.id === note.id || (sameStaff(n, note) && Math.abs(n.startSec - note.startSec) < EPS)) {
      if (!byMidi.has(n.midi) || n.id === note.id) byMidi.set(n.midi, n);
    }
  }
  const group = [...byMidi.values()].sort((a, b) => a.midi - b.midi);
  const tones = group.map((n) => n.spelledName);
  return { tones, ownIndex: Math.max(0, group.findIndex((n) => n.id === note.id)), ...describe(tones), alone: group.length < 2 };
}

/** Both hands, at the instant `note` starts: onsets at that instant plus notes still sounding from earlier. */
export function momentOf(note: ScheduledNote, all: readonly ScheduledNote[], figure: Figure): Moment {
  const t = note.startSec;
  const byMidi = new Map<number, { n: ScheduledNote; held: boolean }>();
  for (const n of all) {
    const onset = Math.abs(n.startSec - t) < EPS;
    const held = n.startSec < t - EPS && n.startSec + n.durationSec > t + EPS;
    if (!onset && !held) continue;
    const prev = byMidi.get(n.midi);
    // An onset of that pitch beats a held one; the hovered note beats everything.
    if (!prev || (prev.held && onset) || n.id === note.id) byMidi.set(n.midi, { n, held: !onset });
  }
  const group = [...byMidi.values()].sort((a, b) => a.n.midi - b.n.midi);
  const tones = group.map((g) => g.n.spelledName);
  const figMidis = new Set(figure.tones.length ? [...figure.tones] : []);
  return {
    tones,
    held: group.map((g) => g.held),
    ownIndex: Math.max(0, group.findIndex((g) => g.n.id === note.id)),
    ...(() => {
      const d = describe(tones);
      return { name: d.chord, interval: d.interval };
    })(),
    differsFromFigure: tones.length !== figMidis.size || tones.some((s) => !figMidis.has(s)),
  };
}
