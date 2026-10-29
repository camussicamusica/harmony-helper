import { describe, expect, test } from "bun:test";
import {
  accidentalPool,
  cardKey,
  deckPool,
  drawCards,
  levelDescription,
  matchMidi,
  naturalPool,
  type Card,
} from "../src/lib/games/noteDeck";

/** Deterministic rng (mulberry32). */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const names = (cs: Card[]) => cs.map((c) => c.spelled);

describe("levels", () => {
  test("level 1 per clef", () => {
    expect(names(naturalPool(1, "treble"))).toEqual(["C4", "D4", "E4"]);
    expect(names(naturalPool(1, "bass"))).toEqual(["F3", "G3", "A3"]);
  });
  test("levels are cumulative", () => {
    for (const clef of ["treble", "bass"] as const) {
      for (let lv = 2; lv <= 6; lv++) {
        const prev = names(naturalPool(lv - 1, clef));
        const cur = names(naturalPool(lv, clef));
        expect(cur.slice(0, prev.length)).toEqual(prev);
      }
    }
  });
  test("level 5 adds the ledger-line notes", () => {
    expect(names(naturalPool(5, "treble"))).toEqual(expect.arrayContaining(["A3", "B3", "A5", "B5", "C6"]));
    expect(names(naturalPool(5, "bass"))).toEqual(expect.arrayContaining(["C2", "D2", "E2", "D4", "E4"]));
  });
  test("accidentals exist only at level 6", () => {
    for (let lv = 1; lv <= 5; lv++) expect(accidentalPool(lv, "treble")).toEqual([]);
    const acc = names(accidentalPool(6, "treble"));
    expect(acc.length).toBeGreaterThan(10);
    expect(acc.every((s) => /[#b]/.test(s))).toBe(true);
    expect(acc).not.toContain("E#4");
    expect(acc).not.toContain("Fb4");
  });
  test("level 6 keeps the naturals", () => {
    expect(names(naturalPool(6, "bass"))).toEqual(names(naturalPool(5, "bass")));
  });
});

describe("drawCards", () => {
  test("draws the asked count (1 to 5)", () => {
    for (let n = 1; n <= 5; n++) expect(drawCards({ n, level: 3, clef: "treble", rng: seeded(n) })).toHaveLength(n);
  });
  test("no duplicates when the deck is big enough", () => {
    for (let s = 1; s <= 200; s++) {
      const cards = drawCards({ n: 5, level: 2 + (s % 5), clef: "treble", rng: seeded(s) });
      expect(new Set(cards.map(cardKey)).size).toBe(5);
    }
  });
  test("deck smaller than n: repeats allowed, never two equal in a row", () => {
    // level 1 treble has 3 cards; 5 asked
    for (let s = 1; s <= 200; s++) {
      const cards = drawCards({ n: 5, level: 1, clef: "treble", rng: seeded(s) });
      expect(cards).toHaveLength(5);
      for (let i = 1; i < cards.length; i++) expect(cardKey(cards[i])).not.toBe(cardKey(cards[i - 1]));
    }
  });
  test("cards come from the pool of the level and clef", () => {
    const pool = new Set(deckPool(2, "bass").map(cardKey));
    for (let s = 1; s <= 50; s++) {
      for (const c of drawCards({ n: 4, level: 2, clef: "bass", rng: seeded(s) })) expect(pool.has(cardKey(c))).toBe(true);
    }
  });
  test("accidentals only at level 6", () => {
    for (let s = 1; s <= 200; s++) {
      for (let lv = 1; lv <= 5; lv++) {
        expect(drawCards({ n: 5, level: lv, clef: "both", rng: seeded(s) }).some((c) => /[#b]/.test(c.spelled))).toBe(false);
      }
    }
    let any = false;
    for (let s = 1; s <= 50; s++) if (drawCards({ n: 5, level: 6, clef: "treble", rng: seeded(s) }).some((c) => /[#b]/.test(c.spelled))) any = true;
    expect(any).toBe(true);
  });
  test("level 6: about a third of the cards are altered", () => {
    let alt = 0;
    let total = 0;
    for (let s = 1; s <= 400; s++) {
      for (const c of drawCards({ n: 3, level: 6, clef: "treble", rng: seeded(s) })) {
        total++;
        if (/[#b]/.test(c.spelled)) alt++;
      }
    }
    expect(alt / total).toBeGreaterThan(0.25);
    expect(alt / total).toBeLessThan(0.42);
  });
  test('"Las dos" mixes both clefs', () => {
    const clefs = new Set<string>();
    for (let s = 1; s <= 30; s++) for (const c of drawCards({ n: 5, level: 3, clef: "both", rng: seeded(s) })) clefs.add(c.clef);
    expect(clefs.has("treble") && clefs.has("bass")).toBe(true);
  });
  test("a single clef never yields the other", () => {
    for (let s = 1; s <= 30; s++) {
      expect(drawCards({ n: 5, level: 4, clef: "bass", rng: seeded(s) }).every((c) => c.clef === "bass")).toBe(true);
    }
  });
  test("a new draw does not repeat the previous one exactly", () => {
    const first = drawCards({ n: 1, level: 1, clef: "treble", rng: seeded(7) });
    for (let s = 1; s <= 100; s++) {
      const next = drawCards({ n: 1, level: 1, clef: "treble", rng: seeded(s), previous: first });
      expect(cardKey(next[0])).not.toBe(cardKey(first[0]));
    }
  });
});

describe("matchMidi", () => {
  const d4: Card = { spelled: "D4", clef: "treble", midi: 62 };
  test("same note, same octave", () => {
    expect(matchMidi(d4, 62)).toEqual({ match: true, octave: true });
  });
  test("same pitch class, other octave", () => {
    expect(matchMidi(d4, 74)).toEqual({ match: true, octave: false });
    expect(matchMidi(d4, 50)).toEqual({ match: true, octave: false });
  });
  test("different pitch class", () => {
    expect(matchMidi(d4, 63)).toEqual({ match: false, octave: false });
  });
  test("enharmonic: Db matches the C# key", () => {
    const db4 = deckPool(6, "treble").find((c) => c.spelled === "Db4")!;
    expect(matchMidi(db4, 61)).toEqual({ match: true, octave: true });
    expect(matchMidi(db4, 73).match).toBe(true);
  });
});

describe("levelDescription", () => {
  test("follows the clef", () => {
    expect(levelDescription(1, "treble")).toBe("Do Re Mi");
    expect(levelDescription(1, "bass")).toBe("Fa Sol La");
    expect(levelDescription(1, "both")).toContain("Sol: Do Re Mi");
  });
});
