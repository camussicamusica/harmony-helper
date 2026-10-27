import { describe, expect, test } from "bun:test";
import { chordRoleOf, keyRoleOf, noteContext, octaveOf } from "../src/lib/music/analysis/noteContext";
import { keyInfo } from "../src/lib/music/analysis/key";
import { pieceChords } from "../src/lib/music/analysis/pieceChords";
import type { ScoreMeta } from "../src/lib/music/analysis/scoreMeta";
import type { Hand, ScheduledNote } from "../src/lib/music/types";

const meta: ScoreMeta = {
  fifths: null,
  timeSig: { beats: 4, beatType: 4 },
  measures: [0, 1, 2, 3].map((i) => ({ number: i + 1, startSec: i * 2, endSec: i * 2 + 2 })),
};

let n = 0;
function note(midi: number, spelledName: string, startSec: number, durationSec = 0.5, hand: Hand = "RH"): ScheduledNote {
  return { id: `n${n++}`, midi, noteName: spelledName, spelledName, startSec, durationSec, measure: 1, hand, durationName: "negra" };
}

describe("octaveOf", () => {
  test("follows the spelling", () => {
    expect(octaveOf(60, "C")).toBe(4);
    expect(octaveOf(60, "B#")).toBe(3);
    expect(octaveOf(59, "Cb")).toBe(4);
    expect(octaveOf(69, "A")).toBe(4);
  });
});

describe("degree names", () => {
  const dMajor = keyInfo("D", "major");
  test("major: subdominante is the 4th degree", () => {
    const r = keyRoleOf("G", dMajor);
    expect(r.degree).toBe(4);
    expect(r.text).toBe("4.º grado de Re mayor · subdominante");
  });
  test("major: all seven names", () => {
    const names = dMajor.notes.map((s) => keyRoleOf(s, dMajor).degreeName);
    expect(names).toEqual(["tónica", "supertónica", "mediante", "subdominante", "dominante", "superdominante", "sensible"]);
  });
  test("minor: 7th of the natural scale is subtónica", () => {
    const aMinor = keyInfo("A", "minor");
    expect(keyRoleOf("G", aMinor).degreeName).toBe("subtónica");
    expect(keyRoleOf("A", aMinor).text).toBe("1.º grado de La menor · tónica");
    expect(keyRoleOf("E", aMinor).degreeName).toBe("dominante");
  });
  test("minor: raised 7th is out of the scale but is the sensible", () => {
    const r = keyRoleOf("G#", keyInfo("A", "minor"));
    expect(r.inScale).toBe(false);
    expect(r.degreeName).toBe("sensible");
    expect(r.text).toContain("fuera de la escala de La menor");
    expect(r.text).toContain("sensible");
    expect(r.alteration).toBe("alteración: Sol# en vez de Sol");
  });
});

describe("out-of-scale note", () => {
  test("C# in D major is in scale, C natural is not", () => {
    const d = keyInfo("D", "major");
    expect(keyRoleOf("C#", d).degree).toBe(7);
    const r = keyRoleOf("C", d);
    expect(r.inScale).toBe(false);
    expect(r.degree).toBeNull();
    expect(r.text).toBe("fuera de la escala de Re mayor · alteración: Do en vez de Do#");
  });
  test("A# in D major", () => {
    expect(keyRoleOf("A#", keyInfo("D", "major")).text).toBe("fuera de la escala de Re mayor · alteración: La# en vez de La");
  });
});

