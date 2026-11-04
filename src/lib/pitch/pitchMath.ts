/**
 * Pitch math for the microphone, no audio and no DOM: Hz → MIDI/cents, a median filter, a tracker that turns raw detector
 * frames into calm ones, and the voice-range statistics. Knows nothing about singing: the trumpet reuses it with other options.
 */
import { staffStep, type Clef } from "@/lib/music/staffMath";

/** One reading of the detector. `freq` is null when it found nothing. */
export interface PitchFrame {
  /** Milliseconds, any monotonic clock. */
  t: number;
  freq: number | null;
  /** 0..1, pitchy's confidence. */
  clarity: number;
  /** Signal level of the window, 0..1. */
  rms: number;
}

/** Continuous MIDI number: A4 = 440 Hz = 69. */
export function freqToMidiFloat(f: number): number {
  return 69 + 12 * Math.log2(f / 440);
}

export function nearestMidi(midiFloat: number): number {
  return Math.round(midiFloat);
}

/** Cents of `f` above (positive) or below the equal-tempered note `midi`. */
export function centsOff(f: number, midi: number): number {
  return (freqToMidiFloat(f) - midi) * 100;
}

export function median(arr: readonly number[]): number {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}

/** Percentile `p` (0..100) with linear interpolation between neighbours. */
export function percentile(arr: readonly number[], p: number): number {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const pos = (Math.min(100, Math.max(0, p)) / 100) * (s.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export interface TrackerOptions {
  /** Frames below this clarity are not a note (noise, consonants). */
  minClarity: number;
  /** Volume gate: frames quieter than this are the room, not her. */
  minRms: number;
  minHz: number;
  maxHz: number;
  /** Length of the median window. */
  medianMs: number;
  /** The same nearest note must hold this long to count as stable. */
  stableMs: number;
  /** A jump of an octave or more (11.5+ semitones) is dropped unless it lasts this many frames in a row. */
  octaveJumpFrames: number;
}

export const DEFAULT_TRACKER_OPTIONS: TrackerOptions = {
  minClarity: 0.9,
  minRms: 0.01,
  minHz: 70,
  maxHz: 1100,
  medianMs: 150,
  stableMs: 150,
  octaveJumpFrames: 3,
};

/** What the tracker says about one frame. When `heard` is false the numbers are NaN / 0 and nothing else is meaningful. */
export interface TrackedFrame {
  t: number;
  heard: boolean;
  /** Median-filtered continuous MIDI number. */
  midiFloat: number;
  nearest: number;
  /** Cents of `midiFloat` away from `nearest`, -50..+50. */
  cents: number;
  /** The same nearest note has been held for at least `stableMs`. */
  stable: boolean;
}

const NOT_HEARD = (t: number): TrackedFrame => ({ t, heard: false, midiFloat: NaN, nearest: NaN, cents: 0, stable: false });

/** An octave error is a jump of 12 semitones give or take a little, so the gate sits just under it. */
const OCTAVE_JUMP = 11.5;

/** A silence this long forgets the previous note, so the first note of a new phrase is never taken for an octave jump. */
const FORGET_MS = 400;

/** Feed it frames in time order with `push`; it filters, smooths and tells when a note is stable. */
export class PitchTracker {
  private readonly o: TrackerOptions;
  private win: { t: number; m: number }[] = [];
  private lastAccepted: number | null = null;
  private lastAcceptedT = -Infinity;
  private jumpCount = 0;
  private nearest = NaN;
  private nearestSince = 0;

  constructor(options: Partial<TrackerOptions> = {}) {
    this.o = { ...DEFAULT_TRACKER_OPTIONS, ...options };
  }

  reset() {
    this.win = [];
    this.lastAccepted = null;
    this.lastAcceptedT = -Infinity;
    this.jumpCount = 0;
    this.nearest = NaN;
  }

  push(f: PitchFrame): TrackedFrame {
    const o = this.o;
    const ok =
      f.freq != null && Number.isFinite(f.freq) && f.clarity >= o.minClarity && f.rms >= o.minRms && f.freq >= o.minHz && f.freq <= o.maxHz;
    if (!ok) {
      this.nearest = NaN;
      if (f.t - this.lastAcceptedT > FORGET_MS) this.reset();
      return NOT_HEARD(f.t);
    }
    const m = freqToMidiFloat(f.freq!);

    if (this.lastAccepted != null && f.t - this.lastAcceptedT > FORGET_MS) this.reset();
    if (this.lastAccepted != null && Math.abs(m - this.lastAccepted) >= OCTAVE_JUMP) {
      this.jumpCount++;
      if (this.jumpCount < o.octaveJumpFrames) return NOT_HEARD(f.t); // probably an octave error: wait and see
      this.win = []; // it lasted: it is a real new pitch, forget the old window
      this.nearest = NaN;
    }
    this.jumpCount = 0;
    this.lastAccepted = m;
    this.lastAcceptedT = f.t;

    this.win.push({ t: f.t, m });
    while (this.win.length > 1 && f.t - this.win[0].t > o.medianMs) this.win.shift();
    const midiFloat = median(this.win.map((w) => w.m));
    const nearest = nearestMidi(midiFloat);
    if (nearest !== this.nearest) {
      this.nearest = nearest;
      this.nearestSince = f.t;
    }
    return { t: f.t, heard: true, midiFloat, nearest, cents: (midiFloat - nearest) * 100, stable: f.t - this.nearestSince >= o.stableMs };
  }
}

export interface RangeOptions {
  /** Milliseconds between frames (default 1024/44100 s, one ScriptProcessor block). */
  frameMs?: number;
  /** Minimum stable material per phase (default 1000 ms). */
  minMs?: number;
}

/**
 * Comfortable range from the stable frames of the low phase and of the high phase: the 5th percentile of the first,
 * the 95th of the second, so cracks and puffs fall outside. null when a phase has less than `minMs` of frames or the
 * result is upside down.
 */
export function rangeFromFrames(
  lowPhaseMidis: readonly number[],
  highPhaseMidis: readonly number[],
  opts: RangeOptions = {},
): { low: number; high: number } | null {
  const frameMs = opts.frameMs ?? (1024 / 44100) * 1000;
  const need = Math.ceil((opts.minMs ?? 1000) / frameMs);
  const lo = lowPhaseMidis.filter(Number.isFinite);
  const hi = highPhaseMidis.filter(Number.isFinite);
  if (lo.length < need || hi.length < need) return null;
  const low = Math.round(percentile(lo, 5));
  const high = Math.round(percentile(hi, 95));
  if (high < low) return null;
  return { low, high };
}

/** Treble clef when the middle of the range is C4 (60) or higher, bass otherwise. */
export function clefForRange(low: number, high: number): Clef {
  return (low + high) / 2 >= 60 ? "treble" : "bass";
}

const NATURAL_LETTER: Record<number, string> = { 0: "C", 2: "D", 4: "E", 5: "F", 7: "G", 9: "A", 11: "B" };

/** Staff step (see staffMath: 0 = bottom line, 2 = next line…) of a natural MIDI note. */
function naturalStep(midi: number, clef: Clef): number {
  return staffStep(`${NATURAL_LETTER[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`, clef);
}

/**
 * Staff step for a continuous MIDI number, for drawing a line. Naturals land exactly on their step; a sharp or a
 * fraction sits linearly between the naturals on either side (C#4 is halfway between C4 and D4).
 */
export function staffStepFloat(midiFloat: number, clef: Clef): number {
  let lo = Math.floor(midiFloat);
  while (!(((lo % 12) + 12) % 12 in NATURAL_LETTER)) lo--;
  let hi = Math.ceil(midiFloat);
  while (!(((hi % 12) + 12) % 12 in NATURAL_LETTER)) hi++;
  const a = naturalStep(lo, clef);
  if (hi === lo) return a;
  return a + ((naturalStep(hi, clef) - a) * (midiFloat - lo)) / (hi - lo);
}
