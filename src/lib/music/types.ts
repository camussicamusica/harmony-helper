export type Hand = "RH" | "LH";

export type IsolationMode = "both" | "rh" | "lh";

export interface ScheduledNote {
  id: string;
  midi: number;
  noteName: string;
  startSec: number;
  durationSec: number;
  hand: Hand;
  /** Measure number as printed in the score. */
  measure: number;
  /** Spanish duration name, e.g. "negra con puntillo". */
  durationName: string;
  /** Letter + accidental following the score's spelling, ASCII: "D", "F#", "Db". */
  spelledName: string;
  /** True when this note is the end of a slur. */
  slurEnd?: boolean;
  /** True when this note only continues a tie (same pitch as the note before). */
  tieContinuation?: boolean;
  /** Index of the music system (line of the page) the note sits on. */
  system?: number;
  /** OSMD voice id inside its staff (the bass line and the chord of one hand are different voices). */
  voice?: number;
  /** True when a rest (silence) precedes this note in its hand's melodic line. Set by markPhrases. */
  isRestBefore?: boolean;
  /** Notehead center in px, relative to the score wrapper. Set after render. */
  cx?: number;
  cy?: number;
  /** SVG <g> elements for the notehead(s) of this note in the rendered score. */
  svgEls?: SVGGElement[];
  /** Beat within the measure (1-based, whole beats), when the score gives it. */
  beat?: number;
  /** The round notehead <path> of this note alone (a chord mate has its own). Set after render. */
  headEl?: SVGElement;
  /** SVG elements for the accidental glyph(s) attached to this note, if any. */
  accidentalEls?: SVGElement[];
}

export type ScoreView = "tocar" | "estudiar";
