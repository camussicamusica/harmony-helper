/** What a MusicXML file says about its printed layout (Audiveris keeps the paper's line and page breaks). */

export interface LayoutInfo {
  /** Measures that start a new system / a new page on the paper, from <print new-system|new-page="yes">. */
  newSystems: number[];
  newPages: number[];
  /** Page size from <defaults><page-layout>, in the file's own units (tenths-ish), or null. */
  page: { width: number; height: number } | null;
  /** True when the file carries any break at all. */
  hasBreaks: boolean;
}

export function readLayoutInfo(xml: string): LayoutInfo {
  const newSystems: number[] = [];
  const newPages: number[] = [];
  // Self-closing <measure .../> carries nothing; the pattern skips it (no "/" right before ">").
  const re = /<measure\b[^>]*?\bnumber="([^"]*)"(?:[^>]*[^/>])?>([\s\S]*?)<\/measure>/g;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(xml))) {
    const n = parseInt(m[1], 10);
    if (!Number.isFinite(n)) continue;
    const pr = /<print\b([^>]*)>/.exec(m[2]);
    if (!pr) continue;
    const key = `${n}`;
    if (/new-system="yes"/.test(pr[1]) && !seen.has("s" + key)) {
      seen.add("s" + key);
      newSystems.push(n);
    }
    if (/new-page="yes"/.test(pr[1]) && !seen.has("p" + key)) {
      seen.add("p" + key);
      newPages.push(n);
    }
  }
  const w = /<page-width>\s*([\d.]+)\s*<\/page-width>/.exec(xml);
  const h = /<page-height>\s*([\d.]+)\s*<\/page-height>/.exec(xml);
  const page = w && h && +w[1] > 0 && +h[1] > 0 ? { width: +w[1], height: +h[1] } : null;
  return { newSystems, newPages, page, hasBreaks: newSystems.length + newPages.length > 0 };
}

/** Measures per printed system, given the first measure of every system (1 is implicit) and the last measure number. */
export function measuresPerSystem(info: Pick<LayoutInfo, "newSystems" | "newPages">, lastMeasure: number): number[] {
  const starts = [...new Set([1, ...info.newSystems, ...info.newPages])].sort((a, b) => a - b);
  return starts.map((s, i) => (i + 1 < starts.length ? starts[i + 1] : lastMeasure + 1) - s);
}

/** Printed pages: first measure of each (1 is implicit). */
export function pageStarts(info: Pick<LayoutInfo, "newPages">): number[] {
  return [...new Set([1, ...info.newPages])].sort((a, b) => a - b);
}

const escXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * The XML OSMD should draw for the page header: `title` replaces the file's work-title / movement-title (or is added when
 * it has none), so OSMD never falls back to "Untitled Score". The stored file is not touched; only what is rendered.
 */
export function withTitle(xml: string, title: string): string {
  const t = escXml(title.trim());
  if (!t) return xml;
  let done = false;
  let out = xml.replace(/<(work-title|movement-title)>[^<]*<\/\1>/g, (_m, name) => {
    done = true;
    return `<${name}>${t}</${name}>`;
  });
  if (done) return out;
  out = xml.replace(/<(identification|defaults|credit|part-list)\b/, `<movement-title>${t}</movement-title><$1`);
  return out;
}
