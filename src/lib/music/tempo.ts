/** Tempo helpers: pure logic, no React and no Tone, so they can be tested. */

export const MIN_BPM = 20;
export const MAX_BPM = 220;
/** Calm default for study when the score writes no tempo. */
export const DEFAULT_STUDY_BPM = 72;
export const TEMPO_KEY = "hh.tempo.v1";
export const TEMPO_PERCENTS = [50, 75, 100] as const;

export function clampBpm(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_STUDY_BPM;
  return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(v)));
}

/** +5 / -5 bpm; fine (Shift) is +1 / -1. */
export function stepBpm(bpm: number, dir: 1 | -1, fine = false): number {
  return clampBpm(bpm + dir * (fine ? 1 : 5));
}

/** Quarter notes per unit of each MusicXML beat-unit. */
const BEAT_UNIT_QUARTERS: Record<string, number> = {
  maxima: 32,
  long: 16,
  breve: 8,
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  "16th": 0.25,
  "32nd": 0.125,
  "64th": 0.0625,
};

/** "<beat-unit>half</beat-unit>" + dot + 60 per minute -> quarter-note bpm (half dotted = 3 quarters). */
export function toQuarterBpm(beatUnit: string, dots: number, perMinute: number): number | null {
  const q = BEAT_UNIT_QUARTERS[beatUnit.trim()];
  if (q === undefined || !Number.isFinite(perMinute) || perMinute <= 0) return null;
  let len = q;
  let add = q;
  for (let i = 0; i < dots; i++) {
    add /= 2;
    len += add;
  }
  return perMinute * len;
}

/**
 * The tempo written in the score, in quarter-note bpm, or null when there is none.
 * Reads the first `<sound tempo>` (already in quarters per minute) or the first
 * `<metronome>` (beat-unit + per-minute), whichever appears first in the file.
 * OSMD also reads these (sheet.DefaultStartTempoInBpm) but takes per-minute as-is
 * without converting the beat unit, so a half-note metronome would come out wrong.
 */
export function parseWrittenTempo(xml: string): number | null {
  const re = /<sound\b[^>]*?\btempo\s*=\s*"([^"]*)"|<metronome\b[^>]*>([\s\S]*?)<\/metronome>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    if (m[1] !== undefined) {
      const v = parseFloat(m[1]);
      if (Number.isFinite(v) && v > 0) return Math.round(v);
      continue;
    }
    const body = m[2] ?? "";
    const unit = /<beat-unit>\s*([^<\s]+)\s*<\/beat-unit>/.exec(body);
    const perMin = /<per-minute[^>]*>\s*([^<]*)<\/per-minute>/.exec(body);
    if (!unit || !perMin) continue; // e.g. "quarter = half" metronome: no per-minute
    const dots = (body.slice(0, body.indexOf("<per-minute")).match(/<beat-unit-dot\s*\/?>/g) ?? []).length;
    const n = parseFloat(perMin[1].replace(",", "."));
    const q = toQuarterBpm(unit[1], dots, n);
    if (q !== null) return Math.round(q);
  }
  return null;
}

/** The score's own tempo for the % buttons: written tempo, else the study default. */
export function baseTempo(written: number | null): number {
  return clampBpm(written ?? DEFAULT_STUDY_BPM);
}

export function bpmForPercent(base: number, pct: number): number {
  return clampBpm((base * pct) / 100);
}

/** Which of 50/75/100 the current bpm equals, or null. */
export function activePercent(bpm: number, base: number): number | null {
  for (const p of TEMPO_PERCENTS) if (bpmForPercent(base, p) === bpm) return p;
  return null;
}

/** Saved tempo for this score, else the written tempo, else 72. */
export function resolveInitialBpm(saved: number | null, written: number | null): number {
  if (saved !== null && Number.isFinite(saved)) return clampBpm(saved);
  return baseTempo(written);
}

/** Same musical position, new tempo: seconds scale by oldBpm / newBpm. */
export function rescaleSeconds(sec: number, oldBpm: number, newBpm: number): number {
  return (sec * oldBpm) / newBpm;
}

type Store = Pick<Storage, "getItem" | "setItem">;

function readMap(store: Store): Record<string, number> {
  try {
    const raw = store.getItem(TEMPO_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

export function loadSavedTempo(store: Store, scoreHash: string): number | null {
  const v = readMap(store)[scoreHash];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function saveTempo(store: Store, scoreHash: string, bpm: number): void {
  try {
    const map = readMap(store);
    map[scoreHash] = clampBpm(bpm);
    store.setItem(TEMPO_KEY, JSON.stringify(map));
  } catch {
    /* storage blocked: tempo just isn't remembered */
  }
}
