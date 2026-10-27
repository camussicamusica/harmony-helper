import { Chord } from "tonal";
import type { ScheduledNote } from "../types";
import { solfegeName } from "../naming";
import {
  FUNCTION_ES,
  QUALITY_ES,
  QUALITY_ROLE,
  functionOf,
  isSeventh,
  romanFor,
  type ChordFunction,
  type ChordQuality,
} from "./chords";
import type { KeyInfo } from "./key";
import type { ScoreMeta } from "./scoreMeta";

export interface PieceChord {
  startSec: number;
  endSec: number;
  measure: number;
  /** Beat of the measure where the chord starts (1-based). */
  beat: number;
  /** "Sol mayor" */
  name: string;
  /** Spelled root ("G") and Spanish root ("Sol"). */
  root: string;
  rootEs: string;
  rootPc: number;
  quality: ChordQuality;
  roleId: string;
  /** Bass note in solfège, only when it is not the root ("Re"). */
  bassEs: string | null;
  /** Spelled notes, lowest first. */
  notes: string[];
  notesEs: string[];
  pcs: number[];
  /** Scale degree 1..7, or null when the chord is outside the scale. */
  degree: number | null;
  /** "V", "ii°"… or null when outside the scale. */
  roman: string | null;
  fn: ChordFunction | null;
  fnEs: string | null;
  inScale: boolean;
  /** Ids of the notes that start inside the segment (to highlight their noteheads). */
  noteIds: string[];
}

const EPS = 1e-3;
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const pcOf = (spelled: string) => {
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let pc = base[spelled[0]] ?? 0;
  for (const ch of spelled.slice(1)) pc += ch === "#" ? 1 : ch === "b" ? -1 : 0;
  return mod12(pc);
};

const TYPE_TO_QUALITY: Record<string, ChordQuality> = {
  major: "major",
  minor: "minor",
  diminished: "diminished",
  augmented: "augmented",
  "dominant seventh": "dominant7",
  "major seventh": "major7",
  "minor seventh": "minor7",
  "half-diminished": "halfDim7",
  "diminished seventh": "dim7",
  "suspended second": "sus",
  "suspended fourth": "sus",
};

export interface ChordParts {
  root: string;
  quality: ChordQuality;
  bass: string;
}

