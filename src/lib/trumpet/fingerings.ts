/**
 * B♭ trumpet fingerings: pure logic, no React, no DOM.
 * Everything is in WRITTEN pitch (MIDI number, written C4 = 60). Sounding pitch is written - 2.
 * Source of the chart: docs/research/trompeta-lectura-y-mecanica.md, section 3.4.
 */

export type Valves = [boolean, boolean, boolean];

/** Semitones each valve lowers the pitch: valve 1 = 2, valve 2 = 1, valve 3 = 3. Combinations add. */
export const VALVE_SEMITONES: readonly [number, number, number] = [2, 1, 3];

/** Open partials in written MIDI. Partial 1 is the pedal tone. Partial 7 is ~31 cents flat. */
export const OPEN_PARTIALS: Readonly<Record<number, number>> = {
  1: 48, 2: 60, 3: 67, 4: 72, 5: 76, 6: 79, 7: 82, 8: 84, 9: 86, 10: 88, 12: 91, 16: 96,
};

/** Partials we offer, lowest first. 7 is left out as a primary choice (flat). 11, 13, 14, 15 are out of tune. */
const USABLE_PARTIALS = [1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 16];

export const MIN_MIDI = 36;
export const MAX_MIDI = 96;
/** Lowest note of the standard range (F♯3). Below it only pedal tones exist. */
export const LOW_STANDARD = 54;

export type Alternative = { valves: Valves; label: string; partial: number };

export type Fingering = {
  valves: Valves;
  partial: number;
  /** "1-3", "0" for open. */
  label: string;
  alternatives: Alternative[];
  /** Tuning-slide advice, in Spanish, when the note needs it. */
  slide?: string;
  /** false for the gaps (49–53 and below 42) where the trumpet has no real note. */
  reachable: boolean;
};

export function valvesFromSemitones(semis: number): Valves | null {
  switch (semis) {
    case 0: return [false, false, false];
    case 1: return [false, true, false];
    case 2: return [true, false, false];
    case 3: return [true, true, false]; // 1-2 is the chart default; 3 alone is the alternate
    case 4: return [false, true, true];
    case 5: return [true, false, true];
    case 6: return [true, true, true];
    default: return null;
  }
}

export function valveLabel(v: Valves): string {
  const on = v.map((x, i) => (x ? String(i + 1) : "")).filter(Boolean);
  return on.length ? on.join("-") : "0";
}

export function semitonesOf(v: Valves): number {
  return v.reduce((s, on, i) => s + (on ? VALVE_SEMITONES[i] : 0), 0);
}

/** Tuning-slide advice by written note. Low D and C♯ are the classic ones (research 3.6). */
const SLIDE_NOTES: Readonly<Record<number, string>> = {
  54: "corredera 3ª afuera",
  55: "corredera 3ª afuera",
  61: "corredera 3ª afuera",
  62: "corredera 3ª afuera",
};

/** Above C6 the chart (thewholehorn) differs from the plain rule for this note. */
const PRIMARY_OVERRIDES: Readonly<Record<number, { semis: number; partial: number }>> = {
  85: { semis: 3, partial: 10 }, // C♯6 = 1-2
};

/** Extra fingerings from the research table, 3.5. Keyed by written note. */
const EXTRA_ALTERNATIVES: Readonly<Record<number, { semis: number; partial: number; valves?: Valves }[]>> = {
  67: [{ semis: 5, partial: 4 }], // G4 with 1-3
  71: [{ semis: 5, partial: 5 }], // B4 with 1-3
  72: [{ semis: 4, partial: 5 }], // C5 with 2-3
  86: [{ semis: 2, partial: 10 }], // D6 with 1
  88: [{ semis: 3, partial: 12 }], // E6 with 1-2
  91: [{ semis: 5, partial: 16 }],
};

const THIRD_ALONE: Valves = [false, false, true];

function pickPartial(midi: number): { partial: number; semis: number } | null {
  for (const p of USABLE_PARTIALS) {
    const semis = OPEN_PARTIALS[p] - midi;
    if (semis >= 0 && semis <= 6) return { partial: p, semis };
  }
  return null;
}

function alt(semis: number, partial: number, valves?: Valves): Alternative | null {
  const v = valves ?? valvesFromSemitones(semis);
  return v ? { valves: v, label: valveLabel(v), partial } : null;
}

/** Fingering for a written note, or null outside 36–96. */
export function fingeringFor(writtenMidi: number): Fingering | null {
  if (!Number.isFinite(writtenMidi) || writtenMidi < MIN_MIDI || writtenMidi > MAX_MIDI) return null;
  const n = Math.round(writtenMidi);

  if (n < LOW_STANDARD) {
    // Pedal tones: partial 1 (C3 = 48) lowered by 0–6 semitones covers 42–48.
    const semis = OPEN_PARTIALS[1] - n;
    const v = valvesFromSemitones(semis);
    if (v) return { valves: v, partial: 1, label: valveLabel(v), alternatives: [], reachable: true };
    // 49–53 sit in the gap between the pedals and F♯3; below 42 there is no pedal either.
    return { valves: [true, true, true], partial: n > 48 ? 2 : 1, label: "1-2-3", alternatives: [], reachable: false };
  }

  const ov = PRIMARY_OVERRIDES[n];
  const pick = ov ?? pickPartial(n);
  if (!pick) return null;
  const valves = valvesFromSemitones(pick.semis)!;

  const alternatives: Alternative[] = [];
  // 3 alone has the same tube length as 1-2 and is in tune (1-2 runs ~11 cents sharp).
  if (pick.semis === 3) alternatives.push(alt(3, pick.partial, THIRD_ALONE)!);
  for (const e of EXTRA_ALTERNATIVES[n] ?? []) {
    const a = alt(e.semis, e.partial, e.valves);
    if (a) alternatives.push(a);
  }

  const out: Fingering = { valves, partial: pick.partial, label: valveLabel(valves), alternatives, reachable: true };
  if (SLIDE_NOTES[n]) out.slide = SLIDE_NOTES[n];
  return out;
}

/** Written notes playable with a valve combination: pedal first, then partials 2–8 (ascending). */
export function seriesFor(valves: Valves): number[] {
  const s = semitonesOf(valves);
  return [1, 2, 3, 4, 5, 6, 7, 8].map((p) => OPEN_PARTIALS[p] - s);
}

/** Register band: 0 pedal (< F♯3), 1 F♯3–B3, 2 C4–B4, 3 C5–B5, 4 C6 and up. */
export function registerBand(writtenMidi: number): 0 | 1 | 2 | 3 | 4 {
  if (writtenMidi < 54) return 0;
  if (writtenMidi < 60) return 1;
  if (writtenMidi < 72) return 2;
  if (writtenMidi < 84) return 3;
  return 4;
}
