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
import { intervalRole, intervalSignature, noteSignature, noteTargetOn, subscribe as subscribeColors } from "@/lib/colors/store";
import type { Hand, IsolationMode, ScheduledNote, ScoreView as ViewMode } from "@/lib/music/types";

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
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<SVGSVGElement | null>(null);
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
      const headGroup = el.querySelector(".vf-notehead");
      const heads = headGroup ? Array.from(headGroup.querySelectorAll("path")) : [];
      let rects: DOMRect[] = heads.map((h) => h.getBoundingClientRect()).filter((r) => r.width || r.height);
      rects = rects.sort((a, b) => a.top - b.top);
      const ranked = [...group].sort((a, b) => b.midi - a.midi);
      const whole = el.getBoundingClientRect();
      ranked.forEach((n, i) => {
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
    drawLine();
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

    for (const note of notes) {
      if (!note.svgEls?.length) continue;
      for (const el of note.svgEls) {
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

    drawLine();
    notesOut(notes);
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
          className="relative"
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
          <div
            ref={containerRef}
            className="score-root"
            style={tocar ? { flex: "none", minWidth: 200 } : { width: "100%" }}
          />
          <svg ref={overlayRef} className="pointer-events-none absolute left-0 top-0" />
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
          className="pointer-events-none fixed z-50 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
          style={{
            left: tooltip.x + (tipRight ? -14 : 14),
            top: tooltip.y + 16,
            transform: tipRight ? "translateX(-100%)" : undefined,
          }}
        >
          <div className="font-medium">{tooltip.line1}</div>
          {tooltip.line2 && <div className="mt-0.5 text-muted-foreground">{tooltip.line2}</div>}
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