/** Detect a chord from spelled note names, lowest first. Null when nothing known matches (never guess). */
export function detectChordParts(spelledLowToHigh: string[]): ChordParts | null {
  const seen = new Set<string>();
  const pcs: string[] = [];
  for (const n of spelledLowToHigh) {
    if (!seen.has(n)) {
      seen.add(n);
      pcs.push(n);
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
    const [main] = sym.split("/");
    const c = Chord.get(main);
    if (c.empty || !c.tonic) continue;
    const quality = TYPE_TO_QUALITY[c.type];
    if (!quality) continue;
    return { root: c.tonic, quality, bass: pcs[0] };
  }
  return null;
}

interface Seg {
  startSec: number;
  endSec: number;
  measure: number;
  beat: number;
  notes: ScheduledNote[];
}

/** Length of one beat in whole notes: 1/beatType, or 3/8 for compound meters (6/8, 9/8, 12/8). */
export function beatWholeFraction(timeSig: ScoreMeta["timeSig"]): number {
  if (!timeSig) return 1 / 4;
  const { beats, beatType } = timeSig;
  if (beatType === 8 && beats >= 6 && beats % 3 === 0) return 3 / 8;
  return 1 / beatType;
}

function buildBeatSegments(notes: ScheduledNote[], meta: ScoreMeta, bpm: number): Seg[][] {
  const beatSec = (240 / bpm) * beatWholeFraction(meta.timeSig);
  let measures = meta.measures;
  if (!measures.length) {
    // Fallback: spans from the notes' own measure numbers.
    const by = new Map<number, { s: number; e: number }>();
    for (const n of notes) {
      const m = by.get(n.measure) ?? { s: Infinity, e: 0 };
      m.s = Math.min(m.s, n.startSec);
      m.e = Math.max(m.e, n.startSec + n.durationSec);
      by.set(n.measure, m);
    }
    measures = [...by.entries()].sort((a, b) => a[1].s - b[1].s).map(([number, v]) => ({ number, startSec: v.s, endSec: v.e }));
  }
  const out: Seg[][] = [];
  for (const m of measures) {
    const row: Seg[] = [];
    let t = m.startSec;
    let beat = 1;
    while (t < m.endSec - EPS) {
      const end = Math.min(t + beatSec, m.endSec);
      const len = end - t;
      const inSeg = notes.filter((n) => {
        const nEnd = n.startSec + n.durationSec;
        const overlap = Math.min(end, nEnd) - Math.max(t, n.startSec);
        if (overlap <= EPS) return false;
        return n.startSec >= t - EPS || overlap >= 0.2 * len;
      });
      row.push({ startSec: t, endSec: end, measure: m.number, beat, notes: inSeg });
      t = end;
      beat++;
    }
    out.push(row);
  }
  return out;
}

function detectNotes(ns: ScheduledNote[]): ChordParts | null {
  const sorted = [...ns].sort((a, b) => a.midi - b.midi);
  return detectChordParts(sorted.map((n) => n.spelledName));
}

/**
 * Chords of the piece: one per beat (a beat with fewer than 3 different notes borrows the following
 * beats of the same measure until a chord appears), consecutive identical chords merged.
 */
export function pieceChords(notes: ScheduledNote[], key: KeyInfo, meta: ScoreMeta, bpm: number): PieceChord[] {
  if (!notes.length) return [];
  const keyPcs = new Set(key.pcs);
  const raw: Array<{ segs: Seg[]; parts: ChordParts; notes: ScheduledNote[] }> = [];

  for (const row of buildBeatSegments(notes, meta, bpm)) {
    let i = 0;
    while (i < row.length) {
      const alone = detectNotes(row[i].notes);
      if (alone) {
        raw.push({ segs: [row[i]], parts: alone, notes: row[i].notes });
        i++;
        continue;
      }
      // A passing melody note can hide a chord that was already sounding: the voices that last into the next beat
      // spell the same chord the next beat does. Then the chord starts here, not one beat later.
      const next = row[i + 1];
      const nextParts = next ? detectNotes(next.notes) : null;
      if (next && nextParts) {
        const held = row[i].notes.filter((n) => n.startSec + n.durationSec > next.startSec + EPS);
        const heldParts = detectNotes(held);
        if (heldParts && heldParts.root === nextParts.root && heldParts.quality === nextParts.quality) {
          raw.push({ segs: [row[i], next], parts: nextParts, notes: [...new Set([...held, ...next.notes])] });
          i += 2;
          continue;
        }
      }
      let found = false;
      let union = [...row[i].notes];
      for (let j = i + 1; j < row.length; j++) {
        if (detectNotes(row[j].notes)) break; // that beat has its own chord
        union = union.concat(row[j].notes);
        const parts = detectNotes(union);
        if (parts) {
          raw.push({ segs: row.slice(i, j + 1), parts, notes: union });
          i = j + 1;
          found = true;
          break;
        }
      }
      if (!found) i++;
    }
  }

  const out: PieceChord[] = [];
  let prevKey = "";
  for (const r of raw) {
    const first = r.segs[0];
    const last = r.segs[r.segs.length - 1];
    const rootPc = pcOf(r.parts.root);
    const sorted = [...r.notes].sort((a, b) => a.midi - b.midi);
    const spelled: string[] = [];
    for (const n of sorted) if (!spelled.includes(n.spelledName)) spelled.push(n.spelledName);
    const pcs = [...new Set(spelled.map(pcOf))];
    const idKey = `${rootPc}:${r.parts.quality}`;
    const contiguous = out.length > 0 && Math.abs(out[out.length - 1].endSec - first.startSec) < EPS;
    if (contiguous && idKey === prevKey) {
      out[out.length - 1].endSec = last.endSec;
      continue;
    }
    prevKey = idKey;

    const idx = key.pcs.indexOf(rootPc);
    const inScale = idx >= 0 && pcs.every((p) => keyPcs.has(p));
    const rootEs = solfegeName(r.parts.root);
    const q = r.parts.quality;
    const qEs = q === "sus" ? "sus" : QUALITY_ES[q];
    const name = isSeventh(q) ? (q === "dominant7" ? `${rootEs}7` : `${rootEs} ${qEs}`) : `${rootEs} ${qEs}`;
    const fn = inScale ? functionOf(key.mode, idx) : null;
    const bassPc = pcOf(r.parts.bass);
    out.push({
      startSec: first.startSec,
      endSec: last.endSec,
      measure: first.measure,
      beat: first.beat,
      name,
      root: r.parts.root,
      rootEs,
      rootPc,
      quality: q,
      roleId: QUALITY_ROLE[q],
      bassEs: bassPc !== rootPc ? solfegeName(r.parts.bass) : null,
      notes: spelled,
      notesEs: spelled.map(solfegeName),
      pcs,
      degree: inScale ? idx + 1 : null,
      roman: inScale ? romanFor(idx, q) : null,
      fn,
      fnEs: fn ? FUNCTION_ES[fn] : null,
      inScale,
      noteIds: [],
    });
  }
  // Highlight targets: notes starting inside each (merged) chord, plus the chord tones that kept sounding from the
  // chord right before it (a melody step changes the label, e.g. Si m7 -> Si menor, but the hand is still on the keys
  // from the earlier beat; without them the box would sit on one lone melody note).
  out.forEach((c, k) => {
    const own = notes.filter((n) => n.startSec >= c.startSec - EPS && n.startSec < c.endSec - EPS);
    const prev = out[k - 1];
    const carried =
      prev && Math.abs(prev.endSec - c.startSec) < EPS
        ? notes.filter(
            (n) =>
              n.measure === c.measure &&
              n.startSec >= prev.startSec - EPS &&
              n.startSec < c.startSec - EPS &&
              n.startSec + n.durationSec > c.startSec + EPS &&
              c.pcs.includes(pcOf(n.spelledName)),
          )
        : [];
    c.noteIds = [...carried, ...own].map((n) => n.id);
  });
  return out;
}
