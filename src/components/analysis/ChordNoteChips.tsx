import { noteChipStyle, spelledPc } from "@/lib/colors/noteChip";
import { useColors } from "@/lib/colors/store";
import { noteLabel, solfegeName } from "@/lib/music/naming";

interface Props {
  /** Spelled notes ("D", "F#", "A", "C"), in the order to show. */
  spelled: readonly string[];
  /** "full" = "Re (D)"; "short" = "Re" (small spaces). */
  label?: "full" | "short";
  className?: string;
  /** Index in `spelled` of the note she is on: drawn with a thicker ring and bold. */
  ownIndex?: number;
  /** "lg" = the big chip of the note itself. */
  size?: "sm" | "lg";
}

/** One chip per chord tone, painted with HER note color (neutral when that note's color is off). */
export function ChordNoteChips({ spelled, label = "full", className = "", ownIndex, size = "sm" }: Props) {
  const { palette } = useColors(); // repaint when she changes a note color
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`} data-testid="chord-chips">
      {spelled.map((n, i) => {
        const st = noteChipStyle(spelledPc(n), palette.roles);
        return (
          <span
            key={`${n}-${i}`}
            data-note={n}
            data-neutral={st.neutral ? "1" : "0"}
            data-own={i === ownIndex ? "1" : "0"}
            className={`rounded-md ${size === "lg" ? "px-2.5 py-1 text-sm leading-5" : "px-1.5 py-0.5 text-[11px] leading-4"} ${i === ownIndex ? "font-extrabold" : "font-semibold"}`}
            style={
              i === ownIndex
                ? { background: st.background, color: st.color, border: `1.5px solid ${st.border}`, boxShadow: "0 0 0 2px #111827" }
                : { background: st.background, color: st.color, border: `1.5px solid ${st.border}` }
            }
          >
            {label === "full" ? noteLabel(n) : solfegeName(n)}
          </span>
        );
      })}
    </span>
  );
}
