/** Things the analysis needs from OSMD's source model (not from the rendered SVG). */
export interface MeasureSpan {
  number: number;
  startSec: number;
  endSec: number;
}

export interface ScoreMeta {
  /** Key signature in sharps (+) / flats (-), if the score has one. */
  fifths: number | null;
  /** Every key signature in the piece (the first one and any later change), in score order. */
  keyChanges?: Array<{ measure: number; fifths: number }>;
  /** Time signature of the first measure. */
  timeSig: { beats: number; beatType: number } | null;
  measures: MeasureSpan[];
}

export const EMPTY_META: ScoreMeta = { fifths: null, timeSig: null, measures: [] };

/** Read key signature, time signature and measure spans from a loaded OSMD. Defensive: never throws. */
export function readScoreMeta(osmd: any, bpm: number): ScoreMeta {
  try {
    const sheet = osmd?.Sheet ?? osmd?.sheet;
    const sm: any[] = sheet?.SourceMeasures ?? [];
    if (!sm.length) return EMPTY_META;
    const secPerWhole = (60 / bpm) * 4;

    let fifths: number | null = null;
    for (const se of sm[0].FirstInstructionsStaffEntries ?? []) {
      for (const ins of se?.Instructions ?? []) {
        // Duck-typed KeyInstruction (class names do not survive minification).
        if (typeof ins?.Key === "number" && ins.AlteratedNotes !== undefined) {
          fifths = ins.Key;
          break;
        }
      }
      if (fifths !== null) break;
    }

    const keyChanges: Array<{ measure: number; fifths: number }> = [];
    sm.forEach((m, i) => {
      for (const se of m.FirstInstructionsStaffEntries ?? []) {
        const ins = (se?.Instructions ?? []).find((x: any) => typeof x?.Key === "number" && x.AlteratedNotes !== undefined);
        if (ins) {
          const measure = m.MeasureNumber ?? i + 1;
          if (keyChanges[keyChanges.length - 1]?.measure !== measure) keyChanges.push({ measure, fifths: ins.Key });
          break;
        }
      }
    });

    const ts = sm[0].ActiveTimeSignature;
    const timeSig =
      ts && ts.Numerator > 0 && ts.Denominator > 0 ? { beats: ts.Numerator as number, beatType: ts.Denominator as number } : null;

    const measures: MeasureSpan[] = sm.map((m, i) => {
      const start = (m.AbsoluteTimestamp?.RealValue ?? 0) * secPerWhole;
      const dur = (m.Duration?.RealValue ?? m.ActiveTimeSignature?.RealValue ?? 0) * secPerWhole;
      return { number: m.MeasureNumber ?? i + 1, startSec: start, endSec: start + dur };
    });
    return { fifths, keyChanges, timeSig, measures };
  } catch {
    return EMPTY_META;
  }
}
