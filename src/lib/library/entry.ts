/** Biblioteca: pure logic (no browser APIs), so it can be tested. */

export interface LibraryEntry {
  /** hashText(xml): the same id the Ficha override and tempo prefs use. */
  id: string;
  /** The MusicXML text (for .mxl, the unzipped text the app produces). */
  xml: string;
  filename: string;
  /** From the file's metadata, "" when it has none. */
  title: string;
  composer: string;
  /** Spanish label of the detected key ("Re mayor"), "" until the analysis ran. */
  keyLabel: string;
  measures: number;
  addedAt: number;
  lastOpenedAt: number;
  /** Her own name for it (rename); wins over everything. */
  titleOverride?: string;
}

function tag(xml: string, re: RegExp): string {
  const m = re.exec(xml);
  return m ? decodeXml(m[1]).replace(/\s+/g, " ").trim() : "";
}

function decodeXml(s: string): string {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

/** work-title, else movement-title ("" if neither has text). */
export function xmlTitle(xml: string): string {
  return tag(xml, /<work-title>([^<]*)<\/work-title>/) || tag(xml, /<movement-title>([^<]*)<\/movement-title>/);
}

export function xmlComposer(xml: string): string {
  return tag(xml, /<creator[^>]*type="composer"[^>]*>([^<]*)<\/creator>/);
}

/** Number of measures of the first part (counts <measure ...> opening tags of that part). */
export function xmlMeasureCount(xml: string): number {
  const part = /<part\b[^>]*>([\s\S]*?)<\/part>/.exec(xml);
  const body = part ? part[1] : xml;
  return (body.match(/<measure[\s>]/g) ?? []).length;
}

/** "Gymnopedie-No.-1.mxl" -> "Gymnopedie No. 1": no extension, dashes and underscores become spaces. */
export function titleFromFilename(filename: string): string {
  const base = filename.replace(/^.*[\\/]/, "").replace(/\.(mxl|musicxml|xml)$/i, "");
  return base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

/** What to show as the name: her rename, the file's title, the cleaned filename. Never an empty string. */
export function displayTitle(e: Pick<LibraryEntry, "titleOverride" | "title" | "filename">): string {
  return e.titleOverride?.trim() || e.title.trim() || titleFromFilename(e.filename) || "Sin título";
}

export function buildEntry(id: string, xml: string, filename: string, now: number, extra: Partial<Pick<LibraryEntry, "keyLabel" | "measures">> = {}): LibraryEntry {
  return {
    id,
    xml,
    filename,
    title: xmlTitle(xml),
    composer: xmlComposer(xml),
    keyLabel: extra.keyLabel ?? "",
    measures: extra.measures ?? xmlMeasureCount(xml),
    addedAt: now,
    lastOpenedAt: now,
  };
}

/** Opening a score: new entry if unknown, else the old one with a fresh lastOpenedAt (no duplicate, rename kept). */
export function touchOrAdd(list: readonly LibraryEntry[], fresh: LibraryEntry): LibraryEntry[] {
  const i = list.findIndex((e) => e.id === fresh.id);
  if (i < 0) return [...list, fresh];
  const old = list[i];
  const merged: LibraryEntry = {
    ...old,
    filename: fresh.filename || old.filename,
    keyLabel: fresh.keyLabel || old.keyLabel,
    measures: fresh.measures || old.measures,
    lastOpenedAt: fresh.lastOpenedAt,
  };
  return list.map((e, k) => (k === i ? merged : e));
}

/** Import: merge by id. Keeps the earliest addedAt, the latest lastOpenedAt, and her rename from either side. */
export function mergeLibraries(mine: readonly LibraryEntry[], theirs: readonly LibraryEntry[]): LibraryEntry[] {
  const byId = new Map(mine.map((e) => [e.id, e] as const));
  for (const t of theirs) {
    const m = byId.get(t.id);
    if (!m) {
      byId.set(t.id, t);
      continue;
    }
    byId.set(t.id, {
      ...m,
      addedAt: Math.min(m.addedAt, t.addedAt),
      lastOpenedAt: Math.max(m.lastOpenedAt, t.lastOpenedAt),
      titleOverride: m.titleOverride ?? t.titleOverride,
      keyLabel: m.keyLabel || t.keyLabel,
      composer: m.composer || t.composer,
    });
  }
  return [...byId.values()];
}

export function sortByLastOpened(list: readonly LibraryEntry[]): LibraryEntry[] {
  return [...list].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt || a.id.localeCompare(b.id));
}

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Search over display title, composer and filename; accents and case ignored; every word must match. */
export function searchEntries(list: readonly LibraryEntry[], query: string): LibraryEntry[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [...list];
  return list.filter((e) => {
    const hay = fold(`${displayTitle(e)} ${e.title} ${e.composer} ${e.filename}`);
    return words.every((w) => hay.includes(w));
  });
}

/** "hace 2 días" style, in Spanish. */
export function agoEs(then: number, now: number): string {
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return "recién";
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} ${m === 1 ? "minuto" : "minutos"}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} ${d === 1 ? "día" : "días"}`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `hace ${mo} ${mo === 1 ? "mes" : "meses"}`;
  const y = Math.floor(mo / 12);
  return `hace ${y} ${y === 1 ? "año" : "años"}`;
}

export const EXPORT_FORMAT = "harmony-helper-library";

export function exportLibraryJson(list: readonly LibraryEntry[], now: number): string {
  return JSON.stringify({ format: EXPORT_FORMAT, version: 1, exportedAt: now, entries: list }, null, 1);
}

/** Parse an exported file; throws a readable Error when it is not one. Drops malformed entries. */
export function parseLibraryJson(text: string): LibraryEntry[] {
  let o: any;
  try {
    o = JSON.parse(text);
  } catch {
    throw new Error("Ese archivo no es una copia de la biblioteca.");
  }
  if (!o || o.format !== EXPORT_FORMAT || !Array.isArray(o.entries)) throw new Error("Ese archivo no es una copia de la biblioteca.");
  return o.entries
    .filter((e: any) => e && typeof e.id === "string" && typeof e.xml === "string" && e.xml.length > 0)
    .map((e: any): LibraryEntry => ({
      id: e.id,
      xml: e.xml,
      filename: String(e.filename ?? ""),
      title: String(e.title ?? ""),
      composer: String(e.composer ?? ""),
      keyLabel: String(e.keyLabel ?? ""),
      measures: Number.isFinite(e.measures) ? e.measures : 0,
      addedAt: Number.isFinite(e.addedAt) ? e.addedAt : 0,
      lastOpenedAt: Number.isFinite(e.lastOpenedAt) ? e.lastOpenedAt : 0,
      ...(typeof e.titleOverride === "string" && e.titleOverride ? { titleOverride: e.titleOverride } : {}),
    }));
}
