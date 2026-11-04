import { useEffect, useState, type MutableRefObject } from "react";
import { noteColor } from "@/lib/colors/store";
import { accidentalGlyph, ledgerSteps, parseSpelled, staffStep, type Clef } from "@/lib/music/staffMath";
import { spelledSharp } from "@/lib/pitch/noteName";
import { staffStepFloat, type TrackedFrame } from "@/lib/pitch/pitchMath";

/** Frames kept for the trace (the hook pushes, this component only reads). */
export type TraceFrame = TrackedFrame;

const W = 640;
const H = 160;
const INK = "#111111";
const GREY = "#9ca3af";
const SPAN_MS = 6000;
const PLOT_X0 = 46;
const PLOT_X1 = 566;
const HEAD_X = 604;
const TOP_STEP = 14;
const BOTTOM_STEP = -6;
const PAD = 6;
const STEP_PX = (H - 2 * PAD) / (TOP_STEP - BOTTOM_STEP);
const yOf = (step: number) => PAD + (TOP_STEP - Math.min(TOP_STEP, Math.max(BOTTOM_STEP, step))) * STEP_PX;

/** Her note color, but the app's "role off" black counts as no color: the line stays grey. */
export function lineColor(midi: number): string {
  const c = noteColor(midi);
  return c.toLowerCase() === "#000000" ? GREY : c;
}

interface Props {
  /** MIDI note she is aiming at. */
  target: number;
  clef: Clef;
  /** Tracked frames, newest last. The owner appends; this component redraws at about 30 fps while `active`. */
  framesRef: MutableRefObject<TraceFrame[]>;
  active: boolean;
  /** The target notehead takes its color. */
  lit: boolean;
}

interface Run {
  stable: boolean;
  nearest: number;
  pts: [number, number][];
}

/**
 * The last ~6 s of the sung pitch over a staff, with the target note at the right. The line is grey while she moves and
 * takes her color for that note while the same note holds (`stable`). Breaks where nothing was heard. Plain SVG.
 */
export function PitchTrace({ target, clef, framesRef, active, lit }: Props) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) {
      setTick((n) => n + 1); // one last draw
      return;
    }
    const id = setInterval(() => setTick((n) => n + 1), 33);
    return () => clearInterval(id);
  }, [active]);

  const now = typeof performance === "undefined" ? 0 : performance.now();
  const frames = framesRef.current;
  while (frames.length && now - frames[0].t > SPAN_MS + 1000) frames.shift();
  const xOf = (t: number) => PLOT_X1 - ((now - t) / SPAN_MS) * (PLOT_X1 - PLOT_X0);

  const runs: Run[] = [];
  let prev: TraceFrame | null = null;
  let cur: Run | null = null;
  for (const f of frames) {
    if (now - f.t > SPAN_MS) {
      prev = null;
      continue;
    }
    if (!f.heard) {
      prev = null;
      cur = null;
      continue;
    }
    const pt: [number, number] = [xOf(f.t), yOf(staffStepFloat(f.midiFloat, clef))];
    const contiguous = prev !== null && f.t - prev.t < 120;
    if (!cur || !contiguous || cur.stable !== f.stable || (f.stable && cur.nearest !== f.nearest)) {
      cur = { stable: f.stable, nearest: f.nearest, pts: contiguous && prev ? [[xOf(prev.t), yOf(staffStepFloat(prev.midiFloat, clef))], pt] : [pt] };
      runs.push(cur);
    } else {
      cur.pts.push(pt);
    }
    prev = f;
  }

  const spelled = spelledSharp(target);
  const step = staffStep(spelled, clef);
  const acc = parseSpelled(spelled)?.accidental ?? "";
  const headY = yOf(step);
  const rx = STEP_PX * 1.4;
  const ry = STEP_PX * 1.02;
  const clefStyle = clef === "treble" ? { glyph: "𝄞", size: STEP_PX * 17.5, y: yOf(-1.5) } : { glyph: "𝄢", size: STEP_PX * 9.5, y: yOf(2.1) };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      style={{ maxWidth: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label="Tu línea de afinación sobre el pentagrama"
      data-testid="pitch-trace"
      data-clef={clef}
      data-runs={runs.length}
    >
      <rect x={0} y={0} width={W} height={H} rx={4} fill="#ffffff" />
      {[0, 2, 4, 6, 8].map((s) => (
        <line key={s} x1={2} x2={W - 2} y1={yOf(s)} y2={yOf(s)} stroke={INK} strokeWidth={0.7} opacity={0.75} />
      ))}
      <text x={4} y={clefStyle.y} fontSize={clefStyle.size} fill={INK} aria-hidden style={{ fontFamily: '"Noto Music","Bravura Text","Apple Symbols","Segoe UI Symbol",serif' }}>
        {clefStyle.glyph}
      </text>
      {/* where the target sits, across the plot */}
      <line x1={PLOT_X0} x2={PLOT_X1} y1={headY} y2={headY} stroke={GREY} strokeWidth={1} strokeDasharray="3 4" opacity={0.7} />
      {runs.map((r, i) => (
        <polyline
          key={i}
          points={r.pts.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke={r.stable ? lineColor(r.nearest) : GREY}
          strokeWidth={r.stable ? 3 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          data-stable={r.stable ? "1" : "0"}
        />
      ))}
      <g data-testid="trace-target" data-note={spelled} data-lit={lit ? "1" : "0"}>
        {ledgerSteps(step).map((ls) => (
          <line key={ls} x1={HEAD_X - rx - 3} x2={HEAD_X + rx + 3} y1={yOf(ls)} y2={yOf(ls)} stroke={INK} strokeWidth={0.8} />
        ))}
        {acc && (
          <text x={HEAD_X - rx - 2} y={headY + STEP_PX * 0.95} fontSize={STEP_PX * 4.6} textAnchor="end" fill={INK} aria-hidden>
            {accidentalGlyph(acc)}
          </text>
        )}
        <ellipse cx={HEAD_X} cy={headY} rx={rx} ry={ry} transform={`rotate(-18 ${HEAD_X} ${headY})`} fill={lit ? lineColor(target) : INK} stroke={INK} strokeWidth={0.9} />
      </g>
    </svg>
  );
}
