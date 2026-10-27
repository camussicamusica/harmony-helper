import { describe, expect, test } from "bun:test";
import { boxedMeasures, chordLabelText, degreeOnly, labelWidth, layoutLabels, selectChordLabels } from "../src/lib/music/analysis/chordNames";
import type { PieceChord } from "../src/lib/music/analysis/pieceChords";
import type { Pattern } from "../src/lib/music/analysis/patterns";

const ch = (measure: number, beat: number, rootPc: number, quality: PieceChord["quality"] = "major7"): PieceChord =>
  ({ measure, beat, rootPc, quality, name: "X", roman: "I", inScale: true }) as unknown as PieceChord;
const pat = (...occ: number[][]): Pattern => ({ id: "p1", kind: "exact", measures: occ });

describe("boxedMeasures", () => {
  test("every measure of every occurrence", () => {
    expect([...boxedMeasures([pat([1, 2], [5, 6])])].sort((a, b) => a - b)).toEqual([1, 2, 5, 6]);
  });
});

describe("selectChordLabels", () => {
  // G (pc 7) x3 and D (pc 2) x2, A (pc 9) once.
  const chords = [ch(1, 1, 7), ch(2, 1, 2), ch(3, 1, 7), ch(4, 1, 2), ch(5, 1, 7), ch(6, 1, 9)];
  test("todos: every chord", () => {
    expect(selectChordLabels(chords, new Set([1, 2, 3, 4, 5, 6]), "todos").map((p) => p.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });
  test("unicos: repeated chords inside boxes get nothing", () => {
    const picks = selectChordLabels(chords, new Set([1, 2, 3, 4, 5, 6]), "unicos");
    expect(picks).toEqual([{ index: 5, reason: "unica" }]);
  });
  test("unicos: a repeated chord outside every box is labelled", () => {
    const picks = selectChordLabels(chords, new Set([1, 2, 3, 4]), "unicos");
    expect(picks.map((p) => [p.index, p.reason])).toEqual([
      [4, "sin-caja"],
      [5, "ambas"],
    ]);
  });
  test("unicos: unique chord inside a box still gets a label", () => {
    expect(selectChordLabels(chords, new Set([1, 2, 3, 4, 5, 6]), "unicos").map((p) => [p.index, p.reason])).toEqual([[5, "unica"]]);
  });
  test("a printed spot counts once", () => {
    const dup = [ch(1, 1, 7), ch(1, 1, 7)];
    expect(selectChordLabels(dup, new Set(), "todos")).toHaveLength(1);
  });
});

describe("chordLabelText", () => {
  test("name and degree", () => {
    expect(chordLabelText({ name: "Sol maj7", roman: "IV", inScale: true })).toBe("Sol maj7 · IV");
  });
  test("out of the key says fuera", () => {
    expect(chordLabelText({ name: "Do# mayor", roman: null, inScale: false })).toBe("Do# mayor · fuera");
  });
});

describe("degreeOnly", () => {
  test("strips the seventh, keeps the quality sign", () => {
    expect(degreeOnly("IVmaj7")).toBe("IV");
    expect(degreeOnly("V7")).toBe("V");
    expect(degreeOnly("ii7")).toBe("ii");
    expect(degreeOnly("vii°7")).toBe("vii°");
    expect(degreeOnly("vii°")).toBe("vii°");
    expect(degreeOnly("I")).toBe("I");
  });
  test("label uses it", () => {
    expect(chordLabelText({ name: "Sol maj7", roman: "IVmaj7", inScale: true })).toBe("Sol maj7 · IV");
  });
});

describe("layoutLabels", () => {
  test("a label that fits goes on the first row", () => {
    const r = layoutLabels([{ id: 1, system: 0, x: 10, width: 40 }, { id: 2, system: 0, x: 80, width: 40 }]);
    expect([...r.rows.entries()]).toEqual([[1, 0], [2, 0]]);
  });
  test("an overlapping label is staggered to row 1", () => {
    const r = layoutLabels([{ id: 1, system: 0, x: 10, width: 60 }, { id: 2, system: 0, x: 40, width: 60 }]);
    expect(r.rows.get(2)).toBe(1);
  });
  test("a third overlapping label is skipped", () => {
    const r = layoutLabels([{ id: 1, system: 0, x: 10, width: 60 }, { id: 2, system: 0, x: 30, width: 60 }, { id: 3, system: 0, x: 50, width: 60 }]);
    expect(r.skipped).toEqual([3]);
  });
  test("systems are independent", () => {
    const r = layoutLabels([{ id: 1, system: 0, x: 10, width: 60 }, { id: 2, system: 1, x: 20, width: 60 }]);
    expect(r.rows.get(2)).toBe(0);
  });
  test("labelWidth grows with the text", () => {
    expect(labelWidth("Sol maj7 · IV")).toBeGreaterThan(labelWidth("Sol"));
  });
});
