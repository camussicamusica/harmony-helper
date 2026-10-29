import { Note } from "tonal";
import type { Clef } from "@/lib/music/staffMath";

/** Mazo de notas: pools per level and clef, the draw, and the comparison with a MIDI key. Pure; the rng is injectable. */

export type ClefChoice = Clef | "both";
export type Rng = () => number;

export const LEVELS = [1, 2, 3, 4, 5, 6] as const;
export const MAX_LEVEL = 6;

/** Notes that each level ADDS (natural notes), per clef. Level 6 adds no new naturals: it adds the ♯ / ♭ of all of them. */
const ADDED: Record<Clef, readonly (readonly string[])[]> = {
  treble: [
    ["C4", "D4", "E4"],
    ["F4", "G4"],
    ["A4", "B4", "C5"],
    ["D5", "E5", "F5", "G5"],
    ["A3", "B3", "A5", "B5", "C6"], // ledger lines
    [],
  ],
  bass: [
    ["F3", "G3", "A3"],
    ["C3", "D3", "E3"],
    ["G2", "A2", "B2"],
    ["F2", "B3", "C4"],
    ["C2", "D2", "E2", "D4", "E4"], // ledger lines
    [],
  ],
};

/** Short description of what each level adds, for the select. Per clef, because the two decks grow differently. */
const LEVEL_NOTES: Record<Clef, Record<number, string>> = {
  treble: {
    1: "Do Re Mi",
    2: "+ Fa Sol",
    3: "+ La Si Do",
    4: "+ Re Mi Fa Sol agudos",
    5: "+ notas con líneas adicionales",
    6: "+ sostenidos y bemoles",
  },
  bass: {
    1: "Fa Sol La",
    2: "+ Do Re Mi",
    3: "+ Sol La Si graves",
    4: "+ Fa grave, Si y Do",
    5: "+ notas con líneas adicionales",
    6: "+ sostenidos y bemoles",
  },
};

export function levelDescription(level: number, clef: ClefChoice): string {
  if (clef === "both") {
    const [sol, fa] = [LEVEL_NOTES.treble[level], LEVEL_NOTES.bass[level]];
    return sol === fa ? sol : `Sol: ${sol} · Fa: ${fa}`;
  }
  return LEVEL_NOTES[clef][level] ?? "";
}

/** One card: the note as written on its staff. `spelled` has the octave ("Db4"). */
export interface Card {
  spelled: string;
  clef: Clef;
  midi: number;
}

const mk = (spelled: string, clef: Clef): Card => ({ spelled, clef, midi: Note.midi(spelled) as number });
export const cardKey = (c: Card) => `${c.clef}:${c.midi}`;

/** Natural notes up to `level` (cumulative). */
export function naturalPool(level: number, clef: Clef): Card[] {
  const lv = Math.max(1, Math.min(MAX_LEVEL, Math.round(level)));
  return ADDED[clef].slice(0, lv).flat().map((s) => mk(s, clef));
}

/** ♯ and ♭ of every natural of the level-5 pool (no E♯, B♯, F♭, C♭). Level 6 only. */
export function accidentalPool(level: number, clef: Clef): Card[] {
  if (level < MAX_LEVEL) return [];
  const out: Card[] = [];
  const seen = new Set<string>();
  for (const n of ADDED[clef].slice(0, 5).flat()) {
    const letter = n[0];
    const oct = n.slice(1);
    const cands = [`${letter}#${oct}`, `${letter}b${oct}`].filter((s) => {
      const pc = Note.pitchClass(s);
      return !["E#", "B#", "Fb", "Cb"].includes(pc);
    });
    for (const s of cands) {
      const c = mk(s, clef);
      // De-duplicated by spelling, not by pitch: C#4 and Db4 are different cards (a draw never holds both, see `used`).
      if (!seen.has(s)) {
        seen.add(s);
        out.push(c);
      }
    }
  }
  return out;
}

/** Every card of the level and clef choice (naturals + accidentals), without duplicate spellings. */
export function deckPool(level: number, clef: ClefChoice): Card[] {
  const clefs: Clef[] = clef === "both" ? ["treble", "bass"] : [clef];
  return clefs.flatMap((c) => [...naturalPool(level, c), ...accidentalPool(level, c)]);
}

/** At level 6 about this share of the cards carries an accidental. */
export const ACCIDENTAL_SHARE = 1 / 3;

const pick = <T,>(arr: readonly T[], rng: Rng): T => arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];

export interface DrawOptions {
  n: number;
  level: number;
  clef: ClefChoice;
  rng?: Rng;
  /** The previous draw: the new one will not repeat it exactly. */
  previous?: readonly Card[];
}

function drawOnce(n: number, level: number, clef: ClefChoice, rng: Rng): Card[] {
  const all = deckPool(level, clef);
  const unique = all.length >= n; // no repeats inside a draw when the deck is big enough
  const out: Card[] = [];
  const used = new Set<string>();
  for (let i = 0; i < n; i++) {
    const c: Clef = clef === "both" ? (rng() < 0.5 ? "treble" : "bass") : clef;
    const nat = naturalPool(level, c);
    const acc = accidentalPool(level, c);
    const wantAcc = acc.length > 0 && rng() < ACCIDENTAL_SHARE;
    const last = out[i - 1] ? cardKey(out[i - 1]) : null;
    const free = (list: readonly Card[]) =>
      list.filter((x) => cardKey(x) !== last && (!unique || !used.has(cardKey(x))));
    // The wanted kind of this clef, then the other kind, then anything in the deck, then (deck exhausted) anything but the last.
    let cands = free(wantAcc ? acc : nat);
    if (!cands.length) cands = free(wantAcc ? nat : acc);
    if (!cands.length) cands = free(all);
    if (!cands.length) cands = all.filter((x) => cardKey(x) !== last);
    const card = pick(cands, rng);
    used.add(cardKey(card));
    out.push(card);
  }
  return out;
}

const sameDraw = (a: readonly Card[], b: readonly Card[]) =>
  a.length === b.length && a.every((c, i) => cardKey(c) === cardKey(b[i]));

/**
 * Draws `n` cards (1 to 5). No repeats inside a draw when the deck has at least `n` cards; otherwise repeats are
 * allowed but never two equal in a row. "both" picks the clef of each card at random. A new draw tries not to equal `previous`.
 */
export function drawCards({ n, level, clef, rng = Math.random, previous }: DrawOptions): Card[] {
  const count = Math.max(1, Math.min(5, Math.round(n)));
  let cards = drawOnce(count, level, clef, rng);
  for (let t = 0; previous && sameDraw(cards, previous) && t < 20; t++) cards = drawOnce(count, level, clef, rng);
  return cards;
}

export interface MidiMatch {
  /** Same pitch class (any octave; Db = C#). */
  match: boolean;
  /** Same pitch class AND same octave as written. */
  octave: boolean;
}

/** Compares a MIDI key with a card by pitch class; `octave` says whether the octave was right too. */
export function matchMidi(card: Pick<Card, "midi">, midi: number): MidiMatch {
  const diff = midi - card.midi;
  const match = diff % 12 === 0;
  return { match, octave: diff === 0 };
}

/** "Re (D)" style label of a card, without the octave. */
export function cardPitchClass(card: Pick<Card, "spelled">): string {
  return Note.pitchClass(card.spelled);
}
