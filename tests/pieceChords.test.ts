import { describe, expect, test } from "bun:test";
import { beatWholeFraction, detectChordParts, pieceChords } from "../src/lib/music/analysis/pieceChords";
import { keyInfo } from "../src/lib/music/analysis/key";
import type { ScoreMeta } from "../src/lib/music/analysis/scoreMeta";
import type { ScheduledNote } from "../src/lib/music/types";

// 120 bpm in 4/4: one beat = 0.5 s, one measure = 2 s.
const BPM = 120;
const meta = (measures: number): ScoreMeta => ({
  fifths: null,
  timeSig: { beats: 4, beatType: 4 },
  measures: Array.from({ length: measures }, (_, i) => ({ number: i + 1, startSec: i * 2, endSec: i * 2 + 2 })),
});

let n = 0;
function note(midi: number, spelledName: string, startSec: number, durationSec: number, measure: number): ScheduledNote {
  return {
    id: `n${n++}`, midi, noteName: spelledName, spelledName, startSec, durationSec, measure,
    hand: "RH", durationName: "negra",
  };
}

/** A block chord held from `start` for `dur` seconds. */
const chord = (spec: Array<[number, string]>, start: number, dur: number, measure: number) =>
  spec.map(([m, s]) => note(m, s, start, dur, measure));

const G_TRIAD: Array<[number, string]> = [[55, "G"], [59, "B"], [62, "D"]];
const C_TRIAD: Array<[number, string]> = [[60, "C"], [64, "E"], [67, "G"]];
const EB_TRIAD: Array<[number, string]> = [[63, "Eb"], [67, "G"], [70, "Bb"]];

describe("detectChordParts", () => {
  test("three notes make a chord", () => {
    expect(detectChordParts(["F#", "A", "C#"])).toMatchObject({ root: "F#", quality: "minor" });
  });
  test("two notes are not a chord", () => {
    expect(detectChordParts(["C", "G"])).toBeNull();
  });
  test("notes that match nothing known give null (never guess)", () => {
    expect(detectChordParts(["C", "C#", "D"])).toBeNull();
  });
});

describe("beatWholeFraction", () => {
  test("simple and compound meters", () => {
    expect(beatWholeFraction({ beats: 4, beatType: 4 })).toBe(1 / 4);
    expect(beatWholeFraction({ beats: 6, beatType: 8 })).toBe(3 / 8);
    expect(beatWholeFraction({ beats: 3, beatType: 8 })).toBe(1 / 8);
    expect(beatWholeFraction(null)).toBe(1 / 4);
  });
});

describe("pieceChords", () => {
  const gMajor = keyInfo("G", "major");

  test("no notes, no chords", () => {
    expect(pieceChords([], gMajor, meta(1), BPM)).toEqual([]);
  });

  test("a held chord is detected (Sol mayor = I in G)", () => {
    const out = pieceChords(chord(G_TRIAD, 0, 2, 1), gMajor, meta(1), BPM);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      name: "Sol mayor", quality: "major", degree: 1, roman: "I", fn: "T", fnEs: "Tónica", inScale: true,
      measure: 1, beat: 1, bassEs: null,
    });
  });

  test("consecutive identical beats merge into one chord spanning the whole time", () => {
    // Four separate attacks of the same chord, one per beat.
    const notes = [0, 0.5, 1, 1.5].flatMap((t) => chord(G_TRIAD, t, 0.5, 1));
    const out = pieceChords(notes, gMajor, meta(1), BPM);
    expect(out).toHaveLength(1);
    expect(out[0].startSec).toBeCloseTo(0);
    expect(out[0].endSec).toBeCloseTo(2);
  });

  test("a change of chord starts a new entry", () => {
    const notes = [...chord(G_TRIAD, 0, 2, 1), ...chord(C_TRIAD, 2, 2, 2)];
    const out = pieceChords(notes, gMajor, meta(2), BPM);
    expect(out.map((c) => c.name)).toEqual(["Sol mayor", "Do mayor"]);
    expect(out.map((c) => c.roman)).toEqual(["I", "IV"]);
    expect(out[1].measure).toBe(2);
  });

  test("an out-of-scale chord is flagged inScale false, with no degree / numeral / function", () => {
    const out = pieceChords(chord(EB_TRIAD, 0, 2, 1), gMajor, meta(1), BPM);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("Mi♭ mayor");
    expect(out[0].inScale).toBe(false);
    expect(out[0].degree).toBeNull();
    expect(out[0].roman).toBeNull();
    expect(out[0].fn).toBeNull();
  });

  test("an inversion is named by its root, and the bass is reported", () => {
    // G major with D in the bass.
    const out = pieceChords(chord([[50, "D"], [55, "G"], [59, "B"]], 0, 2, 1), gMajor, meta(1), BPM);
    expect(out[0].name).toBe("Sol mayor");
    expect(out[0].bassEs).toBe("Re");
  });

  test("chord notes get highlighted by id", () => {
    const notes = chord(G_TRIAD, 0, 2, 1);
    const out = pieceChords(notes, gMajor, meta(1), BPM);
    expect(out[0].noteIds.sort()).toEqual(notes.map((x) => x.id).sort());
  });
});
