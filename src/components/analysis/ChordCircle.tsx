import { useEffect, useRef, useState } from "react";
import { PLAIN_COLOR } from "@/lib/colors/defaults";
import { readableTextOn } from "@/lib/colors/color";
import { noteColor, useColors } from "@/lib/colors/store";
import { roleColor } from "@/lib/colors/roleColor";
import { noteChipStyle } from "@/lib/colors/noteChip";
import { solfegeName } from "@/lib/music/naming";
import type { KeyInfo } from "@/lib/music/analysis/key";
import { FUNCTION_ES, FUNCTION_ROLE, type ChordFunction } from "@/lib/music/analysis/chords";
import { resolutionArrows, ringAngle, ringSpelling, tritones } from "@/lib/music/analysis/circle";

/** What the circle draws: a chord from the scale or from the piece. */
export interface CircleChord {
  /** "Mi7", "La mayor" */
  name: string;
  /** Spelled notes, parallel to `pcs`. */
  notes: string[];
  pcs: number[];
  rootPc: number;
  roleId: string;
  fn: ChordFunction | null;
  inScale: boolean;
}

interface Props {
  keyInfo: KeyInfo;
  chord: CircleChord;
  /** Pitch classes of the tonic triad (for the resolution arrows). */
  tonicPcs: number[];
}

const W = 360;
const CX = 180;
const CY = 168;
const R = 104;
const ARC = { x0: 30, y0: 372, cx: 180, cy: 458, x1: 330, y1: 372 };
const FN_T: Record<ChordFunction, number> = { SD: 0.13, T: 0.5, D: 0.87 };
const ARROW = "#44403C";

