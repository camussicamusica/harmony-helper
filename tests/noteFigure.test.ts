import { describe, expect, test } from "bun:test";
import { figureOf, momentOf } from "../src/lib/music/analysis/noteFigure";
import type { Hand, ScheduledNote } from "../src/lib/music/types";

let k = 0;
const n = (midi: number, spelledName: string, startSec: number, durationSec: number, hand: Hand): ScheduledNote => ({
  id: `f${k++}`, midi, noteName: spelledName, spelledName, startSec, durationSec, measure: 6, hand, durationName: "blanca", system: 0,
});

// Gymnopédie m6: bass D2 held all measure, LH chord A3 C#4 F#4 on beat 2, melody on the right hand.
const bass = n(38, "D", 0, 1.5, "LH");
const A = n(57, "A", 0.5, 1, "LH");
const Cs = n(61, "C#", 0.5, 1, "LH");
const Fs = n(66, "F#", 0.5, 1, "LH");
const melody = n(79, "G", 0.5, 0.5, "RH");
const all = [bass, A, Cs, Fs, melody];

describe("figureOf", () => {
  test("same staff and same onset only: no held bass, no other hand", () => {
    const f = figureOf(A, all);
    expect(f.tones).toEqual(["A", "C#", "F#"]);
    expect(f.ownIndex).toBe(0);
    expect(f.chord).toBe("Fa# menor (bajo La)");
    expect(f.alone).toBe(false);
  });
  test("a note printed alone says so", () => {
    const f = figureOf(melody, all);
    expect(f.alone).toBe(true);
    expect(f.tones).toEqual(["G"]);
  });
  test("two notes give an interval name", () => {
    const f = figureOf(A, [A, Cs]);
    expect(f.interval).toBeTruthy();
    expect(f.chord).toBeNull();
  });
});

describe("momentOf", () => {
  test("onsets plus held notes, held ones marked", () => {
    const m = momentOf(A, all, figureOf(A, all));
    expect(m.tones).toEqual(["D", "A", "C#", "F#", "G"]);
    expect(m.held).toEqual([true, false, false, false, false]);
    expect(m.ownIndex).toBe(1);
    expect(m.differsFromFigure).toBe(true);
  });
  test("same as the figure when nothing else sounds", () => {
    const solo = [A, Cs, Fs];
    expect(momentOf(A, solo, figureOf(A, solo)).differsFromFigure).toBe(false);
  });
});
