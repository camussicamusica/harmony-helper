import type { PieceChord } from "./pieceChords";

/** One place in the score where a chord sounds. `index` points into the piece chord list. */
export interface ChordOccurrence {
  index: number;
  measure: number;
  beat: number;
  startSec: number;
  endSec: number;
  chord: PieceChord;
}

export type ChordRef = Pick<PieceChord, "rootPc" | "quality">;

/** What to look for: any test on a chord, one chord, or a list of chords (e.g. the keys she clicks on the círculo). */
export type ChordQuery = ((chord: PieceChord, index: number) => boolean) | ChordRef | readonly ChordRef[];

/** Same chord = same root and quality (the bass note does not matter). */
export const chordId = (c: ChordRef) => `${c.rootPc}:${c.quality}`;

export function matcherFor(query: ChordQuery): (chord: PieceChord, index: number) => boolean {
  if (typeof query === "function") return query;
  const ids = new Set((Array.isArray(query) ? (query as readonly ChordRef[]) : [query as ChordRef]).map(chordId));
  return (c) => ids.has(chordId(c));
}

/** Printed spot of a chord: the same measure number and beat is the same place on the page. */
const spotKey = (c: Pick<PieceChord, "measure" | "beat" | "rootPc" | "quality">) => `${c.measure}.${c.beat}.${chordId(c)}`;

/**
 * Every occurrence of what `query` describes, in score order. A printed spot counts once: if a repeat (or voltas)
 * had been unrolled, the repeated pass of the same measure and beat is the same place on the page.
 */
export function findChordOccurrences(chords: readonly PieceChord[], query: ChordQuery): ChordOccurrence[] {
  const match = matcherFor(query);
  const out: ChordOccurrence[] = [];
  const seen = new Set<string>();
  chords.forEach((chord, index) => {
    if (match(chord, index)) {
      const key = spotKey(chord);
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ index, measure: chord.measure, beat: chord.beat, startSec: chord.startSec, endSec: chord.endSec, chord });
    }
  });
  return out.sort((a, b) => a.startSec - b.startSec || a.index - b.index);
}

export interface ChordGroup {
  id: string;
  /** First occurrence of the chord (its name, notes and color). */
  chord: PieceChord;
  count: number;
  occurrences: ChordOccurrence[];
}

/** The distinct chords of the piece with their counts, in order of first appearance. */
export function groupChords(chords: readonly PieceChord[]): ChordGroup[] {
  const by = new Map<string, ChordGroup>();
  const seen = new Set<string>();
  chords.forEach((chord, index) => {
    const id = chordId(chord);
    const key = spotKey(chord);
    if (seen.has(key)) return;
    seen.add(key);
    const occ: ChordOccurrence = { index, measure: chord.measure, beat: chord.beat, startSec: chord.startSec, endSec: chord.endSec, chord };
    const g = by.get(id);
    if (g) {
      g.count++;
      g.occurrences.push(occ);
    } else by.set(id, { id, chord, count: 1, occurrences: [occ] });
  });
  return [...by.values()];
}

/** Next position in a loop of `count` items; `dir` is +1 or -1. 0 when empty. */
export function wrapPos(pos: number, count: number, dir: 1 | -1): number {
  if (count <= 0) return 0;
  return (((pos + dir) % count) + count) % count;
}

/** "compás 3, tiempo 2 · 3 de 9" (pos is 0-based). */
export function occurrenceLabel(occ: Pick<ChordOccurrence, "measure" | "beat">, pos: number, count: number): string {
  return `compás ${occ.measure}, tiempo ${occ.beat} · ${pos + 1} de ${count}`;
}
