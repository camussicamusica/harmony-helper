import { summarizeTranspose } from "@/lib/music/transpose";

/**
 * The instrument a score is studied on. Configuration, not scattered ifs: the rest of the app asks this object
 * (does it have a keyboard, hands, a transpose) instead of comparing ids. Piano is the default and changes nothing.
 */
export type InstrumentId = "piano" | "trumpet-bb";

export interface Instrument {
  id: InstrumentId;
  label: string;
  /** Chromatic transpose of its written music (B♭ trumpet = -2). 0 = sounds as written. */
  transposeSemitones: number;
  /** Comfortable written range (MIDI), or null when the instrument has no notion of one here. */
  range: { low: number; high: number } | null;
  /** On-screen piano keyboard and MIDI keyboard control. */
  hasKeyboard: boolean;
  /** Right / left hand controls. */
  hasHands: boolean;
  /** Valve diagram that follows the notes. */
  hasPistons: boolean;
}

export const PIANO: Instrument = {
  id: "piano",
  label: "Piano",
  transposeSemitones: 0,
  range: null,
  hasKeyboard: true,
  hasHands: true,
  hasPistons: false,
};

export const TRUMPET_BB: Instrument = {
  id: "trumpet-bb",
  label: "Trompeta en Si♭",
  transposeSemitones: -2,
  range: { low: 54, high: 84 }, // written F♯3–C6
  hasKeyboard: false,
  hasHands: false,
  hasPistons: true,
};

export const INSTRUMENTS: readonly Instrument[] = [PIANO, TRUMPET_BB];

export function getInstrument(id: InstrumentId): Instrument {
  return INSTRUMENTS.find((i) => i.id === id) ?? PIANO;
}

export function parseInstrumentId(v: unknown): InstrumentId | null {
  return v === "piano" || v === "trumpet-bb" ? v : null;
}

/**
 * Transpose each part of a score will have under the chosen instrument. The selector wins over the file where the
 * file cannot be trusted: a transposing instrument on a score with no transpose (Audiveris writes none) or one
 * shared transpose gets its own on every part, never doubled. A mixed score (an orchestra) keeps what the file says,
 * and so does a non-transposing instrument: a trumpet part stays correct when the piano is chosen.
 */
export function resolveTranspose(instrument: Instrument, fileParts: readonly number[]): number[] {
  const parts = fileParts.map((p) => (Number.isFinite(p) ? Math.round(p) : 0));
  if (!instrument.transposeSemitones) return parts;
  const kind = summarizeTranspose(parts).kind;
  return kind === "mixed" ? parts : parts.map(() => instrument.transposeSemitones);
}

/** Minimal shape of an OSMD sheet this module touches. */
interface SheetLike {
  Instruments?: Array<{ PlaybackTranspose?: number; _fileTranspose?: number }>;
}

/**
 * Writes the resolved transpose into the sheet's instruments, so parsing, analysis and colors read it as if the
 * file said so. The file's own value is kept aside, so switching instrument back and forth never compounds.
 */
export function applyInstrumentToSheet(sheet: SheetLike | null | undefined, instrument: Instrument): void {
  const insts = sheet?.Instruments;
  if (!insts?.length) return;
  for (const i of insts) i._fileTranspose ??= typeof i.PlaybackTranspose === "number" && Number.isFinite(i.PlaybackTranspose) ? i.PlaybackTranspose : 0;
  const resolved = resolveTranspose(instrument, insts.map((i) => i._fileTranspose ?? 0));
  insts.forEach((i, k) => {
    i.PlaybackTranspose = resolved[k];
  });
}

export interface ScoreInstrumentScan {
  /** part-name of each part, "" when it has none. */
  names: string[];
  /** First <chromatic> of each part, 0 when it has none. */
  transposes: number[];
}

/** Reads names and transposes straight from the MusicXML text, so the instrument can be guessed before OSMD loads it. */
export function scanScoreInstruments(xml: string): ScoreInstrumentScan {
  const names: string[] = [];
  for (const m of xml.matchAll(/<score-part\b[^>]*>([\s\S]*?)<\/score-part>/g)) {
    const n = /<part-name\b[^>]*>([^<]*)<\/part-name>/.exec(m[1]);
    names.push(n ? n[1].trim() : "");
  }
  const transposes: number[] = [];
  for (const m of xml.matchAll(/<part\s[^>]*>([\s\S]*?)<\/part>/g)) {
    const t = /<transpose\b[^>]*>[\s\S]*?<chromatic>\s*(-?\d+)/.exec(m[1]);
    transposes.push(t ? Number(t[1]) : 0);
  }
  return { names, transposes };
}

const TRUMPET_NAME = /trump|tromp|cornet/i;
const NOT_B_FLAT = /\bin\s*c\b/i;

/** A guess from the file alone: B♭ trumpet when every part is a uniform -2 or is named like a trumpet; else null (no opinion). */
export function guessInstrument(scan: ScoreInstrumentScan): InstrumentId | null {
  const info = summarizeTranspose(scan.transposes);
  if (info.kind === "uniform" && info.semitones === TRUMPET_BB.transposeSemitones) return TRUMPET_BB.id;
  if (info.kind === "mixed") return null;
  if (scan.names.length && scan.names.every((n) => TRUMPET_NAME.test(n) && !NOT_B_FLAT.test(n))) return TRUMPET_BB.id;
  return null;
}

/** Her saved choice for this score, else the file's guess, else the last one she used (piano the first time). */
export function pickInstrumentId(saved: InstrumentId | undefined | null, guess: InstrumentId | null, fallback: InstrumentId): InstrumentId {
  return saved ?? guess ?? fallback;
}
