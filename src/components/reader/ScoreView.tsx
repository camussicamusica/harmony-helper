import { useEffect, useRef, useState } from "react";
import * as OSMDModule from "opensheetmusicdisplay";
import { applyStemColors, parseSheetToNotes } from "@/lib/music/parseMusicXml";
import { activeNotes, getPlaybackSeconds } from "@/lib/music/scheduler";
import { hoverText, INTERVAL_KEY_LABEL } from "@/lib/music/naming";
import { buildGeometry } from "@/lib/music/melodicLine";
import { pitchClassColor } from "@/lib/music/midiUtils";
import {
  DISABLED_SEGMENT_COLOR,
  HALO_COLOR,
  PILL_TEXT_DARK,
  PILL_TEXT_LIGHT,
  PLAIN_COLOR,
  RING_NEUTRAL_COLOR,
} from "@/lib/colors/defaults";
import { readableTextOn } from "@/lib/colors/color";
import type { LineColorMode } from "@/lib/music/lineMode";
import { IntervalLegend } from "./IntervalLegend";
import { readScoreMeta, type ScoreMeta } from "@/lib/music/analysis/scoreMeta";
import type { PieceChord } from "@/lib/music/analysis/pieceChords";
import { getPalette, getRole } from "@/lib/colors/store";
import { headHoverStyle, spelledPc } from "@/lib/colors/noteChip";
import { ChordNoteChips } from "@/components/analysis/ChordNoteChips";
import { intervalRole, intervalSignature, noteSignature, noteTargetOn, subscribe as subscribeColors } from "@/lib/colors/store";
import type { Hand, IsolationMode, ScheduledNote, ScoreView as ViewMode } from "@/lib/music/types";
import type { Pattern, PatternScope } from "@/lib/music/analysis/patterns";
import { colorKey } from "@/lib/music/analysis/patterns";
import { strongOf } from "@/lib/music/analysis/patternColors";
import { buildBands, gradientStops, maxIntensityForContrast, type DegradeNote } from "@/lib/music/analysis/degrade";

// CJS/ESM-tolerant constructor lookup — OSMD ships as CJS so the named export
// can be missing in some SSR/Vite paths.
const OpenSheetMusicDisplayCtor: any =
  (OSMDModule as any).OpenSheetMusicDisplay ??
  (OSMDModule as any).default?.OpenSheetMusicDisplay ??
  (OSMDModule as any).default;

interface Props {
  xml: string;
  bpm: number;
  isolation: IsolationMode;
  zoom: number;
  view: ViewMode;
  line: boolean;
  intervals: boolean;
  lineMode: LineColorMode;
  isPlaying: boolean;
  onNotes: (notes: ScheduledNote[]) => void;
  /** Notes plus key/time/measure info for the Ficha analysis. */
  onScoreData?: (notes: ScheduledNote[], meta: ScoreMeta) => void;
  /** Chords of the piece (indices below point into this list). */
  chordMarks?: PieceChord[];
  /** Indices into `chordMarks` to light up. */
  highlightChords?: number[];
  /** Index into `chordMarks` of the occurrence she is walking through: a soft box in the chord's color. */
  occurrenceMark?: number | null;
  /** Scroll the score to this chord (nonce makes repeated requests work). */
  focusChord?: { index: number; nonce: number } | null;
  /** Measure numbers she marked as hard (Recorrido): drawn as amber boxes. */
  hardMeasures?: number[];
  /** While true, clicking a measure adds / removes it from the hard list. */
  markMode?: boolean;
  onToggleHardMeasure?: (measure: number) => void;
  /** One measure to emphasize (selected in the Recorrido list). */
  highlightMeasure?: number | null;
  /** Scroll the score to this measure (nonce makes repeated requests work). */
  focusMeasure?: { measure: number; nonce: number } | null;
  /** "Cajas de patrones": boxes behind the notes. null/undefined = layer off. */
  patternLayer?: PatternLayerView | null;
  /** "Degradé de notas": soft band behind each staff. null/undefined = layer off. */
  degradeLayer?: { intensity: number } | null;
  /** Reports the strongest intensity that keeps black noteheads at 4.5:1 for the current notes. */
  onDegradeCap?: (cap: number) => void;
}

export interface PatternLayerView {
  patterns: Pattern[];
  /** color key -> box color */
  colors: Map<string, string>;
  /** color key -> letter */
  letters: Map<string, string>;
  scope: PatternScope;
  intensity: number;
}

