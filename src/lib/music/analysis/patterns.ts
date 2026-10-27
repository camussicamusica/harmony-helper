import type { ScheduledNote } from "../types";

/** Which hand(s) a measure is compared with: both together (default), only the right, only the left. */
export type PatternScope = "both" | "rh" | "lh";

export interface Pattern {
  /** Stable within one detection run: "p1", "p2"... in order of first appearance. */
  id: string;
  /** Each occurrence is the list of consecutive measure numbers it covers. */
  measures: number[][];
  kind: "exact" | "transposed";
  /**
   * Only for `kind: "transposed"` entries that borrow the color and the letter of an exact pattern
   * (the id of that pattern). Without it, the transposed pattern has its own color and letter.
   */
  colorOf?: string;
}

export interface DetectOptions {
  scope?: PatternScope;
  /** Also match measures with the same rhythm and the same interval sequence at a different pitch. */
  includeTransposed?: boolean;
  /** Start second of every measure (`meta.measures`). Without it, a measure starts at its first note. */
  measureStarts?: Map<number, number>;
  /** Longest run of consecutive measures looked at as one pattern. Default 4. */
  maxRun?: number;
}

const MS = 1000;

function pickHands(notes: ScheduledNote[], scope: PatternScope): ScheduledNote[] {
  if (scope === "rh") return notes.filter((n) => n.hand === "RH");
  if (scope === "lh") return notes.filter((n) => n.hand === "LH");
  return notes;
}

interface MeasureSig {
  /** Exact: (onset in the measure, pitch, duration) for every sounding note. */
  exact: string;
  /** Transposed: same onsets and durations, plus the pitch steps between consecutive notes. */
  shape: string;
}

/**
 * Signature of every measure that has notes. Rests are implied by the onsets.
 * Notes that only continue a tie are not new events and are left out.
 */
export function measureSignatures(
  notes: ScheduledNote[],
  scope: PatternScope = "both",
  measureStarts?: Map<number, number>,
): Map<number, MeasureSig> {
  const by = new Map<number, ScheduledNote[]>();
  for (const n of pickHands(notes, scope)) {
    if (n.tieContinuation) continue;
    const arr = by.get(n.measure) ?? [];
    arr.push(n);
    by.set(n.measure, arr);
  }
  const out = new Map<number, MeasureSig>();
  for (const [m, ns] of by) {
    const start = measureStarts?.get(m) ?? Math.min(...ns.map((n) => n.startSec));
    const evs = ns
      .map((n) => ({
        on: Math.round((n.startSec - start) * MS),
        midi: n.midi,
        dur: Math.round(n.durationSec * MS),
      }))
      .sort((a, b) => a.on - b.on || a.midi - b.midi || a.dur - b.dur);
    const exact = evs.map((e) => `${e.on}:${e.midi}:${e.dur}`).join("|");
    const steps = evs.slice(1).map((e, i) => e.midi - evs[i].midi);
    const shape = `${evs.map((e) => `${e.on}:${e.dur}`).join("|")}#${steps.join(",")}`;
    out.set(m, { exact, shape });
  }
  return out;
}

interface Group {
  key: string;
  len: number;
  /** Start indices into the ordered measure list, not overlapping each other. */
  starts: number[];
}

/** The measure numbers that have notes, in score order. */
function orderedMeasures(sigs: Map<number, MeasureSig>): number[] {
  return [...sigs.keys()].sort((a, b) => a - b);
}

/** True when `a` and `b` are consecutive in the score (no empty measure between them). */
function consecutive(nums: number[], i: number, len: number): boolean {
  for (let k = 1; k < len; k++) if (nums[i + k] !== nums[i + k - 1] + 1) return false;
  return true;
}

/**
 * Finds the measures (or runs of 2-4 measures) that repeat.
 *
 * - A run counts only when it appears 2 or more times without overlapping itself.
 * - Longest run first. A measure already inside a longer repeated run is not boxed again.
 * - Exception, to keep the picture clear: a longer run is dropped when one of its measures also
 *   shows up somewhere else in the score. Then the measures are boxed one by one, so the extra
 *   copy is not left without a box (A B x A y A B: A at 1, 4 and 6; B at 2 and 7).
 */
