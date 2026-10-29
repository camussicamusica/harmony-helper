import type { Valves } from "@/lib/trumpet/fingerings";

interface Props {
  /** Which pistons are down; null = none lit (no note, or one the trumpet does not have). */
  valves: Valves | null;
  /** Fill of a pressed piston: the note's own color. */
  color: string;
  /** Register band 0 (pedal) to 4 (very high) for the small grey bar; null = none lit. */
  band: 0 | 1 | 2 | 3 | 4 | null;
  /** Piston numbers under the drawing. */
  numbers?: boolean;
  className?: string;
  label?: string;
}

const XS = [45, 105, 165]; // piston 1 is the one nearest the mouthpiece (left)
const DOWN = 22;

/**
 * Three pistons, calm: a pressed piston takes the note's color, the rest stay grey, and a small grey bar at the right
 * says which register the note is in. Pure drawing; the caller decides the note.
 */
export function PistonsDrawing({ valves, color, band, numbers = true, className, label = "Pistones de la trompeta" }: Props) {
  return (
    <svg viewBox="0 0 220 150" className={className} role="img" aria-label={label} data-testid="pistons-drawing">
      {XS.map((x, i) => {
        const on = !!valves?.[i];
        return (
          <g key={i} data-piston={i + 1} data-down={on ? "1" : "0"}>
            <rect x={x - 19} y={64} width={38} height={62} rx={7} fill="var(--color-muted)" stroke="var(--color-border)" />
            <g style={{ transform: `translateY(${on ? DOWN : 0}px)`, transition: "transform 90ms ease-out" }} className="motion-reduce:!transition-none">
              <rect x={x - 4} y={22} width={8} height={50} rx={2} fill="var(--color-muted-foreground)" opacity={0.5} />
              <rect
                x={x - 16}
                y={8}
                width={32}
                height={16}
                rx={6}
                fill={on ? color : "var(--color-muted-foreground)"}
                opacity={on ? 1 : 0.4}
                style={{ transition: "fill 120ms" }}
              />
            </g>
            {numbers && (
              <text x={x} y={144} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--color-muted-foreground)">
                {i + 1}
              </text>
            )}
          </g>
        );
      })}
      <g aria-hidden>
        {[4, 3, 2, 1, 0].map((b, k) => (
          <rect key={b} x={205} y={22 + k * 20} width={8} height={16} rx={2} fill="var(--color-muted-foreground)" opacity={band === b ? 0.75 : 0.16} />
        ))}
      </g>
    </svg>
  );
}
