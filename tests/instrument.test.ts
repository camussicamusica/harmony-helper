import { describe, expect, test } from "bun:test";
import {
  PIANO, TRUMPET_BB, applyInstrumentToSheet, getInstrument, guessInstrument, parseInstrumentId, pickInstrumentId, resolveTranspose, scanScoreInstruments,
} from "../src/lib/instrument/instrument";
import { buildEntry, mergeLibraries, parseLibraryJson, exportLibraryJson, touchOrAdd } from "../src/lib/library/entry";
import { playbackShift, summarizeTranspose } from "../src/lib/music/transpose";

const part = (id: string, name: string, chromatic?: number) =>
  `<score-part id="${id}"><part-name>${name}</part-name></score-part>` +
  `\u0000${id}\u0000${chromatic === undefined ? "" : `<transpose><diatonic>-1</diatonic><chromatic>${chromatic}</chromatic></transpose>`}`;

function xmlOf(parts: Array<[string, number?]>): string {
  const list = parts.map(([n, c], i) => part(`P${i + 1}`, n, c));
  const heads = list.map((p) => p.split("\u0000")[0]).join("");
  const bodies = list.map((p) => {
    const [, id, tr] = p.split("\u0000");
    return `<part id="${id}"><measure number="1"><attributes>${tr}</attributes></measure></part>`;
  });
  return `<score-partwise><part-list>${heads}</part-list>${bodies.join("")}</score-partwise>`;
}

describe("resolveTranspose (the selector wins over the file)", () => {
  test("trumpet on a file with no transpose: -2 everywhere", () => {
    expect(resolveTranspose(TRUMPET_BB, [0])).toEqual([-2]);
    expect(resolveTranspose(TRUMPET_BB, [0, 0])).toEqual([-2, -2]);
  });
  test("trumpet on a file that already says -2: keeps -2, never doubles", () => {
    expect(resolveTranspose(TRUMPET_BB, [-2])).toEqual([-2]);
    expect(resolveTranspose(TRUMPET_BB, resolveTranspose(TRUMPET_BB, [-2]))).toEqual([-2]);
  });
  test("trumpet on a file with another shared transpose: the selector wins", () => {
    expect(resolveTranspose(TRUMPET_BB, [-7])).toEqual([-2]);
  });
  test("trumpet on an orchestra: the file stays", () => {
    expect(resolveTranspose(TRUMPET_BB, [0, -2, -7])).toEqual([0, -2, -7]);
  });
  test("piano: 0 when the file has none, otherwise the file's own", () => {
    expect(resolveTranspose(PIANO, [0])).toEqual([0]);
    expect(resolveTranspose(PIANO, [-2])).toEqual([-2]);
    expect(resolveTranspose(PIANO, [0, -2, 3])).toEqual([0, -2, 3]);
  });
  test("junk values count as 0", () => {
    expect(resolveTranspose(TRUMPET_BB, [Number.NaN])).toEqual([-2]);
    expect(resolveTranspose(PIANO, [Number.NaN])).toEqual([0]);
  });
});

describe("applyInstrumentToSheet", () => {
  test("switching back and forth uses the file's value each time", () => {
    const sheet = { Instruments: [{ PlaybackTranspose: 0 }] };
    applyInstrumentToSheet(sheet, TRUMPET_BB);
    expect(sheet.Instruments[0].PlaybackTranspose).toBe(-2);
    applyInstrumentToSheet(sheet, TRUMPET_BB);
    expect(sheet.Instruments[0].PlaybackTranspose).toBe(-2);
    applyInstrumentToSheet(sheet, PIANO);
    expect(sheet.Instruments[0].PlaybackTranspose).toBe(0);
  });
  test("a trumpet file read as piano keeps its -2", () => {
    const sheet = { Instruments: [{ PlaybackTranspose: -2 }] };
    applyInstrumentToSheet(sheet, PIANO);
    expect(sheet.Instruments[0].PlaybackTranspose).toBe(-2);
    applyInstrumentToSheet(sheet, TRUMPET_BB);
    expect(sheet.Instruments[0].PlaybackTranspose).toBe(-2);
  });
  test("no instruments: nothing happens", () => {
    expect(() => applyInstrumentToSheet({}, TRUMPET_BB)).not.toThrow();
    expect(() => applyInstrumentToSheet(null, TRUMPET_BB)).not.toThrow();
  });
});