export function detectPatterns(notes: ScheduledNote[], opts: DetectOptions = {}): Pattern[] {
  const scope = opts.scope ?? "both";
  const maxRun = Math.max(1, Math.min(4, opts.maxRun ?? 4));
  const sigs = measureSignatures(notes, scope, opts.measureStarts);
  const nums = orderedMeasures(sigs);
  const exactAt = nums.map((m) => sigs.get(m)!.exact);
  const total = new Map<string, number>();
  for (const k of exactAt) total.set(k, (total.get(k) ?? 0) + 1);

  const covered = new Set<number>(); // indices into nums
  const chosen: Group[] = [];

  for (let len = Math.min(maxRun, nums.length); len >= 1; len--) {
    const byKey = new Map<string, number[]>();
    for (let i = 0; i + len <= nums.length; i++) {
      if (!consecutive(nums, i, len)) continue;
      const key = exactAt.slice(i, i + len).join("¦");
      const arr = byKey.get(key) ?? [];
      arr.push(i);
      byKey.set(key, arr);
    }
    for (const [key, all] of byKey) {
      // Left to right, no overlaps, nothing already boxed by a longer run.
      const starts: number[] = [];
      let lastEnd = -1;
      for (const s of all) {
        if (s <= lastEnd) continue;
        let free = true;
        for (let k = 0; k < len; k++) if (covered.has(s + k)) free = false;
        if (!free) continue;
        starts.push(s);
        lastEnd = s + len - 1;
      }
      if (starts.length < 2) continue;
      if (len > 1) {
        // Keep the run only if every one of its measures appears nowhere else.
        const parts = key.split("¦");
        if (parts.some((p) => (total.get(p) ?? 0) > starts.length)) continue;
      }
      for (const s of starts) for (let k = 0; k < len; k++) covered.add(s + k);
      chosen.push({ key, len, starts });
    }
  }

  // Order by where the first occurrence begins, so ids and letters read left to right.
  chosen.sort((a, b) => a.starts[0] - b.starts[0] || b.len - a.len);
  const patterns: Pattern[] = chosen.map((g, i) => ({
    id: `p${i + 1}`,
    kind: "exact" as const,
    measures: g.starts.map((s) => nums.slice(s, s + g.len)),
  }));

  if (opts.includeTransposed) addTransposed(patterns, sigs, nums, covered);
  return patterns;
}

/** Appends "transposed" entries: measures that only match an exact pattern after a pitch shift. */
function addTransposed(patterns: Pattern[], sigs: Map<number, MeasureSig>, nums: number[], covered: Set<number>) {
  const classes = new Map<string, number[]>();
  for (const m of nums) {
    const key = sigs.get(m)!.shape;
    const arr = classes.get(key) ?? [];
    arr.push(m);
    classes.set(key, arr);
  }
  const idxOf = new Map(nums.map((m, i) => [m, i]));
  let counter = patterns.length;
  const extra: Pattern[] = [];
  for (const members of classes.values()) {
    if (members.length < 2) continue;
    const free = members.filter((m) => !covered.has(idxOf.get(m)!));
    if (!free.length) continue;
    // Exact single-measure patterns that live in this class: the biggest lends its color.
    const lenders = patterns.filter((p) => p.measures[0].length === 1 && members.includes(p.measures[0][0]));
    const lender = [...lenders].sort((a, b) => b.measures.length - a.measures.length)[0];
    // Free measures that are identical to each other would already be an exact pattern, so here they differ in pitch.
    if (lender) {
      counter++;
      extra.push({ id: `p${counter}`, kind: "transposed", measures: free.map((m) => [m]), colorOf: lender.id });
    } else if (free.length >= 2) {
      counter++;
      extra.push({ id: `p${counter}`, kind: "transposed", measures: free.map((m) => [m]) });
    }
  }
  extra.sort((a, b) => a.measures[0][0] - b.measures[0][0]);
  patterns.push(...extra);
}

/** The id whose color and letter a pattern uses. */
export function colorKey(p: Pattern): string {
  return p.colorOf ?? p.id;
}

/** "A", "B"... "Z", "AA"... */
export function letterFor(index: number): string {
  let n = index;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/** Color keys in reading order and the letter for each one. */
export function patternLetters(patterns: Pattern[]): Map<string, string> {
  const out = new Map<string, string>();
  let i = 0;
  for (const p of patterns) {
    const k = colorKey(p);
    if (!out.has(k)) out.set(k, letterFor(i++));
  }
  return out;
}

/** How many different colors the patterns need. */
export function colorCount(patterns: Pattern[]): number {
  return new Set(patterns.map(colorKey)).size;
}
