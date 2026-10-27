import { hexToOklab, normalizeHex, oklabToHex } from "@/lib/colors/color";

/** One note as the degradé needs it: where it sits and which color it has (null = its color is switched off). */
export interface DegradeNote {
  x: number;
  /** 0 = top staff (right hand), 1 = bottom staff (left hand). */
  staff: number;
  system: number;
  startSec: number;
  endSec: number;
  color: string | null;
}

export interface DegradeStop {
  x: number;
  color: string;
}

export interface DegradeBand {
  system: number;
  staff: number;
  /** Where the band starts and ends (a little before the first note and after the last one). */
  x0: number;
  x1: number;
  stops: DegradeStop[];
}

export interface BandOptions {
  /** A silence longer than this many seconds cuts the band. */
  maxGapSec: number;
  /** Noteheads closer than this many px are one stop (chord mates). */
  sameXPx?: number;
  /** How far the band reaches before the first and after the last note of a piece of band, in px. */
  padPx?: number;
}

/** Mean of colors in OKLab. This is what a chord gets: one color for the whole chord, at its x. */
export function averageColor(colors: string[]): string {
  if (colors.length === 1) return normalizeHex(colors[0]) ?? colors[0];
  let L = 0;
  let a = 0;
  let b = 0;
  for (const c of colors) {
    const [l, aa, bb] = hexToOklab(c);
    L += l;
    a += aa;
    b += bb;
  }
  const n = colors.length;
  return oklabToHex([L / n, a / n, b / n]);
}

/**
 * Splits the notes into pieces of band: one per staff and system, cut at long silences.
 * Stops are placed at the notehead x (not by duration). Notes whose color is off add no stop.
 */
export function buildBands(notes: DegradeNote[], opts: BandOptions): DegradeBand[] {
  const sameX = opts.sameXPx ?? 3;
  const pad = opts.padPx ?? 22;
  const groups = new Map<string, DegradeNote[]>();
  for (const n of notes) {
    const k = `${n.system}:${n.staff}`;
    const arr = groups.get(k) ?? [];
    arr.push(n);
    groups.set(k, arr);
  }
  const bands: DegradeBand[] = [];
  for (const [k, list] of groups) {
    const [system, staff] = k.split(":").map(Number);
    list.sort((a, b) => a.x - b.x || a.startSec - b.startSec);

    // Cluster by x (chords).
    const clusters: DegradeNote[][] = [];
    for (const n of list) {
      const last = clusters[clusters.length - 1];
      if (last && Math.abs(n.x - last[last.length - 1].x) <= sameX) last.push(n);
      else clusters.push([n]);
    }

    let stops: DegradeStop[] = [];
    let reachSec = -Infinity; // when the sound so far ends
    const flush = () => {
      if (stops.length) {
        bands.push({ system, staff, x0: stops[0].x - pad, x1: stops[stops.length - 1].x + pad, stops });
      }
      stops = [];
    };
    for (const c of clusters) {
      const start = Math.min(...c.map((n) => n.startSec));
      if (stops.length && start - reachSec > opts.maxGapSec) flush();
      if (!stops.length) reachSec = -Infinity;
      reachSec = Math.max(reachSec, ...c.map((n) => n.endSec));
      const on = c.filter((n) => n.color).map((n) => n.color as string);
      if (!on.length) continue; // all off: no stop; the band interpolates over it or stays cut
      const x = c.reduce((s, n) => s + n.x, 0) / c.length;
      stops.push({ x, color: averageColor(on) });
    }
    flush();
  }
  return bands.sort((a, b) => a.system - b.system || a.staff - b.staff || a.x0 - b.x0);
}

export interface GradientStop {
  offset: number;
  color: string;
  opacity: number;
}

/** Stops for an SVG linear gradient across [x0, x1]: transparent at both ends, full color at each note. */
export function gradientStops(band: DegradeBand): GradientStop[] {
  const w = Math.max(1, band.x1 - band.x0);
  const first = band.stops[0];
  const last = band.stops[band.stops.length - 1];
  return [
    { offset: 0, color: first.color, opacity: 0 },
    ...band.stops.map((s) => ({ offset: Math.min(1, Math.max(0, (s.x - band.x0) / w)), color: s.color, opacity: 1 })),
    { offset: 1, color: last.color, opacity: 0 },
  ];
}

// ---------- readability of black noteheads ----------

const chan = (hex: string): [number, number, number] => {
  const h = normalizeHex(hex) ?? "#000000";
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
};

const lin = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

export function relLuminance(hex: string): number {
  const [r, g, b] = chan(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contrast of pure black on top of `bg` (WCAG: (L + 0.05) / 0.05). */
export function contrastWithBlack(bg: string): number {
  return (relLuminance(bg) + 0.05) / 0.05;
}

/** `color` painted at `alpha` over `paper`, mixed the way the browser mixes (in sRGB). */
export function onPaper(color: string, alpha: number, paper = "#FFFFFF"): string {
  const c = chan(color);
  const p = chan(paper);
  const out = c.map((v, i) => Math.round(v * alpha + p[i] * (1 - alpha)));
  return "#" + out.map((v) => v.toString(16).padStart(2, "0")).join("");
}

function mixSrgb(a: string, b: string): string {
  const x = chan(a);
  const y = chan(b);
  return "#" + x.map((v, i) => Math.round((v + y[i]) / 2).toString(16).padStart(2, "0")).join("");
}

/**
 * The strongest intensity (0-1) at which black noteheads still have `ratio`:1 over every color of the band.
 * Includes the halfway mix of neighbours, because the gradient passes through those too.
 */
export function maxIntensityForContrast(colors: string[], paper = "#FFFFFF", ratio = 4.5): number {
  const all = [...colors];
  for (let i = 1; i < colors.length; i++) all.push(mixSrgb(colors[i - 1], colors[i]));
  if (!all.length) return 1;
  const ok = (alpha: number) => all.every((c) => contrastWithBlack(onPaper(c, alpha, paper)) >= ratio);
  if (ok(1)) return 1;
  if (!ok(0)) return 0; // the paper itself is too dark
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}
