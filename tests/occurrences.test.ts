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
  test("a disabled role keeps its stored color (enabled only governs the score)", () => {
    expect(noteChipStyle(7, roles).background).toBe("#1E5FBF");
    expect(noteChipStyle(7, roles).neutral).toBe(false);
  });
  test("missing role or no pitch is neutral", () => {
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

import { buildDefaultRoles } from "../src/lib/colors/defaults";

describe("every chord tone gets her color (default roles, all enabled)", () => {
  const roles = buildDefaultRoles();
  const spellings: Array<[string, number]> = [
    ["C", 0], ["B#", 0], ["C#", 1], ["Db", 1], ["D", 2], ["D#", 3], ["Eb", 3], ["E", 4], ["Fb", 4], ["F", 5], ["E#", 5],
    ["F#", 6], ["Gb", 6], ["G", 7], ["G#", 8], ["Ab", 8], ["A", 9], ["A#", 10], ["Bb", 10], ["B", 11], ["Cb", 11],
    ["G4", 7], ["D5", 2], ["Fx", 7], ["Bbb", 9],
  ];
  for (const [sp, pc] of spellings) {
    test(`${sp} -> pc ${pc}, colored`, () => {
      expect(spelledPc(sp)).toBe(pc);
      const st = noteChipStyle(spelledPc(sp), roles);
      expect(st.neutral).toBe(false);
      expect(st.background).toBe(roles.find((r) => r.id === `note-${pc}`)!.color);
    });
  }
});

import { durationNameFor, intervalNameEs } from "../src/lib/music/naming";
import { headHoverStyle } from "../src/lib/colors/noteChip";

describe("durationNameFor (dots)", () => {
  test("plain, dotted and double dotted for every base", () => {
    const bases: Array<[number, string]> = [[1, "redonda"], [1 / 2, "blanca"], [1 / 4, "negra"], [1 / 8, "corchea"], [1 / 16, "semicorchea"]];
    for (const [b, name] of bases) {
      expect(durationNameFor(b, b)).toBe(name);
      expect(durationNameFor(b, b * 1.5)).toBe(`${name} con puntillo`);
      expect(durationNameFor(b, b * 1.75)).toBe(`${name} con doble puntillo`);
    }
  });
  test("tuplets keep the plain name; no type falls back to length", () => {
    expect(durationNameFor(1 / 4, 1 / 6)).toBe("negra");
    expect(durationNameFor(undefined, 0.75)).toBe("blanca con puntillo");
  });
});

describe("intervalNameEs", () => {
  test("Spanish names", () => {
    expect(intervalNameEs("B", "F#")).toBe("quinta justa");
    expect(intervalNameEs("C", "E")).toBe("tercera mayor");
    expect(intervalNameEs("C", "Eb")).toBe("tercera menor");
    expect(intervalNameEs("C", "F#")).toBe("cuarta aumentada");
    expect(intervalNameEs("C", "Gb")).toBe("quinta disminuida");
  });
  test("two sounding notes carry the interval; three do not", () => {
    const n = (midi: number, s: string): ScheduledNote => ({
      id: s, midi, noteName: s, spelledName: s, startSec: 0, durationSec: 1, measure: 1, hand: "LH", durationName: "negra",
    });
    const two = [n(47, "B"), n(54, "F#")];
    const h = hoverText(two[0], two);
    expect(h.chord?.interval).toBe("quinta justa");
    expect(h.chord?.ownIndex).toBe(0);
    expect(hoverText(two[1], two).chord?.ownIndex).toBe(1);
    const three = [n(48, "C"), n(52, "E"), n(55, "G")];
    expect(hoverText(three[0], three).chord?.interval).toBeNull();
  });
});

describe("headHoverStyle", () => {
  const roles = [
    { id: "note-2", color: "#F9C81E", enabled: true, targets: ["notehead", "stem"] },
    { id: "note-7", color: "#1E5FBF", enabled: false, targets: ["notehead"] },
    { id: "note-9", color: "#aa00aa", enabled: true, targets: ["stem"] },
  ];
  test("glow when the head is already colored", () => expect(headHoverStyle(2, roles)).toEqual({ color: "#F9C81E", mode: "glow" }));
  test("fill when disabled or notehead target off (stored color)", () => {
    expect(headHoverStyle(7, roles)).toEqual({ color: "#1E5FBF", mode: "fill" });
    expect(headHoverStyle(9, roles)?.mode).toBe("fill");
  });
  test("null when no role", () => {
    expect(headHoverStyle(5, roles)).toBeNull();
    expect(headHoverStyle(-1, roles)).toBeNull();
  });
});

describe("hoverText location and own note", () => {
  test("where reads Compás N · tiempo B", () => {
    const x = { id: "a", midi: 47, noteName: "B", spelledName: "B", startSec: 0, durationSec: 1, measure: 18, beat: 1, hand: "LH", durationName: "blanca con puntillo" } as ScheduledNote;
    const h = hoverText(x, [x]);
    expect(h.where).toBe("Compás 18 · tiempo 1");
    expect(h.own).toEqual({ spelled: "B", duration: "blanca con puntillo" });
    expect(h.chord).toBeNull();
  });
});

describe("printed positions count once", () => {
  test("the same measure and beat of the same chord (e.g. a repeat unrolled) is one occurrence", () => {
    const a = ch(7, "major7", 5, 2);
    const again = ch(7, "major7", 5, 2); // second pass over the repeat
    const other = ch(7, "major7", 9, 2);
    const list = [a, again, other];
    expect(findChordOccurrences(list, a).map((o) => [o.measure, o.beat])).toEqual([[5, 2], [9, 2]]);
    expect(groupChords(list)[0].count).toBe(2);
  });
});
