import { describe, expect, test } from "bun:test";
import {
  buildKeySigView,
  fifthsAtMeasure,
  keyEvidence,
  keyPlayMidis,
  majorTonicOf,
  measureRangeOf,
  minorTonicOf,
  signatureAccidentals,
  signatureOrder,
  signatureSteps,
  signatureTag,
  signatureTrick,
  whichKeyText,
} from "../src/lib/music/analysis/keySignature";
import { keyInfo } from "../src/lib/music/analysis/key";
import { staffStep } from "../src/lib/music/staffMath";

describe("accidentals", () => {
  test("sharps and flats in order", () => {
    expect(signatureAccidentals(2)).toEqual(["F#", "C#"]);
    expect(signatureAccidentals(-3)).toEqual(["Bb", "Eb", "Ab"]);
    expect(signatureAccidentals(0)).toEqual([]);
    expect(signatureAccidentals(7)).toHaveLength(7);
  });
  test("printed lines match the pitches in both clefs", () => {
    const tr = signatureSteps(7, "treble");
    expect(tr).toEqual(["F5", "C5", "G5", "D5", "A4", "E5", "B4"].map((n) => staffStep(n, "treble")));
    const fl = signatureSteps(-7, "treble");
    expect(fl).toEqual(["B4", "E5", "A4", "D5", "G4", "C5", "F4"].map((n) => staffStep(n, "treble")));
    expect(signatureSteps(7, "bass")).toEqual(["F3", "C3", "G3", "D3", "A2", "E3", "B2"].map((n) => staffStep(n, "bass")));
    expect(signatureSteps(-7, "bass")).toEqual(["B2", "E3", "A2", "D3", "G2", "C3", "F2"].map((n) => staffStep(n, "bass")));
  });
});

describe("which key", () => {
  test("tonics", () => {
    expect(majorTonicOf(2)).toBe("D");
    expect(minorTonicOf(2)).toBe("B");
    expect(majorTonicOf(-3)).toBe("Eb");
    expect(minorTonicOf(-3)).toBe("C");
    expect(majorTonicOf(0)).toBe("C");
  });
  test("texts", () => {
    expect(whichKeyText(2)).toBe("Re mayor, o su relativa Si menor");
    expect(whichKeyText(0)).toBe("Do mayor o La menor, sin alteraciones");
    expect(signatureTag(2)).toBe("Re mayor · 2 ♯");
    expect(signatureTag(-4)).toBe("La♭ mayor · 4 ♭");
    expect(signatureTag(0)).toBe("Do mayor · sin alteraciones");
  });
});

describe("tricks", () => {
  test("sharps: last sharp + half step", () => {
    expect(signatureTrick(2)).toBe("El último sostenido + medio tono = la tónica (Do# → Re).");
    expect(signatureTrick(1)).toContain("Fa# → Sol");
  });
  test("flats: the second to last is the tonic", () => {
    expect(signatureTrick(-3)).toBe("El penúltimo bemol es la tónica (Mi♭).");
    expect(signatureTrick(-2)).toContain("Si♭");
  });
  test("one flat is a special case", () => {
    expect(signatureTrick(-1)).toContain("solo bemol");
    expect(signatureTrick(-1)).toContain("Fa");
  });
  test("none", () => {
    expect(signatureTrick(0)).toContain("Do mayor");
  });
});

describe("order highlighting", () => {
  test("sharps, two in use", () => {
    const o = signatureOrder(2);
    expect(o.names).toEqual(["Fa", "Do", "Sol", "Re", "La", "Mi", "Si"]);
    expect(o.inUse).toEqual([true, true, false, false, false, false, false]);
    expect(o.kind).toBe("sharps");
  });
  test("flats, three in use", () => {
    const o = signatureOrder(-3);
    expect(o.names).toEqual(["Si", "Mi", "La", "Re", "Sol", "Do", "Fa"]);
    expect(o.inUse.filter(Boolean)).toHaveLength(3);
    expect(o.inUse.slice(0, 3)).toEqual([true, true, true]);
  });
  test("none in use without a signature", () => {
    expect(signatureOrder(0).inUse.some(Boolean)).toBe(false);
  });
});

describe("view", () => {
  test("uses the detected key when it matches the signature", () => {
    const v = buildKeySigView(2, "treble", keyInfo("D", "major"), ["la pieza termina en Re"], "bastante seguro");
    expect(v.key.label).toBe("Re mayor");
    expect(v.detected).toBe("La app detectó Re mayor (bastante seguro): la pieza termina en Re.");
    expect(v.accidentals).toEqual(["F#", "C#"]);
  });
  test("mismatch falls back to the major key and says so", () => {
    const v = buildKeySigView(2, "bass", keyInfo("A", "minor"), []);
    expect(v.key.label).toBe("Re mayor");
    expect(v.detected).toContain("no coincide");
  });
  test("no detection", () => {
    expect(buildKeySigView(0, "treble", null).key.label).toBe("Do mayor");
  });
  test("play midis", () => {
    const m = keyPlayMidis(keyInfo("D", "major"), ["F#", "C#"]);
    expect(m.scale).toEqual([62, 64, 66, 67, 69, 71, 73, 74]);
    expect(m.chord).toEqual([62, 66, 69]);
    expect(m.altered.map((a) => a.midi)).toEqual([66, 61]);
    expect(keyPlayMidis(keyInfo("B", "minor"), []).scale[0]).toBe(59);
  });
});

describe("evidence", () => {
  const n = (midi: number, startSec: number, durationSec: number) => ({ midi, startSec, durationSec, spelledName: "D" });
  test("final note and most used", () => {
    const ev = keyEvidence([n(66, 0, 1), n(62, 1, 3), n(62, 4, 2)], keyInfo("D", "major"));
    expect(ev).toEqual(["la pieza termina en Re", "Re es la nota que más suena"]);
  });
});

describe("key changes", () => {
  const ch = [{ measure: 1, fifths: 2 }, { measure: 20, fifths: -1 }];
  test("signature at a measure", () => {
    expect(fifthsAtMeasure(ch, 5, null)).toBe(2);
    expect(fifthsAtMeasure(ch, 20, null)).toBe(-1);
    expect(fifthsAtMeasure([], 5, 3)).toBe(3);
  });
  test("range governed", () => {
    expect(measureRangeOf(ch, 5)).toEqual({ from: 1, to: 19 });
    expect(measureRangeOf(ch, 25)).toEqual({ from: 20, to: Infinity });
  });
});
