import { describe, expect, test } from "bun:test";
import {
  colorCount,
  detectPatterns,
  letterFor,
  measureSignatures,
  patternLetters,
} from "../src/lib/music/analysis/patterns";
import type { Hand, ScheduledNote } from "../src/lib/music/types";

// 4/4 at 120 bpm: a beat is 0.5 s, a measure is 2 s.
const MEASURE_SEC = 2;
let id = 0;

type Spec = [midi: number, beat: number, beats: number, hand?: Hand];

/** Notes of one measure from [midi, beat, lengthInBeats] triples. */
function bar(m: number, spec: Spec[]): ScheduledNote[] {
  return spec.map(([midi, beat, beats, hand]) => ({
    id: `n${id++}`,
    midi,
    noteName: "x",
    spelledName: "x",
    startSec: (m - 1) * MEASURE_SEC + beat * 0.5,
    durationSec: beats * 0.5,
    hand: hand ?? "RH",
    measure: m,
    durationName: "negra",
  }));
}

const shift = (spec: Spec[], by: number): Spec[] => spec.map(([p, b, l, h]) => [p + by, b, l, h]);

const A: Spec[] = [[62, 0, 1], [59, 1, 1], [55, 2, 2], [43, 0, 4, "LH"]];
const B: Spec[] = [[55, 0, 1], [59, 1, 1], [62, 2, 1], [59, 3, 1], [43, 0, 2, "LH"], [38, 2, 2, "LH"]];
const C: Spec[] = [[57, 0, 2], [60, 2, 2], [38, 0, 2, "LH"], [42, 2, 2, "LH"]];
const D: Spec[] = [[55, 0, 4], [31, 0, 4, "LH"]];

/** The demo score: 1=3=5, 2=6, 7 is 2 shifted up a fifth. */
function demo(): ScheduledNote[] {
  return [
    ...bar(1, A), ...bar(2, B), ...bar(3, A), ...bar(4, C),
    ...bar(5, A), ...bar(6, B), ...bar(7, shift(B, 7)), ...bar(8, D),
  ];
}

describe("measureSignatures", () => {
  test("onsets are counted from the start of the measure, so the same bar later in the piece matches", () => {
    const sig = measureSignatures([...bar(1, A), ...bar(3, A)]);
    expect(sig.get(1)!.exact).toBe(sig.get(3)!.exact);
  });
  test("a different pitch or rhythm changes the signature", () => {
    const sig = measureSignatures([...bar(1, A), ...bar(2, shift(A, 2)), ...bar(3, [[62, 0, 2], [59, 2, 1], [55, 3, 1]])]);
    expect(sig.get(1)!.exact).not.toBe(sig.get(2)!.exact);
    expect(sig.get(1)!.exact).not.toBe(sig.get(3)!.exact);
  });
  test("a note that only continues a tie is not a new event", () => {
    const tied = bar(2, [[62, 0, 1], [59, 1, 1]]);
    tied.push({ ...bar(2, [[64, 0, 1]])[0], tieContinuation: true });
    const plain = bar(1, [[62, 0, 1], [59, 1, 1]]);
    const sig = measureSignatures([...plain, ...tied]);
    expect(sig.get(1)!.exact).toBe(sig.get(2)!.exact);
  });
  test("the real start of the measure is used when it is given (a measure that opens with a rest)", () => {
    const starts = new Map([[1, 0], [2, 2]]);
    // Both start with a quarter rest: the first note is on beat 1.
    const notes = [...bar(1, [[60, 1, 1]]), ...bar(2, [[60, 1, 1]])];
    const sig = measureSignatures(notes, "both", starts);
    expect(sig.get(1)!.exact).toBe(sig.get(2)!.exact);
    // A rest-first measure is NOT the same as one that opens with the note.
    const other = measureSignatures([...bar(1, [[60, 1, 1]]), ...bar(2, [[60, 0, 1]])], "both", starts);
    expect(other.get(1)!.exact).not.toBe(other.get(2)!.exact);
  });
});

