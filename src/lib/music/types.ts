export type Hand = "RH" | "LH";

export type IsolationMode = "both" | "rh" | "lh";

export interface ScheduledNote {
  id: string;
  midi: number;
  noteName: string;
  startSec: number;
  durationSec: number;
  hand: Hand;
  /** SVG <g> elements for the notehead(s) of this note in the rendered score. */
  svgEls?: SVGGElement[];
  /** SVG elements for the accidental glyph(s) attached to this note, if any. */
  accidentalEls?: SVGElement[];
}