interface PatternHit {
  key: string;
  /** First measure of this occurrence. */
  first: number;
  rects: Array<{ x: number; y: number; w: number; h: number }>;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const NOW_LINE_FRACTION = 0.3;
/** Radius of the melodic-line ring drawn around (not over) each notehead. */
const RING_R = 8;

function svgEl<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

interface TooltipState {
  x: number;
  y: number;
  line1: string;
  line2: string | null;
  own: { spelled: string; duration: string };
  where: string;
  measure: number;
  beat?: number;
  /** Chord tones (spelled), shown as chips in her note colors. */
  chord?: { name: string | null; tones: string[]; ownIndex: number; interval: string | null } | null;
}

export function ScoreView({
  xml,
  bpm,
  isolation,
  zoom,
  view,
  line,
  intervals,
  lineMode,
  isPlaying,
  onNotes,
  onScoreData,
  chordMarks = [],
  occurrenceMark = null,
  highlightChords = [],
  focusChord = null,
  hardMeasures = [],
  markMode = false,
  onToggleHardMeasure,
  highlightMeasure = null,
  focusMeasure = null,
  patternLayer = null,
  degradeLayer = null,
  onDegradeCap,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<SVGSVGElement | null>(null);
  const chordSvgRef = useRef<SVGSVGElement | null>(null);
  const hardSvgRef = useRef<SVGSVGElement | null>(null);
  const patternSvgRef = useRef<SVGSVGElement | null>(null);
  const degradeSvgRef = useRef<SVGSVGElement | null>(null);
  const osmdRef = useRef<any>(null);
  const readyRef = useRef(false);
  const cleanupRef = useRef<Array<() => void>>([]);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const onNotesRef = useRef(onNotes);
  onNotesRef.current = onNotes;
  const notesRef = useRef<ScheduledNote[]>([]);
  const lineRef = useRef(line);
  lineRef.current = line;
  const alwaysLabelsRef = useRef(intervals);
  alwaysLabelsRef.current = intervals;
  const lineModeRef = useRef(lineMode);
  lineModeRef.current = lineMode;
  const isolationRef = useRef(isolation);
  isolationRef.current = isolation;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const viewRef = useRef(view);
  viewRef.current = view;
  const onScoreDataRef = useRef(onScoreData);
  onScoreDataRef.current = onScoreData;
  const chordMarksRef = useRef(chordMarks);
  chordMarksRef.current = chordMarks;
  const occurrenceMarkRef = useRef(occurrenceMark);
  occurrenceMarkRef.current = occurrenceMark;
  const highlightRef = useRef(highlightChords);
  highlightRef.current = highlightChords;
  const hardRef = useRef(hardMeasures);
  hardRef.current = hardMeasures;
  const highlightMeasureRef = useRef(highlightMeasure);
  highlightMeasureRef.current = highlightMeasure;
  const markModeRef = useRef(markMode);
  markModeRef.current = markMode;
  const onToggleHardRef = useRef(onToggleHardMeasure);
  onToggleHardRef.current = onToggleHardMeasure;
  const patternLayerRef = useRef(patternLayer);
  patternLayerRef.current = patternLayer;
  const degradeLayerRef = useRef(degradeLayer);
  degradeLayerRef.current = degradeLayer;
  const onDegradeCapRef = useRef(onDegradeCap);
  onDegradeCapRef.current = onDegradeCap;
  /** Boxes drawn right now (for hover and click), and the pattern color key under the pointer. */
  const patternHitsRef = useRef<PatternHit[]>([]);
  const patternHoverRef = useRef<string | null>(null);
  /** Top and bottom (px, relative to the wrapper) of every staff, per system id, top staff first. */
  const staffRowsRef = useRef<Map<number, Array<{ top: number; bottom: number }>>>(new Map());
  /** Length of one measure in seconds: a silence this long cuts the degradé. */
  const measureSecRef = useRef(0);
  /** Top staff line (px, relative to the wrapper) of each system id. */
  const systemTopRef = useRef<Map<number, number>>(new Map());
  const fitRef = useRef(1);
  const timeMapRef = useRef<Array<{ t: number; x: number }>>([]);
  const holdUntilRef = useRef(0);

  const [renderError, setRenderError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [legendKeys, setLegendKeys] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const runCleanups = () => {
    try {
      cleanupRef.current.forEach((fn) => {
        try {
          fn();
        } catch {
          /* ignore */
        }
      });
    } finally {
      cleanupRef.current = [];
    }
  };

  /** Repaint accidentals and the hover/playing color from the palette. No OSMD re-render needed. */
  const paintNotes = (notes: ScheduledNote[]) => {
    for (const note of notes) {
      const color = pitchClassColor(note.midi);
      const accColor = noteTargetOn(note.midi, "accidental") ? color : PLAIN_COLOR;
      for (const aEl of note.accidentalEls ?? []) {
        try {
          aEl.setAttribute("fill", accColor);
          aEl.style.fill = accColor;
          aEl.classList.add("accidental-colored");
          aEl
            .querySelectorAll<SVGElement>("path, rect, ellipse, polygon, text")
            .forEach((child) => {
              child.setAttribute("fill", accColor);
              child.style.fill = accColor;
            });
        } catch {
          /* ignore detached node */
        }
      }
      for (const el of note.svgEls ?? []) {
        el.style.setProperty("--note-color", color);
      }
    }
  };

  /** Notehead centers (px, relative to the score wrapper) + the time -> x table used by Tocar's auto-scroll. */
  const measure = (notes: ScheduledNote[]) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wr = wrap.getBoundingClientRect();
    // Notes that share one VexFlow <g> (chord mates): pair notehead paths with notes by pitch rank.
    const byEl = new Map<SVGGElement, ScheduledNote[]>();
    for (const n of notes) {
      const el = n.svgEls?.[0];
      if (!el || !el.isConnected) {
        n.cx = undefined;
        n.cy = undefined;
        continue;
      }
      const arr = byEl.get(el) ?? [];
      arr.push(n);
      byEl.set(el, arr);
    }
    for (const [el, group] of byEl) {
      // Each chord head is its own .vf-notehead <g> inside the note's <g>.
      const heads = Array.from(el.querySelectorAll<SVGElement>(".vf-notehead path"));
      let rects: DOMRect[] = heads.map((h) => h.getBoundingClientRect()).filter((r) => r.width || r.height);
      rects = rects.sort((a, b) => a.top - b.top);
      const ranked = [...group].sort((a, b) => b.midi - a.midi);
      const whole = el.getBoundingClientRect();
      // Same pairing for the head element itself (needed by the per-notehead hover).
      const headEls = heads.filter((h) => { const b = h.getBoundingClientRect(); return b.width || b.height; })
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      ranked.forEach((n, i) => {
        n.headEl = headEls.length === ranked.length ? headEls[i] : headEls.length === 1 ? headEls[0] : undefined;
        const r = rects.length === ranked.length ? rects[i] : rects.length ? rects[0] : whole;
        if (!r.width && !r.height) {
          n.cx = undefined;
          n.cy = undefined;
          return;
        }
        n.cx = r.left + r.width / 2 - wr.left;
        n.cy = r.top + r.height / 2 - wr.top;
      });
    }
    // time -> x: one point per onset, x = mean of its noteheads.
    const byOnset = new Map<number, number[]>();
    for (const n of notes) {
      if (n.cx === undefined) continue;
      const key = Math.round(n.startSec * 1000);
      const arr = byOnset.get(key) ?? [];
      arr.push(n.cx);
      byOnset.set(key, arr);
    }
    const map = [...byOnset.entries()]
      .map(([k, xs]) => ({ t: k / 1000, x: xs.reduce((a, b) => a + b, 0) / xs.length }))
      .sort((a, b) => a.t - b.t);
    if (map.length) {
      const endT = Math.max(...notes.map((n) => n.startSec + n.durationSec));
      const last = map[map.length - 1];
      if (endT > last.t) map.push({ t: endT, x: last.x + 40 });
    }
    timeMapRef.current = map;

    // Top staff line of each system: first group of 5 flat staff-line paths of every system's top staff.
    const tops: number[] = [];
    const rows: Array<{ top: number; bottom: number }> = [];
    containerRef.current?.querySelectorAll(".staffline").forEach((g) => {
      const rs = Array.from(g.querySelectorAll("path"))
        .map((p) => p.getBoundingClientRect())
        .filter((r) => r.height < 1 && r.width > 0);
      if (rs.length) {
        const top = Math.min(...rs.map((r) => r.top - wr.top));
        tops.push(top);
        rows.push({ top, bottom: Math.max(...rs.map((r) => r.bottom - wr.top)) });
      }
    });
    tops.sort((a, b) => a - b);
    rows.sort((a, b) => a.top - b.top);
    const sysIds = [...new Set(notes.map((n) => n.system ?? 0))].sort((a, b) => a - b);
    const m = new Map<number, number>();
    const staffRows = new Map<number, Array<{ top: number; bottom: number }>>();
    if (sysIds.length && tops.length && tops.length % sysIds.length === 0) {
      const per = tops.length / sysIds.length;
      sysIds.forEach((id, i) => {
        m.set(id, tops[i * per]);
        staffRows.set(id, rows.slice(i * per, (i + 1) * per));
      });
    }
    systemTopRef.current = m;
    staffRowsRef.current = staffRows;
  };

  /** Where a chord mark sits: x over its first notes, y above the top staff of that system. */
  const chordPosition = (chord: PieceChord): { x: number; y: number } | null => {
    const byId = new Map(notesRef.current.map((n) => [n.id, n]));
    const ns = chord.noteIds.map((id) => byId.get(id)).filter((n): n is ScheduledNote => !!n && n.cx !== undefined);
    if (!ns.length) return null;
    const t0 = Math.min(...ns.map((n) => n.startSec));
    const first = ns.filter((n) => Math.abs(n.startSec - t0) < 1e-3);
    const x = first.reduce((a, n) => a + n.cx!, 0) / first.length;
    const sys = first[0].system ?? 0;
    const top = systemTopRef.current.get(sys);
    const ys = ns.filter((n) => (n.system ?? 0) === sys).map((n) => n.cy!);
    const y = (top !== undefined ? Math.min(top, Math.min(...ys) - 8) : Math.min(...ys) - 30) - 24;
    return { x, y };
  };

  /**
   * Chord highlight on the score: noteheads of the highlighted chords get the `chord-hl` class, and the chord she
   * is walking through (occurrence navigator) gets a soft box in the chord's color around its beat.
   */
  const drawChords = () => {
    const svg = chordSvgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("width", String(wrap.offsetWidth));
    svg.setAttribute("height", String(wrap.offsetHeight));
    // Clear notehead highlights; re-apply below.
    for (const n of notesRef.current) n.svgEls?.forEach((el) => el.classList.remove("chord-hl"));
    const marks = chordMarksRef.current;
    const hl = new Set(highlightRef.current);
    if (hl.size > 0) {
      const byId = new Map(notesRef.current.map((n) => [n.id, n]));
      for (const i of hl) {
        for (const id of marks[i]?.noteIds ?? []) byId.get(id)?.svgEls?.forEach((el) => el.classList.add("chord-hl"));
      }
    }
    const occ = occurrenceMarkRef.current;
    const chord = occ === null ? undefined : marks[occ];
    if (!chord) return;
    const byId = new Map(notesRef.current.map((n) => [n.id, n]));
    const ns = chord.noteIds.map((id) => byId.get(id)).filter((n): n is ScheduledNote => !!n && n.cx !== undefined);
    if (!ns.length) return;
    const sys = ns[0].system ?? 0;
    const inSys = ns.filter((n) => (n.system ?? 0) === sys);
    const x0 = Math.min(...inSys.map((n) => n.cx!)) - 22;
    const x1 = Math.max(Math.max(...inSys.map((n) => n.cx!)) + 22, x0 + 60);
    const mb = measureBoxes().get(chord.measure);
    const ys = inSys.map((n) => n.cy!);
    const top = systemTopRef.current.get(sys);
    const y0 = mb?.y0 ?? (top !== undefined ? Math.min(top, Math.min(...ys) - 8) : Math.min(...ys) - 30) - 8;
    const y1 = mb?.y1 ?? Math.max(...ys) + 30;
    const color = getRole(chord.roleId)?.color ?? getRole("chord-outsideScale")?.color ?? "#78716C";
    const g = svgEl("g", { "data-occurrence-box": `${chord.measure}.${chord.beat}` });
    g.appendChild(
      svgEl("rect", {
        x: x0,
        y: y0,
        width: x1 - x0,
        height: y1 - y0,
        rx: 8,
        fill: color,
        "fill-opacity": 0.2,
        stroke: color,
        "stroke-width": 2.5,
        ...(chord.inScale ? {} : { "stroke-dasharray": "6 4" }),
      }),
    );
    svg.appendChild(g);
  };


  /** Box (px, relative to the wrapper) of every measure that has notes: x from the neighbours' midpoints, y over the system. */
  const measureBoxes = (): Map<number, { x0: number; x1: number; y0: number; y1: number }> => {
    const out = new Map<number, { x0: number; x1: number; y0: number; y1: number }>();
    const bySys = new Map<number, Map<number, { min: number; max: number }>>();
    const ySys = new Map<number, { min: number; max: number }>();
    for (const n of notesRef.current) {
      if (n.cx === undefined || n.cy === undefined) continue;
      const sys = n.system ?? 0;
      const ms = bySys.get(sys) ?? new Map<number, { min: number; max: number }>();
      const e = ms.get(n.measure);
      if (e) {
        e.min = Math.min(e.min, n.cx);
        e.max = Math.max(e.max, n.cx);
      } else ms.set(n.measure, { min: n.cx, max: n.cx });
      bySys.set(sys, ms);
      const y = ySys.get(sys);
      if (y) {
        y.min = Math.min(y.min, n.cy);
        y.max = Math.max(y.max, n.cy);
      } else ySys.set(sys, { min: n.cy, max: n.cy });
    }
    for (const [sys, ms] of bySys) {
      const list = [...ms.entries()].sort((a, b) => a[1].min - b[1].min);
      const yr = ySys.get(sys)!;
      const top = systemTopRef.current.get(sys);
      const y0 = (top !== undefined ? Math.min(top, yr.min - 8) : yr.min - 30) - 8;
      const y1 = yr.max + 30;
      list.forEach(([num, r], i) => {
        const x0 = i === 0 ? r.min - 26 : (list[i - 1][1].max + r.min) / 2;
        const x1 = i === list.length - 1 ? r.max + 26 : (r.max + list[i + 1][1].min) / 2;
        out.set(num, { x0, x1, y0, y1 });
      });
    }
    return out;
  };

  /** "Marcar compás difícil": amber boxes over the marked measures (and a pulse on the selected one). */
  const drawHard = () => {
    const svg = hardSvgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("width", String(wrap.offsetWidth));
    svg.setAttribute("height", String(wrap.offsetHeight));
    const hard = hardRef.current;
    const sel = highlightMeasureRef.current;
    const wanted = new Set<number>(hard);
    if (sel !== null) wanted.add(sel);
    if (!wanted.size) return;
    const boxes = measureBoxes();
    const AMBER = "#D97706";
    for (const m of wanted) {
      const b = boxes.get(m);
      if (!b) continue;
      const isHard = hard.includes(m);
      const lit = sel === m;
      const g = svgEl("g", {});
      const r = svgEl("rect", {
        x: b.x0 + 2,
        y: b.y0,
        width: Math.max(8, b.x1 - b.x0 - 4),
        height: b.y1 - b.y0,
        rx: 6,
        fill: AMBER,
        "fill-opacity": lit ? 0.22 : 0.12,
        stroke: AMBER,
        "stroke-width": lit ? 3 : 1.5,
        ...(isHard && !lit ? { "stroke-dasharray": "5 4" } : {}),
      });
      if (lit) {
        r.appendChild(svgEl("animate", { attributeName: "stroke-opacity", values: "1;0.35;1", dur: "1.4s", repeatCount: "indefinite" }));
      }
      g.appendChild(r);
      if (isHard) {
        const label = `comp. ${m}`;
        const w = 12 + label.length * 5.4;
        g.appendChild(svgEl("rect", { x: b.x0 + 6, y: b.y1 - 17, width: w, height: 14, rx: 7, fill: AMBER }));
        const t = svgEl("text", { x: b.x0 + 6 + w / 2, y: b.y1 - 7, "text-anchor": "middle", "font-size": 9.5, "font-weight": 700, fill: "#ffffff" });
        t.textContent = label;
        g.appendChild(t);
      }
      svg.appendChild(g);
    }
  };

  /** Which system (line) each measure is on. */
  const measureSystems = (): Map<number, number> => {
    const out = new Map<number, number>();
    for (const n of notesRef.current) if (!out.has(n.measure)) out.set(n.measure, n.system ?? 0);
    return out;
  };

  /** Vertical extent (px) of the staves a scope covers in one system, with a little air and room for ledger lines. */
  const scopeY = (sys: number, scope: PatternScope): { y0: number; y1: number } | null => {
    const rows = staffRowsRef.current.get(sys) ?? [];
    const hands: Hand[] = scope === "rh" ? ["RH"] : scope === "lh" ? ["LH"] : ["RH", "LH"];
    let pick = rows;
    if (rows.length >= 2) {
      if (scope === "rh") pick = [rows[0]];
      else if (scope === "lh") pick = [rows[1]];
    }
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const r of pick) {
      y0 = Math.min(y0, r.top - 14);
      y1 = Math.max(y1, r.bottom + 14);
    }
    for (const n of notesRef.current) {
      if ((n.system ?? 0) !== sys || n.cy === undefined || !hands.includes(n.hand)) continue;
      y0 = Math.min(y0, n.cy - 14);
      y1 = Math.max(y1, n.cy + 14);
    }
    return Number.isFinite(y0) && Number.isFinite(y1) ? { y0, y1 } : null;
  };

  /** "Cajas de patrones": soft rounded boxes behind the notes, one color and one letter per pattern. */
  const drawPatterns = () => {
    const svg = patternSvgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("width", String(wrap.offsetWidth));
    svg.setAttribute("height", String(wrap.offsetHeight));
    patternHitsRef.current = [];
    const layer = patternLayerRef.current;
    if (!layer || !layer.patterns.length) return;
    const boxes = measureBoxes();
    const sysOf = measureSystems();
    const hover = patternHoverRef.current;
    for (const p of layer.patterns) {
      const key = colorKey(p);
      const base = layer.colors.get(key);
      if (!base) continue;
      const strong = strongOf(base);
      const letter = (layer.letters.get(key) ?? "?") + (p.kind === "transposed" ? "\u2032" : "");
      const lit = hover === key;
      const dim = hover !== null && !lit;
      for (const occ of p.measures) {
        const segs: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
        for (const m of occ) {
          const b = boxes.get(m);
          const ys = scopeY(sysOf.get(m) ?? 0, layer.scope);
          if (!b || !ys) continue;
          const last = segs[segs.length - 1];
          if (last && Math.abs(last.y0 - ys.y0) < 1 && b.x0 >= last.x0) last.x1 = Math.max(last.x1, b.x1);
          else segs.push({ x0: b.x0, x1: b.x1, y0: ys.y0, y1: ys.y1 });
        }
        if (!segs.length) continue;
        const g = svgEl("g", { opacity: dim ? 0.4 : 1 });
        const rects: PatternHit["rects"] = [];
        segs.forEach((sg, i) => {
          const x = sg.x0 + 2;
          const w = Math.max(10, sg.x1 - sg.x0 - 4);
          const h = sg.y1 - sg.y0;
          rects.push({ x, y: sg.y0, w, h });
          g.appendChild(
            svgEl("rect", {
              x,
              y: sg.y0,
              width: w,
              height: h,
              rx: 9,
              fill: base,
              "fill-opacity": lit ? Math.min(0.7, layer.intensity + 0.2) : layer.intensity,
              stroke: strong,
              "stroke-opacity": 0.85,
              "stroke-width": lit ? 2.5 : 1.25,
              ...(p.kind === "transposed" ? { "stroke-dasharray": "6 4" } : {}),
            }),
          );
          if (i === 0) {
            const pw = 10 + letter.length * 7;
            g.appendChild(svgEl("rect", { x: x + 5, y: sg.y0 + 5, width: pw, height: 16, rx: 8, fill: strong }));
            const t = svgEl("text", {
              x: x + 5 + pw / 2,
              y: sg.y0 + 17,
              "text-anchor": "middle",
              "font-size": 11,
              "font-weight": 700,
              fill: "#ffffff",
            });
            t.textContent = letter;
            g.appendChild(t);
          }
        });
        svg.appendChild(g);
        patternHitsRef.current.push({ key, first: occ[0], rects });
      }
    }
  };

  /** Color of a note for the degradé, or null when its color is switched off. */
  const degradeColor = (midi: number): string | null => {
    const r = getRole(`note-${((midi % 12) + 12) % 12}`);
    return !r || r.enabled === false ? null : r.color;
  };
  const lastCapRef = useRef(-1);

  /** "Degradé de notas": a soft band behind each staff, colors placed at the notehead x. */
  const drawDegrade = () => {
    const svg = degradeSvgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("width", String(wrap.offsetWidth));
    svg.setAttribute("height", String(wrap.offsetHeight));
    const layer = degradeLayerRef.current;
    if (!layer) return;

    const dnotes: DegradeNote[] = [];
    const spans = new Map<string, { min: number; max: number }>();
    for (const n of notesRef.current) {
      if (n.cx === undefined || n.cy === undefined) continue;
      const sys = n.system ?? 0;
      const rows = staffRowsRef.current.get(sys) ?? [];
      const staff = rows.length >= 2 && n.hand === "LH" ? 1 : 0;
      dnotes.push({ x: n.cx, staff, system: sys, startSec: n.startSec, endSec: n.startSec + n.durationSec, color: degradeColor(n.midi) });
      const k = `${sys}:${staff}`;
      const sp = spans.get(k);
      if (sp) {
        sp.min = Math.min(sp.min, n.cy);
        sp.max = Math.max(sp.max, n.cy);
      } else spans.set(k, { min: n.cy, max: n.cy });
    }
    const measureSec = measureSecRef.current > 0 ? measureSecRef.current : (60 / bpmRef.current) * 4;
    const bands = buildBands(dnotes, { maxGapSec: measureSec * 0.95 });
    const cap = maxIntensityForContrast(bands.flatMap((b) => b.stops.map((s) => s.color)));
    if (Math.abs(cap - lastCapRef.current) > 0.004) {
      lastCapRef.current = cap;
      onDegradeCapRef.current?.(cap);
    }
    const alpha = Math.min(layer.intensity, cap);
    const defs = svgEl("defs", {});
    svg.appendChild(defs);
    bands.forEach((b, i) => {
      const row = staffRowsRef.current.get(b.system)?.[b.staff];
      const sp = spans.get(`${b.system}:${b.staff}`)!;
      const y0 = Math.min(row ? row.top - 16 : Infinity, sp.min - 22);
      const y1 = Math.max(row ? row.bottom + 16 : -Infinity, sp.max + 22);
      const gid = `hhdg-${i}`;
      const vid = `hhdv-${i}`;
      const mid = `hhdm-${i}`;
      const grad = svgEl("linearGradient", { id: gid, gradientUnits: "userSpaceOnUse", x1: b.x0, y1: 0, x2: b.x1, y2: 0 });
      for (const st of gradientStops(b)) {
        grad.appendChild(svgEl("stop", { offset: st.offset, "stop-color": st.color, "stop-opacity": st.opacity }));
      }
      // Soft top and bottom edges: the band is a ribbon, not a hard rectangle.
      const vgrad = svgEl("linearGradient", { id: vid, gradientUnits: "userSpaceOnUse", x1: 0, y1: y0, x2: 0, y2: y1 });
      vgrad.appendChild(svgEl("stop", { offset: 0, "stop-color": "#ffffff", "stop-opacity": 0 }));
      vgrad.appendChild(svgEl("stop", { offset: 0.28, "stop-color": "#ffffff", "stop-opacity": 1 }));
      vgrad.appendChild(svgEl("stop", { offset: 0.72, "stop-color": "#ffffff", "stop-opacity": 1 }));
      vgrad.appendChild(svgEl("stop", { offset: 1, "stop-color": "#ffffff", "stop-opacity": 0 }));
      const mask = svgEl("mask", { id: mid, maskUnits: "userSpaceOnUse", x: b.x0, y: y0, width: b.x1 - b.x0, height: y1 - y0 });
      mask.appendChild(svgEl("rect", { x: b.x0, y: y0, width: b.x1 - b.x0, height: y1 - y0, fill: `url(#${vid})` }));
      defs.append(grad, vgrad, mask);
      svg.appendChild(
        svgEl("rect", {
          x: b.x0,
          y: y0,
          width: b.x1 - b.x0,
          height: y1 - y0,
          fill: `url(#${gid})`,
          "fill-opacity": alpha,
          mask: `url(#${mid})`,
        }),
      );
    });
  };

  /** Scroll so a box (px, relative to the wrapper) is in view: Tocar moves the band, Estudiar moves the page. */
  const scrollToBox = (b: { x0: number; y0: number }) => {
    const sc = scrollRef.current;
    const wrap = wrapRef.current;
    if (!sc || !wrap) return;
    if (viewRef.current === "tocar") {
      holdUntilRef.current = performance.now() + 2500;
      sc.scrollTo({ left: Math.max(0, b.x0 - NOW_LINE_FRACTION * sc.clientWidth), behavior: "smooth" });
    } else {
      const top = wrap.getBoundingClientRect().top + window.scrollY + b.y0 - 150;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  };

  const patternHitAt = (e: React.MouseEvent<HTMLDivElement>): PatternHit | null => {
    const wrap = wrapRef.current;
    if (!wrap || !patternHitsRef.current.length) return null;
    const wr = wrap.getBoundingClientRect();
    const x = e.clientX - wr.left;
    const y = e.clientY - wr.top;
    for (const h of patternHitsRef.current) {
      for (const r of h.rects) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return h;
    }
    return null;
  };

  /** Pointer over a pattern box: light up every occurrence of that pattern. */
  const onWrapMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!patternLayerRef.current) return;
    const key = patternHitAt(e)?.key ?? null;
    if (key === patternHoverRef.current) return;
    patternHoverRef.current = key;
    drawPatterns();
    if (wrapRef.current) wrapRef.current.style.cursor = key && !markModeRef.current ? "pointer" : "";
  };
  const onWrapLeave = () => {
    if (patternHoverRef.current === null) return;
    patternHoverRef.current = null;
    drawPatterns();
    if (wrapRef.current) wrapRef.current.style.cursor = "";
  };

