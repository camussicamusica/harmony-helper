import { MiniStaff } from "@/components/music/MiniStaff";
import { noteChipStyle, spelledPc } from "@/lib/colors/noteChip";
import { noteLabel } from "@/lib/music/naming";
import { cardPitchClass, type Card } from "@/lib/games/noteDeck";

interface Props {
  card: Card;
  flipped: boolean;
  /** Roles of her current palette (read only). */
  roles: readonly { id: string; color: string; enabled?: boolean }[];
  onFlip: () => void;
}

/**
 * One flash card, about 120 x 150. Face down: the note on its staff in black ink. Face up: the head takes her color for
 * that note and a pill with its name appears. Quiet by design: grey border, no right or wrong colors.
 */
export function NoteCard({ card, flipped, roles, onFlip }: Props) {
  const pc = cardPitchClass(card);
  const name = noteLabel(pc);
  const chip = noteChipStyle(spelledPc(card.spelled), roles);
  return (
    <button
      type="button"
      onClick={onFlip}
      data-testid="note-card"
      data-flipped={flipped ? "1" : "0"}
      data-note={card.spelled}
      data-clef={card.clef}
      aria-label={flipped ? `${name}, carta dada vuelta` : "Carta boca abajo: tocá para dar vuelta"}
      className="flex h-[150px] w-[120px] flex-col items-center rounded-lg border border-border bg-card px-1 pb-1 pt-2 text-foreground transition-colors hover:border-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
    >
      {/* The pill's row is always reserved, so a card does not jump when it flips. */}
      <span className="flex h-7 items-center">
        {flipped && (
          <span
            data-testid="note-card-name"
            className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
            style={{ background: chip.background, color: chip.color, borderColor: chip.border }}
          >
            {name}
          </span>
        )}
      </span>
      {/* Drawn small and scaled up by CSS: MiniStaff caps its step size, so a bigger box alone only adds white below. */}
      <span className="flex flex-1 items-center">
        <MiniStaff
          notes={[{ spelled: card.spelled, fill: flipped && !chip.neutral ? chip.background : undefined }]}
          clef={card.clef}
          width={70}
          height={64}
          className="w-[108px]"
          ariaLabel={flipped ? name : "Pentagrama con una nota"}
        />
      </span>
    </button>
  );
}
