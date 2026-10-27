import { accidentalGlyph, ledgerSteps, parseSpelled, staffStep, type Accidental, type Clef } from "@/lib/music/staffMath";

/** One notehead of a MiniStaff. */
export interface MiniStaffNote {
  /** Spelled with octave: "C#5", "Bb3". */
  spelled: string;
  /** Column (0-based, may be fractional). Default: its index in `notes`. */
  col?: number;
  /** Notehead fill. Default: black. */
  fill?: string;
  /** Ring around the head (the note she is on). */
  ring?: boolean;
  /** Draw the ring dashed (an altered note that is not part of the scale). */
  dashed?: boolean;
  /** Head size factor (1 = normal). */
  size?: number;
  /** 0..1, default 1. */
  opacity?: number;
  /** Tiny text under the note. */
  label?: string;
  labelBold?: boolean;
  /** Overrides the accidental drawn before the head: "n" = natural sign, "" = none. Default: the spelling's own. */
  accidental?: Accidental | "n";
  /** Accessible name; with onClick the head is a button. */
  ariaLabel?: string;
  onClick?: () => void;
  /** Draw only the accidental (a key-signature glyph on its line), no notehead. */
  glyphOnly?: boolean;
}

export interface MiniStaffProps {
  notes: readonly MiniStaffNote[];
  clef: Clef;
  /** Pixels. Defaults fit the hover panel. */
  width?: number;
  height?: number;
  /** Total number of columns (default: one per note). Lets the caller leave room for extra heads. */
  columns?: number;
  ariaLabel?: string;
  className?: string;
}

const INK = "#111111";
const CLEF_W = 24;
const LABEL_H = 17;

/**
 * A tiny staff drawn as plain SVG (no OSMD): 5 lines, a clef, ledger lines and ovals at their staff positions.
 * Accidentals are written per note (a sharp or flat before the head), not as a key signature: every note says
 * what it is on its own, which reads better for a scale or a chord card. Steps come from `staffStep` (staffMath.ts).
 */
