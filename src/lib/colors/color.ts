import type { ColorRole } from "./types";

export function normalizeHex(input: string): string | null {
  let s = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(s)) s = s.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return "#" + s.toLowerCase();
}

function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex) ?? "#000000";
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}

const toLin = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const fromLin = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

export type Lab = [number, number, number];

export function hexToOklab(hex: string): Lab {
  const [r8, g8, b8] = hexToRgb(hex);
  const r = toLin(r8), g = toLin(g8), b = toLin(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToHex([L, a, b]: Lab): string {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return rgbToHex(
    fromLin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLin(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  );
}

/** Perceptual distance (Euclidean in OKLab, scaled so ~1 is "very different"). */
export function distance(a: string, b: string): number {
  const x = hexToOklab(a), y = hexToOklab(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) * 2.5;
}

export function darken(hex: string, amount = 0.12): string {
  const [L, a, b] = hexToOklab(hex);
  return oklabToHex([Math.max(0, L - amount), a, b]);
}

export function lighten(hex: string, amount = 0.12): string {
  const [L, a, b] = hexToOklab(hex);
  return oklabToHex([Math.min(1, L + amount), a, b]);
}

export interface SimilarPair {
  a: ColorRole;
  b: ColorRole;
  distance: number;
}

/** Pairs that look almost the same. Compares within a group, and notes vs chords. Warn only. */
export function similarPairs(roles: ColorRole[], threshold = 0.12): SimilarPair[] {
  const live = roles.filter((r) => !r.hidden && r.enabled !== false && r.group !== "interface");
  const out: SimilarPair[] = [];
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      const comparable =
        a.group === b.group ||
        (a.group === "notes" && b.group === "chords") ||
        (a.group === "chords" && b.group === "notes");
      if (!comparable) continue;
      const d = distance(a.color, b.color);
      if (d < threshold) out.push({ a, b, distance: d });
    }
  }
  return out;
}

/** Black or white text, whichever reads better on this fill (WCAG relative luminance). */
export function readableTextOn(hex: string, dark = "#111111", light = "#ffffff"): string {
  const h = normalizeHex(hex) ?? "#808080";
  const ch = [1, 3, 5].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  return L > 0.4 ? dark : light;
}
