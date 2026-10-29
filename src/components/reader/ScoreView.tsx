import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as OSMDModule from "opensheetmusicdisplay";
import { applyStemColors, parseSheetToNotes } from "@/lib/music/parseMusicXml";
import { activeNotes, getPlaybackSeconds } from "@/lib/music/scheduler";
import { systemStartX } from "@/lib/music/boxMath";
import { readLayoutInfo, withTitle } from "@/lib/music/layoutInfo";
import { accidentalOwners, keySigAccidentals, modifierOwners, nearestMidiForPc } from "@/lib/music/accidentals";
import { anchorScroll, canStartEstudiarDrag, centerScroll, tocarPadY } from "@/lib/music/panMath";
import { hoverText, INTERVAL_KEY_LABEL, solfegeName } from "@/lib/music/naming";
import { noteContext, pitchOf, type NoteContext } from "@/lib/music/analysis/noteContext";
import { buildScaleView, type ScaleView } from "@/lib/music/analysis/scaleView";
import { ScaleInKey } from "./ScaleInKey";
import { KeyPanel } from "./KeyPanel";
import { buildKeySigView, fifthsAtMeasure, keyEvidence, measureRangeOf, type KeySigView } from "@/lib/music/analysis/keySignature";
import { labelWidth, layoutLabels } from "@/lib/music/analysis/chordNames";
import { playChordMidi, playNoteMidi } from "@/lib/music/analysis/audio";
import { detectKeyFromNotes, type KeyInfo } from "@/lib/music/analysis/key";
import { buildGeometry } from "@/lib/music/melodicLine";
import { pitchClassColor } from "@/lib/music/midiUtils";
import { colorMidiOf, getColorBy, subscribeColorBy } from "@/lib/colors/colorBy";
import { analysisFifths, analysisNotes, soundingOf, toConcert, writtenAndSounding } from "@/lib/music/transpose";
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
import { pieceChords, type PieceChord } from "@/lib/music/analysis/pieceChords";
import { getPalette, getRole } from "@/lib/colors/store";
import { headHoverStyle, spelledPc } from "@/lib/colors/noteChip";
import { buildNoteHitIndex, nearestNoteHit, type HeadBox, type NoteHitIndex } from "@/lib/music/noteHit";
import { bandScrollTop } from "@/lib/music/scrollMath";
import {
  clefForNote,
  clefGlyph,
  clientToSvg,
  closeupBox,
  ledgerLineYs,
  measuredStep,
  pickNearestStaff,
  placePanel,
  shouldFlip,
  staffLineYs,
} from "@/lib/music/closeup";
import { readTipMore, writeTipMore } from "@/lib/ui/uiPrefs";
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
  /** Bumps each time she asks to re-center ("Centrar" button or the C key). */
  centerNonce?: number;
  /** Hoja page header: her rename, else the file's title, else the cleaned filename. Null: draw none. */
  title?: string | null;
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
  /** Estudiar: px kept free on the right (the Ficha sheet) so the systems reflow into the visible width. */
  rightInset?: number;
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
  /** "Nombres de acordes": written chord names above the top staff. index = position in `chordMarks`. null = layer off. */
  chordNames?: { items: Array<{ index: number; text: string; outOfKey: boolean; reason: string }> } | null;
  /** Reports the strongest intensity that keeps black noteheads at 4.5:1 for the current notes. */
  onDegradeCap?: (cap: number) => void;
  /** Key of the piece (detected or chosen in the Ficha) for the hover panel; null = the panel detects it itself. */
  hoverKey?: KeyInfo | null;
}

/** Hover zone over a key signature (or the empty gap where one would be) at the start of a staff. */
interface KeyZone {
  el: SVGGElement | null;
  x0: number;
  y0: number;
  y1: number;
  x1: number;
  system: number;
  staff: number;
  /** Measure the signature governs (first note to its right), null if unknown. */
  measure: number | null;
  /** True when no glyphs are drawn here (the zone is only meaningful for a piece with no signature). */
  empty: boolean;
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
/** Hoja: width (px) of one page at zoom 100%, and the OSMD zoom that gives the printed look at that width. */
const HOJA_BASE_W = 820;
const HOJA_OSMD_ZOOM = 0.7;
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

/** Pointer grace before the tag / panel close (ms). */
const TIP_GRACE_MS = 250;
/** Width of the unfolded panel and the room a tag + panel need to the side of a note. */
const TIP_PANEL_W = 290;
const TIP_NEED_W = TIP_PANEL_W + 110;

interface TooltipState {
  /** Colored name tag glued to the notehead itself, so name, color and position are seen in one glance. */
  tag: { x: number; y: number; left: boolean };
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
  centerNonce = 0,
  title = null,
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
  rightInset = 0,
  hardMeasures = [],
  markMode = false,
  onToggleHardMeasure,
  highlightMeasure = null,
  focusMeasure = null,
  patternLayer = null,
  degradeLayer = null,
  chordNames = null,
  onDegradeCap,
  hoverKey = null,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<SVGSVGElement | null>(null);
  const chordSvgRef = useRef<SVGSVGElement | null>(null);
  const hardSvgRef = useRef<SVGSVGElement | null>(null);
  const patternSvgRef = useRef<SVGSVGElement | null>(null);
  const degradeSvgRef = useRef<SVGSVGElement | null>(null);
  const chordNameSvgRef = useRef<SVGSVGElement | null>(null);
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
  const rightInsetRef = useRef(rightInset);
  rightInsetRef.current = view !== "tocar" ? rightInset : 0;
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
  const chordNamesRef = useRef(chordNames);
  chordNamesRef.current = chordNames;
  const degradeLayerRef = useRef(degradeLayer);
  degradeLayerRef.current = degradeLayer;
  const onDegradeCapRef = useRef(onDegradeCap);
  onDegradeCapRef.current = onDegradeCap;
  /** Boxes drawn right now (for hover and click), and the pattern color key under the pointer. */
  const patternHitsRef = useRef<PatternHit[]>([]);
  const patternHoverRef = useRef<string | null>(null);
  /** Top and bottom (px, relative to the wrapper) of every staff, per system id, top staff first. */
  /** Hit-test index of the notehead zones (rebuilt by measure()) + the note currently lit by the pointer. */
  const hitIndexRef = useRef<NoteHitIndex | null>(null);
  const hoverRef = useRef<{ note: ScheduledNote; els: Element[]; halo: Element[]; head?: SVGElement; x: number; y: number } | null>(null);
  const staffRowsRef = useRef<Map<number, Array<{ top: number; bottom: number }>>>(new Map());
  /** Length of one measure in seconds: a silence this long cuts the degradé. */
  const measureSecRef = useRef(0);
  /** Top staff line (px, relative to the wrapper) of each system id. */
  const systemTopRef = useRef<Map<number, number>>(new Map());
  const fitRef = useRef(1);
  const timeMapRef = useRef<Array<{ t: number; x: number }>>([]);
  const holdUntilRef = useRef(0);

