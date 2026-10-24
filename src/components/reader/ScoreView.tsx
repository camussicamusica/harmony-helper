import { useEffect, useRef, useState } from "react";
import * as OSMDModule from "opensheetmusicdisplay";
import { applyStemColors, parseSheetToNotes } from "@/lib/music/parseMusicXml";
import { activeNotes } from "@/lib/music/scheduler";
import { pitchClassColor } from "@/lib/music/midiUtils";
import { PLAIN_COLOR } from "@/lib/colors/defaults";
import { noteSignature, noteTargetOn, subscribe as subscribeColors } from "@/lib/colors/store";
import type { IsolationMode, ScheduledNote } from "@/lib/music/types";

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
  contour: boolean;
  onNotes: (notes: ScheduledNote[]) => void;
}

const CONTOUR_LAYER_ID = "contour-layer";

export function ScoreView({ xml, bpm, isolation, zoom, contour, onNotes }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const osmdRef = useRef<any>(null);
  const cleanupRef = useRef<Array<() => void>>([]);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const onNotesRef = useRef(onNotes);
  onNotesRef.current = onNotes;
  const notesRef = useRef<ScheduledNote[]>([]);
  const contourRef = useRef(contour);
  contourRef.current = contour;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const [renderError, setRenderError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

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

  const wireAfterRender = (notesOut: (n: ScheduledNote[]) => void) => {
    runCleanups();
    activeNotes.clearHover();

    const osmd = osmdRef.current;
    if (!osmd) return;
    const { notes } = parseSheetToNotes(osmd, bpmRef.current);

    notesRef.current = notes;
    paintNotes(notes);

    for (const note of notes) {
      if (!note.svgEls?.length) continue;
      for (const el of note.svgEls) {
        const onEnter = () => {
          activeNotes.addHover(note.midi, note.hand);
          el.classList.add("note-hover");
        };
        const onLeave = () => {
          activeNotes.removeHover(note.midi, note.hand);
          el.classList.remove("note-hover");
        };
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
        cleanupRef.current.push(() => {
          el.removeEventListener("mouseenter", onEnter);
          el.removeEventListener("mouseleave", onLeave);
        });
      }
    }

    drawContourLayer(containerRef.current, notes);
    applyContourVisibility(containerRef.current, contourRef.current);

    notesOut(notes);
  };

  // Initial load / xml change — recreate OSMD.
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    setRenderError(null);

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
        (osmd as any).Zoom = zoom;
        osmd.render();
        wireAfterRender(onNotes);
      } catch (e) {
        if (cancelled) return;
        console.error("OSMD load/render failed:", e);
        setRenderError("Failed to render sheet music — the file could not be parsed.");
      }
    })();

    return () => {
      cancelled = true;
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
  }, [xml, reloadNonce]);

  // Zoom — re-render OSMD and re-wire listeners + contour.
  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd) return;
    try {
      (osmd as any).Zoom = zoom;
      osmd.render();
      wireAfterRender(onNotes);
    } catch (e) {
      console.error("Zoom render failed:", e);
      setRenderError("Failed to re-render sheet music at this zoom level.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // Colors — repaint live when the palette changes. Stems need an OSMD re-render (debounced).
  useEffect(() => {
    let lastSig = noteSignature();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = subscribeColors(() => {
      const sig = noteSignature();
      if (sig === lastSig) return;
      lastSig = sig;
      paintNotes(notesRef.current); // accidentals + hover color, instant
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const osmd = osmdRef.current;
        if (!osmd) return;
        try {
          applyStemColors(osmd);
          (osmd as any).Zoom = zoomRef.current;
          osmd.render();
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
    if (!osmd) return;
    try {
      const { notes } = parseSheetToNotes(osmd, bpm);
      onNotes(notes);
    } catch (e) {
      console.error("BPM recompute failed:", e);
    }
  }, [bpm, onNotes]);

  // Contour toggle.
  useEffect(() => {
    applyContourVisibility(containerRef.current, contour);
  }, [contour]);

  // Isolation as data attribute.
  useEffect(() => {
    const root = containerRef.current;
    if (root) root.dataset.isolation = isolation;
  }, [isolation]);

  return (
    <div className="relative h-full w-full overflow-auto bg-background">
      <div ref={containerRef} className="score-root min-w-full p-4" />
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

/** Draw a thin polyline per hand connecting sequential notehead centers. */
function drawContourLayer(container: HTMLDivElement | null, notes: ScheduledNote[]) {
  if (!container) return;
  const svg = container.querySelector("svg") as SVGSVGElement | null;
  if (!svg) return;

  svg.querySelector(`#${CONTOUR_LAYER_ID}`)?.remove();

  const ctm = svg.getScreenCTM();
  if (!ctm) return;
  const inv = ctm.inverse();

  const toSvg = (rect: DOMRect) => {
    const pt = svg.createSVGPoint();
    pt.x = rect.left + rect.width / 2;
    pt.y = rect.top + rect.height / 2;
    return pt.matrixTransform(inv);
  };

  const ordered = [...notes].sort((a, b) => a.startSec - b.startSec);
  const byHand: Record<string, Array<{ x: number; y: number }>> = { RH: [], LH: [] };
  for (const n of ordered) {
    const el = n.svgEls?.[0];
    if (!el || !el.isConnected) continue;
    const rect = el.getBoundingClientRect();
    if (!rect.width && !rect.height) continue;
    const p = toSvg(rect);
    byHand[n.hand].push({ x: p.x, y: p.y });
  }

  const NS = "http://www.w3.org/2000/svg";
  const layer = document.createElementNS(NS, "g");
  layer.setAttribute("id", CONTOUR_LAYER_ID);
  layer.setAttribute("pointer-events", "none");

  for (const hand of ["RH", "LH"] as const) {
    const pts = byHand[hand];
    if (pts.length < 2) continue;
    const poly = document.createElementNS(NS, "polyline");
    poly.setAttribute("points", pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" "));
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", "currentColor");
    poly.setAttribute("stroke-width", "1.2");
    poly.setAttribute("stroke-opacity", "0.45");
    poly.setAttribute("stroke-linejoin", "round");
    poly.setAttribute("stroke-linecap", "round");
    poly.setAttribute("class", `contour-line contour-${hand}`);
    layer.appendChild(poly);
  }

  svg.appendChild(layer);
}

function applyContourVisibility(container: HTMLDivElement | null, visible: boolean) {
  if (!container) return;
  const layer = container.querySelector(`#${CONTOUR_LAYER_ID}`) as SVGGElement | null;
  if (layer) layer.style.display = visible ? "" : "none";
}
