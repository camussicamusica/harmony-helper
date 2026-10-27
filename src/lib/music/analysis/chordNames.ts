import type { PieceChord } from "./pieceChords";
import { chordId } from "./occurrences";
import type { Pattern } from "./patterns";

export type ChordNamesMode = "unicos" | "todos";

/** Why a chord got a label (shown as data-reason, handy to check the rule on a real piece). */
export type LabelReason = "unica" | "sin-caja" | "ambas" | "todos";

export interface ChordLabelPick {
  /** Index in the piece's chord list. */
  index: number;
  reason: LabelReason;
}

/** Measures covered by at least one pattern box (any occurrence of any pattern). */
export function boxedMeasures(patterns: readonly Pattern[]): Set<number> {
  const out = new Set<number>();
  for (const p of patterns) for (const occ of p.measures) for (const m of occ) out.add(m);
  return out;
}

const spot = (c: PieceChord) => `${c.measure}.${c.beat}.${chordId(c)}`;

/**
 * Which chords get a written name.
 * "todos": every detected chord (a printed spot once).
 * "unicos": a chord is labelled when it is the only one of its kind in the whole piece (same root and quality occurs
 * once) OR its measure is not inside any pattern box. Chords inside a box that repeat have no label: the box letter
 * already says they are a repetition.
 */
export function selectChordLabels(chords: readonly PieceChord[], boxed: ReadonlySet<number>, mode: ChordNamesMode): ChordLabelPick[] {
  const seen = new Set<string>();
  const spots: number[] = [];
  chords.forEach((c, i) => {
    const k = spot(c);
    if (seen.has(k)) return;
    seen.add(k);
    spots.push(i);
  });
  if (mode === "todos") return spots.map((index) => ({ index, reason: "todos" as const }));
  const count = new Map<string, number>();
  for (const i of spots) count.set(chordId(chords[i]), (count.get(chordId(chords[i])) ?? 0) + 1);
  const out: ChordLabelPick[] = [];
  for (const i of spots) {
    const c = chords[i];
    const unique = count.get(chordId(c)) === 1;
    const outside = !boxed.has(c.measure);
    if (unique || outside) out.push({ index: i, reason: unique && outside ? "ambas" : unique ? "unica" : "sin-caja" });
  }
  return out;
}

/** The degree alone: "IVmaj7" -> "IV", "V7" -> "V", "vii°7" -> "vii°" (the chord name already says the quality). */
export function degreeOnly(roman: string): string {
  return roman.replace(/maj7$/, "").replace(/([°ø])?7$/, "$1");
}

/** "Sol maj7 · IV"; out of the key: "Do# mayor · fuera". */
export function chordLabelText(c: Pick<PieceChord, "name" | "roman" | "inScale">): string {
  if (!c.inScale) return `${c.name} · fuera`;
  return c.roman ? `${c.name} · ${degreeOnly(c.roman)}` : c.name;
}

export interface LabelBox {
  id: number;
  system: number;
  /** Left edge and width in px. */
  x: number;
  width: number;
}

/**
 * Avoid collisions: per system, left to right, each label goes on the first of `rows` rows where it does not touch
 * the previous label of that row (`gap` px of air); when it fits nowhere it is skipped. Returns id -> row.
 */
export function layoutLabels(boxes: readonly LabelBox[], rows = 2, gap = 6): { rows: Map<number, number>; skipped: number[] } {
  const out = new Map<number, number>();
  const skipped: number[] = [];
  const bySystem = new Map<number, LabelBox[]>();
  for (const b of boxes) bySystem.set(b.system, [...(bySystem.get(b.system) ?? []), b]);
  for (const list of bySystem.values()) {
    const ends = new Array<number>(rows).fill(-Infinity);
    for (const b of [...list].sort((a, c) => a.x - c.x)) {
      const r = ends.findIndex((end) => b.x >= end + gap);
      if (r < 0) {
        skipped.push(b.id);
        continue;
      }
      ends[r] = b.x + b.width;
      out.set(b.id, r);
    }
  }
  return { rows: out, skipped };
}

/** Rough text width at 11px (the label is plain text, no need to measure the DOM). */
export const labelWidth = (text: string, fontPx = 11) => Math.ceil(text.length * fontPx * 0.56);
