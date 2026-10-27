import { describe, expect, test } from "bun:test";
import { measuresPerSystem, pageStarts, readLayoutInfo } from "../src/lib/music/layoutInfo";

const xml = `<score-partwise><defaults><page-layout><page-height>1685</page-height><page-width>1238</page-width></page-layout></defaults>
<part id="P1">
<measure number="1"><print></print></measure>
<measure number="2"/>
<measure number="3"><print new-system="yes"></print></measure>
<measure number="4"><print new-page="yes"></print></measure>
<measure number="5"></measure>
</part></score-partwise>`;

describe("readLayoutInfo", () => {
  test("reads system and page breaks and the page size", () => {
    const i = readLayoutInfo(xml);
    expect(i.newSystems).toEqual([3]);
    expect(i.newPages).toEqual([4]);
    expect(i.page).toEqual({ width: 1238, height: 1685 });
    expect(i.hasBreaks).toBe(true);
  });
  test("no breaks, no page: nothing", () => {
    const i = readLayoutInfo(`<score-partwise><part id="P1"><measure number="1"/></part></score-partwise>`);
    expect(i.hasBreaks).toBe(false);
    expect(i.page).toBeNull();
  });
});

describe("measuresPerSystem / pageStarts", () => {
  test("a page break also starts a system", () => {
    const i = { newSystems: [5, 9, 13, 21], newPages: [17] };
    expect(measuresPerSystem(i, 24)).toEqual([4, 4, 4, 4, 4, 4]);
    expect(pageStarts(i)).toEqual([1, 17]);
  });
  test("last system runs to the last measure", () => {
    expect(measuresPerSystem({ newSystems: [5], newPages: [] }, 7)).toEqual([4, 3]);
  });
});

import { withTitle } from "../src/lib/music/layoutInfo";
describe("withTitle", () => {
  test("adds a movement-title before the identification block when there is none", () => {
    const out = withTitle(`<score-partwise><identification/><part-list/></score-partwise>`, "Gymnopedie No. 1");
    expect(out).toContain("<movement-title>Gymnopedie No. 1</movement-title><identification");
  });
  test("replaces existing titles and escapes", () => {
    const out = withTitle(`<work><work-title>Old</work-title></work><movement-title>x</movement-title>`, "A & B");
    expect(out).toBe(`<work><work-title>A &amp; B</work-title></work><movement-title>A &amp; B</movement-title>`);
  });
  test("empty title leaves the file as is", () => {
    expect(withTitle("<a/>", "  ")).toBe("<a/>");
  });
});
