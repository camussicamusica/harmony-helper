import { describe, expect, test } from "bun:test";
import { keyInfo } from "../src/lib/music/analysis/key";
import {
  buildScaleView,
  headFill,
  passageLegend,
  passageRange,
  pickTonicOctave,
  pitchClassesInPassage,
} from "../src/lib/music/analysis/scaleView";
import { noteChipStyle } from "../src/lib/colors/noteChip";

const n = (spelledName: string, midi: number, measure: number, hand: "RH" | "LH" = "RH") => ({ spelledName, midi, measure, hand });

describe("passage", () => {
  const notes = [n("D", 62, 1), n("E", 64, 2), n("C#", 61, 3), n("A", 69, 4), n("B", 71, 5), n("G", 67, 8)];
  test("previous, current and next measure, clipped", () => {
    expect(passageRange(notes, 3)).toEqual({ from: 2, to: 4 });
    expect(passageRange(notes, 1)).toEqual({ from: 1, to: 2 });
    expect(passageRange(notes, 8)).toEqual({ from: 7, to: 8 });
  });
  test("pitch classes from any staff in the range", () => {
    const withLH = [...notes, n("F#", 42, 3, "LH")];
    expect([...pitchClassesInPassage(withLH, 2, 4)].sort((a, b) => a - b)).toEqual([1, 2, 4, 6, 9].sort((a, b) => a - b).filter((x) => x !== 2));
  });
  test("legend", () => {
    expect(passageLegend(3, 5)).toBe("En color: las que suenan en este pasaje (compases 3–5)");
    expect(passageLegend(1, 1)).toContain("compás 1");
  });
});

describe("pickTonicOctave", () => {
  test("keeps the hovered note inside the scale span", () => {
    expect(pickTonicOctave("D", 61)).toBe(3); // C#4 is the 7th of D3..D4
  });
  test("contains the note when possible", () => {
    const oct = pickTonicOctave("D", 66); // F#4
    expect(oct).toBe(4);
  });
});

describe("buildScaleView", () => {
  const dMajor = keyInfo("D", "major");
  const piece = [n("D", 62, 2), n("F#", 66, 3), n("C#", 73, 3), n("A", 69, 4), n("E", 64, 9)];
  test("D major, C#5 is the 7th degree", () => {
    const v = buildScaleView(n("C#", 73, 3), dMajor, piece)!;
    expect(v.clef).toBe("treble");
    expect(v.steps.map((s) => s.spelled)).toEqual(["D4", "E4", "F#4", "G4", "A4", "B4", "C#5", "D5"]);
    expect(v.steps.map((s) => s.degree)).toEqual([1, 2, 3, 4, 5, 6, 7, 1]);
    expect(v.hoveredIndex).toBe(6);
    expect(v.steps.filter((s) => s.hovered)).toHaveLength(1);
    expect(v.extra).toBeNull();
    // measures 2-4 use D, F#, C#, A (E is in measure 9)
    expect(v.steps.map((s) => s.used)).toEqual([true, false, true, false, true, false, true, true]);
    expect(v.legend).toBe("En color: las que suenan en este pasaje (compases 2–4)");
  });
  test("left hand gets the bass clef and a lower octave", () => {
    const v = buildScaleView(n("C#", 49, 3, "LH"), dMajor, piece)!;
    expect(v.clef).toBe("bass");
    expect(v.steps[0].spelled).toBe("D2");
    expect(v.steps[6].midi).toBe(49);
    expect(v.hoveredIndex).toBe(6);
  });
  test("tonic: rings the closest of the two", () => {
    expect(buildScaleView(n("D", 74, 3), dMajor, piece)!.hoveredIndex).toBe(7);
    expect(buildScaleView(n("D", 62, 3), dMajor, piece)!.steps[buildScaleView(n("D", 62, 3), dMajor, piece)!.hoveredIndex!].midi).toBe(62);
  });
  test("out of scale: C natural in D major goes next to C#", () => {
    const v = buildScaleView(n("C", 72, 3), dMajor, piece)!;
    expect(v.hoveredIndex).toBeNull();
    expect(v.extra).not.toBeNull();
    expect(v.extra!.afterIndex).toBe(6);
    expect(v.extra!.spelled).toBe("C5");
    expect(v.extra!.accidental).toBe("n");
    expect(v.extra!.text).toBe("alterada: Do en vez de Do#");
  });
  test("out of scale with its own accidental keeps it", () => {
    const v = buildScaleView(n("G#", 68, 3), dMajor, piece)!;
    expect(v.extra!.accidental).toBe("#");
    expect(v.extra!.text).toBe("alterada: Sol# en vez de Sol");
  });
  test("natural minor, and the raised 7th (harmonic minor)", () => {
    const aMinor = keyInfo("A", "minor");
    const nat = buildScaleView(n("G", 67, 1), aMinor, [n("G", 67, 1)])!;
    expect(nat.steps.map((s) => s.spelled)).toEqual(["A3", "B3", "C4", "D4", "E4", "F4", "G4", "A4"]);
    expect(nat.note).toBeNull();
    const harm = buildScaleView(n("G#", 68, 1), aMinor, [n("G#", 68, 1)])!;
    expect(harm.steps[6].spelled.startsWith("G#")).toBe(true);
    expect(harm.hoveredIndex).toBe(6);
    expect(harm.extra).toBeNull();
    expect(harm.note).toBe("(sensible elevada, menor armónica)");
  });
});

describe("her colors on the staff", () => {
  const roles = [
    { id: "note-1", color: "#ff0088", enabled: true },
    { id: "note-2", color: "#00aa44", enabled: false },
  ];
  test("headFill uses the stored color, even when the role is switched off", () => {
    expect(headFill(1, roles)).toBe("#ff0088");
    expect(headFill(2, roles)).toBe("#00aa44");
  });
  test("black only when the role has no color", () => {
    expect(headFill(5, roles)).toBe("#111111");
    expect(headFill(3, [{ id: "note-3", color: "", enabled: true }])).toBe("#111111");
  });
});

describe("noteChipStyle ignores enabled", () => {
  const roles = [{ id: "note-4", color: "#3366ff", enabled: false }];
  test("a disabled role still gets its stored color", () => {
    const st = noteChipStyle(4, roles);
    expect(st.neutral).toBe(false);
    expect(st.background).toBe("#3366ff");
  });
  test("only a role with no color (or none at all) is neutral", () => {
    expect(noteChipStyle(9, roles).neutral).toBe(true);
    expect(noteChipStyle(4, [{ id: "note-4", color: "", enabled: true }]).neutral).toBe(true);
  });
});