describe("chord role", () => {
  test("triad and seventh roles", () => {
    expect(chordRoleOf(7, 7, "dominant7")).toBe("fundamental"); // G in G7
    expect(chordRoleOf(11, 7, "dominant7")).toBe("tercera"); // B
    expect(chordRoleOf(2, 7, "dominant7")).toBe("quinta"); // D
    expect(chordRoleOf(5, 7, "dominant7")).toBe("septima"); // F
    expect(chordRoleOf(9, 7, "dominant7")).toBe("novena"); // A
    expect(chordRoleOf(1, 7, "major")).toBe("paso");
  });
  test("from the piece's chords", () => {
    const g = [note(55, "G", 0, 2), note(59, "B", 0, 2), note(62, "D", 0, 2)];
    const all = g;
    const key = keyInfo("G", "major");
    const chords = pieceChords(all, key, meta, 120);
    const third = noteContext(g[1], all, key, chords);
    expect(third.chord?.role).toBe("tercera");
    expect(third.chord?.name).toBe("Sol mayor");
    expect(third.chord?.degreeText).toBe("I · Tón");
    expect(third.chord?.source).toBe("pieza");
    expect(noteContext(g[0], all, key, chords).chord?.role).toBe("fundamental");
    expect(noteContext(g[2], all, key, chords).chord?.role).toBe("quinta");
  });
  test("subdominante and a chord outside the key", () => {
    const c = [note(48, "C", 0, 2), note(52, "E", 0, 2), note(55, "G", 0, 2)];
    const key = keyInfo("G", "major");
    const ctx = noteContext(c[0], c, key, pieceChords(c, key, meta, 120));
    expect(ctx.chord?.degreeText).toBe("IV · Subd");
    const eb = [note(51, "Eb", 0, 2), note(55, "G", 0, 2), note(58, "Bb", 0, 2)];
    const out = noteContext(eb[0], eb, key, pieceChords(eb, key, meta, 120));
    expect(out.chord?.inKey).toBe(false);
    expect(out.chord?.degreeText).toBeNull();
  });
  test("seventh and fallback from sounding notes", () => {
    const g7 = [note(43, "G", 0, 2), note(47, "B", 0, 2), note(50, "D", 0, 2), note(53, "F", 0, 2)];
    const key = keyInfo("C", "major");
    // no piece chords given: detected from the notes sounding together
    const ctx = noteContext(g7[3], g7, key, []);
    expect(ctx.chord?.role).toBe("septima");
    expect(ctx.chord?.source).toBe("juntas");
    expect(ctx.chord?.degreeText).toBe("V7 · Dom");
  });
  test("single note has no chord", () => {
    const a = note(60, "C", 0);
    expect(noteContext(a, [a], keyInfo("C", "major"), []).chord).toBeNull();
  });
});

describe("melody", () => {
  test("interval up and down, in the same hand only", () => {
    const a = note(57, "A", 0); // La3
    const b = note(62, "D", 0.5); // Re4: 4th up from A
    const c = note(64, "E", 1); // Mi4: 2nd up
    const other = note(40, "E", 0.5, 0.5, "LH");
    const all = [a, b, c, other];
    const m = noteContext(b, all, null, []).melody;
    expect(m.prev?.text).toBe("viene de La (A): sube una 4.ª justa");
    expect(m.next?.text).toBe("va a Mi (E): sube una 2.ª mayor");
    const down = noteContext(c, [...all, note(60, "C", 1.5)], null, []).melody;
    expect(down.next?.text).toBe("va a Do (C): baja una 3.ª mayor");
  });
  test("repeat, first and last notes, compound interval", () => {
    const a = note(60, "C", 0);
    const b = note(60, "C", 0.5);
    const hi = note(84, "C", 1);
    const all = [a, b, hi];
    expect(noteContext(a, all, null, []).melody.prev).toBeNull();
    expect(noteContext(b, all, null, []).melody.prev?.text).toBe("viene de Do (C): repite la misma nota");
    expect(noteContext(hi, all, null, []).melody.next).toBeNull();
    expect(noteContext(b, all, null, []).melody.next?.interval).toBe("15.ª justa");
  });
  test("tie continuations are skipped", () => {
    const a = note(60, "C", 0);
    const tie = { ...note(60, "C", 0.5), tieContinuation: true };
    const b = note(62, "D", 1);
    expect(noteContext(b, [a, tie, b], null, []).melody.prev?.text).toBe("viene de Do (C): sube una 2.ª mayor");
  });
});

describe("pitch", () => {
  test("octave label", () => {
    const d = note(62, "D", 0);
    expect(noteContext(d, [d], null, []).pitch.octaveLabel).toBe("Re4");
    expect(noteContext(d, [d], null, []).keyRole).toBeNull();
  });
});