describe("detectPatterns: exact repeats", () => {
  test("a bar that appears twice is one pattern with two occurrences", () => {
    const notes = [...bar(1, C), ...bar(2, D), ...bar(3, C)];
    expect(detectPatterns(notes)).toEqual([{ id: "p1", kind: "exact", measures: [[1], [3]] }]);
  });
  test("nothing repeats: no patterns", () => {
    expect(detectPatterns([...bar(1, A), ...bar(2, B), ...bar(3, C), ...bar(4, D)])).toEqual([]);
  });
  test("a single measure is never a pattern", () => {
    expect(detectPatterns(bar(1, A))).toEqual([]);
  });
  test("the demo: 1=3=5 is one pattern and 2=6 another, 4, 7 and 8 have none", () => {
    const p = detectPatterns(demo());
    expect(p.map((x) => x.measures)).toEqual([[[1], [3], [5]], [[2], [6]]]);
    expect(p.every((x) => x.kind === "exact")).toBe(true);
  });
  test("a run of two bars that repeats is boxed as one group", () => {
    const notes = [...bar(1, A), ...bar(2, B), ...bar(3, C), ...bar(4, A), ...bar(5, B), ...bar(6, D)];
    expect(detectPatterns(notes).map((x) => x.measures)).toEqual([[[1, 2], [4, 5]]]);
  });
  test("the longest run wins and its bars are not boxed again", () => {
    const notes = [...bar(1, A), ...bar(2, B), ...bar(3, C), ...bar(4, D), ...bar(5, A), ...bar(6, B), ...bar(7, C), ...bar(8, shift(D, 1))];
    expect(detectPatterns(notes).map((x) => x.measures)).toEqual([[[1, 2, 3], [5, 6, 7]]]);
  });
  test("a run of four is the longest that is looked at", () => {
    const four = [A, B, C, D];
    const notes = [...four.flatMap((s, i) => bar(i + 1, s)), ...four.flatMap((s, i) => bar(i + 5, s))];
    expect(detectPatterns(notes).map((x) => x.measures)).toEqual([[[1, 2, 3, 4], [5, 6, 7, 8]]]);
  });
  test("when a bar of the run also appears alone elsewhere, the bars are boxed one by one", () => {
    // A B at 1-2 and 5-6, and a lone A at 3 (the demo shape).
    const notes = [...bar(1, A), ...bar(2, B), ...bar(3, A), ...bar(4, C), ...bar(5, A), ...bar(6, B)];
    expect(detectPatterns(notes).map((x) => x.measures)).toEqual([[[1], [3], [5]], [[2], [6]]]);
  });
  test("four equal bars in a row are four occurrences of one bar, not two pairs", () => {
    const notes = [1, 2, 3, 4].flatMap((m) => bar(m, A));
    expect(detectPatterns(notes).map((x) => x.measures)).toEqual([[[1], [2], [3], [4]]]);
  });
  test("a bar with no notes (only rests) is skipped and breaks a run", () => {
    // Bar 2 has no notes, so 1 and 3 are not consecutive.
    const notes = [...bar(1, A), ...bar(3, B), ...bar(4, A), ...bar(5, B)];
    // A B is not a run (1 and 3 are not neighbours); the two bars are boxed one by one.
    expect(detectPatterns(notes).map((x) => x.measures)).toEqual([[[1], [4]], [[3], [5]]]);
  });
});

describe("detectPatterns: scope", () => {
  // Same right hand, different left hand.
  const rh: Spec[] = [[62, 0, 2], [64, 2, 2]];
  const notes = [
    ...bar(1, [...rh, [43, 0, 4, "LH"]]),
    ...bar(2, [...rh, [45, 0, 4, "LH"]]),
  ];
  test("both hands: the bars are different", () => {
    expect(detectPatterns(notes, { scope: "both" })).toEqual([]);
  });
  test("right hand only: the bars match", () => {
    expect(detectPatterns(notes, { scope: "rh" }).map((x) => x.measures)).toEqual([[[1], [2]]]);
  });
  test("left hand only: the bars are different", () => {
    expect(detectPatterns(notes, { scope: "lh" })).toEqual([]);
  });
});

describe("detectPatterns: transposed", () => {
  test("off by default: the shifted bar is not reported", () => {
    expect(detectPatterns(demo()).some((p) => p.kind === "transposed")).toBe(false);
  });
  test("on: bar 7 is bar 2 up a fifth, it borrows the color of the exact pattern", () => {
    const p = detectPatterns(demo(), { includeTransposed: true });
    const t = p.filter((x) => x.kind === "transposed");
    expect(t).toEqual([{ id: "p3", kind: "transposed", measures: [[7]], colorOf: "p2" }]);
    expect(p.find((x) => x.id === "p2")!.measures).toEqual([[2], [6]]);
  });
  test("two bars that are only transposed copies get their own pattern", () => {
    const notes = [...bar(1, A), ...bar(2, shift(A, 2)), ...bar(3, D)];
    const p = detectPatterns(notes, { includeTransposed: true });
    expect(p).toEqual([{ id: "p1", kind: "transposed", measures: [[1], [2]] }]);
  });
  test("a different rhythm is not a transposed copy even with the same steps", () => {
    const notes = [...bar(1, [[60, 0, 1], [62, 1, 1]]), ...bar(2, [[65, 0, 2], [67, 2, 2]])];
    expect(detectPatterns(notes, { includeTransposed: true })).toEqual([]);
  });
  test("a different interval sequence is not a transposed copy", () => {
    const notes = [...bar(1, [[60, 0, 1], [62, 1, 1]]), ...bar(2, [[60, 0, 1], [63, 1, 1]])];
    expect(detectPatterns(notes, { includeTransposed: true })).toEqual([]);
  });
  test("the same bars are exact, never also reported as transposed", () => {
    const notes = [...bar(1, A), ...bar(2, B), ...bar(3, A)];
    expect(detectPatterns(notes, { includeTransposed: true }).every((p) => p.kind === "exact")).toBe(true);
  });
});

describe("letters and colors", () => {
  test("letters go A, B, C... then AA", () => {
    expect([0, 1, 25, 26, 27].map(letterFor)).toEqual(["A", "B", "Z", "AA", "AB"]);
  });
  test("a transposed copy shares the letter and the color of its exact pattern", () => {
    const p = detectPatterns(demo(), { includeTransposed: true });
    const letters = patternLetters(p);
    expect(letters.get("p1")).toBe("A");
    expect(letters.get("p2")).toBe("B");
    expect(letters.has("p3")).toBe(false);
    expect(colorCount(p)).toBe(2);
  });
});