describe("scan and guess", () => {
  test("reads names and the first chromatic of each part", () => {
    const scan = scanScoreInstruments(xmlOf([["Trumpet in B♭", -2], ["Piano"]]));
    expect(scan.names).toEqual(["Trumpet in B♭", "Piano"]);
    expect(scan.transposes).toEqual([-2, 0]);
  });
  test("uniform -2 is a trumpet, whatever the part is called", () => {
    expect(guessInstrument(scanScoreInstruments(xmlOf([["Part 1", -2]])))).toBe("trumpet-bb");
  });
  test("a trumpet-like name with no transpose is a trumpet", () => {
    expect(guessInstrument(scanScoreInstruments(xmlOf([["Trompeta 1"]])))).toBe("trumpet-bb");
    expect(guessInstrument(scanScoreInstruments(xmlOf([["Cornet"]])))).toBe("trumpet-bb");
    expect(guessInstrument(scanScoreInstruments(xmlOf([["Trumpet"]])))).toBe("trumpet-bb");
  });
  test("a trumpet in C is not guessed as B♭", () => {
    expect(guessInstrument(scanScoreInstruments(xmlOf([["Trumpet in C"]])))).toBeNull();
  });
  test("a piano, an orchestra, other transposes: no guess", () => {
    expect(guessInstrument(scanScoreInstruments(xmlOf([["Piano"]])))).toBeNull();
    expect(guessInstrument(scanScoreInstruments(xmlOf([["Trumpet", -2], ["Flute"], ["Horn", -7]])))).toBeNull();
    expect(guessInstrument(scanScoreInstruments(xmlOf([["Clarinet", -2], ["Trumpet", -2]])))).toBe("trumpet-bb"); // uniform -2 is all the file says
    expect(guessInstrument(scanScoreInstruments(xmlOf([["Horn", -7]])))).toBeNull();
    expect(guessInstrument(scanScoreInstruments(xmlOf([["Trumpet"], ["Flute"]])))).toBeNull();
  });
  test("nothing to read: no guess", () => {
    expect(guessInstrument(scanScoreInstruments(""))).toBeNull();
  });
});

describe("pickInstrumentId", () => {
  test("her saved choice beats the file, the file beats the last used", () => {
    expect(pickInstrumentId("piano", "trumpet-bb", "trumpet-bb")).toBe("piano");
    expect(pickInstrumentId(undefined, "trumpet-bb", "piano")).toBe("trumpet-bb");
    expect(pickInstrumentId(undefined, null, "trumpet-bb")).toBe("trumpet-bb");
    expect(pickInstrumentId(null, null, "piano")).toBe("piano");
  });
  test("ids", () => {
    expect(parseInstrumentId("trumpet-bb")).toBe("trumpet-bb");
    expect(parseInstrumentId("tuba")).toBeNull();
    expect(getInstrument("trumpet-bb").transposeSemitones).toBe(-2);
    expect(getInstrument("piano").transposeSemitones).toBe(0);
    expect(TRUMPET_BB.range).toEqual({ low: 54, high: 84 });
  });
});

describe("playbackShift", () => {
  test("only a uniform score shows written pitches that must be shifted to be heard", () => {
    expect(playbackShift(summarizeTranspose([-2]))).toBe(-2);
    expect(playbackShift(summarizeTranspose([0]))).toBe(0);
    expect(playbackShift(summarizeTranspose([0, -2]))).toBe(0);
    expect(playbackShift(null)).toBe(0);
  });
});

describe("library entries keep the instrument", () => {
  const e = { ...buildEntry("a", "<x/>", "a.xml", 10), instrument: "trumpet-bb" as const };
  test("touching an entry keeps it", () => {
    const out = touchOrAdd([e], buildEntry("a", "<x/>", "a.xml", 20));
    expect(out[0].instrument).toBe("trumpet-bb");
  });
  test("export, import and merge keep it", () => {
    const back = parseLibraryJson(exportLibraryJson([e], 1));
    expect(back[0].instrument).toBe("trumpet-bb");
    const merged = mergeLibraries([buildEntry("a", "<x/>", "a.xml", 10)], back);
    expect(merged[0].instrument).toBe("trumpet-bb");
  });
  test("an unknown instrument in an import is dropped", () => {
    const text = JSON.stringify({ format: "harmony-helper-library", version: 1, entries: [{ id: "z", xml: "<x/>", instrument: "tuba" }] });
    expect(parseLibraryJson(text)[0].instrument).toBeUndefined();
  });
});
