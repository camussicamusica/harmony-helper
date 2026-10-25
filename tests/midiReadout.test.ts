import { describe, expect, test } from "bun:test";
import { chordReadout, noteReadout } from "../src/lib/midi/readout";

const set = (...m: number[]) => new Set(m);

describe("noteReadout: what the screen says for a single key", () => {
  test("a white key", () => expect(noteReadout(62)).toBe("Re (D) · octava 4"));
  test("middle C is octave 4", () => expect(noteReadout(60)).toBe("Do (C) · octava 4"));
  test("a black key shows both names", () => expect(noteReadout(61)).toBe("Do# (C#) / Re♭ (D♭) · octava 4"));
  test("the lowest and highest piano keys", () => {
    expect(noteReadout(21)).toBe("La (A) · octava 0");
    expect(noteReadout(108)).toBe("Do (C) · octava 8");
  });
});

describe("chordReadout: what the screen says for 3+ keys", () => {
  test("Fa#-La-Do# is Fa# menor", () => expect(chordReadout(set(54, 57, 61))).toBe("Fa# menor"));
  test("Do mayor", () => expect(chordReadout(set(60, 64, 67))).toBe("Do mayor"));
  test("any order, any octave", () => expect(chordReadout(set(79, 52, 60))).toBe("Do mayor (bajo Mi)"));
  test("black-key major chords use flats (Si♭ mayor)", () => expect(chordReadout(set(58, 62, 65))).toBe("Si♭ mayor"));
  test("black-key minor chords use sharps (Do# menor)", () => expect(chordReadout(set(61, 64, 68))).toBe("Do# menor"));
  test("two keys are not a chord", () => expect(chordReadout(set(60, 64))).toBeNull());
  test("nothing pressed", () => expect(chordReadout(set())).toBeNull());
  test("an unrecognised cluster gives null, never a guess", () => expect(chordReadout(set(60, 61, 62))).toBeNull());
});
