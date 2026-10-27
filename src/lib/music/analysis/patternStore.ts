import { generatePalette, hueGap, hueOf, padPalette } from "./patternColors";

/** Minimal slice of `Storage`, so the tests can pass a fake one. */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const SCORES_KEY = "hh.patterns.v1";
export const PALETTES_KEY = "hh.patterns.palettes.v1";
/** Written by public/prototipos/mezcla-de-colores.html. Read once, never changed. */
export const PROTO_PALETTES_KEY = "hh.proto.patternPalettes.v1";
export const PROTO_IMPORTED_KEY = "hh.patterns.protoImported.v1";
export const OPTIONS_KEY = "hh.patterns.options.v1";
export const DEGRADE_KEY = "hh.degrade.v1";
export const CHORD_NAMES_KEY = "hh.chordNames.v1";

export function browserStorage(): KV | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(kv: KV | null, key: string, fallback: T): T {
  try {
    const raw = kv?.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(kv: KV | null, key: string, value: unknown) {
  try {
    kv?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the layer still works for this session */
  }
}

const isHex = (c: unknown): c is string => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c);

// ---------- colors of one score ----------

export interface ScoreColors {
  /** Seed of the random draw. A new draw ("Otra combinación") is a new seed. */
  seed: number;
  /** A saved combination she applied to this score. Wins over the draw. */
  custom?: string[];
}

type ScoresFile = { scores: Record<string, ScoreColors> };

function readScores(kv: KV | null): ScoresFile {
  const v = readJson<ScoresFile>(kv, SCORES_KEY, { scores: {} });
  return v && typeof v === "object" && v.scores && typeof v.scores === "object" ? v : { scores: {} };
}

const newSeed = (rng: () => number) => Math.floor(rng() * 2147483647);

/** The colors of this score: the saved ones, or a first random draw that is saved right away. */
export function getScoreColors(hash: string, kv: KV | null = browserStorage(), rng: () => number = Math.random): ScoreColors {
  const file = readScores(kv);
  const found = file.scores[hash];
  if (found && Number.isFinite(found.seed)) return found;
  const fresh: ScoreColors = { seed: newSeed(rng) };
  file.scores[hash] = fresh;
  writeJson(kv, SCORES_KEY, file);
  return fresh;
}

/** "Otra combinación": a new draw for this score. The first color moves at least 40 degrees from the one it had. */
export function rerollScoreColors(
  hash: string,
  n: number,
  kv: KV | null = browserStorage(),
  rng: () => number = Math.random,
): ScoreColors {
  const file = readScores(kv);
  const old = file.scores[hash];
  const before = old ? paletteFor(n, old) : null;
  let seed = newSeed(rng);
  for (let t = 0; t < 30 && before?.length; t++) {
    const next = paletteFor(n, { seed });
    if (hueGap(hueOf(next[0]), hueOf(before[0])) >= 40) break;
    seed = newSeed(rng);
  }
  const fresh: ScoreColors = { seed };
  file.scores[hash] = fresh;
  writeJson(kv, SCORES_KEY, file);
  return fresh;
}

/** Apply a saved combination to this score. */
export function applyPaletteToScore(hash: string, colors: string[], kv: KV | null = browserStorage()): ScoreColors {
  const file = readScores(kv);
  const prev = file.scores[hash];
  const next: ScoreColors = { seed: prev?.seed ?? newSeed(Math.random), custom: colors.filter(isHex) };
  file.scores[hash] = next;
  writeJson(kv, SCORES_KEY, file);
  return next;
}

/** The `n` colors for a score, one per pattern color key. */
export function paletteFor(n: number, sc: ScoreColors): string[] {
  if (n <= 0) return [];
  if (sc.custom?.length) return padPalette(sc.custom, n, sc.seed);
  return generatePalette(n, sc.seed);
}

// ---------- saved combinations ----------

/** The saved combinations: a list of lists of hex colors (the same shape the prototype uses). */
export function loadPalettes(kv: KV | null = browserStorage()): string[][] {
  const v = readJson<unknown>(kv, PALETTES_KEY, []);
  if (!Array.isArray(v)) return [];
  return v.filter((p): p is string[] => Array.isArray(p) && p.length > 0 && p.every(isHex));
}

/** "Me gusta esta". Returns the new list (an equal combination is not added twice). */
export function savePalette(colors: string[], kv: KV | null = browserStorage()): string[][] {
  const list = loadPalettes(kv);
  const clean = colors.filter(isHex).map((c) => c.toUpperCase());
  if (clean.length && !list.some((p) => p.map((c) => c.toUpperCase()).join() === clean.join())) {
    list.push(clean);
    writeJson(kv, PALETTES_KEY, list);
  }
  return list;
}

/** Only her explicit "Quitar" (after a confirm) calls this. Nothing else deletes a saved combination. */
export function removePalette(index: number, kv: KV | null = browserStorage()): string[][] {
  const list = loadPalettes(kv);
  if (index >= 0 && index < list.length) {
    list.splice(index, 1);
    writeJson(kv, PALETTES_KEY, list);
  }
  return list;
}

/** Copies the prototype's saved combinations once. The prototype's own key is only read. */
export function importProtoPalettes(kv: KV | null = browserStorage()): number {
  try {
    if (kv?.getItem(PROTO_IMPORTED_KEY) === "1") return 0;
    const raw = readJson<unknown>(kv, PROTO_PALETTES_KEY, null);
    if (raw === null) return 0; // nothing to import yet: try again next time
    let added = 0;
    if (Array.isArray(raw)) {
      const have = new Set(loadPalettes(kv).map((p) => p.map((c) => c.toUpperCase()).join()));
      const list = loadPalettes(kv);
      for (const p of raw) {
        if (!Array.isArray(p) || !p.length || !p.every(isHex)) continue;
        const clean = (p as string[]).map((c) => c.toUpperCase());
        if (have.has(clean.join())) continue;
        have.add(clean.join());
        list.push(clean);
        added++;
      }
      if (added) writeJson(kv, PALETTES_KEY, list);
    }
    kv?.setItem(PROTO_IMPORTED_KEY, "1");
    return added;
  } catch {
    return 0;
  }
}

// ---------- layer options ----------

export interface PatternOptions {
  on: boolean;
  scope: "both" | "rh" | "lh";
  includeTransposed: boolean;
  /** 0.05-0.6 */
  intensity: number;
}

export const DEFAULT_PATTERN_OPTIONS: PatternOptions = { on: false, scope: "both", includeTransposed: false, intensity: 0.25 };

export function loadPatternOptions(kv: KV | null = browserStorage()): PatternOptions {
  const v = readJson<Partial<PatternOptions>>(kv, OPTIONS_KEY, {});
  const d = DEFAULT_PATTERN_OPTIONS;
  return {
    on: v.on === true,
    scope: v.scope === "rh" || v.scope === "lh" ? v.scope : d.scope,
    includeTransposed: v.includeTransposed === true,
    intensity: typeof v.intensity === "number" ? Math.max(0.05, Math.min(0.6, v.intensity)) : d.intensity,
  };
}

export function savePatternOptions(o: PatternOptions, kv: KV | null = browserStorage()) {
  writeJson(kv, OPTIONS_KEY, o);
}

export interface DegradeOptions {
  on: boolean;
  /** 0.05-0.6 */
  intensity: number;
}

export const DEFAULT_DEGRADE_OPTIONS: DegradeOptions = { on: false, intensity: 0.35 };

export function loadDegradeOptions(kv: KV | null = browserStorage()): DegradeOptions {
  const v = readJson<Partial<DegradeOptions>>(kv, DEGRADE_KEY, {});
  return {
    on: v.on === true,
    intensity: typeof v.intensity === "number" ? Math.max(0.05, Math.min(0.6, v.intensity)) : DEFAULT_DEGRADE_OPTIONS.intensity,
  };
}

export function saveDegradeOptions(o: DegradeOptions, kv: KV | null = browserStorage()) {
  writeJson(kv, DEGRADE_KEY, o);
}

/** "Nombres de acordes": which chords get a written name above the staff. */
export type ChordNamesMode = "unicos" | "todos";

export interface ChordNamesOptions {
  on: boolean;
  mode: ChordNamesMode;
}

export const DEFAULT_CHORD_NAMES_OPTIONS: ChordNamesOptions = { on: false, mode: "unicos" };

export function loadChordNamesOptions(kv: KV | null = browserStorage()): ChordNamesOptions {
  const v = readJson<Partial<ChordNamesOptions>>(kv, CHORD_NAMES_KEY, {});
  return { on: v.on === true, mode: v.mode === "todos" ? "todos" : "unicos" };
}

export function saveChordNamesOptions(o: ChordNamesOptions, kv: KV | null = browserStorage()) {
  writeJson(kv, CHORD_NAMES_KEY, o);
}