export function MiniStaff({ notes, clef, width = 240, height = 70, columns, ariaLabel, className }: MiniStaffProps) {
  const steps = notes.map((n) => staffStep(n.spelled, clef));
  const finite = steps.filter(Number.isFinite);
  const topStep = Math.max(10, ...finite.map((s) => s + 1));
  const bottomStep = Math.min(-3, ...finite.map((s) => s - 1));
  const padTop = 2;
  const h = Math.min(3, (height - LABEL_H - padTop) / (topStep - bottomStep)); // px per step (half a space)
  const yOf = (step: number) => padTop + (topStep - step) * h;
  const nCols = columns ?? notes.length;
  const colW = (width - CLEF_W - 6) / Math.max(1, nCols);
  const xOf = (col: number) => CLEF_W + 6 + (col + 0.5) * colW;
  const rx = h * 1.4;
  const ry = h * 1.02;
  const labelY = height - 4;

  const clefStyle = clef === "treble" ? { glyph: "𝄞", size: h * 17.5, y: yOf(-1.5) } : { glyph: "𝄢", size: h * 9.5, y: yOf(2.1) };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{ maxWidth: "100%", height: "auto", display: "block" }}
      role="group"
      aria-label={ariaLabel ?? "Pentagrama"}
      className={className}
      data-testid="mini-staff"
      data-clef={clef}
    >
      <rect x={0} y={0} width={width} height={height} rx={4} fill="#ffffff" />
      {[0, 2, 4, 6, 8].map((s) => (
        <line key={s} x1={2} x2={width - 2} y1={yOf(s)} y2={yOf(s)} stroke={INK} strokeWidth={0.7} opacity={0.75} />
      ))}
      <text
        x={4}
        y={clefStyle.y}
        fontSize={clefStyle.size}
        fill={INK}
        aria-hidden
        style={{ fontFamily: '"Noto Music","Bravura Text","Apple Symbols","Segoe UI Symbol",serif' }}
        data-testid="mini-staff-clef"
      >
        {clefStyle.glyph}
      </text>
      {notes.map((n, i) => {
        const step = steps[i];
        if (!Number.isFinite(step)) return null;
        const col = n.col ?? i;
        const x = xOf(col);
        const y = yOf(step);
        const k = n.size ?? 1;
        const parsed = parseSpelled(n.spelled);
        const acc = n.accidental ?? parsed?.accidental ?? "";
        const interactive = !!n.onClick;
        const op = n.opacity ?? 1;
        if (n.glyphOnly) {
          return (
            <text
              onClick={n.onClick ? () => n.onClick!() : undefined}
              style={n.onClick ? { cursor: "pointer" } : undefined}
              role={n.onClick ? "button" : undefined}
              aria-label={n.onClick ? n.ariaLabel : undefined}
              key={`${n.spelled}-${i}`}
              x={x}
              y={y + h * 1.0}
              fontSize={h * 7.5}
              textAnchor="middle"
              fill={n.fill ?? INK}
              stroke={INK}
              strokeWidth={0.5}
              paintOrder="stroke"
              opacity={op}
              aria-hidden
              data-testid="mini-staff-keyglyph"
              data-note={n.spelled}
              data-fill={n.fill ?? INK}
            >
              {accidentalGlyph(acc)}
            </text>
          );
        }
        return (
          <g
            key={`${n.spelled}-${i}`}
            className={interactive ? "group cursor-pointer outline-none" : undefined}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={n.ariaLabel}
            onClick={n.onClick ? () => n.onClick!() : undefined}
            onKeyDown={
              n.onClick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      n.onClick!();
                    }
                  }
                : undefined
            }
            data-note={n.spelled}
            data-fill={n.fill ?? INK}
            data-ring={n.ring ? "1" : "0"}
            data-opacity={op}
          >
            {interactive && (
              <rect
                x={x - colW / 2}
                y={yOf(topStep) }
                width={colW}
                height={height - 2}
                rx={3}
                fill="#111827"
                className="opacity-0 transition-opacity group-hover:opacity-[0.09] group-focus-visible:opacity-[0.12]"
              />
            )}
            {ledgerSteps(step).map((ls) => (
              <line key={ls} x1={x - rx * k - 2.2} x2={x + rx * k + 2.2} y1={yOf(ls)} y2={yOf(ls)} stroke={INK} strokeWidth={0.8} opacity={op} />
            ))}
            {acc && (
              <text
                x={x - rx * k - 1.5}
                y={y + h * 0.95}
                fontSize={h * 4.6}
                textAnchor="end"
                fill={n.fill ?? INK}
                opacity={op}
                aria-hidden
                data-testid="mini-staff-accidental"
              >
                {accidentalGlyph(acc)}
              </text>
            )}
            <g
              className={interactive ? "origin-center transition-transform [transform-box:fill-box] group-hover:scale-125" : undefined}
              opacity={op}
            >
              <ellipse cx={x} cy={y} rx={rx * k} ry={ry * k} transform={`rotate(-18 ${x} ${y})`} fill={n.fill ?? INK} stroke={INK} strokeWidth={0.9} />
            </g>
            {n.ring && (
              <ellipse
                cx={x}
                cy={y}
                rx={rx * k + 3}
                ry={ry * k + 3}
                fill="none"
                stroke={INK}
                strokeWidth={1.3}
                strokeDasharray={n.dashed ? "2.2 1.8" : undefined}
                data-testid="mini-staff-ring"
              />
            )}
            {n.label && (
              <text
                x={x}
                y={labelY}
                fontSize={n.labelBold ? 9.5 : 8}
                fontWeight={n.labelBold ? 700 : 400}
                textAnchor="middle"
                fill={INK}
                opacity={n.labelBold ? 1 : Math.max(op, 0.55)}
                aria-hidden
              >
                {n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
