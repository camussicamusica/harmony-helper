import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { deflateRawSync } from "node:zlib";
import { looksLikeZip, musicXmlFromMxl } from "../src/lib/music/mxl";
import { SAMPLE_MUSICXML } from "../src/lib/music/sampleScore";

/** Builds a minimal ZIP in memory. method 0 = stored, 8 = deflate. (CRC is left at 0: the reader does not check it.) */
function zip(files: Array<{ name: string; data: string; method: 0 | 8 }>): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (n: number) => new Uint8Array([n & 255, (n >> 8) & 255]);
  const u32 = (n: number) => new Uint8Array([n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]);
  const cat = (...a: Uint8Array[]) => {
    const out = new Uint8Array(a.reduce((s, x) => s + x.length, 0));
    let o = 0;
    for (const x of a) { out.set(x, o); o += x.length; }
    return out;
  };
  for (const f of files) {
    const name = enc.encode(f.name);
    const raw = enc.encode(f.data);
    const body = f.method === 8 ? new Uint8Array(deflateRawSync(raw)) : raw;
    const local = cat(u32(0x04034b50), u16(20), u16(0), u16(f.method), u16(0), u16(0), u32(0), u32(body.length), u32(raw.length), u16(name.length), u16(0), name, body);
    central.push(cat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(f.method), u16(0), u16(0), u32(0), u32(body.length), u32(raw.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name));
    parts.push(local);
    offset += local.length;
  }
  const dir = cat(...central);
  const end = cat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(dir.length), u32(offset), u16(0));
  return cat(...parts, dir, end);
}

const CONTAINER = `<?xml version="1.0"?><container><rootfiles><rootfile full-path="score/main.xml" media-type="application/vnd.recordare.musicxml+xml"/></rootfiles></container>`;

// Bun has no DOMParser (it is a browser thing). The code only uses it to read container.xml, so for that one
// test we supply a tiny stand-in that understands <rootfile full-path=".." media-type=".."/>. Removed afterwards.
const g = globalThis as any;
const hadDOMParser = "DOMParser" in g;
beforeAll(() => {
  if (hadDOMParser) return;
  g.DOMParser = class {
    parseFromString(text: string) {
      const roots = [...text.matchAll(/<rootfile\b([^>]*)\/?>/g)].map((m) => {
        const attrs: Record<string, string> = {};
        for (const a of m[1].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
        return { getAttribute: (k: string) => attrs[k] ?? null };
      });
      return { getElementsByTagName: (tag: string) => (tag === "rootfile" ? roots : []) };
    }
  };
});
afterAll(() => {
  if (!hadDOMParser) delete g.DOMParser;
});

describe("musicXmlFromMxl", () => {
  test("looksLikeZip recognises the ZIP signature", () => {
    expect(looksLikeZip(zip([{ name: "a.xml", data: "x", method: 0 }]))).toBe(true);
    expect(looksLikeZip(new TextEncoder().encode("<?xml version"))).toBe(false);
  });

  test("deflate-compressed score is extracted (no container.xml: first .xml file)", async () => {
    const xml = await musicXmlFromMxl(zip([{ name: "score.xml", data: SAMPLE_MUSICXML, method: 8 }]));
    expect(xml).toBe(SAMPLE_MUSICXML);
  });

  test("stored (uncompressed) score is extracted", async () => {
    const xml = await musicXmlFromMxl(zip([{ name: "score.musicxml", data: SAMPLE_MUSICXML, method: 0 }]));
    expect(xml).toBe(SAMPLE_MUSICXML);
  });

  test("container.xml names the main file (and other xml files are ignored)", async () => {
    const decoy = `<?xml version="1.0"?><score-partwise><decoy/></score-partwise>`;
    const bytes = zip([
      { name: "decoy.xml", data: decoy, method: 8 },
      { name: "META-INF/container.xml", data: CONTAINER, method: 8 },
      { name: "score/main.xml", data: SAMPLE_MUSICXML, method: 8 },
    ]);
    expect(await musicXmlFromMxl(bytes)).toBe(SAMPLE_MUSICXML);
  });

  test("a zip with no score inside gives the friendly Spanish error", async () => {
    const bytes = zip([{ name: "notes.txt", data: "hola", method: 8 }]);
    await expect(musicXmlFromMxl(bytes)).rejects.toThrow("No pude abrir ese archivo .mxl");
  });

  test("an xml that is not a MusicXML score gives the friendly error", async () => {
    const bytes = zip([{ name: "x.xml", data: "<html/>", method: 8 }]);
    await expect(musicXmlFromMxl(bytes)).rejects.toThrow("No pude abrir ese archivo .mxl");
  });

  test("garbage bytes give the friendly error", async () => {
    await expect(musicXmlFromMxl(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).rejects.toThrow("No pude abrir ese archivo .mxl");
  });
});
