import { describe, expect, test } from "bun:test";
import { mergeUiPrefs, parseUiPrefs } from "../src/lib/ui/uiPrefs";

describe("uiPrefs", () => {
  test("old stored value gets the new field with its default", () => {
    expect(parseUiPrefs('{"menuOpen":false,"pianoOpen":true}')).toEqual({ menuOpen: false, pianoOpen: true, tipMore: false });
  });
  test("merging one field keeps the others", () => {
    const next = mergeUiPrefs('{"menuOpen":false,"pianoOpen":false}', { tipMore: true });
    expect(next).toEqual({ menuOpen: false, pianoOpen: false, tipMore: true });
  });
  test("garbage falls back to defaults", () => {
    expect(mergeUiPrefs("nope", { tipMore: true })).toEqual({ menuOpen: true, pianoOpen: true, tipMore: true });
  });
});
