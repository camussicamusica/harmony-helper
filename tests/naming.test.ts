import { describe, expect, test } from "bun:test";
import {
  INTERVAL_KEY_LABEL, chordName, durationNameFromWhole, intervalKey, intervalLabel, letterName, noteLabel, solfegeName,
} from "../src/lib/music/naming";

describe("note names in Spanish", () => {
  test("Re (D)", () => expect(noteLabel("D")).toBe("Re (D)"));
  test("sharps and flats", () => {
    expect(noteLabel("C#")).toBe("Do# (C#)");
    expect(noteLabel("Db")).toBe("Re♭ (D♭)");
    expect(noteLabel("Bb")).toBe("Si♭ (B♭)");
  });
  test("all seven solfège names", () => {
    expect(["C", "D", "E", "F", "G", "A", "B"].map(solfegeName)).toEqual(["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"]);
  });
  test("letterName", () => expect(letterName("Eb")).toBe("E♭"));
});

describe("intervals", () => {
  test("names, m2 up to the octave", () => {
    const names = Array.from({ length: 13 }, (_, i) => intervalLabel(60, 60 + i));
    expect(names).toEqual([
      "unísono", "2ª m", "2ª M", "3ª m", "3ª M", "4ª J", "tritono", "5ª J", "6ª m", "6ª M", "7ª m", "7ª M", "8ª",
    ]);
  });
  test("keys, m2 up to P8", () => {
    const keys = Array.from({ length: 13 }, (_, i) => intervalKey(60, 60 + i));
    expect(keys).toEqual(["P1", "m2", "M2", "m3", "M3", "P4", "TT", "P5", "m6", "M6", "m7", "M7", "P8"]);
  });
  test("direction does not matter", () => {
    expect(intervalKey(67, 60)).toBe("P5");
    expect(intervalLabel(67, 60)).toBe("5ª J");
  });
  test("compound intervals fold into the octave (a 10th is a 3rd)", () => {
    expect(intervalKey(60, 76)).toBe("M3");
  });
  test("every key has a Spanish label", () => {
    for (let d = 0; d <= 12; d++) expect(INTERVAL_KEY_LABEL[intervalKey(60, 60 + d)]).toBe(intervalLabel(60, 60 + d));
  });
});

describe("chordName", () => {
  test("Fa# menor", () => expect(chordName(["F#", "A", "C#"])).toBe("Fa# menor"));
  test("Do mayor", () => expect(chordName(["C", "E", "G"])).toBe("Do mayor"));
  test("Si disminuido", () => expect(chordName(["B", "D", "F"])).toBe("Si disminuido"));
  test("Do aumentado", () => expect(chordName(["C", "E", "G#"])).toBe("Do aumentado"));
  test("dominant seventh", () => expect(chordName(["G", "B", "D", "F"])).toBe("Sol séptima (dominante)"));
  test("inversion names the bass", () => expect(chordName(["E", "G", "C"])).toBe("Do mayor (bajo Mi)"));
  test("flat roots use the flat glyph", () => expect(chordName(["Bb", "D", "F"])).toBe("Si♭ mayor"));
  test("fewer than 3 different notes: no name", () => {
    expect(chordName(["C", "E"])).toBeNull();
    expect(chordName(["C", "C", "E"])).toBeNull();
  });
  test("unknown cluster: no name (never guesses)", () => expect(chordName(["C", "C#", "D"])).toBeNull());
});

describe("durationNameFromWhole", () => {
  test("common values", () => {
    expect(durationNameFromWhole(1)).toBe("redonda");
    expect(durationNameFromWhole(1 / 2)).toBe("blanca");
    expect(durationNameFromWhole(1 / 4)).toBe("negra");
    expect(durationNameFromWhole(1 / 8)).toBe("corchea");
    expect(durationNameFromWhole(3 / 8)).toBe("negra con puntillo");
  });
});
