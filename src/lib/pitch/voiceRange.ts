/** Her measured voice range, kept in the browser under `hh.voz.v1` (never the color key). */
export interface VoiceRange {
  low: number;
  high: number;
  measuredAt: string;
}

const KEY = "hh.voz.v1";

export function loadVoiceRange(): VoiceRange | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!Number.isFinite(v?.low) || !Number.isFinite(v?.high) || v.high < v.low) return null;
    return { low: v.low, high: v.high, measuredAt: String(v.measuredAt ?? "") };
  } catch {
    return null;
  }
}

export function saveVoiceRange(low: number, high: number): VoiceRange {
  const r: VoiceRange = { low, high, measuredAt: new Date().toISOString() };
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* private mode or full: she just measures again next time */
  }
  return r;
}

export function clearVoiceRange() {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
