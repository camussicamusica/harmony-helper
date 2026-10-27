import { useMemo } from "react";
import { MiniStaff, type MiniStaffNote } from "@/components/music/MiniStaff";
import { useColors } from "@/lib/colors/store";
import { playNoteMidi } from "@/lib/music/analysis/audio";
import { headFill, type ScaleView } from "@/lib/music/analysis/scaleView";
import { noteLabel } from "@/lib/music/naming";

const FADED = 0.35;

/** The whole scale of the piece's key on a small staff: her colors, the opened note ringed, the song's notes in full color. */
export function ScaleInKey({ view }: { view: ScaleView }) {
  const { palette } = useColors();
  const notes = useMemo(() => {
    const out: MiniStaffNote[] = [];
    const extra = view.extra;
    let col = 0;
    view.steps.forEach((s, i) => {
      const name = s.spelled.replace(/-?\d+$/, "");
      out.push({
        spelled: s.spelled,
        col,
        fill: headFill(s.pc, palette.roles),
        ring: s.hovered,
        size: s.hovered ? 1.2 : 1,
        opacity: s.used || s.hovered ? 1 : FADED,
        label: s.hovered ? `${s.degree}.º` : String(s.degree),
        labelBold: s.hovered,
        ariaLabel: `Tocar ${noteLabel(name)}, grado ${s.degree}${s.hovered ? " (la nota que abriste)" : ""}${s.used ? ", suena en este pasaje" : ""}`,
        onClick: () => void playNoteMidi(s.midi),
      });
      col++;
      if (extra && extra.afterIndex === i) {
        out.push({
          spelled: extra.spelled,
          col,
          fill: headFill(extra.pc, palette.roles),
          ring: true,
          dashed: true,
          size: 1.2,
          accidental: extra.accidental,
          label: "alt.",
          labelBold: true,
          ariaLabel: `Tocar ${noteLabel(extra.spelled.replace(/-?\d+$/, ""))}, ${extra.text}`,
          onClick: () => void playNoteMidi(extra.midi),
        });
        col++;
      }
    });
    return out;
  }, [view, palette.roles]);

  return (
    <div className="mt-1" data-testid="tip-scale">
      <MiniStaff
        notes={notes}
        clef={view.clef}
        columns={notes.length}
        ariaLabel={`Escala de ${view.keyLabel} en clave de ${view.clef === "treble" ? "sol" : "fa"}`}
      />
      <div className="mt-0.5 text-[10px] leading-3 text-muted-foreground" data-testid="tip-scale-legend">
        {view.legend}
      </div>
      {view.extra && (
        <div className="text-[10px] font-medium leading-3" data-testid="tip-scale-extra">
          {view.extra.text}
        </div>
      )}
      {view.note && (
        <div className="text-[10px] font-medium leading-3" data-testid="tip-scale-note">
          {view.note}
        </div>
      )}
    </div>
  );
}
