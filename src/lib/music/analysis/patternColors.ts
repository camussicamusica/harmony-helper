import { hexToOklab, oklabToHex } from "@/lib/colors/color";

/**
 * Colors for the pattern boxes. Same recipe as the approved prototype (public/prototipos/mezcla-de-colores.html):
 * one hue per pattern, evenly spread around the OKLCH wheel with a random offset and a little jitter, light and
 * soft (L 0.82-0.88, C 0.09-0.13), then shuffled so pattern A is not always the same hue.
 */

/** Small seeded random generator (same seed, same numbers). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function oklchToHex(L: number, C: number, hDeg: number): string {
  const r = (hDeg * Math.PI) / 180;
  return oklabToHex([L, C * Math.cos(r), C * Math.sin(r)]).toUpperCase();
}

/** Hue of a hex color in degrees (0-360). */
export function hueOf(hex: string): number {
  const [, a, b] = hexToOklab(hex);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return (h + 360) % 360;
}

/** Shortest distance between two hues, 0-180. */
export function hueGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Fewest degrees two neighbouring patterns' hues may be apart. */
export function minNeighbourGap(n: number): number {
  if (n <= 1) return 0;
  return Math.min(75, (360 / n) * Math.max(1, Math.floor(n / 3)) * 0.8);
}

/** Orders the items so neighbours are far apart in hue. `hues` are the hues the colors really ended up with. */
function orderFarApart<T>(items: T[], hues: number[], rng: () => number): T[] {
  const n = hues.length;
  const need = minNeighbourGap(n);
  const ok = (idx: number[]) => idx.every((k, i) => i === 0 || hueGap(hues[k], hues[idx[i - 1]]) >= need);
  for (let t = 0; t < 200; t++) {
    const idx = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    if (ok(idx)) return idx.map((k) => items[k]);
  }
  // Always works: walk the wheel in steps of about a third of it.
  let stride = Math.max(1, Math.round(n / 3));
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  while (gcd(stride, n) !== 1) stride++;
  const start = Math.floor(rng() * n);
  return Array.from({ length: n }, (_, i) => items[(start + i * stride) % n]);
}

/** `n` soft colors, hues far apart, in a random order. The same seed always gives the same colors. */
export function generatePalette(n: number, seed: number): string[] {
  if (n <= 0) return [];
  const rng = mulberry32(seed);
  const h0 = rng() * 360;
  const step = 360 / n;
  const L = 0.82 + rng() * 0.06;
  const C = 0.09 + rng() * 0.04;
  const jitter = Math.min(15, step * 0.2);
  const hues = Array.from({ length: n }, (_, i) => (h0 + i * step + (rng() - 0.5) * 2 * jitter + 360) % 360);
  const colors = hues.map((h) => oklchToHex(L, C, h));
  return orderFarApart(colors, colors.map(hueOf), rng);
}

/** Darker version of a box color, same hue: used for the thin border and the letter. */
export function strongOf(hex: string): string {
  const [L, a, b] = hexToOklab(hex);
  const k = 1.5; // more chroma so the line is not gray
  return oklabToHex([Math.max(0.45, L - 0.26), a * k, b * k]);
}

/** `custom` colors first; if the score needs more, add generated ones that are not close to any already used. */
export function padPalette(custom: string[], n: number, seed: number): string[] {
  if (custom.length >= n) return custom.slice(0, n);
  const out = [...custom];
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const pool = generatePalette(Math.max(n * 2, 8), seed ^ 0x51ed270b);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const rest = pool.filter((c) => out.every((u) => hueGap(hueOf(c), hueOf(u)) >= 40));
  const rest2 = pool.filter((c) => !rest.includes(c));
  for (const c of [...rest, ...rest2]) {
    if (out.length >= n) break;
    out.push(c);
  }
  return out;
}