  const [renderError, setRenderError] = useState<string | null>(null);
  /** Hoja: the file has no printed line / page breaks, so OSMD laid the pages out by itself. */
  const [autoLayout, setAutoLayout] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [legendKeys, setLegendKeys] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  /** Side panel unfolded from the tag (hover), kept open by pointer or by a click (pinned). */
  const [panelOpen, setPanelOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [panelCtx, setPanelCtx] = useState<NoteContext | null>(null);
  const [panelScale, setPanelScale] = useState<ScaleView | null>(null);
  /** Key-signature hover: tag + the panel's content (same tag/panel mechanism as a note). */
  const [keyHover, setKeyHover] = useState<{ tag: { x: number; y: number; left: boolean }; view: KeySigView } | null>(null);
  const keyZonesRef = useRef<KeyZone[]>([]);
  const keyHoverRef = useRef<{ zone: KeyZone; els: Element[] } | null>(null);
  /** Cropped, enlarged copy of the printed score around the hovered note (the "photo" at the top of the panel). */
  const [panelCloseup, setPanelCloseup] = useState<SVGSVGElement | null>(null);
  const [panelPos, setPanelPos] = useState<{ side: "left" | "right"; shiftY: number; maxH: number; flipped: boolean }>({ side: "right", shiftY: 0, maxH: 600, flipped: false });
  /** "Más": armonía, suenan ahora and melodía are open (remembered in hh.ui.v1). */
  const [tipMore, setTipMore] = useState(false);
  const tipRootRef = useRef<HTMLDivElement | null>(null);
  const tipTagRef = useRef<HTMLButtonElement | null>(null);
  const tipPanelRef = useRef<HTMLDivElement | null>(null);
  /** Mirrors of the panel state for the pointer handlers (no stale closures). */
  const tipRef = useRef({ over: false, pinned: false, open: false, zone: false, timer: 0 });
  const metaRef = useRef<ScoreMeta | null>(null);
  const hoverKeyRef = useRef(hoverKey);
  hoverKeyRef.current = hoverKey;
  const fallbackRef = useRef<{ notes: ScheduledNote[]; key: KeyInfo | null; chords: PieceChord[] } | null>(null);

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

  /** Pitch class that colors a hovered note: its spelling, or the sounding pitch under "Color por: suena". */
  const hoverPc = (note: ScheduledNote) =>
    getColorBy() === "sounding" ? colorMidiOf(note) % 12 : spelledPc(note.spelledName) >= 0 ? spelledPc(note.spelledName) : note.midi % 12;

  /** Repaint accidentals and the hover/playing color from the palette. No OSMD re-render needed. */
  const paintNotes = (notes: ScheduledNote[]) => {
    for (const note of notes) {
      const cm = colorMidiOf(note);
      const color = pitchClassColor(cm);
      const accColor = noteTargetOn(cm, "accidental") ? color : PLAIN_COLOR;
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
    paintKeySignatures();
  };

  /** Each sharp / flat of a key signature wears the color of the note it alters (F# line -> Fa# color), unless that note's color is off. */
  const paintKeySignatures = () => {
    for (const z of keyZonesRef.current) {
      if (!z.el) continue;
      const fifths = fifthsForZone(z);
      if (fifths === null || fifths === 0) continue;
      const glyphs = keySigAccidentals(fifths, z.staff === 0 ? "treble" : "bass");
      const paths = Array.from(z.el.querySelectorAll<SVGElement>("path")).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      if (paths.length !== glyphs.length) continue; // unexpected drawing: leave it black
      paths.forEach((p, i) => {
        const pc = glyphs[i].pc;
        const c = noteTargetOn(pc, "accidental") ? pitchClassColor(pc) : PLAIN_COLOR;
        p.setAttribute("fill", c);
        p.style.fill = c;
      });
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
      // Each printed accidental goes to the head it sits in front of, so it can wear that note's color.
      if (headEls.length === ranked.length) {
        const hb = headEls.map((h) => {
          const r = h.getBoundingClientRect();
          return { cy: r.top + r.height / 2, left: r.left, right: r.right };
        });
        const modEls = Array.from(el.querySelectorAll<SVGElement>(".vf-modifiers path"));
        const sp = Math.max(4, hb.length ? headEls[0].getBoundingClientRect().height : 8);
        const owners = accidentalOwners(
          hb,
          modEls.map((m) => {
            const r = m.getBoundingClientRect();
            return { cy: r.top + r.height / 2, left: r.left, right: r.right, w: r.width, h: r.height };
          }),
          sp,
        );
        ranked.forEach((n) => (n.accidentalEls = []));
        owners.forEach((o, i) => {
          if (o >= 0) ranked[o].accidentalEls!.push(modEls[i]);
        });
      }
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

    // Hover zones: one box per notehead (wrap-relative px), staff spacing and stave midpoints per system.
    const spBySys = new Map<number, number>();
    const splits = new Map<number, number[]>();
    for (const [id, rs] of staffRows) {
      const sps = rs.map((r) => (r.bottom - r.top) / 4).filter((v) => v > 1);
      if (sps.length) spBySys.set(id, sps.reduce((a, b) => a + b, 0) / sps.length);
      splits.set(id, rs.slice(1).map((r, i) => (rs[i].bottom + r.top) / 2));
    }
    const boxes: HeadBox[] = [];
    for (const n of notes) {
      if (n.cx === undefined || n.cy === undefined) continue;
      const sp = spBySys.get(n.system ?? 0) ?? 8;
      let w = sp * 1.3;
      let h = sp;
      if (n.headEl?.isConnected) {
        const r = n.headEl.getBoundingClientRect();
        if (r.width || r.height) {
          w = r.width;
          h = r.height;
        }
      }
      boxes.push({ id: String(n.id), system: n.system ?? 0, x: n.cx, y: n.cy, w, h });
    }
    hitIndexRef.current = buildNoteHitIndex(boxes, { staffSpace: spBySys, splits });

    // Key-signature zones: one per drawn signature (both staves, every system, and mid-piece changes), plus, where no
    // signature is drawn, the gap right after the clef (for a piece without alterations).
    const rowOf = (cy: number) => {
      let best = Infinity;
      let system = 0;
      let staff = 0;
      for (const [id, rs] of staffRows) {
        rs.forEach((row, i) => {
          const d = Math.abs((row.top + row.bottom) / 2 - cy);
          if (d < best) {
            best = d;
            system = id;
            staff = i;
          }
        });
      }
      return { system, staff };
    };
    const firstMeasureAfter = (system: number, x: number) => {
      let best: ScheduledNote | undefined;
      for (const n of notes) {
        if ((n.system ?? 0) !== system || n.cx === undefined || n.cx < x - 2) continue;
        if (!best || n.cx < best.cx!) best = n;
      }
      return best?.measure ?? null;
    };
    const zones: KeyZone[] = [];
    containerRef.current?.querySelectorAll<SVGGElement>("g.vf-keysignature").forEach((g) => {
      const r = g.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const { system, staff } = rowOf((r.top + r.bottom) / 2 - wr.top);
      zones.push({
        el: g,
        x0: r.left - wr.left - 5,
        x1: r.right - wr.left + 5,
        y0: r.top - wr.top - 6,
        y1: r.bottom - wr.top + 6,
        system,
        staff,
        measure: firstMeasureAfter(system, r.right - wr.left),
        empty: false,
      });
    });
    containerRef.current?.querySelectorAll<SVGGElement>("g.vf-clef").forEach((g) => {
      const r = g.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const { system, staff } = rowOf((r.top + r.bottom) / 2 - wr.top);
      if (zones.some((z) => z.system === system && z.staff === staff && z.x0 < r.right - wr.left + 40 && z.x1 > r.right - wr.left)) return;
      const row = staffRows.get(system)?.[staff];
      if (!row) return;
      const x = r.right - wr.left;
      zones.push({ el: null, x0: x + 3, x1: x + 20, y0: row.top - 4, y1: row.bottom + 4, system, staff, measure: firstMeasureAfter(system, x + 20), empty: true });
    });
    keyZonesRef.current = zones;
  };

  /** The pointer is on the tag or the panel, or the panel is pinned: the hovered note is frozen. */
  const tipFrozen = () => tipRef.current.over || tipRef.current.pinned;

  const cancelClose = () => {
    if (tipRef.current.timer) window.clearTimeout(tipRef.current.timer);
    tipRef.current.timer = 0;
  };

  /** After a short grace: fold the panel; drop the hover unless the pointer is back in the note's zone. */
  const scheduleClose = () => {
    const t = tipRef.current;
    if (t.timer) return;
    t.timer = window.setTimeout(() => {
      t.timer = 0;
      if (t.over || t.pinned) return;
      if (t.open) {
        t.open = false;
        setPanelOpen(false);
      }
      if (!t.zone) clearNoteHover();
    }, TIP_GRACE_MS);
  };

  /** Stop lighting the key signature (halo, tag). */
  const clearKeyHover = () => {
    const kh = keyHoverRef.current;
    if (!kh) return;
    keyHoverRef.current = null;
    kh.els.forEach((el) => el.classList.remove("note-halo"));
    setKeyHover(null);
  };

  /** Signature (sharps +/flats -) a zone stands for: the signature in force at its measure. */
  const fifthsForZone = (z: KeyZone): number | null => {
    const meta = metaRef.current;
    const m = z.measure ?? 1;
    return fifthsAtMeasure(meta?.keyChanges ?? [], m, meta?.fifths ?? null);
  };

  /** Everything the panel needs for the signature in force at a zone: detection runs on the stretch it governs. */
  const keyViewFor = (z: KeyZone, fifths: number): KeySigView => {
    const meta = metaRef.current;
    const all = notesRef.current;
    const range = measureRangeOf(meta?.keyChanges ?? [], z.measure ?? 1);
    const part = all.filter((n) => n.measure >= range.from && n.measure <= range.to);
    const sub = part.length ? part : all;
    let det: ReturnType<typeof detectKeyFromNotes> | null = null;
    try {
      if (sub.length) det = detectKeyFromNotes(analysisNotes(sub, meta?.transpose), analysisFifths(fifths, meta?.transpose));
    } catch {
      det = null;
    }
    // The Ficha's key (maybe chosen by hand) wins when it matches this signature.
    const fk = hoverKeyRef.current;
    const key = fk && fk.fifths === fifths ? fk : (det?.best.key ?? null);
    const word = key && det && key.id === det.best.key.id ? det.confidenceWord : undefined;
    return buildKeySigView(fifths, z.staff === 0 ? "treble" : "bass", key, key ? keyEvidence(analysisNotes(sub, meta?.transpose), key) : [], word, meta?.transpose.kind === "uniform" ? meta.transpose.semitones : 0);
  };

  /** Tag beside the zone (re-read live so scrolling keeps it attached). */
  const placeKeyTag = (force: boolean) => {
    const kh = keyHoverRef.current;
    const wrap = wrapRef.current;
    if (!kh || !wrap) return;
    const wr = wrap.getBoundingClientRect();
    const left = wr.left + kh.zone.x0;
    const right = wr.left + kh.zone.x1;
    const rightEdge = window.innerWidth - rightInsetRef.current;
    const fitsRight = right + 5 + TIP_NEED_W <= rightEdge;
    const tagLeft = !fitsRight && left - 5 - TIP_NEED_W >= 0;
    const x = Math.round(tagLeft ? left - 5 : right + 5);
    const y = Math.round(wr.top + kh.zone.y0 - 12); // above the staff, so the time signature stays visible
    setKeyHover((prev) => (prev && !force && prev.tag.x === x && prev.tag.y === y ? prev : prev && { ...prev, tag: { x, y, left: tagLeft } }));
  };

  const showKeyHover = (z: KeyZone) => {
    const fifths = fifthsForZone(z);
    if (fifths === null || (z.empty && fifths !== 0)) return;
    clearNoteHover();
    // Light every signature of this system that sits at the same x (both staves).
    const group = keyZonesRef.current.filter((o) => o.el && o.system === z.system && Math.abs(o.x0 - z.x0) < 6);
    const els = group.map((o) => o.el!).filter(Boolean);
    els.forEach((el) => el.classList.add("note-halo"));
    keyHoverRef.current = { zone: z, els };
    containerRef.current?.classList.add("in-note-zone");
    tipRef.current.zone = true;
    const view = keyViewFor(z, fifths);
    setKeyHover({ tag: { x: 0, y: 0, left: false }, view });
    placeKeyTag(true);
  };

  const openKeyPanel = () => {
    const kh = keyHoverRef.current;
    if (!kh) return;
    const t = tipRef.current;
    t.over = true;
    cancelClose();
    if (t.open) return;
    t.open = true;
    setPanelOpen(true);
  };

  /** Stop lighting the hovered note: head, <g>, piano key, tag and panel. */
  const clearNoteHover = () => {
    cancelClose();
    const t = tipRef.current;
    t.over = false;
    t.pinned = false;
    t.open = false;
    t.zone = false;
    setPanelOpen(false);
    setPinned(false);
    setPanelCtx(null);
    setPanelScale(null);
    setPanelCloseup(null);
    clearKeyHover();
    const cur = hoverRef.current;
    if (!cur) return;
    hoverRef.current = null;
    activeNotes.removeHover(soundingOf(cur.note), cur.note.hand);
    cur.els.forEach((el) => el.classList.remove("note-hover"));
    cur.halo.forEach((el) => el.classList.remove("note-halo"));
    cur.head?.classList.remove("head-hover-fill", "head-hover-glow");
    cur.note.accidentalEls?.forEach((a) => a.classList.remove("head-hover-fill", "head-hover-glow"));
    containerRef.current?.classList.remove("in-note-zone");
    setTooltip(null);
  };

  /** Light a note exactly as the old per-head hover did; the bubble sits above or below the staff, never on the notes. */
  const showNoteHover = (note: ScheduledNote) => {
    const head = note.headEl?.isConnected ? note.headEl : undefined;
    const shared = (g: SVGGElement) => notesRef.current.filter((n) => n.svgEls?.[0] === g).length > 1;
    const els: Element[] = (note.svgEls ?? []).map((g) => (shared(g) && head ? head : g));
    activeNotes.addHover(soundingOf(note), note.hand);
    els.forEach((el) => el.classList.add("note-hover"));
    // White border around the whole note or chord (head, stem, flag) so its color stands out on any background.
    const halo: Element[] = note.svgEls ?? [];
    halo.forEach((el) => el.classList.add("note-halo"));
    if (head) {
      const hh = headHoverStyle(hoverPc(note), getPalette().roles);
      if (hh) {
        head.style.setProperty("--head-color", hh.color);
        head.classList.add(hh.mode === "fill" ? "head-hover-fill" : "head-hover-glow");
      }
    }
    // Its accidental lights up with it.
    if (head) {
      const hh2 = headHoverStyle(hoverPc(note), getPalette().roles);
      if (hh2) {
        for (const a of note.accidentalEls ?? []) {
          a.style.setProperty("--head-color", hh2.color);
          a.classList.add(hh2.mode === "fill" ? "head-hover-fill" : "head-hover-glow");
        }
      }
    }
    containerRef.current?.classList.add("in-note-zone");
    hoverRef.current = { note, els, halo, head, x: NaN, y: NaN };
    tipRef.current.zone = true;
  };

  /** Key and chords for the panel: the Ficha's when it has them, else detected here once per score. */
  const analysisForPanel = (): { key: KeyInfo | null; chords: PieceChord[] } => {
    if (hoverKeyRef.current) return { key: hoverKeyRef.current, chords: chordMarksRef.current };
    const notes = notesRef.current;
    if (fallbackRef.current?.notes !== notes) {
      let key: KeyInfo | null = null;
      let chords: PieceChord[] = [];
      try {
        if (notes.length) {
          const tr = metaRef.current?.transpose;
          const heard = analysisNotes(notes, tr);
          key = detectKeyFromNotes(heard, analysisFifths(metaRef.current?.fifths, tr)).best.key;
          if (metaRef.current) chords = pieceChords(heard, key, metaRef.current, bpmRef.current);
        }
      } catch {
        /* no analysis: the panel just leaves those sections out */
      }
      fallbackRef.current = { notes, key, chords };
    }
    return fallbackRef.current;
  };

  /** Pointer entered the tag: unfold the panel (hover) with this note's analysis. */
  /**
   * A window of the page SVG around `note`, cloned and enlarged: what the note looks like on the page (color + shape +
   * place on the staff). Only the hovered notehead is painted with her note color; everything else stays as printed.
   */
  const buildCloseup = (note: ScheduledNote): SVGSVGElement | null => {
    try {
      const wrap = wrapRef.current;
      const head: Element | undefined = note.headEl?.isConnected ? note.headEl : note.svgEls?.[0];
      const svg = head?.closest("svg") as SVGSVGElement | null | undefined;
      if (!wrap || !head || !svg) return null;
      const svgRect = svg.getBoundingClientRect();
      const vbl = svg.viewBox?.baseVal;
      const vb = vbl && vbl.width > 0 ? { x: vbl.x, y: vbl.y, w: vbl.width, h: vbl.height } : { x: 0, y: 0, w: svgRect.width, h: svgRect.height };
      const hr = head.getBoundingClientRect();
      const c = clientToSvg({ x: hr.left + hr.width / 2, y: hr.top + hr.height / 2 }, svgRect, vb);
      const k = vb.w / (svgRect.width || 1); // client px -> svg units
      const clientCy = hr.top + hr.height / 2;
      const group = head.closest(".vf-stavenote") ?? head.parentElement;
      // The five printed lines of the head's own staff: zero-height line paths that span the head, grouped into staves.
      const spHint = Math.max(4, hr.height * 0.95);
      const nearYs: number[] = [];
      svg.querySelectorAll("g.staffline path").forEach((p) => {
        const r = p.getBoundingClientRect();
        if (r.height < 0.5 && r.width > spHint * 4 && r.left <= hr.left && r.right >= hr.right && Math.abs(r.top - clientCy) < 14 * spHint) nearYs.push(r.top);
      });
      const lines = pickNearestStaff(nearYs, spHint, clientCy);
      if (!lines) return null;
      const spPx = (lines.bottom - lines.top) / 4;
      const sp = spPx * k;
      const staffTopY = clientToSvg({ x: 0, y: lines.top }, svgRect, vb).y;
      const staffBottomY = clientToSvg({ x: 0, y: lines.bottom }, svgRect, vb).y;
      const clef = clefForNote(note.spelledName, note.midi, measuredStep(clientCy, lines.bottom, spPx), note.hand);
      // Which pieces of the printed note belong to THIS head: its own paths, the stem, its accidental and dots.
      const keep: Element[] = [];
      let stemY: number | undefined;
      if (group) {
        const headPaths: Element[] = head.tagName.toLowerCase() === "path" ? [head] : Array.from(head.querySelectorAll("path"));
        keep.push(...headPaths);
        const allHeads = Array.from(group.querySelectorAll(".vf-notehead path"));
        const heads = allHeads.length ? allHeads : headPaths;
        const rect = (e: Element) => e.getBoundingClientRect();
        const ownIdx = heads.findIndex((h) => headPaths.includes(h));
        const mods = Array.from(group.querySelectorAll(".vf-modifiers path"));
        const owner = modifierOwners(
          heads.map((h) => ({ cy: rect(h).top + rect(h).height / 2, left: rect(h).left, right: rect(h).right })),
          mods.map((m) => ({ cy: rect(m).top + rect(m).height / 2, left: rect(m).left, right: rect(m).right, w: rect(m).width, h: rect(m).height })),
          spPx,
        );
        mods.forEach((m, i) => {
          if (ownIdx >= 0 && owner[i] === ownIdx) keep.push(m);
        });
        group.querySelectorAll(".vf-stem, .vf-flag").forEach((e) => {
          keep.push(e);
          const r = rect(e);
          if (r.height > 0 && e.classList.contains("vf-stem")) {
            const far = Math.abs(r.top - clientCy) > Math.abs(r.bottom - clientCy) ? r.top : r.bottom;
            stemY = clientToSvg({ x: 0, y: far }, svgRect, vb).y;
          }
        });
      } else {
        keep.push(head);
      }
      const box = closeupBox({ cx: c.x, cy: c.y, sp, staffTop: staffTopY, staffBottom: staffBottomY, clef, stemY });
      // Same child-index path from the root, to find an element inside the clone.
      const pathOf = (el: Element): number[] => {
        const path: number[] = [];
        for (let e: Element | null = el; e && e !== svg; e = e.parentElement) {
          path.unshift(Array.prototype.indexOf.call(e.parentElement?.children ?? [], e));
        }
        return path;
      };
      const clone = svg.cloneNode(true) as SVGSVGElement;
      const inClone = (el: Element): Element | undefined => {
        let t: Element | undefined = clone;
        for (const i of pathOf(el)) t = t?.children[i];
        return t;
      };
      clone.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));
      clone.removeAttribute("id");
      clone.querySelectorAll(".note-hover, .note-halo, .head-hover-fill, .head-hover-glow, .chord-hl").forEach((e) => {
        e.classList.remove("note-hover", "note-halo", "head-hover-fill", "head-hover-glow", "chord-hl");
      });
      // Everything is hidden except the pieces above: visibility is inherited, so a "visible" leaf shows through.
      clone.setAttribute("style", "visibility:hidden");
      for (const el of keep) {
        const t = inClone(el);
        if (!t) continue;
        (t as SVGElement).style.visibility = "visible";
        // A stem is the printed black one (the page may tint it with a chord mate's color).
        if (el.classList.contains("vf-stem") || el.classList.contains("vf-flag")) {
          [t, ...Array.from(t.querySelectorAll("*"))].forEach((e) => {
            (e as SVGElement).style.stroke = "#111";
            if (e.tagName.toLowerCase() === "path") (e as SVGElement).style.fill = "#111";
          });
        }
      }
      const target = inClone(head);
      if (target) {
        const color = headHoverStyle(hoverPc(note), getPalette().roles)?.color ?? pitchClassColor(colorMidiOf(note)); // same color as the tag
        const paint = (e: Element) => {
          e.setAttribute("fill", color);
          (e as SVGElement).style.fill = color;
        };
        if (target.tagName.toLowerCase() === "path") paint(target);
        else target.querySelectorAll("path").forEach(paint);
      }
      // The bare staff: 5 lines across the whole window, the ledger lines this note needs, and a small clef at the left.
      const NS = "http://www.w3.org/2000/svg";
      const gx = document.createElementNS(NS, "g");
      gx.setAttribute("style", "visibility:visible");
      gx.setAttribute("stroke", "#111");
      const hline = (y: number, x1: number, x2: number, w: number) => {
        const l = document.createElementNS(NS, "line");
        l.setAttribute("x1", String(x1));
        l.setAttribute("x2", String(x2));
        l.setAttribute("y1", String(y));
        l.setAttribute("y2", String(y));
        l.setAttribute("stroke-width", String(w));
        gx.appendChild(l);
      };
      const vx = box.viewBox.x;
      for (const y of staffLineYs(staffTopY, sp)) hline(y, vx, vx + box.viewBox.w, sp * 0.1);
      const headW = Math.max(sp * 1.1, hr.width * k);
      for (const y of ledgerLineYs(c.y, staffBottomY, sp)) hline(y, c.x - headW * 0.95, c.x + headW * 0.95, sp * 0.13);
      const g = clefGlyph(clef, staffBottomY, sp);
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", String(box.clefX));
      t.setAttribute("y", String(g.baseline));
      t.setAttribute("font-size", String(g.size));
      t.setAttribute("fill", "#111");
      t.setAttribute("stroke", "none");
      t.setAttribute("style", 'font-family:"Noto Music","Bravura Text","Apple Symbols","Segoe UI Symbol",serif;visibility:visible');
      t.setAttribute("data-testid", "closeup-clef");
      t.textContent = g.glyph;
      gx.appendChild(t);
      clone.appendChild(gx);
      clone.setAttribute("data-clef", clef);
      clone.setAttribute("data-head-y", String(box.headY));
      clone.setAttribute("viewBox", `${box.viewBox.x} ${box.viewBox.y} ${box.viewBox.w} ${box.viewBox.h}`);
      clone.setAttribute("width", String(box.width));
      clone.setAttribute("height", String(box.height));
      clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
      clone.setAttribute("aria-hidden", "true");
      return clone;
    } catch {
      return null;
    }
  };

  const openPanel = () => {
    const cur = hoverRef.current;
    if (!cur) return;
    const t = tipRef.current;
    t.over = true;
    cancelClose();
    if (t.open) return;
    t.open = true;
    const { key, chords } = analysisForPanel();
    const live = notesRef.current.find((n) => n.id === cur.note.id) ?? cur.note;
    const tr = metaRef.current?.transpose;
    if (tr?.kind === "mixed") {
      // Mixed parts: key and chord context is about what sounds; the NOTA line still says what is printed.
      const ctx = noteContext(toConcert(live), analysisNotes(notesRef.current, tr), key, chords);
      setPanelCtx({ ...ctx, pitch: pitchOf(live), transposed: writtenAndSounding(live) });
      setPanelScale(key ? buildScaleView(toConcert(live), key, analysisNotes(notesRef.current, tr)) : null);
    } else {
      setPanelCtx(noteContext(live, notesRef.current, key, chords));
      setPanelScale(key ? buildScaleView(live, key, notesRef.current) : null);
    }
    setPanelCloseup(buildCloseup(live));
    setTipMore(readTipMore());
    setPanelOpen(true);
  };

  const leaveTip = () => {
    tipRef.current.over = false;
    scheduleClose();
  };

  const togglePin = () => {
    const t = tipRef.current;
    t.pinned = !t.pinned;
    setPinned(t.pinned);
    if (t.pinned) (keyHoverRef.current ? openKeyPanel : openPanel)();
  };

  /** Tag position: glued to the notehead (re-read live, so Tocar auto-scroll keeps it attached). */
  const placeTooltip = (note: ScheduledNote, force: boolean) => {
    const cur = hoverRef.current;
    if (!cur) return;
    const r = (note.headEl?.isConnected ? note.headEl : note.svgEls?.[0])?.getBoundingClientRect();
    if (!r) return;
    // Tag on the right of the note, unless the tag + the unfolded panel would not fit there but fit on the left.
    // The Ficha sheet covers the right `rightInset` px: the panel must not open under it.
    const rightEdge = window.innerWidth - rightInsetRef.current;
    const fitsRight = r.right + 5 + TIP_NEED_W <= rightEdge;
    const fitsLeft = r.left - 5 - TIP_NEED_W >= 0;
    const tagLeft = !fitsRight && (fitsLeft || r.right + 110 > rightEdge);
    const x = Math.round(tagLeft ? r.left - 5 : r.right + 5);
    const y = Math.round(r.top + r.height / 2);
    if (!force && x === cur.x && y === cur.y) return;
    cur.x = x;
    cur.y = y;
    const live = notesRef.current.find((n) => n.id === note.id) ?? note;
    setTooltip({ tag: { x, y, left: tagLeft }, ...hoverText(live, notesRef.current) });
  };

  /** Pointer (client px) -> nearest note zone -> hover. Overlays with their own hit target keep priority. */
  const updateNoteHover = (cx: number, cy: number, target: EventTarget | null, buttons: number) => {
    const wrap = wrapRef.current;
    const idx = hitIndexRef.current;
    // Pointer on the tag / panel (or panel pinned): the note stays; only the tag follows the score.
    if (tipFrozen()) {
      const cur = hoverRef.current;
      if (cur) placeTooltip(cur.note, false);
      else if (keyHoverRef.current) placeKeyTag(false);
      return;
    }
    const overlay = [overlayRef, chordSvgRef, hardSvgRef, chordNameSvgRef].some((r) => r.current && target instanceof Node && r.current.contains(target));
    if (!wrap || !idx || overlay || buttons !== 0) return clearNoteHover();
    const wr = wrap.getBoundingClientRect();
    // Key signature first: its zone is the gap between the clef and the first note.
    const px = cx - wr.left;
    const py = cy - wr.top;
    const kz = keyZonesRef.current.find((z) => px >= z.x0 && px <= z.x1 && py >= z.y0 && py <= z.y1);
    if (kz) {
      if (keyHoverRef.current?.zone !== kz) {
        const f = fifthsForZone(kz);
        if (f === null || (kz.empty && f !== 0)) {
          // not a real signature spot: fall through to notes
        } else {
          showKeyHover(kz);
          return;
        }
      } else {
        tipRef.current.zone = true;
        if (!tipRef.current.open) cancelClose();
        placeKeyTag(false);
        return;
      }
    } else if (keyHoverRef.current) {
      // Left the signature: keep the tag a moment so the pointer can reach it.
      tipRef.current.zone = false;
      scheduleClose();
    }
    const hit = nearestNoteHit({ x: px, y: py }, idx);
    const note = hit ? notesRef.current.find((n) => String(n.id) === hit.id) : undefined;
    if (!note) {
      // Left the zone: keep the tag a moment so the pointer can reach it.
      tipRef.current.zone = false;
      if (hoverRef.current || keyHoverRef.current) scheduleClose();
      return;
    }
    if (hoverRef.current?.note.id !== note.id) {
      clearNoteHover();
      showNoteHover(note);
      placeTooltip(note, true);
    } else {
      tipRef.current.zone = true;
      if (!tipRef.current.open) cancelClose();
      placeTooltip(note, false);
    }
  };

  /** Where a chord mark sits: x over its first notes, y above the top staff of that system. */
  const chordPosition = (chord: PieceChord): { x: number; y: number; sys: number } | null => {
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
    return { x, y, sys };
  };

  /** Vertical extent (px, wrapper-relative) of one system with room for what hangs off it: stems, ledger lines, voltas, numbers. */
  const systemBand = (sys: number): { y0: number; y1: number; ty0: number; ty1: number } | null => {
    const rows = staffRowsRef.current.get(sys) ?? [];
    const ys = notesRef.current.filter((n) => (n.system ?? 0) === sys && n.cy !== undefined).map((n) => n.cy!);
    if (!rows.length && !ys.length) return null;
    const sp = rows.length ? Math.max(4, (rows[0].bottom - rows[0].top) / 4) : 8;
    const top = Math.min(...rows.map((r) => r.top), ...ys);
    const bottom = Math.max(...rows.map((r) => r.bottom), ...ys);
    // y0/y1: roomy margins; ty0/ty1: tight ones, used when the roomy band is taller than the visible area.
    return { y0: top - 6 * sp, y1: bottom + 6 * sp, ty0: top - 3 * sp, ty1: bottom + 3 * sp };
  };

  /**
   * Estudiar: scroll the page so the band [y0, y1] (wrapper-relative px) is whole inside the visible part of the score,
   * between the sticky top bar and the sticky piano: vertically centered, or its top edge if it is taller than that.
   */
  const scrollBandIntoView = (y0: number, y1: number, tight?: { y0: number; y1: number }) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const topEl = document.querySelector("[data-chrome='top']");
    const botEl = document.querySelector("[data-chrome='bottom']");
    const visTop = topEl ? topEl.getBoundingClientRect().bottom : 0;
    const visBottom = Math.min(window.innerHeight, botEl ? botEl.getBoundingClientRect().top : window.innerHeight);
    const docTop = wrap.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: bandScrollTop({ docTop, y0, y1, tight, visTop, visBottom }), behavior: "smooth" });
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
    const mb = measureBoxes(sys).get(chord.measure);
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
  const measureBoxes = (onlySystem?: number): Map<number, { x0: number; x1: number; y0: number; y1: number }> => {
    const out = new Map<number, { x0: number; x1: number; y0: number; y1: number }>();
    const bySys = new Map<number, Map<number, { min: number; max: number }>>();
    const ySys = new Map<number, { min: number; max: number }>();
    for (const n of notesRef.current) {
      if (n.cx === undefined || n.cy === undefined) continue;
      const sys = n.system ?? 0;
      if (onlySystem !== undefined && sys !== onlySystem) continue;
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
    const wr0 = wrapRef.current?.getBoundingClientRect();
    const sigEls = wr0
      ? Array.from(containerRef.current?.querySelectorAll("g.vf-clef, g.vf-keysignature, g.vf-timesignature") ?? [])
          .map((g) => g.getBoundingClientRect())
          .filter((r) => r.width > 0)
          .map((r) => ({ rightX: r.right - wr0.left, cy: (r.top + r.bottom) / 2 - wr0.top }))
      : [];
    for (const [sys, ms] of bySys) {
      const list = [...ms.entries()].sort((a, b) => a[1].min - b[1].min);
      const yr = ySys.get(sys)!;
      const top = systemTopRef.current.get(sys);
      const y0 = (top !== undefined ? Math.min(top, yr.min - 8) : yr.min - 30) - 8;
      const y1 = yr.max + 30;
      // Right edge of the clef / key / time signature that opens this system (they sit left of its first note).
      let sigRight: number | null = null;
      if (sigEls.length && list.length) {
        const first = list[0][1].min;
        for (const g of sigEls) {
          if (g.rightX > first + 4 || g.cy < y0 || g.cy > y1) continue;
          sigRight = Math.max(sigRight ?? -Infinity, g.rightX);
        }
      }
      list.forEach(([num, r], i) => {
        const x0 = i === 0 ? systemStartX({ firstNoteX: r.min, sigRight }) : (list[i - 1][1].max + r.min) / 2;
        const x1 = i === list.length - 1 ? r.max + 26 : (r.max + list[i + 1][1].min) / 2;
        out.set(num, { x0, x1, y0, y1 });
      });
    }
    return out;
  };

  /**
   * "Nombres de acordes": the chord symbol (Spanish name · degree) as small muted text above the top staff of the
   * system, at the chord's first notehead, above the pattern boxes. Two rows to avoid collisions; a label that fits on
   * neither is skipped. Out-of-key chords get "fuera" and a dashed underline. Clicking a label plays the chord.
   */
  const drawChordNames = () => {
    const svg = chordNameSvgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("width", String(wrap.offsetWidth));
    svg.setAttribute("height", String(wrap.offsetHeight));
    const layer = chordNamesRef.current;
    if (!layer || !layer.items.length) return;
    const marks = chordMarksRef.current;
    const byId = new Map(notesRef.current.map((n) => [n.id, n]));
    const cands: Array<{ id: number; system: number; x: number; width: number; item: (typeof layer.items)[number]; midis: number[]; ys: number[] }> = [];
    for (const item of layer.items) {
      const chord = marks[item.index];
      if (!chord) continue;
      const ns = chord.noteIds.map((id) => byId.get(id)).filter((n): n is ScheduledNote => !!n && n.cx !== undefined && n.cy !== undefined);
      if (!ns.length) continue;
      const system = ns[0].system ?? 0;
      const inSys = ns.filter((n) => (n.system ?? 0) === system);
      cands.push({
        id: item.index,
        system,
        x: Math.min(...inSys.map((n) => n.cx!)) - 6,
        width: labelWidth(item.text),
        item,
        midis: [...new Set(ns.map((n) => n.midi))].sort((a, b) => a - b),
        ys: inSys.map((n) => n.cy!),
      });
    }
    const { rows } = layoutLabels(cands.map(({ id, system, x, width }) => ({ id, system, x, width })));
    for (const c of cands) {
      const row = rows.get(c.id);
      if (row === undefined) continue;
      const top = systemTopRef.current.get(c.system) ?? Math.min(...c.ys) - 30;
      const y = top - 18 - row * 13;
      const g = svgEl("g", {
        "pointer-events": "all",
        cursor: "pointer",
        "data-chord-name": c.item.text,
        "data-reason": c.item.reason,
        "data-row": row,
      });
      g.appendChild(svgEl("rect", { x: c.x - 2, y: y - 11, width: c.width + 4, height: 15, fill: "transparent" }));
      const t = svgEl("text", {
        x: c.x,
        y,
        "font-size": 11,
        "font-weight": 500,
        fill: "#6b7280",
        stroke: "#ffffff",
        "stroke-width": 3,
        "stroke-linejoin": "round",
        "paint-order": "stroke",
      });
      t.textContent = c.item.text;
      g.appendChild(t);
      if (c.item.outOfKey) {
        g.appendChild(svgEl("line", { x1: c.x, x2: c.x + c.width, y1: y + 2.5, y2: y + 2.5, stroke: "#6b7280", "stroke-width": 1, "stroke-dasharray": "2.5 2" }));
      }
      const title = svgEl("title", {});
      title.textContent = "Tocar este acorde";
      g.appendChild(title);
      g.addEventListener("click", (e) => {
        e.stopPropagation();
        void playChordMidi(c.midis);
      });
      svg.appendChild(g);
    }
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
      dnotes.push({ x: n.cx, staff, system: sys, startSec: n.startSec, endSec: n.startSec + n.durationSec, color: degradeColor(colorMidiOf(n)) });
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
  const scrollToBox = (b: { x0: number; y0: number; y1?: number }) => {
    const sc = scrollRef.current;
    const wrap = wrapRef.current;
    if (!sc || !wrap) return;
    if (viewRef.current === "tocar") {
      holdUntilRef.current = performance.now() + 2500;
      sc.scrollTo({ left: Math.max(0, b.x0 - NOW_LINE_FRACTION * sc.clientWidth), behavior: "smooth" });
    } else {
      scrollBandIntoView(b.y0 - 40, (b.y1 ?? b.y0 + 200) + 40);
    }
  };

  const patternHitAt = (e: React.MouseEvent<HTMLDivElement>): PatternHit | null => {
    const wrap = wrapRef.current;
    if (!wrap || !patternHitsRef.current.length) return null;
    const wr = wrap.getBoundingClientRect();
    const x = e.clientX - wr.left;
    const y = e.clientY - wr.top;
    // The key signature keeps priority: a pattern box never answers for a pointer on it.
    if (keyZonesRef.current.some((z) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1)) return null;
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
    // A click (no drag: onClickCapture drops the click after a drag) on a note inside its hover zone plays that note.
    if (!markModeRef.current && hoverRef.current && !patternHitAt(e)) {
      void playNoteMidi(soundingOf(hoverRef.current.note));
    }
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
        grad.appendChild(svgEl("stop", { offset: "0", "stop-color": pitchClassColor(colorMidiOf(seg.from)) }));
        grad.appendChild(svgEl("stop", { offset: "1", "stop-color": pitchClassColor(colorMidiOf(seg.to)) }));
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
            stroke: mode === "intervalos" ? RING_NEUTRAL_COLOR : pitchClassColor(colorMidiOf(n)),
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
    drawChordNames();
  };

  /** Render OSMD. In Tocar the zoom is fitted to the band height (zoom slider multiplies on top). */
  const renderScore = (osmd: any, refit: boolean) => {
    const tocar = viewRef.current === "tocar";
    // Room above and below the staff, so zooming in never leaves part of it out of reach and any band can sit mid-view.
    if (wrapRef.current) {
      const pad = tocar ? tocarPadY(scrollRef.current?.clientHeight ?? 0) : 0;
      wrapRef.current.style.paddingTop = tocar ? `${pad}px` : "";
      wrapRef.current.style.paddingBottom = tocar ? `${pad}px` : "";
    }
    if (tocar && refit) {
      osmd.Zoom = 1;
      osmd.render();
      const svg = containerRef.current?.querySelector("svg");
      const h = svg ? svg.getBoundingClientRect().height : 0;
      const bandH = scrollRef.current?.clientHeight ?? 0;
      fitRef.current = h > 0 && bandH > 0 ? Math.max(0.3, Math.min(4, (bandH - 8) / h)) : 1;
    }
    if (viewRef.current === "hoja" && containerRef.current) {
      // A sheet of paper: its width (and so every page) scales with the zoom, the number of measures per line does not.
      containerRef.current.style.width = `${HOJA_BASE_W * zoomRef.current}px`;
      osmd.Zoom = HOJA_OSMD_ZOOM * zoomRef.current;
    } else {
      osmd.Zoom = (tocar ? fitRef.current : 1) * zoomRef.current;
    }
    osmd.render();
  };

  /** Width of the rendered score (px): what zoom scales. */
  const scoreWidth = () => containerRef.current?.getBoundingClientRect().width ?? 0;

  /** Tocar: scroll so the middle of the staff band is the middle of the visible area (the staff itself, not the SVG's margins). */
  const centerVertical = () => {
    const sc = scrollRef.current;
    const wrap = wrapRef.current;
    if (!sc || !wrap || viewRef.current !== "tocar") return;
    let y0: number;
    let y1: number;
    const band = systemBand(0);
    if (band) {
      y0 = band.y0;
      y1 = band.y1;
    } else {
      const r = containerRef.current?.getBoundingClientRect();
      const wr = wrap.getBoundingClientRect();
      if (!r) return;
      y0 = r.top - wr.top;
      y1 = r.bottom - wr.top;
    }
    sc.scrollTop = centerScroll({ bandStart: y0, bandEnd: y1, viewSize: sc.clientHeight, contentSize: sc.scrollHeight });
  };

  /** After a zoom re-render: same musical point at the same screen x (now-line in Tocar, view center in Estudiar); Tocar also re-centers vertically. */
  const settleAfterZoom = (prev: { w: number; left: number }) => {
    const sc = scrollRef.current;
    if (!sc) return;
    const tocarView = viewRef.current === "tocar";
    const origin = tocarView ? NOW_LINE_FRACTION * sc.clientWidth : 16;
    sc.scrollLeft = anchorScroll({
      scroll: prev.left,
      oldSize: prev.w,
      newSize: scoreWidth(),
      anchor: tocarView ? origin : sc.clientWidth / 2,
      origin,
      viewSize: sc.clientWidth,
      contentSize: sc.scrollWidth,
    });
    if (tocarView) centerVertical();
  };

  /** "Centrar": Tocar puts the staff mid-view and the playback position back under the now-line; Estudiar centers sideways and brings the system at mid-screen into view. */
  const centerNow = () => {
    const sc = scrollRef.current;
    if (!sc) return;
    if (viewRef.current === "tocar") {
      const secs = getPlaybackSeconds();
      const x = secs < 0.01 ? null : xAt(secs); // stopped: back to the start, as Detener does
      const max = Math.max(0, sc.scrollWidth - sc.clientWidth);
      centerVertical();
      sc.scrollTo({ left: x === null ? 0 : Math.max(0, Math.min(max, x - NOW_LINE_FRACTION * sc.clientWidth)), behavior: "smooth" });
      return;
    }
    sc.scrollTo({ left: Math.max(0, (sc.scrollWidth - sc.clientWidth) / 2), behavior: "smooth" });
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wr = wrap.getBoundingClientRect();
    const midY = window.innerHeight / 2 - wr.top;
    let best: { sys: number; d: number } | null = null;
    for (const sys of staffRowsRef.current.keys()) {
      const b = systemBand(sys);
      if (!b) continue;
      const d = midY < b.y0 ? b.y0 - midY : midY > b.y1 ? midY - b.y1 : 0;
      if (!best || d < best.d) best = { sys, d };
    }
    const b = best ? systemBand(best.sys) : null;
    if (b) scrollBandIntoView(b.y0, b.y1, { y0: b.ty0, y1: b.ty1 });
  };

  /** Hoja: tag every page element with "Página N de M" (shown under it by CSS). */
  const labelPages = () => {
    if (viewRef.current !== "hoja") return;
    const pages = Array.from(containerRef.current?.children ?? []).filter((c) => c.querySelector("svg")) as HTMLElement[];
    pages.forEach((p, i) => {
      p.dataset.page = String(i + 1);
      p.dataset.label = `Página ${i + 1} de ${pages.length}`;
    });
  };

  const wireAfterRender = (notesOut: (n: ScheduledNote[]) => void) => {
    labelPages();
    runCleanups();
    activeNotes.clearHover();
    setTooltip(null);

    const osmd = osmdRef.current;
    if (!osmd) return;
    const { notes } = parseSheetToNotes(osmd, bpmRef.current);

    notesRef.current = notes;
    measure(notes); // pairs heads, accidentals and key-signature zones first
    paintNotes(notes);

    // Hover is handled by one pointer listener on the score (nearest-note zones), see the "Note hover zones" effect.
    hoverRef.current = null;

    drawPatterns();
    drawDegrade();
    drawLine();
    drawChords();
    drawHard();
    drawChordNames();
    notesOut(notes);
    try {
      const meta = readScoreMeta(osmd, bpmRef.current);
      metaRef.current = meta;
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

    const layout = readLayoutInfo(xml);
    setAutoLayout(view === "hoja" && !layout.hasBreaks);
    let osmd: any;
    try {
      osmd = new OpenSheetMusicDisplayCtor(container, {
        autoResize: false,
        backend: "svg",
        drawTitle: view === "hoja" && !!title,
        drawSubtitle: false,
        drawComposer: view === "hoja" && /<creator[^>]*type="composer"[^>]*>\s*[^<\s]/.test(xml),
        drawCredits: false,
        renderSingleHorizontalStaffline: view === "tocar",
        ...(view === "hoja"
          ? {
              // Printed pages like her paper: A4 sheets, the file's own line and page breaks when it has them.
              pageFormat: layout.page ? `${Math.round(layout.page.width)}x${Math.round(layout.page.height)}` : "A4_P",
              newSystemFromXML: layout.hasBreaks,
              newPageFromXML: layout.hasBreaks,
            }
          : {}),
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
        await osmd.load(view === "hoja" && title ? withTitle(xml, title) : xml);
        if (cancelled) return;
        // Hoja sizes its pages from the container's width: wait until the layout has given it one.
        for (let i = 0; i < 20 && view === "hoja" && container.offsetWidth < 50; i++) await new Promise((r) => requestAnimationFrame(r));
        if (cancelled) return;
        applyStemColors(osmd);
        renderScore(osmd, true);
        readyRef.current = true;
        wireAfterRender(onNotesRef.current);
        centerVertical();
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
  }, [xml, reloadNonce, view, view === "hoja" ? title : null]);

  // Note hover zones — one pointer listener on the score; hit testing is a cheap search in precomputed boxes, rAF-throttled.
  useEffect(() => {
    const wrap = wrapRef.current;
    const sc = scrollRef.current;
    if (!wrap) return;
    let raf = 0;
    let last: { x: number; y: number; target: EventTarget | null; buttons: number } | null = null;
    const run = () => {
      raf = 0;
      if (last) updateNoteHover(last.x, last.y, last.target, last.buttons);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(run);
    };
    const onMove = (e: PointerEvent) => {
      last = { x: e.clientX, y: e.clientY, target: e.target, buttons: e.buttons };
      queue();
    };
    const onLeave = () => {
      last = null;
      tipRef.current.zone = false;
      if (tipFrozen()) return;
      if (hoverRef.current || keyHoverRef.current) scheduleClose(); // the pointer may be heading for the tag
    };
    const onScroll = () => {
      if (last) queue(); // the score moved under a still pointer
      else if (hoverRef.current) placeTooltip(hoverRef.current.note, false); // frozen on the tag: keep it attached
      else if (keyHoverRef.current) placeKeyTag(false);
    };
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    sc?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      sc?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      clearNoteHover();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Panel placement: side (right of the tag, or left when there is no room), vertical clamp to the viewport.
  useLayoutEffect(() => {
    const tag = tipTagRef.current;
    const panel = tipPanelRef.current;
    if (!panelOpen || !tag || !panel) return;
    const tr = tag.getBoundingClientRect();
    const w = TIP_PANEL_W + 6;
    const wantLeft = tooltip?.tag.left ?? keyHover?.tag.left ?? false;
    const side: "left" | "right" = wantLeft || tr.right + w + 8 > window.innerWidth ? "left" : "right";
    const margin = 8;
    const pr = panel.getBoundingClientRect();
    // The close-up photo's notehead sits at the tag's centre height, always (placePanel). Little room below it: NOTA and the rest
    // go above the photo instead (flipped); the part that does not fit scrolls inside the card.
    const photo = panel.querySelector("[data-testid=tip-closeup]");
    const card = panel.firstElementChild as HTMLElement | null;
    let shiftY: number;
    let maxH: number;
    let flipped = false;
    if (photo && card) {
      const ph = photo.querySelector("svg")?.getBoundingClientRect() ?? photo.getBoundingClientRect();
      const headY = Number(photo.querySelector("svg")?.getAttribute("data-head-y")) || ph.height / 2;
      const cr = card.getBoundingClientRect();
      const tagCy = tr.top + tr.height / 2;
      if (shouldFlip(tagCy, ph.height - headY, window.innerHeight, margin) !== panelPos.flipped) {
        // Layout must change first; this effect runs again with the new layout's measurements.
        setPanelPos((p) => ({ ...p, flipped: !p.flipped }));
        return;
      }
      const scroller = card.querySelector("[data-tip-scroll]") as HTMLElement | null;
      const natural = scroller ? cr.height - scroller.clientHeight + scroller.scrollHeight : cr.height;
      const pl = placePanel({
        tagCenterY: tagCy,
        photoBelow: ph.height - headY,
        photoFromTop: ph.top + headY - cr.top,
        photoFromBottom: cr.bottom - (ph.top + headY),
        cardH: natural,
        viewportH: window.innerHeight,
        margin,
      });
      flipped = pl.flipped;
      shiftY = Math.round(pl.top - tr.top);
      maxH = Math.round(pl.maxH);
    } else {
      shiftY = Math.round(Math.min(Math.max(tr.top, margin), window.innerHeight - margin - pr.height) - tr.top);
      const top0 = tr.top + shiftY;
      if (top0 < margin) shiftY += Math.round(margin - top0);
      maxH = Math.max(160, Math.round(window.innerHeight - margin - (tr.top + shiftY)));
    }
    setPanelPos((p) =>
      p.side === side && p.flipped === flipped && Math.abs(p.shiftY - shiftY) < 1 && Math.abs(p.maxH - maxH) < 2 ? p : { side, shiftY, maxH, flipped },
    );
  });

  // Pinned panel: Esc or a click anywhere else closes it.
  useEffect(() => {
    if (!pinned) return;
    const close = () => {
      tipRef.current.pinned = false;
      setPinned(false);
      clearNoteHover();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Node && tipRootRef.current?.contains(e.target)) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned]);

  // Zoom — re-render OSMD and re-wire listeners + line.
  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd || !readyRef.current) return;
    try {
      const prev = { w: scoreWidth(), left: scrollRef.current?.scrollLeft ?? 0 };
      renderScore(osmd, false);
      wireAfterRender(onNotesRef.current);
      settleAfterZoom(prev);
    } catch (e) {
      console.error("Zoom render failed:", e);
      setRenderError("Failed to re-render sheet music at this zoom level.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // "Centrar" (button or C key).
  useEffect(() => {
    if (centerNonce > 0 && readyRef.current) centerNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerNonce]);

  // Estudiar: hold the space bar to drag the page with the mouse anywhere (text and clicks keep working otherwise).
  const [spaceHeld, setSpaceHeld] = useState(false);
  const spaceRef = useRef(false);
  useEffect(() => {
    if (view === "tocar") return;
    const typing = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(el.tagName) || el.getAttribute?.("role") === "slider");
    };
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      e.preventDefault(); // no page-down while she is panning
      spaceRef.current = true;
      setSpaceHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      spaceRef.current = false;
      setSpaceHeld(false);
    };
    const blur = () => {
      spaceRef.current = false;
      setSpaceHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      blur();
    };
  }, [view]);

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
              centerVertical();
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
    // "Color por: escrita / suena" repaints exactly like a palette edit does.
    const sigNow = () => `${noteSignature()}|${getColorBy()}`;
    let lastSig = sigNow();
    let lastIntSig = intervalSignature();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onColorsChanged = () => {
      drawChords(); // chord role colors may have changed
      drawHard();
      drawDegrade(); // the band follows the note colors
      const sig = sigNow();
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
    };
    const unsub = subscribeColors(onColorsChanged);
    const unsubBy = subscribeColorBy(onColorsChanged);
    return () => {
      unsub();
      unsubBy();
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
      metaRef.current = meta;
      measureSecRef.current = meta.measures[0] ? meta.measures[0].endSec - meta.measures[0].startSec : 0;
      onScoreDataRef.current?.(notes, meta);
      drawPatterns();
      drawDegrade();
      drawChords();
      drawHard();
      drawChordNames();
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
  // Chord names — redraw when the layer, its mode or the detected chords change.
  useEffect(() => {
    drawChordNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chordNames, chordMarks]);
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
      const band = systemBand(pos.sys);
      if (band) scrollBandIntoView(band.y0, band.y1, { y0: band.ty0, y1: band.ty1 });
      else scrollBandIntoView(pos.y - 40, pos.y + 300);
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

  // Manual panning: drag the sheet (and wheel / trackpad) pauses the playback follow for a moment.
  // Tocar: drag anywhere, both directions. Estudiar: only the mouse on empty space, or with the space bar held.
  const dragRef = useRef<{ x: number; y: number; left: number; top: number; winTop: number; moved: boolean } | null>(null);
  const justDraggedRef = useRef(false);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const sc = scrollRef.current;
    if (view !== "tocar") {
      if (e.pointerType !== "mouse") return; // touch keeps its native scroll
      const t = e.target as Element;
      const empty =
        t === sc || t === wrapRef.current || t === containerRef.current || (t instanceof SVGSVGElement && containerRef.current?.contains(t));
      if (!canStartEstudiarDrag({ spaceHeld: spaceRef.current, onEmptySpace: !!empty })) return;
    }
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: sc?.scrollLeft ?? 0,
      top: sc?.scrollTop ?? 0,
      winTop: window.scrollY,
      moved: false,
    };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const sc = scrollRef.current;
    if (!d || !sc) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) > 4) {
      d.moved = true;
      clearNoteHover();
      try {
        sc.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (view !== "tocar") document.body.style.userSelect = "none"; // no text selection while panning
    }
    if (d.moved) {
      holdUntilRef.current = performance.now() + 1500;
      sc.scrollLeft = d.left - dx;
      if (view === "tocar") sc.scrollTop = d.top - dy;
      else window.scrollTo({ top: d.winTop - dy, behavior: "instant" as ScrollBehavior });
    }
  };
  const endDrag = () => {
    if (dragRef.current?.moved) {
      // The click that follows a drag must not press chord labels, pattern boxes or "marcar compás".
      justDraggedRef.current = true;
      setTimeout(() => (justDraggedRef.current = false), 0);
    }
    dragRef.current = null;
    document.body.style.userSelect = "";
  };

  const tocar = view === "tocar";

  return (
    <div
      className={tocar ? "relative h-full w-full bg-[var(--desk)]" : "relative w-full bg-[var(--desk)]"}
      // Estudiar with the Ficha open: the score container gets narrower, its resize observer re-wraps the systems.
      style={!tocar && rightInset > 0 ? { paddingRight: rightInset } : undefined}
    >
      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (justDraggedRef.current) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        onWheel={() => {
          holdUntilRef.current = performance.now() + 1500;
        }}
        className={
          tocar
            ? "score-sheet score-sheet-tocar h-full w-full cursor-grab overflow-auto active:cursor-grabbing"
            : `w-full overflow-x-auto ${view === "hoja" ? "hoja-desk" : "score-sheet"} ${spaceHeld ? "cursor-grab active:cursor-grabbing" : ""}`
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
              : { padding: view === "hoja" ? 24 : 16 }
          }
        >
          {/* Behind the notes: pattern boxes first, then the degradé. The score sits above them. */}
          <svg ref={patternSvgRef} className="pointer-events-none absolute left-0 top-0" aria-hidden />
          <svg ref={degradeSvgRef} className="pointer-events-none absolute left-0 top-0" aria-hidden />
          <div
            ref={containerRef}
            className="score-root"
            style={
              tocar
                ? { flex: "none", minWidth: 200, position: "relative" }
                : view === "hoja"
                  ? { width: HOJA_BASE_W * zoom, margin: "0 auto", position: "relative" }
                  : { width: "100%", position: "relative" }
            }
          />
          <svg ref={overlayRef} className="pointer-events-none absolute left-0 top-0" />
          <svg ref={chordSvgRef} className="pointer-events-none absolute left-0 top-0" />
          <svg ref={hardSvgRef} className="pointer-events-none absolute left-0 top-0" />
          <svg ref={chordNameSvgRef} className="pointer-events-none absolute left-0 top-0" aria-label="Nombres de acordes" />
        </div>
      </div>

      {view === "hoja" && autoLayout && (
        <p className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-md border border-border bg-card/95 px-3 py-1 text-xs text-muted-foreground shadow-sm" role="note">
          Esta partitura no trae los cortes del papel; la app los calculó.
        </p>
      )}

      {line && lineMode !== "notas" && <IntervalLegend keys={legendKeys} />}

      {tocar && (
        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-px bg-primary/60"
          style={{ left: `${NOW_LINE_FRACTION * 100}%` }}
          aria-hidden
        />
      )}

      {keyHover && !tooltip && (
        <div
          ref={tipRootRef}
          className="fixed z-50"
          style={
            keyHover.tag.left
              ? { right: document.documentElement.clientWidth - keyHover.tag.x, top: keyHover.tag.y, transform: "translateY(-50%)" }
              : { left: keyHover.tag.x, top: keyHover.tag.y, transform: "translateY(-50%)" }
          }
          onPointerEnter={openKeyPanel}
          onPointerLeave={leaveTip}
          data-testid="tip-root"
          data-kind="key"
        >
          <button
            ref={tipTagRef}
            type="button"
            className={`block cursor-pointer whitespace-nowrap rounded-lg border border-border bg-white/95 px-2.5 py-1 text-sm font-semibold text-neutral-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${pinned ? "ring-2 ring-foreground/70" : ""}`}
            aria-expanded={panelOpen}
            aria-label="Detalles de la armadura"
            onClick={togglePin}
            data-testid="tip-tag"
          >
            {keyHover.view.tag}
          </button>
          {panelOpen && (
            <div
              ref={tipPanelRef}
              className="absolute top-0"
              style={{
                [panelPos.side === "right" ? "left" : "right"]: "100%",
                [panelPos.side === "right" ? "paddingLeft" : "paddingRight"]: 6,
                transform: `translateY(${panelPos.shiftY}px)`,
                width: TIP_PANEL_W + 6,
              }}
              data-testid="tip-panel"
              data-side={panelPos.side}
            >
              <div
                className="tip-panel-card flex flex-col rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
                style={{ maxHeight: panelPos.maxH }}
                data-side={panelPos.side}
              >
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <KeyPanel view={keyHover.view} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tooltip && (
        <div
          ref={tipRootRef}
          className="fixed z-50"
          style={
            tooltip.tag.left
              ? { right: document.documentElement.clientWidth - tooltip.tag.x, top: tooltip.tag.y, transform: "translateY(-50%)" }
              : { left: tooltip.tag.x, top: tooltip.tag.y, transform: "translateY(-50%)" }
          }
          onPointerEnter={openPanel}
          onPointerLeave={leaveTip}
          data-testid="tip-root"
        >
          <button
            ref={tipTagRef}
            type="button"
            className={`block cursor-pointer whitespace-nowrap rounded-lg bg-white/90 p-0.5 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${pinned ? "ring-2 ring-foreground/70" : ""}`}
            aria-expanded={panelOpen}
            aria-label="Detalles de la nota"
            onClick={togglePin}
            data-testid="tip-tag"
          >
            <ChordNoteChips spelled={[tooltip.own.spelled]} size="lg" />
          </button>
          {panelOpen && panelCtx && (
            <div
              ref={tipPanelRef}
              className="absolute top-0"
              style={{
                [panelPos.side === "right" ? "left" : "right"]: "100%",
                [panelPos.side === "right" ? "paddingLeft" : "paddingRight"]: 6,
                transform: `translateY(${panelPos.shiftY}px)`,
                width: TIP_PANEL_W + 6,
              }}
              data-testid="tip-panel"
              data-side={panelPos.side}
            >
              <div
                className="tip-panel-card flex flex-col rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
                style={{ maxHeight: panelPos.maxH }}
                data-side={panelPos.side}
              >
                <NotePanel
                  tooltip={tooltip}
                  ctx={panelCtx}
                  scale={panelScale}
                  closeup={panelCloseup}
                  flipped={panelPos.flipped}
                  refMidi={hoverRef.current?.note.midi ?? 60}
                  more={tipMore}
                  onMore={(v) => {
                    setTipMore(v);
                    writeTipMore(v);
                  }}
                />
              </div>
            </div>
          )}
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

/** Small-caps section header of the hover panel (the card's existing style). */
function PanelSection({ title, children, testId }: { title: string; children: React.ReactNode; testId?: string }) {
  return (
    <section className="mt-2 first:mt-0" data-testid={testId}>
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </section>
  );
}

/** The cropped score "photo": mounts the prepared SVG clone. */
function Closeup({ svg, flipped, onClick }: { svg: SVGSVGElement; flipped?: boolean; onClick?: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.replaceChildren(svg);
    return () => {
      if (svg.parentNode === host) host.removeChild(svg);
    };
  }, [svg]);
  return (
    <div
      ref={ref}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? "Tocar esta nota" : undefined}
      className={`score-root mx-auto ${flipped ? "mt-1.5" : "mb-1"} overflow-hidden rounded border border-border bg-white ${onClick ? "cursor-pointer" : ""}`}
      style={{ width: svg.getAttribute("width") + "px", height: svg.getAttribute("height") + "px", maxWidth: "100%" }}
      data-testid="tip-closeup"
    />
  );
}

/** A collapsible block of the "Más" part: small-caps title, same look as PanelSection. */
function MoreSection({ title, open, testId, children }: { title: string; open: boolean; testId: string; children: React.ReactNode }) {
  return (
    <details className="mt-2 first:mt-0" open={open} data-testid={testId}>
      <summary className="mb-0.5 cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</summary>
      {children}
    </details>
  );
}

/**
 * Contents of the panel that unfolds from the note's tag. Top (never scrolls, sits beside the tag): the close-up photo
 * and the NOTA line. Then figure and key. Everything else is behind "Más".
 */
function NotePanel({
  tooltip,
  ctx,
  scale,
  closeup,
  flipped,
  refMidi,
  more,
  onMore,
}: {
  tooltip: TooltipState;
  ctx: NoteContext;
  scale: ScaleView | null;
  closeup: SVGSVGElement | null;
  flipped?: boolean;
  /** MIDI of the hovered note: chips that only know a name play the nearest note of that name. */
  refMidi: number;
  more: boolean;
  onMore: (open: boolean) => void;
}) {
  const { keyRole, chord, melody, figure, moment } = ctx;
  const midiOf = (spelled: string) => {
    const pc = spelledPc(spelled);
    return pc >= 0 ? nearestMidiForPc(pc, refMidi) : refMidi;
  };
  const playName = (spelled: string) => void playNoteMidi(midiOf(spelled));
  const playTones = (tones: string[]) => void playChordMidi(tones.map(midiOf));
  const photo = closeup && <Closeup svg={closeup} flipped={flipped} onClick={() => void playNoteMidi(refMidi)} />;
  const notaSection = (
    <PanelSection title="Nota" testId="tip-note">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <ChordNoteChips spelled={[tooltip.own.spelled]} size="lg" onNoteClick={playName} />
        <span className="text-sm font-medium" data-testid="tip-octave">{ctx.pitch.octaveLabel}</span>
      </div>
      {ctx.transposed && (
        <div className="mt-0.5 text-[11px] text-muted-foreground" data-testid="tip-sounding">
          escrita {ctx.transposed.written} · suena {ctx.transposed.sounding}
        </div>
      )}
      <div className="mt-0.5 text-[11px]">
        {tooltip.own.duration} · compás {tooltip.measure}
        {tooltip.beat ? ` · tiempo ${tooltip.beat}` : ""}
      </div>
    </PanelSection>
  );
  // Normal: photo, NOTA, then the rest. Flipped (little room below the photo): NOTA and the rest, then the photo last.
  const flip = !!flipped && !!closeup;
  return (
    <>
      {!flip && (
        <div className="shrink-0">
          {photo}
          {notaSection}
        </div>
      )}
      {flip && <div className="shrink-0">{notaSection}</div>}

      <div className="min-h-0 flex-1 overflow-y-auto" data-tip-scroll>
        <PanelSection title="Su figura" testId="tip-figure">
          {figure.alone ? (
            <div className="text-[11px] text-muted-foreground">Nota sola (sin otras notas en su figura)</div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <ChordNoteChips spelled={figure.tones} ownIndex={figure.ownIndex} onNoteClick={playName} />
              {(figure.chord || figure.interval) && <span className="text-[11px] font-medium">{figure.chord ?? figure.interval}</span>}
            </div>
          )}
        </PanelSection>

        {keyRole && (
          <PanelSection title="En la tonalidad" testId="tip-key">
            <div className="text-[11px] font-medium">{keyRole.text}</div>
            {scale && <ScaleInKey view={scale} />}
          </PanelSection>
        )}

        <button
          type="button"
          onClick={() => onMore(!more)}
          aria-expanded={more}
          data-testid="tip-more"
          className="mt-2 rounded px-1 text-[11px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Más {more ? "▾" : "▸"}
        </button>

        {more && (
          <div data-testid="tip-more-body">
            <MoreSection title="Armonía" open testId="tip-chord">
              {chord ? (
                <div>
                  <button type="button" className="text-left text-[11px] font-medium underline-offset-2 hover:underline" onClick={() => playTones(chord.tones)} aria-label={`Tocar el acorde ${chord.name}`}>
                    {chord.name}
                  </button>
                  <ChordNoteChips className="mt-0.5" spelled={chord.tones} ownIndex={chord.ownIndex} onNoteClick={playName} />
                  <div className="mt-0.5 text-[11px]">
                    Esta nota es: <span className="font-medium">{chord.roleLabel}</span>
                  </div>
                  <div className="text-[11px]" data-testid="tip-chord-degree">
                    {chord.degreeText ?? (chord.inKey === false ? "acorde fuera de la tonalidad" : null)}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground">Sin un acorde claro en este momento.</div>
              )}
            </MoreSection>

            {moment.differsFromFigure && (
              <MoreSection title="Suenan ahora" open={false} testId="tip-moment">
                {/* Small measure: barlines left and right, measure number top-left. */}
                <div
                  className="relative rounded-md border-x-2 border-y border-y-border border-x-foreground/80 px-2.5 pb-1.5 pt-4"
                  data-testid="tip-measure"
                >
                  <span className="absolute left-1.5 top-0.5 text-[10px] leading-3 text-muted-foreground">compás {tooltip.measure}</span>
                  <ChordNoteChips spelled={moment.tones} ownIndex={moment.ownIndex} onNoteClick={playName} />
                  {moment.held.some(Boolean) && (
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      sostenida{moment.held.filter(Boolean).length > 1 ? "s" : ""}: {moment.tones.filter((_, i) => moment.held[i]).map((t) => solfegeName(t)).join(", ")}
                    </div>
                  )}
                  {(moment.name || moment.interval) && <div className="mt-1 text-[11px] font-medium">{moment.name ?? moment.interval}</div>}
                </div>
              </MoreSection>
            )}

            {(melody.prev || melody.next) && (
              <MoreSection title="Melodía" open testId="tip-melody">
                {melody.prev && <div className="text-[11px]">{melody.prev.text}</div>}
                {melody.next && <div className="text-[11px]">{melody.next.text}</div>}
              </MoreSection>
            )}
          </div>
        )}
      </div>
      {flip && <div className="shrink-0">{photo}</div>}
    </>
  );
}
