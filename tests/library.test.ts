import { describe, expect, test } from "bun:test";
import {
  agoEs, buildEntry, displayTitle, exportLibraryJson, mergeLibraries, parseLibraryJson, searchEntries, sortByLastOpened,
  titleFromFilename, touchOrAdd, xmlComposer, xmlMeasureCount, xmlTitle,
} from "../src/lib/library/entry";
import { createMemoryStore, recordOpened } from "../src/lib/library/store";

const XML = `<score-partwise><work><work-title>Gymnopédie No. 1</work-title></work><identification><creator type="composer">Erik Satie</creator></identification><part id="P1"><measure number="1"/><measure number="2"></measure><measure number="3"></measure></part></score-partwise>`;
const NO_TITLE = `<score-partwise><part id="P1"><measure number="1"></measure></part></score-partwise>`;

describe("metadata", () => {
  test("title, composer, measures", () => {
    expect(xmlTitle(XML)).toBe("Gymnopédie No. 1");
    expect(xmlComposer(XML)).toBe("Erik Satie");
    expect(xmlMeasureCount(XML)).toBe(3);
    expect(xmlMeasureCount(`<part id="P1"><measure number="1"><attributes><measure-style/></attributes></measure></part>`)).toBe(1);
  });
  test("movement-title is the fallback; none gives empty", () => {
    expect(xmlTitle(`<movement-title>Sonata</movement-title>`)).toBe("Sonata");
    expect(xmlTitle(NO_TITLE)).toBe("");
  });
  test("filename cleanup", () => {
    expect(titleFromFilename("Gymnopedie-No.-1.mxl")).toBe("Gymnopedie No. 1");
    expect(titleFromFilename("mi_partitura.musicxml")).toBe("mi partitura");
    expect(titleFromFilename("C:\\x\\a-b.xml")).toBe("a b");
  });
  test("displayTitle: rename > file title > filename, never empty", () => {
    const e = buildEntry("a", NO_TITLE, "Gymnopedie-No.-1.mxl", 1);
    expect(displayTitle(e)).toBe("Gymnopedie No. 1");
    expect(displayTitle({ ...e, title: "Real", titleOverride: "Mía" })).toBe("Mía");
    expect(displayTitle({ ...e, title: "Real" })).toBe("Real");
    expect(displayTitle({ title: "", filename: "", titleOverride: undefined })).toBe("Sin título");
  });
});

describe("touchOrAdd / merge / sort / search", () => {
  const a = buildEntry("a", XML, "a.mxl", 100);
  const b = buildEntry("b", NO_TITLE, "Otra-pieza.xml", 200);
  test("same id again does not duplicate and updates lastOpenedAt, keeps rename", () => {
    const renamed = { ...a, titleOverride: "Mi Satie" };
    const out = touchOrAdd([renamed, b], { ...a, lastOpenedAt: 900 });
    expect(out).toHaveLength(2);
    const got = out.find((e) => e.id === "a")!;
    expect(got.lastOpenedAt).toBe(900);
    expect(got.addedAt).toBe(100);
    expect(got.titleOverride).toBe("Mi Satie");
  });
  test("new id is appended", () => {
    expect(touchOrAdd([a], b)).toHaveLength(2);
  });
  test("merge by id keeps the earliest added, latest opened, either rename", () => {
    const mine = [{ ...a, lastOpenedAt: 500 }];
    const theirs = [{ ...a, addedAt: 50, lastOpenedAt: 300, titleOverride: "X" }, b];
    const out = mergeLibraries(mine, theirs);
    expect(out).toHaveLength(2);
    const m = out.find((e) => e.id === "a")!;
    expect([m.addedAt, m.lastOpenedAt, m.titleOverride]).toEqual([50, 500, "X"]);
  });
  test("sorted by last opened, newest first", () => {
    expect(sortByLastOpened([a, b]).map((e) => e.id)).toEqual(["b", "a"]);
  });
  test("search ignores accents and case, over title, composer and filename", () => {
    const list = [a, b];
    expect(searchEntries(list, "gymnopedie").map((e) => e.id)).toEqual(["a"]);
    expect(searchEntries(list, "SATIE").map((e) => e.id)).toEqual(["a"]);
    expect(searchEntries(list, "otra pieza").map((e) => e.id)).toEqual(["b"]);
    expect(searchEntries(list, "  ")).toHaveLength(2);
    expect(searchEntries(list, "zzz")).toHaveLength(0);
  });
});

describe("agoEs", () => {
  const now = 10_000_000_000;
  test("units", () => {
    expect(agoEs(now - 10_000, now)).toBe("recién");
    expect(agoEs(now - 3 * 60_000, now)).toBe("hace 3 minutos");
    expect(agoEs(now - 3_600_000, now)).toBe("hace 1 hora");
    expect(agoEs(now - 2 * 86_400_000, now)).toBe("hace 2 días");
    expect(agoEs(now - 90 * 86_400_000, now)).toBe("hace 3 meses");
  });
});

describe("export / import", () => {
  test("round trip", () => {
    const a = { ...buildEntry("a", XML, "a.mxl", 100), titleOverride: "Mi Satie" };
    const back = parseLibraryJson(exportLibraryJson([a], 5));
    expect(back).toEqual([a]);
  });
  test("rejects other files, drops bad entries", () => {
    expect(() => parseLibraryJson("nope")).toThrow();
    expect(() => parseLibraryJson(`{"x":1}`)).toThrow();
    const txt = JSON.stringify({ format: "harmony-helper-library", entries: [{ id: "x" }, { id: "y", xml: "<a/>" }] });
    expect(parseLibraryJson(txt).map((e) => e.id)).toEqual(["y"]);
  });
});

describe("store (in-memory fake)", () => {
  test("recordOpened adds once, then touches", async () => {
    const s = createMemoryStore();
    await recordOpened(s, buildEntry("a", XML, "a.mxl", 1), touchOrAdd);
    await recordOpened(s, buildEntry("a", XML, "a.mxl", 5), touchOrAdd);
    const all = await s.all();
    expect(all).toHaveLength(1);
    expect(all[0].lastOpenedAt).toBe(5);
    await s.remove("a");
    expect(await s.all()).toHaveLength(0);
  });
});
