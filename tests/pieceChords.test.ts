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

describe("pieceChords: passing melody notes and carried voices", () => {
  const dMajor = keyInfo("D", "major");
  // 3/4 at 120 bpm: beat 0.5 s, measure 1.5 s. Bass G2 for the measure, chord B D F# on beats 2-3 (Gmaj7).
  const m3 = (): ScoreMeta => ({
    fifths: 2,
    timeSig: { beats: 3, beatType: 4 },
    measures: [{ number: 7, startSec: 0, endSec: 1.5 }],
  });
  const bass = () => note(43, "G", 0, 1.5, 7);
  const voices = () => [note(59, "B", 0.5, 1, 7), note(62, "D", 0.5, 1, 7), note(66, "F#", 0.5, 1, 7)];

  test("a passing note on beat 2 does not push the chord to beat 3", () => {
    // beat 2: melody C# (not in the chord) -> beat 2 alone is no known chord; beat 3: melody D -> Gmaj7
    const notes = [bass(), ...voices(), note(73, "C#", 0.5, 0.5, 7), note(74, "D", 1, 0.5, 7)];
    const out = pieceChords(notes, dMajor, m3(), BPM);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ measure: 7, beat: 2, quality: "major7", rootPc: 7 });
  });

  test("a melody step that relabels the chord keeps the held voices in the box", () => {
    // Si m7 on beat 2 (melody A), Si menor on beat 3 (melody B): the box of the 2nd must include the held B D F#.
    const b = note(35, "B", 0, 1.5, 34);
    const held = [note(59, "B", 0.5, 1, 34), note(62, "D", 0.5, 1, 34), note(66, "F#", 0.5, 1, 34)];
    const a4 = note(69, "A", 0.5, 0.5, 34);
    const b4 = note(71, "B", 1, 0.5, 34);
    const meta34: ScoreMeta = { fifths: 2, timeSig: { beats: 3, beatType: 4 }, measures: [{ number: 34, startSec: 0, endSec: 1.5 }] };
    const out = pieceChords([b, ...held, a4, b4], dMajor, meta34, BPM);
    expect(out.map((c) => [c.name, c.beat])).toEqual([["Si m7", 2], ["Si menor", 3]]);
    const second = out[1];
    for (const h of held) expect(second.noteIds).toContain(h.id);
    expect(second.noteIds).not.toContain(b.id); // the downbeat bass is not carried
    expect(second.noteIds).not.toContain(a4.id);
  });
});