  /** Click in "Marcar compás difícil" mode: which measure is under the pointer? */
  const onWrapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!markModeRef.current && patternLayerRef.current) {
      // Click on a pattern box: go to the next occurrence of that pattern.
      const hit = patternHitAt(e);
      const layer = patternLayerRef.current;
      if (hit && layer) {
        const firsts = layer.patterns
          .filter((p) => colorKey(p) === hit.key)
          .flatMap((p) => p.measures.map((o) => o[0]))
          .sort((a, b) => a - b);
        const next = firsts[(firsts.indexOf(hit.first) + 1) % firsts.length];
        const b = measureBoxes().get(next);
        if (b && next !== hit.first) scrollToBox(b);
      }
      return;
    }
    if (!markModeRef.current || !onToggleHardRef.current) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wr = wrap.getBoundingClientRect();
    const x = e.clientX - wr.left;
    const y = e.clientY - wr.top;
    for (const [m, b] of measureBoxes()) {
      if (x >= b.x0 && x < b.x1 && y >= b.y0 && y <= b.y1) {
        onToggleHardRef.current(m);
        return;
      }
    }
  };

  const xAt = (t: number): number | null => {
    const m = timeMapRef.current;
    if (!m.length) return null;
    if (t <= m[0].t) return m[0].x;
    for (let i = 1; i < m.length; i++) {
      if (t <= m[i].t) {
        const a = m[i - 1];
        const b = m[i];
        const f = (t - a.t) / (b.t - a.t || 1);
        return a.x + (b.x - a.x) * f;
      }
    }
    return m[m.length - 1].x;
  };

  /** Melodic line overlay: dots + gradient segments (+ interval labels). */
  const drawLine = () => {
    const svg = overlayRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("width", String(wrap.offsetWidth));
    svg.setAttribute("height", String(wrap.offsetHeight));
    if (!lineRef.current) {
      setLegendKeys((p) => (p.length ? [] : p));
      return;
    }
    const mode = lineModeRef.current;
    const useIntervals = mode !== "notas";

    const iso = isolationRef.current;
    const hands: Hand[] = iso === "rh" ? ["RH"] : iso === "lh" ? ["LH"] : ["RH", "LH"];
    const geo = buildGeometry(notesRef.current, hands);

    const defs = svgEl("defs", {});
    svg.appendChild(defs);
    const halos = svgEl("g", {});
    const lines = svgEl("g", {});
    const dots = svgEl("g", {});
    const labels = svgEl("g", {});
    const hoverLabel = svgEl("g", {});
    const hits = svgEl("g", {});
    labels.setAttribute("pointer-events", "none");
    hoverLabel.setAttribute("pointer-events", "none");
    svg.append(halos, lines, dots, labels, hoverLabel, hits);
    const always = alwaysLabelsRef.current;

    /** Labels are hidden by default: hover shows one segment's label, "Etiquetas siempre" keeps all. */
    const attachLabel = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      visible: SVGElement,
      width: number,
      nodes: SVGElement[],
    ) => {
      if (always) nodes.forEach((n) => labels.appendChild(n));
      const hit = svgEl("line", {
        x1,
        y1,
        x2,
        y2,
        stroke: "#000000",
        "stroke-opacity": 0,
        "stroke-width": 14,
        "stroke-linecap": "butt",
        "pointer-events": "stroke",
      });
      hit.addEventListener("pointerenter", () => {
        if (!always) nodes.forEach((n) => hoverLabel.appendChild(n));
        visible.setAttribute("stroke-width", String(width + 1.5));
      });
      hit.addEventListener("pointerleave", () => {
        if (!always) nodes.forEach((n) => n.remove());
        visible.setAttribute("stroke-width", String(width));
      });
      hits.appendChild(hit);
    };

    const present = new Set<string>();
    let gid = 0;
    for (const g of geo) {
      for (const seg of g.segments) {
        present.add(seg.key);
        // Stop the line at the ring around each notehead so the note itself stays visible.
        const dx = seg.to.cx! - seg.from.cx!;
        const dy = seg.to.cy! - seg.from.cy!;
        const len = Math.hypot(dx, dy);
        if (len < RING_R * 2 + 2) continue;
        const ux = dx / len;
        const uy = dy / len;
        const x1 = seg.from.cx! + ux * RING_R;
        const y1 = seg.from.cy! + uy * RING_R;
        const x2 = seg.to.cx! - ux * RING_R;
        const y2 = seg.to.cy! - uy * RING_R;
        if (useIntervals) {
          const role = intervalRole(seg.key);
          const isOff = !!role && role.enabled === false && seg.key !== "P1";
          const color = role?.color ?? DISABLED_SEGMENT_COLOR;
          const width = isOff ? 1.5 : 3.5;
          if (!isOff) {
            halos.appendChild(
              svgEl("line", { x1, y1, x2, y2, stroke: HALO_COLOR, "stroke-opacity": 0.85, "stroke-width": width + 2.5, "stroke-linecap": "round" }),
            );
          }
          const visLine = svgEl("line", {
            x1,
            y1,
            x2,
            y2,
            stroke: isOff ? DISABLED_SEGMENT_COLOR : color,
            "stroke-width": width,
            "stroke-linecap": "round",
          });
          lines.appendChild(visLine);
          if (!isOff) {
            const text = INTERVAL_KEY_LABEL[seg.key] ?? seg.label;
            const w = text.length * 6.2 + 12;
            const h = 15;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const pill = svgEl("rect", { x: mx - w / 2, y: my - h / 2, width: w, height: h, rx: h / 2, fill: color });
            const t = svgEl("text", {
              x: mx,
              y: my + 3.8,
              "text-anchor": "middle",
              "font-size": 10.5,
              "font-weight": 700,
              fill: readableTextOn(color, PILL_TEXT_DARK, PILL_TEXT_LIGHT),
            });
            t.textContent = text;
            attachLabel(x1, y1, x2, y2, visLine, width, [pill, t]);
          }
          continue;
        }
        const id = `mlg-${g.hand}-${gid++}`;
        const grad = svgEl("linearGradient", {
          id,
          gradientUnits: "userSpaceOnUse",
          x1,
          y1,
          x2,
          y2,
        });
        grad.appendChild(svgEl("stop", { offset: "0", "stop-color": pitchClassColor(seg.from.midi) }));
        grad.appendChild(svgEl("stop", { offset: "1", "stop-color": pitchClassColor(seg.to.midi) }));
        defs.appendChild(grad);
        halos.appendChild(
          svgEl("line", {
            x1,
            y1,
            x2,
            y2,
            stroke: "#ffffff",
            "stroke-opacity": 0.85,
            "stroke-width": 5,
            "stroke-linecap": "round",
          }),
        );
        const visLine = svgEl("line", {
          x1,
          y1,
          x2,
          y2,
          stroke: `url(#${id})`,
          "stroke-width": 2.5,
          "stroke-linecap": "round",
        });
        lines.appendChild(visLine);
        {
          const t = svgEl("text", {
            x: (x1 + x2) / 2,
            y: (y1 + y2) / 2 - 7,
            "text-anchor": "middle",
            "font-size": 11,
            "font-weight": 600,
            fill: "#222222",
            stroke: "#ffffff",
            "stroke-width": 3,
            "paint-order": "stroke",
            "stroke-linejoin": "round",
          });
          t.textContent = seg.label;
          attachLabel(x1, y1, x2, y2, visLine, 2.5, [t]);
        }
      }
      for (const n of g.dots) {
        dots.appendChild(
          svgEl("circle", {
            cx: n.cx!,
            cy: n.cy!,
            r: RING_R,
            fill: "none",
            stroke: mode === "intervalos" ? RING_NEUTRAL_COLOR : pitchClassColor(n.midi),
            "stroke-width": 1.75,
          }),
        );
      }
    }
    const order = ["P1", "m2", "M2", "m3", "M3", "P4", "TT", "P5", "m6", "M6", "m7", "M7", "P8"];
    const keys = useIntervals ? order.filter((k) => present.has(k)) : [];
    setLegendKeys((p) => (p.join() === keys.join() ? p : keys));
  };

  /** Re-measure and redraw without re-rendering OSMD. */
  const relayout = () => {
    measure(notesRef.current);
    drawPatterns();
    drawDegrade();
    drawLine();
    drawChords();
    drawHard();
  };

  /** Render OSMD. In Tocar the zoom is fitted to the band height (zoom slider multiplies on top). */
  const renderScore = (osmd: any, refit: boolean) => {
    const tocar = viewRef.current === "tocar";
    if (tocar && refit) {
      osmd.Zoom = 1;
      osmd.render();
      const svg = containerRef.current?.querySelector("svg");
      const h = svg ? svg.getBoundingClientRect().height : 0;
      const bandH = scrollRef.current?.clientHeight ?? 0;
      fitRef.current = h > 0 && bandH > 0 ? Math.max(0.3, Math.min(4, (bandH - 8) / h)) : 1;
    }
    osmd.Zoom = (tocar ? fitRef.current : 1) * zoomRef.current;
    osmd.render();
  };

  const wireAfterRender = (notesOut: (n: ScheduledNote[]) => void) => {
    runCleanups();
    activeNotes.clearHover();
    setTooltip(null);

    const osmd = osmdRef.current;
    if (!osmd) return;
    const { notes } = parseSheetToNotes(osmd, bpmRef.current);

    notesRef.current = notes;
    paintNotes(notes);
    measure(notes);

    // Chord mates share one <g>: for them the bubble listens on the note's own head, so it names the right note.
    const perG = new Map<Element, number>();
    for (const n of notes) {
      const g0 = n.svgEls?.[0];
      if (g0) perG.set(g0, (perG.get(g0) ?? 0) + 1);
    }
    for (const note of notes) {
      if (!note.svgEls?.length) continue;
      for (const gEl of note.svgEls) {
        const el: SVGElement = (perG.get(gEl) ?? 0) > 1 && note.headEl ? note.headEl : gEl;
        const show = (ev: MouseEvent) => {
          const live = notesRef.current.find((n) => n.id === note.id) ?? note;
          const txt = hoverText(live, notesRef.current);
          setTooltip({ x: ev.clientX, y: ev.clientY, ...txt });
        };
        const onEnter = (ev: MouseEvent) => {
          activeNotes.addHover(note.midi, note.hand);
          el.classList.add("note-hover");
          show(ev);
        };
        const onMove = (ev: MouseEvent) => {
          setTooltip((t) => (t ? { ...t, x: ev.clientX, y: ev.clientY } : t));
        };
        const onLeave = () => {
          activeNotes.removeHover(note.midi, note.hand);
          el.classList.remove("note-hover");
          setTooltip(null);
        };
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mousemove", onMove);
        el.addEventListener("mouseleave", onLeave);
        cleanupRef.current.push(() => {
          el.removeEventListener("mouseenter", onEnter);
          el.removeEventListener("mousemove", onMove);
          el.removeEventListener("mouseleave", onLeave);
        });
      }
    }

    // Per-notehead hover: only that head lights up (fill when its color is not shown, glow when it is).
    for (const note of notes) {
      const head = note.headEl;
      if (!head || !head.isConnected) continue;
      const enter = () => {
        const hh = headHoverStyle(spelledPc(note.spelledName) >= 0 ? spelledPc(note.spelledName) : note.midi % 12, getPalette().roles);
        if (!hh) return;
        head.style.setProperty("--head-color", hh.color);
        head.classList.add(hh.mode === "fill" ? "head-hover-fill" : "head-hover-glow");
      };
      const leave = () => head.classList.remove("head-hover-fill", "head-hover-glow");
      head.addEventListener("mouseenter", enter);
      head.addEventListener("mouseleave", leave);
      cleanupRef.current.push(() => {
        head.removeEventListener("mouseenter", enter);
        head.removeEventListener("mouseleave", leave);
        leave();
      });
    }

    drawPatterns();
    drawDegrade();
    drawLine();
    drawChords();
    drawHard();
    notesOut(notes);
    try {
      const meta = readScoreMeta(osmd, bpmRef.current);
      measureSecRef.current = meta.measures[0] ? meta.measures[0].endSec - meta.measures[0].startSec : 0;
      onScoreDataRef.current?.(notes, meta);
    } catch {
      /* ignore */
    }
  };

  // Initial load / xml / view change — recreate OSMD.
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    setRenderError(null);
    readyRef.current = false;

    if (typeof OpenSheetMusicDisplayCtor !== "function") {
      console.error("OSMD constructor unavailable", OSMDModule);
      setRenderError("Sheet music engine failed to load.");
      return;
    }

    let osmd: any;
    try {
      osmd = new OpenSheetMusicDisplayCtor(container, {
        autoResize: false,
        backend: "svg",
        drawTitle: false,
        drawSubtitle: false,
        drawComposer: false,
        drawCredits: false,
        renderSingleHorizontalStaffline: view === "tocar",
      });
    } catch (e) {
      console.error("OSMD init failed:", e);
      setRenderError("Failed to initialize sheet music engine.");
      return;
    }

    osmdRef.current = osmd;
    let cancelled = false;

    (async () => {
      try {
        await osmd.load(xml);
        if (cancelled) return;
        applyStemColors(osmd);
        renderScore(osmd, true);
        readyRef.current = true;
        wireAfterRender(onNotesRef.current);
      } catch (e) {
        if (cancelled) return;
        console.error("OSMD load/render failed:", e);
        setRenderError("Failed to render sheet music — the file could not be parsed.");
      }
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      runCleanups();
      try {
        activeNotes.clearHover();
      } catch {
        /* ignore */
      }
      osmdRef.current = null;
      try {
        if (container) container.innerHTML = "";
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xml, reloadNonce, view]);

  // Zoom — re-render OSMD and re-wire listeners + line.
  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd || !readyRef.current) return;
    try {
      renderScore(osmd, false);
      wireAfterRender(onNotesRef.current);
    } catch (e) {
      console.error("Zoom render failed:", e);
      setRenderError("Failed to re-render sheet music at this zoom level.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // Container resize — Estudiar re-wraps to the new width; Tocar re-fits to the new height.
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    let lastW = sc.clientWidth;
    let lastH = sc.clientHeight;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const w = sc.clientWidth;
        const h = sc.clientHeight;
        const dw = Math.abs(w - lastW) > 2;
        const dh = Math.abs(h - lastH) > 2;
        lastW = w;
        lastH = h;
        const osmd = osmdRef.current;
        if (!osmd || !readyRef.current) return;
        try {
          if (viewRef.current === "tocar") {
            if (dh) {
              renderScore(osmd, true);
              wireAfterRender(onNotesRef.current);
            } else if (dw) {
              relayout();
            }
          } else if (dw) {
            renderScore(osmd, false);
            wireAfterRender(onNotesRef.current);
          }
        } catch (e) {
          console.error("Resize render failed:", e);
        }
      }, 200);
    });
    ro.observe(sc);
    return () => {
      ro.disconnect();
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Colors — repaint live when the palette changes. Stems need an OSMD re-render (debounced).
  useEffect(() => {
    let lastSig = noteSignature();
    let lastIntSig = intervalSignature();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = subscribeColors(() => {
      drawChords(); // chord role colors may have changed
      drawHard();
      drawDegrade(); // the band follows the note colors
      const sig = noteSignature();
      const intSig = intervalSignature();
      if (intSig !== lastIntSig) {
        lastIntSig = intSig;
        drawLine();
      }
      if (sig === lastSig) return;
      lastSig = sig;
      paintNotes(notesRef.current); // accidentals + hover color, instant
      drawLine(); // line + dots follow the palette instantly
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const osmd = osmdRef.current;
        if (!osmd || !readyRef.current) return;
        try {
          applyStemColors(osmd);
          renderScore(osmd, false);
          wireAfterRender(onNotesRef.current);
        } catch (e) {
          console.error("Color re-render failed:", e);
        }
      }, 150);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // BPM — recompute timings only.
  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd || !readyRef.current) return;
    try {
      const { notes } = parseSheetToNotes(osmd, bpm);
      notesRef.current = notes;
      measure(notes);
      onNotesRef.current(notes);
      const meta = readScoreMeta(osmd, bpm);
      measureSecRef.current = meta.measures[0] ? meta.measures[0].endSec - meta.measures[0].startSec : 0;
      onScoreDataRef.current?.(notes, meta);
      drawPatterns();
      drawDegrade();
      drawChords();
      drawHard();
    } catch (e) {
      console.error("BPM recompute failed:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm]);

  // Line / intervals / isolation — redraw the overlay.
  useEffect(() => {
    const root = containerRef.current;
    if (root) root.dataset.isolation = isolation;
    drawLine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line, intervals, isolation, lineMode]);

  // Chord highlight / occurrence box — redraw the chord overlay.
  useEffect(() => {
    drawChords();
    drawHard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chordMarks, occurrenceMark, highlightChords]);

  // Pattern boxes / degradé — redraw when the layer or its settings change.
  useEffect(() => {
    patternHoverRef.current = null;
    if (wrapRef.current) wrapRef.current.style.cursor = "";
    drawPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patternLayer]);
  useEffect(() => {
    drawDegrade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [degradeLayer]);
  // Hard measures / selected measure — redraw the amber boxes.
  useEffect(() => {
    drawHard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hardMeasures, highlightMeasure]);

  // Scroll the score to a measure (Recorrido, step 6).
  useEffect(() => {
    if (!focusMeasure) return;
    const sc = scrollRef.current;
    const wrap = wrapRef.current;
    const b = measureBoxes().get(focusMeasure.measure);
    if (!b || !sc || !wrap) return;
    scrollToBox(b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMeasure]);

  // Scroll the score to a chord (Estudiar: page scroll; Tocar: band scroll under the "now" line).
  useEffect(() => {
    if (!focusChord) return;
    const chord = chordMarksRef.current[focusChord.index];
    const sc = scrollRef.current;
    const wrap = wrapRef.current;
    if (!chord || !sc || !wrap) return;
    const pos = chordPosition(chord);
    if (!pos) return;
    if (viewRef.current === "tocar") {
      holdUntilRef.current = performance.now() + 2500;
      sc.scrollTo({ left: Math.max(0, pos.x - NOW_LINE_FRACTION * sc.clientWidth), behavior: "smooth" });
    } else {
      const top = wrap.getBoundingClientRect().top + window.scrollY + pos.y - 150;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusChord]);

  // Tocar auto-scroll: keep the playback position under the fixed "now" line.
  useEffect(() => {
    if (view !== "tocar") return;
    const sc = scrollRef.current;
    if (!sc) return;
    if (!isPlaying) {
      if (getPlaybackSeconds() < 0.01) sc.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    let raf = 0;
    const tick = () => {
      if (performance.now() > holdUntilRef.current) {
        const x = xAt(getPlaybackSeconds());
        if (x !== null) {
          const max = sc.scrollWidth - sc.clientWidth;
          const target = Math.max(0, Math.min(max, x - NOW_LINE_FRACTION * sc.clientWidth));
          const diff = target - sc.scrollLeft;
          sc.scrollLeft = Math.abs(diff) > 60 ? sc.scrollLeft + diff * 0.2 : target;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, view]);

  // Tocar manual scrolling: drag (and wheel) pauses the follow for a moment.
  const dragRef = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (view !== "tocar" || e.button !== 0) return;
    dragRef.current = { x: e.clientX, left: scrollRef.current?.scrollLeft ?? 0, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const sc = scrollRef.current;
    if (!d || !sc) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true;
      try {
        sc.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (d.moved) {
      holdUntilRef.current = performance.now() + 1500;
      sc.scrollLeft = d.left - dx;
    }
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const tocar = view === "tocar";
  const tipRight = tooltip ? tooltip.x > window.innerWidth - 280 : false;

  return (
    <div className={tocar ? "relative h-full w-full bg-background" : "relative w-full bg-background"}>
      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={() => {
          holdUntilRef.current = performance.now() + 1500;
        }}
        className={
          tocar ? "h-full w-full cursor-grab overflow-x-auto overflow-y-hidden" : "w-full"
        }
      >
        <div
          ref={wrapRef}
          onClick={onWrapClick}
          onMouseMove={onWrapMove}
          onMouseLeave={onWrapLeave}
          className={markMode ? "relative cursor-crosshair" : "relative"}
          style={
            tocar
              ? {
                  display: "flex",
                  alignItems: "center",
                  minHeight: "100%",
                  width: "max-content",
                  minWidth: "100%",
                  paddingLeft: `${NOW_LINE_FRACTION * 100}%`,
                  paddingRight: `${(1 - NOW_LINE_FRACTION) * 100}%`,
                }
              : { padding: 16 }
          }
        >
          {/* Behind the notes: pattern boxes first, then the degradé. The score sits above them. */}
          <svg ref={patternSvgRef} className="pointer-events-none absolute left-0 top-0" aria-hidden />
          <svg ref={degradeSvgRef} className="pointer-events-none absolute left-0 top-0" aria-hidden />
          <div
            ref={containerRef}
            className="score-root"
            style={tocar ? { flex: "none", minWidth: 200, position: "relative" } : { width: "100%", position: "relative" }}
          />
          <svg ref={overlayRef} className="pointer-events-none absolute left-0 top-0" />
          <svg ref={chordSvgRef} className="pointer-events-none absolute left-0 top-0" />
          <svg ref={hardSvgRef} className="pointer-events-none absolute left-0 top-0" />
        </div>
      </div>

      {line && lineMode !== "notas" && <IntervalLegend keys={legendKeys} />}

      {tocar && (
        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-px bg-primary/60"
          style={{ left: `${NOW_LINE_FRACTION * 100}%` }}
          aria-hidden
        />
      )}

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 max-w-[260px] rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
          style={{
            left: tooltip.x + (tipRight ? -14 : 14),
            top: tooltip.y + 16,
            transform: tipRight ? "translateX(-100%)" : undefined,
          }}
        >
          <div className="flex items-baseline gap-2" data-testid="tip-note">
            <ChordNoteChips spelled={[tooltip.own.spelled]} size="lg" />
            <span className="text-sm font-medium">{tooltip.own.duration}</span>
            {tooltip.beat ? <span className="text-[11px] text-muted-foreground">tiempo {tooltip.beat}</span> : null}
          </div>
          {/* Small measure: barlines left and right, measure number top-left. */}
          <div
            className="relative mt-1.5 rounded-md border-x-2 border-y border-y-border border-x-foreground/80 px-2.5 pb-1.5 pt-4"
            data-testid="tip-measure"
          >
            <span className="absolute left-1.5 top-0.5 text-[10px] leading-3 text-muted-foreground">
              compás {tooltip.measure}
            </span>
            {tooltip.chord && (
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Suenan juntas
              </div>
            )}
            <ChordNoteChips
              spelled={tooltip.chord ? tooltip.chord.tones : [tooltip.own.spelled]}
              ownIndex={tooltip.chord ? tooltip.chord.ownIndex : 0}
            />
            {tooltip.chord && (tooltip.chord.name || tooltip.chord.interval) && (
              <div className="mt-1 text-[11px] font-medium">{tooltip.chord.name ?? tooltip.chord.interval}</div>
            )}
          </div>
        </div>
      )}

      {renderError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div className="pointer-events-auto max-w-md rounded-lg border border-border bg-card p-5 text-center shadow-sm">
            <div className="text-sm font-medium text-foreground">{renderError}</div>
            <div className="mt-1 text-xs italic text-muted-foreground">
              Try re-uploading or use a different file.
            </div>
            <button
              type="button"
              onClick={() => {
                setRenderError(null);
                setReloadNonce((n) => n + 1);
              }}
              className="mt-3 inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
