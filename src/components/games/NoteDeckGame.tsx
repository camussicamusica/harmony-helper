import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useColors } from "@/lib/colors/store";
import { drawCards, levelDescription, LEVELS, matchMidi, type Card, type ClefChoice } from "@/lib/games/noteDeck";
import { subscribe } from "@/lib/midi/input";
import { noteReadout } from "@/lib/midi/readout";
import { playNoteMidi } from "@/lib/music/analysis/audio";
import { NoteCard } from "./NoteCard";

const COUNTS = [1, 2, 3, 4, 5];
const CLEFS: { id: ClefChoice; label: string }[] = [
  { id: "treble", label: "Sol" },
  { id: "bass", label: "Fa" },
  { id: "both", label: "Las dos" },
];

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1 rounded-md border border-border p-0.5">
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded px-3 py-1 text-xs transition-colors ${
            value === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Mazo de notas: flip cards by clicking, or play the note on the MIDI keyboard. No points, no streaks, no red. */
export function NoteDeckGame() {
  const { palette } = useColors();
  const [count, setCount] = useState(3);
  const [clef, setClef] = useState<ClefChoice>("treble");
  const [level, setLevel] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const [readout, setReadout] = useState("");
  const cardsRef = useRef<Card[]>([]);
  const flippedRef = useRef<boolean[]>([]);

  const deal = useCallback(
    (previous?: Card[]) => {
      const next = drawCards({ n: count, level, clef, previous });
      cardsRef.current = next;
      flippedRef.current = next.map(() => false);
      setCards(next);
      setFlipped(flippedRef.current);
      setReadout("");
    },
    [count, level, clef],
  );

  // Draw after mount (never during render: the server and the browser would draw different cards) and again whenever a setting changes.
  useEffect(() => {
    deal();
  }, [deal]);

  const setFlippedAt = (i: number) => {
    flippedRef.current = flippedRef.current.map((f, j) => f || j === i);
    setFlipped(flippedRef.current);
  };

  const flipByClick = (i: number) => {
    setFlippedAt(i);
    setReadout("");
    void playNoteMidi(cardsRef.current[i].midi).catch(() => {});
  };

  const flipAll = () => {
    flippedRef.current = flippedRef.current.map(() => true);
    setFlipped(flippedRef.current);
    setReadout("");
  };

  // A key on the MIDI keyboard turns the first face-down card (left to right) if its pitch class matches. The keyboard makes its own sound.
  useEffect(() => {
    return subscribe((e) => {
      if (e.type !== "on") return;
      const i = flippedRef.current.findIndex((f) => !f);
      if (i < 0) return;
      const m = matchMidi(cardsRef.current[i], e.midi);
      if (!m.match) {
        setReadout(`Tocaste ${noteReadout(e.midi).split(" · ")[0]}`);
        return;
      }
      setFlippedAt(i);
      setReadout(m.octave ? "" : "en otra octava");
    });
  }, []);

  const allUp = flipped.length > 0 && flipped.every(Boolean);

  return (
    <section aria-label="Mazo de notas" className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Cartas</span>
          <Segmented label="Cantidad de cartas" value={count} onChange={setCount} options={COUNTS.map((n) => ({ id: n, label: String(n) }))} />
        </div>
        <div className="flex items-center gap-2">
          <span>Clave</span>
          <Segmented label="Clave" value={clef} onChange={setClef} options={CLEFS} />
        </div>
        <div className="flex items-center gap-2">
          <span>Nivel</span>
          <Select value={String(level)} onValueChange={(v) => setLevel(Number(v))}>
            <SelectTrigger className="h-8 w-[72px] text-xs" aria-label="Nivel" data-testid="level-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={String(l)}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span data-testid="level-description">{levelDescription(level, clef)}</span>
        </div>
      </div>

      <div className="flex min-h-[150px] flex-wrap gap-3" data-testid="note-deck">
        {cards.map((c, i) => (
          <NoteCard
            key={`${c.clef}-${c.spelled}-${i}`}
            card={c}
            flipped={flipped[i] ?? false}
            roles={palette.roles}
            onFlip={() => flipByClick(i)}
          />
        ))}
      </div>

      <p className="min-h-[1.25rem] text-xs text-muted-foreground" data-testid="midi-readout" aria-live="polite">
        {readout}
      </p>

      <p className="text-xs text-muted-foreground">Clic en una carta = se da vuelta y suena. O tocá la nota en el teclado MIDI.</p>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => deal(cardsRef.current)}>
          Sacar de nuevo
        </Button>
        <Button size="sm" variant="outline" onClick={flipAll} disabled={allUp}>
          Dar vuelta todas
        </Button>
      </div>
    </section>
  );
}
