import { useMemo } from "react";
import { MiniStaff, type MiniStaffNote } from "@/components/music/MiniStaff";
import { ChordNoteChips } from "@/components/analysis/ChordNoteChips";
import { ScaleInKey } from "./ScaleInKey";
import { useColors } from "@/lib/colors/store";
import { spelledPc } from "@/lib/colors/noteChip";
import { playChordMidi, playNoteMidi, playSequence } from "@/lib/music/analysis/audio";
import { buildKeyScaleView, headFill } from "@/lib/music/analysis/scaleView";
import { keyPlayMidis, type KeySigView } from "@/lib/music/analysis/keySignature";

/** Section title in the card's small-caps style. */
function Sec({ title, children, testId }: { title: string; children: React.ReactNode; testId: string }) {
  return (
    <section className="mt-2 first:mt-0" data-testid={testId}>
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </section>
  );
}

const btn =
  "rounded border border-border bg-background px-1.5 py-0.5 text-[11px] font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Panel of the key signature: the glyphs on a staff in her colors, which key, the scale, tricks and play buttons. */
export function KeyPanel({ view }: { view: KeySigView }) {
  const { palette } = useColors();
  const none = view.accidentals.length === 0;
  const play = useMemo(() => keyPlayMidis(view.key, view.accidentals), [view]);
  const glyphs = useMemo<MiniStaffNote[]>(
    () =>
      view.accidentals.map((n, i) => {
        const letter = n[0];
        const acc = n.slice(1);
        const step = view.steps[i];
        // The note name only needs to land on the right step: pick the octave from the step.
        const base = view.clef === "treble" ? 4 * 7 + 2 : 2 * 7 + 4;
        const dia = base + step;
        const oct = Math.floor(dia / 7);
        return {
          spelled: `${letter}${acc}${oct}`,
          col: i,
          glyphOnly: true,
          fill: headFill(spelledPc(n), palette.roles),
          ariaLabel: `Tocar ${n}`,
          onClick: () => void playNoteMidi(play.altered.find((a) => a.name === n)?.midi ?? 60),
        };
      }),
    [view, palette.roles, play],
  );
  const scale = useMemo(() => buildKeyScaleView(view.key, view.clef, view.accidentals), [view]);

  return (
    <div data-testid="key-panel">
      <Sec title="Armadura" testId="key-armadura">
        <MiniStaff
          notes={glyphs}
          clef={view.clef}
          columns={7}
          width={150}
          height={64}
          ariaLabel={`Armadura: ${view.accidentals.length ? view.accidentals.join(", ") : "sin alteraciones"}`}
        />
        {none ? (
          <div className="mt-1 text-[11px] text-muted-foreground">Sin alteraciones.</div>
        ) : (
          <ChordNoteChips
            className="mt-1"
            spelled={view.accidentals}
            onNoteClick={(n) => void playNoteMidi(play.altered.find((a) => a.name === n)?.midi ?? 60)}
          />
        )}
      </Sec>

      <Sec title="Qué tonalidad" testId="key-which">
        <div className="text-[11px] font-medium">{view.which}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{view.detected}</div>
      </Sec>

      <Sec title="Escala" testId="key-scale">
        <ScaleInKey view={scale} />
      </Sec>

      <Sec title="Trucos" testId="key-tricks">
        <div className="text-[11px]">{view.trick}</div>
        <div className="mt-1 text-[10px] text-muted-foreground">{view.order.title}</div>
        <div className="flex flex-wrap gap-1" data-testid="key-order">
          {view.order.names.map((n, i) => (
            <span
              key={n}
              data-in-use={view.order.inUse[i] ? "1" : "0"}
              className={`rounded px-1 text-[11px] ${view.order.inUse[i] ? "bg-foreground font-bold text-background" : "text-muted-foreground"}`}
            >
              {n}
            </span>
          ))}
        </div>
      </Sec>

      <div className="mt-2 flex flex-wrap gap-1" data-testid="key-play">
        <button type="button" className={btn} onClick={() => void playSequence(play.scale, 0.45)} aria-label={`Tocar la escala de ${view.key.label}`}>
          ▶ Escala
        </button>
        <button type="button" className={btn} onClick={() => void playChordMidi(play.chord)} aria-label={`Tocar el acorde de ${view.key.label}`}>
          ▶ Acorde de tónica
        </button>
      </div>
    </div>
  );
}
