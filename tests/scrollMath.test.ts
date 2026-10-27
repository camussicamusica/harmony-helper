import { describe, expect, test } from "bun:test";
import { bandScrollTop } from "../src/lib/music/scrollMath";

describe("bandScrollTop", () => {
  const vis = { visTop: 100, visBottom: 600 }; // 500 px of room
  test("a band that fits is centered in the visible area", () => {
    // band 200 tall at wrapper y 1000..1200, wrapper at doc 50 -> band top should sit at viewport 250
    expect(bandScrollTop({ docTop: 50, y0: 1000, y1: 1200, ...vis })).toBe(50 + 1000 - 250);
  });
  test("a band taller than the room starts just under the top bar", () => {
    expect(bandScrollTop({ docTop: 0, y0: 1000, y1: 1700, ...vis })).toBe(1000 - 108);
  });
  test("falls back to the tight band when the roomy one does not fit", () => {
    // roomy 600 > 500, tight 300 fits -> centered at viewport 200
    expect(bandScrollTop({ docTop: 0, y0: 1000, y1: 1600, tight: { y0: 1100, y1: 1400 }, ...vis })).toBe(1100 - 200);
  });
  test("never scrolls above the page", () => {
    expect(bandScrollTop({ docTop: 0, y0: 10, y1: 100, ...vis })).toBe(0);
  });
});
