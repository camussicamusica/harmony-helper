import { expect, test } from "bun:test";
import { systemStartX } from "../src/lib/music/boxMath";

test("no signature: padding before the first note", () => {
  expect(systemStartX({ firstNoteX: 200, sigRight: null })).toBe(174);
});
test("a signature that reaches past the padded start pushes the box after it", () => {
  expect(systemStartX({ firstNoteX: 200, sigRight: 185 })).toBe(189);
});
test("a signature well left of the notes changes nothing", () => {
  expect(systemStartX({ firstNoteX: 300, sigRight: 150 })).toBe(274);
});
