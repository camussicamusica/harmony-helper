import { describe, expect, test } from "bun:test";
import {
  chordId,
  findChordOccurrences,
  groupChords,
  occurrenceLabel,
  wrapPos,
} from "../src/lib/music/analysis/occurrences";
import { noteChipStyle, spelledPc, NEUTRAL_CHIP } from "../src/lib/colors/noteChip";
import { hoverText } from "../src/lib/music/naming";
import type { PieceChord } from "../src/lib/music/analysis/pieceChords";
import type { ScheduledNote } from "../src/lib/music/types";

let t = 0;
function ch(rootPc: number, quality: PieceChord["quality"], measure: number, beat: number): PieceChord {
  const startSec = t++;
  return { startSec, endSec: startSec + 1, measure, beat, rootPc, quality, name: `${rootPc}${quality}` } as PieceChord;
}

// D major piece: I  IVmaj7  I  IVmaj7  I  IVmaj7
const D = (m: number, b = 1) => ch(2, "major", m, b);
const G7 = (m: number, b = 2) => ch(7, "major7", m, b);
const piece = [D(1), G7(1), D(2), G7(3), D(4), G7(5)];

describe("findChordOccurrences", () => {
  test("a chord: every occurrence in score order, with measure and beat", () => {
    const occ = findChordOccurrences(piece, G7(0));
    expect(occ.map((o) => [o.measure, o.beat])).toEqual([[1, 2], [3, 2], [5, 2]]);
    expect(occ.map((o) => o.index)).toEqual([1, 3, 5]);
  });
  test("root and quality identify the chord, not the bass", () => {
    expect(chordId({ rootPc: 7, quality: "major7" })).toBe("7:major7");
    expect(findChordOccurrences(piece, { rootPc: 2, quality: "major" })).toHaveLength(3);
  });
  test("a list of chords", () => {
    const occ = findChordOccurrences(piece, [{ rootPc: 2, quality: "major" }, { rootPc: 7, quality: "major7" }]);
    expect(occ).toHaveLength(6);
  });
  test("a predicate (e.g. every chord rooted on a pitch class)", () => {
    expect(findChordOccurrences(piece, (c) => c.rootPc === 7)).toHaveLength(3);
    expect(findChordOccurrences(piece, () => false)).toEqual([]);
  });
});

describe("groupChords", () => {
  test("distinct chords with counts, in order of first appearance", () => {
    const g = groupChords(piece);
    expect(g.map((x) => [x.id, x.count])).toEqual([["2:major", 3], ["7:major7", 3]]);
    expect(g[1].occurrences[0].measure).toBe(1);
  });
});

describe("cursor math", () => {
  test("wraps forward and backward", () => {
    expect(wrapPos(0, 3, 1)).toBe(1);
    expect(wrapPos(2, 3, 1)).toBe(0);
    expect(wrapPos(0, 3, -1)).toBe(2);
    expect(wrapPos(0, 0, 1)).toBe(0);
  });
  test("position text", () => {
    expect(occurrenceLabel({ measure: 3, beat: 2 }, 2, 9)).toBe("compás 3, tiempo 2 · 3 de 9");
  });
});

describe("noteChipStyle", () => {
  const roles = [
    { id: "note-2", color: "#F9C81E" },
    { id: "note-7", color: "#1E5FBF", enabled: false },
    { id: "note-9", color: "#1E5FBF", enabled: true },
  ];
  test("uses her color with readable text", () => {
    const s = noteChipStyle(2, roles);
    expect(s.background).toBe("#F9C81E");
    expect(s.color).toBe("#111111"); // light yellow -> dark text
    expect(noteChipStyle(9, roles).color).toBe("#ffffff"); // dark blue -> white text
  });
  test("disabled or missing role is neutral", () => {
    expect(noteChipStyle(7, roles)).toEqual(NEUTRAL_CHIP);
    expect(noteChipStyle(5, roles)).toEqual(NEUTRAL_CHIP);
    expect(noteChipStyle(-1, roles)).toEqual(NEUTRAL_CHIP);
  });
  test("spelled names map to pitch classes", () => {
    expect([spelledPc("D"), spelledPc("F#"), spelledPc("Bb"), spelledPc("C")]).toEqual([2, 6, 10, 0]);
    expect(spelledPc("??")).toBe(-1);
  });
});

describe("hoverText chord tones", () => {
  const n = (midi: number, spelledName: string): ScheduledNote => ({
    id: spelledName, midi, noteName: spelledName, spelledName, startSec: 0, durationSec: 1, measure: 1, hand: "RH", durationName: "negra",
  });
  test("exposes the tones for chips and keeps the text line", () => {
    const all = [n(62, "D"), n(66, "F#"), n(69, "A"), n(72, "C")];
    const h = hoverText(all[0], all);
    expect(h.chord?.tones).toEqual(["D", "F#", "A", "C"]);
    expect(h.line2).toContain("Re");
  });
});