const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (r: number, deg: number) => ({ x: CX + r * Math.cos(rad(deg)), y: CY + r * Math.sin(rad(deg)) });
const arcPoint = (t: number) => {
  const u = 1 - t;
  return {
    x: u * u * ARC.x0 + 2 * u * t * ARC.cx + t * t * ARC.x1,
    y: u * u * ARC.y0 + 2 * u * t * ARC.cy + t * t * ARC.y1,
  };
};

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Eases a number toward `target` with requestAnimationFrame (jumps when she prefers reduced motion). */
function useTween(target: number, ms = 600) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    if (cur.current === target) return;
    if (reducedMotion()) {
      cur.current = target;
      setV(target);
      return;
    }
    const from = cur.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      cur.current = from + (target - from) * e;
      setV(cur.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/** A thin wavy path between two points. */
function wavyPath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const n = 48;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const off = 4.5 * Math.sin(u * Math.PI * 2 * 4) * Math.sin(u * Math.PI);
    const x = a.x + dx * u + nx * off;
    const y = a.y + dy * u + ny * off;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

export function ChordCircle({ keyInfo, chord, tonicPcs }: Props) {
  const { palette } = useColors(); // repaint when she changes any color
  const roles = palette.roles;
  const [hoverTri, setHoverTri] = useState<number | null>(null);

  const tonic = keyInfo.tonicPc;
  const names = ringSpelling(keyInfo, chord.notes, chord.pcs);
  const inChord = new Set(chord.pcs);
  const inScale = new Set(keyInfo.pcs);
  const qColor = roleColor(roles, chord.roleId);
  const ordered = [...chord.pcs].sort((a, b) => ((a - tonic + 12) % 12) - ((b - tonic + 12) % 12));
  const pos = (pc: number, r = R) => polar(r, ringAngle(pc, tonic));
  const poly = ordered.map((pc) => pos(pc)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const tri = tritones(chord.pcs);
  const arrows = chord.inScale && chord.fn === "D" ? resolutionArrows(chord.pcs, chord.rootPc, tonicPcs, tonic) : [];

  const fnColor = (f: ChordFunction) => roleColor(roles, FUNCTION_ROLE[f], "#9CA3AF");
  const lastT = useRef(FN_T.T);
  const onArc = chord.inScale && chord.fn !== null;
  const targetT = onArc ? FN_T[chord.fn as ChordFunction] : lastT.current;
  lastT.current = targetT;
  const t = useTween(targetT);
  const ball = arcPoint(t);
  const ballColor = onArc ? fnColor(chord.fn as ChordFunction) : "#9CA3AF";

  const fnWord = onArc ? FUNCTION_ES[chord.fn as ChordFunction] : null;
  const chipBg = onArc ? fnColor(chord.fn as ChordFunction) : "";
  const chipW = fnWord ? fnWord.length * 7.6 + 22 : 0;

  const arrowPath = (from: number, to: number) => {
    const a0 = ringAngle(from, tonic);
    const a1 = ringAngle(to, tonic);
    const delta = ((a1 - a0 + 540) % 360) - 180;
    const sgn = delta > 0 ? 1 : -1;
    const ra = R - 17;
    const s = polar(ra, a0 + sgn * 7);
    const e = polar(ra, a1 - sgn * 8);
    return `M${s.x.toFixed(1)} ${s.y.toFixed(1)} A${ra} ${ra} 0 0 ${sgn > 0 ? 1 : 0} ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
  };

  const label = `Círculo cromático en ${keyInfo.label}: ${chord.name}${fnWord ? `, ${fnWord}` : ", fuera de la escala"}. Notas: ${chord.notes.map(solfegeName).join(", ")}.`;

  return (
    <svg viewBox={`0 0 ${W} 450`} className="mx-auto block h-auto w-full max-w-[360px]" role="img" aria-label={label}>
      <defs>
        <linearGradient id="cc-arc" gradientUnits="userSpaceOnUse" x1={ARC.x0} y1="0" x2={ARC.x1} y2="0">
          <stop offset="0" stopColor={fnColor("SD")} />
          <stop offset={FN_T.SD} stopColor={fnColor("SD")} />
          <stop offset={FN_T.T} stopColor={fnColor("T")} />
          <stop offset={FN_T.D} stopColor={fnColor("D")} />
          <stop offset="1" stopColor={fnColor("D")} />
        </linearGradient>
        {[false, true].map((em) => (
          <marker key={String(em)} id={em ? "cc-head-em" : "cc-head"} viewBox="0 0 10 10" refX="7" refY="5" markerWidth={em ? 6 : 5} markerHeight={em ? 6 : 5} orient="auto-start-reverse">
            <path d="M0 1 L9 5 L0 9 Z" fill={ARROW} />
          </marker>
        ))}
      </defs>

      {/* ring */}
      <circle cx={CX} cy={CY} r={R} fill="none" className="stroke-border" strokeWidth="1.5" />
      <circle cx={CX} cy={CY} r={R - 40} fill="none" className="stroke-border" strokeWidth="0.75" strokeDasharray="2 5" opacity="0.7" />

      {/* chord shape */}
      <polygon
        points={poly}
        fill={qColor}
        fillOpacity={0.16}
        stroke={qColor}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeDasharray={chord.inScale ? undefined : "6 5"}
      />

      {/* tritone */}
      {tri.map(([a, b]) => {
        const pa = pos(a);
        const pb = pos(b);
        const key = a * 12 + b;
        const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
        const d = wavyPath(pa, pb);
        return (
          <g key={key} onMouseEnter={() => setHoverTri(key)} onMouseLeave={() => setHoverTri(null)}>
            <title>tritono: la tensión</title>
            <path d={d} fill="none" stroke="transparent" strokeWidth="14" />
            <path d={d} fill="none" className="stroke-foreground" strokeOpacity="0.7" strokeWidth="1.4" strokeLinecap="round" />
            {hoverTri === key && (
              <g pointerEvents="none">
                <rect x={mid.x - 60} y={mid.y - 11} width="120" height="22" rx="5" className="fill-background stroke-border" />
                <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="central" className="fill-foreground" fontSize="11" fontWeight="600">
                  tritono: la tensión
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* resolution arrows */}
      {arrows.map((a) => (
        <g key={`${a.from}-${a.to}`}>
          <title>{`${solfegeName(names[a.from])} → ${solfegeName(names[a.to])}: ${a.why}`}</title>
          <path
            d={arrowPath(a.from, a.to)}
            fill="none"
            stroke={ARROW}
            strokeWidth={a.emphasis ? 2.6 : 1.4}
            strokeOpacity={a.emphasis ? 1 : 0.65}
            strokeLinecap="round"
            markerEnd={`url(#${a.emphasis ? "cc-head-em" : "cc-head"})`}
          />
        </g>
      ))}

      {/* dots and labels */}
      {Array.from({ length: 12 }, (_, pc) => {
        const p = pos(pc);
        const l = pos(pc, R + 25);
        const chordNote = inChord.has(pc);
        const scaleNote = inScale.has(pc);
        const fill = noteColor(pc);
        const isRoot = pc === chord.rootPc;
        return (
          <g key={pc}>
            {chordNote ? (
              <>
                <circle cx={p.x} cy={p.y} r={isRoot ? 15 : 13} fill={qColor} opacity="0.18" />
                <circle cx={p.x} cy={p.y} r={isRoot ? 10 : 8} fill={fill === PLAIN_COLOR ? "#1C1917" : fill} stroke="#ffffff" strokeWidth="2" />
              </>
            ) : (
              <circle cx={p.x} cy={p.y} r={scaleNote ? 3.2 : 2} className="fill-muted-foreground" opacity={scaleNote ? 0.9 : 0.4} />
            )}
            {chordNote ? (
              (() => {
                const label = solfegeName(names[pc]);
                const st = noteChipStyle(pc, roles);
                const w = label.length * 8.6 + 12;
                return (
                  <g data-chord-chip={pc} data-neutral={st.neutral ? "1" : "0"}>
                    <rect x={l.x - w / 2} y={l.y - 11} width={w} height={22} rx={6} fill={st.background} stroke={st.border} strokeWidth="1.5" />
                    <text x={l.x} y={l.y} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight={700} fill={st.color}>
                      {label}
                    </text>
                  </g>
                );
              })()
            ) : (
            <text
              x={l.x}
              y={l.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={chordNote ? 14 : 12}
              fontWeight={chordNote ? 700 : scaleNote ? 500 : 400}
              className={chordNote || scaleNote ? "fill-foreground" : "fill-muted-foreground"}
              opacity={chordNote ? 1 : scaleNote ? 0.8 : 0.4}
            >
              {solfegeName(names[pc])}
            </text>
            )}
          </g>
        );
      })}

      {/* chord name + function */}
      <text x={CX} y={CY + 7} textAnchor="middle" dominantBaseline="central" className="fill-foreground" fontSize="24" fontWeight="700">
        {chord.name}
      </text>
      {fnWord ? (
        <g>
          <rect x={CX - chipW / 2} y={CY + 25} width={chipW} height="20" rx="10" fill={chipBg} />
          <text x={CX} y={CY + 35.5} textAnchor="middle" dominantBaseline="central" fontSize="11.5" fontWeight="700" letterSpacing="1" fill={readableTextOn(chipBg)}>
            {fnWord.toUpperCase()}
          </text>
        </g>
      ) : (
        <text x={CX} y={CY + 35.5} textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground" fontSize="12" fontStyle="italic">
          fuera de la escala
        </text>
      )}

      {/* tension arc */}
      <path d={`M${ARC.x0} ${ARC.y0} Q${ARC.cx} ${ARC.cy} ${ARC.x1} ${ARC.y1}`} fill="none" stroke="url(#cc-arc)" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
      <text x={arcPoint(FN_T.SD).x} y={arcPoint(FN_T.SD).y - 16} textAnchor="middle" className="fill-muted-foreground" fontSize="10">
        Subdominante
      </text>
      <text x={arcPoint(FN_T.D).x} y={arcPoint(FN_T.D).y - 16} textAnchor="middle" className="fill-muted-foreground" fontSize="10">
        Dominante
      </text>
      <text x={CX} y={arcPoint(0.5).y + 22} textAnchor="middle" className="fill-foreground" fontSize="12" fontWeight="700" letterSpacing="2">
        CASA
      </text>
      <g style={{ opacity: onArc ? 1 : 0, transition: "opacity .3s" }}>
        <circle cx={ball.x} cy={ball.y} r="15" fill={ballColor} opacity="0.2" />
        <circle cx={ball.x} cy={ball.y} r="9" fill={ballColor} stroke="#ffffff" strokeWidth="2.5" />
      </g>
      {!onArc && (
        <text x={CX} y={arcPoint(0.5).y - 20} textAnchor="middle" className="fill-muted-foreground" fontSize="10.5" fontStyle="italic">
          Este acorde no tiene lugar en el arco
        </text>
      )}
    </svg>
  );
}
