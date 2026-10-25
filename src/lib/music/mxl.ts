/**
 * Reads a compressed MusicXML (.mxl) file and returns the MusicXML text inside it.
 *
 * An .mxl is a ZIP. META-INF/container.xml names the main score file. No library needed: the ZIP
 * directory is read by hand and the content is inflated with the browser's DecompressionStream
 * ("deflate-raw", available in Chrome).
 */

const u16 = (v: DataView, o: number) => v.getUint16(o, true);
const u32 = (v: DataView, o: number) => v.getUint32(o, true);

interface ZipEntry {
  name: string;
  method: number;
  compSize: number;
  localOffset: number;
}

export function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

function readDirectory(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // End of central directory record: signature 0x06054b50, searched from the end.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (u32(view, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("zip");
  const count = u16(view, eocd + 10);
  let p = u32(view, eocd + 16);
  const dec = new TextDecoder();
  const out: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (u32(view, p) !== 0x02014b50) throw new Error("zip");
    const method = u16(view, p + 10);
    const compSize = u32(view, p + 20);
    const nameLen = u16(view, p + 28);
    const extraLen = u16(view, p + 30);
    const commentLen = u16(view, p + 32);
    const localOffset = u32(view, p + 42);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    out.push({ name, method, compSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readEntry(bytes: Uint8Array, e: ZipEntry): Promise<Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (u32(view, e.localOffset) !== 0x04034b50) throw new Error("zip");
  const nameLen = u16(view, e.localOffset + 26);
  const extraLen = u16(view, e.localOffset + 28);
  const start = e.localOffset + 30 + nameLen + extraLen;
  const raw = bytes.subarray(start, start + e.compSize);
  if (e.method === 0) return raw;
  if (e.method === 8) return inflateRaw(raw);
  throw new Error("zip");
}

/** MusicXML text from the bytes of an .mxl file. Throws Error with a Spanish message if it cannot. */
export async function musicXmlFromMxl(bytes: Uint8Array): Promise<string> {
  const bad = new Error("No pude abrir ese archivo .mxl. Probá exportarlo de nuevo desde MuseScore, o exportalo como .musicxml.");
  try {
    const entries = readDirectory(bytes);
    const text = async (e: ZipEntry) => new TextDecoder("utf-8").decode(await readEntry(bytes, e));
    let rootPath: string | null = null;
    const container = entries.find((e) => e.name.toLowerCase() === "meta-inf/container.xml");
    if (container) {
      const doc = new DOMParser().parseFromString(await text(container), "application/xml");
      const roots = Array.from(doc.getElementsByTagName("rootfile"));
      const pick = roots.find((r) => !r.getAttribute("media-type")?.includes("pdf")) ?? roots[0];
      rootPath = pick?.getAttribute("full-path") ?? null;
    }
    const main =
      (rootPath && entries.find((e) => e.name === rootPath)) ||
      entries.find((e) => /\.(musicxml|xml)$/i.test(e.name) && !e.name.toLowerCase().startsWith("meta-inf/"));
    if (!main) throw bad;
    const xml = await text(main);
    if (!/<score-(partwise|timewise)[\s>]/.test(xml)) throw bad;
    return xml;
  } catch {
    throw bad;
  }
}
