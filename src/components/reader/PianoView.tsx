import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { activeNotes } from "@/lib/music/scheduler";
import { buildKeyboardGeometry, midiToName } from "@/lib/music/midiUtils";
import type { IsolationMode } from "@/lib/music/types";
import { noteColor, pianoKeyColor, subscribe as subscribeColors, getState } from "@/lib/colors/store";
import { BLACK_KEY_COLOR, PLAIN_COLOR, RING_NEUTRAL_COLOR } from "@/lib/colors/defaults";
import { useMidiInput } from "@/lib/midi/input";

interface Props {
  isolation: IsolationMode;
  /** Keyboard shown (the slim "Piano" handle always stays). */
  open: boolean;
  /** Slide the open/close; false for the first paint. */
  animate: boolean;
  onToggle: () => void;
}

const WHITE_W = 22; // narrowest key; below this the keyboard scrolls
const MAX_WHITE_W = 32; // widest key when the window is wide
const WHITE_KEYS = 52;
const MIDDLE_C = 60;
const WHITE_H = 160;
const BLACK_H = 100;

export function PianoView({ isolation, open, animate, onToggle }: Props) {
  // Subscribe to active-notes store.
  useSyncExternalStore(activeNotes.subscribe, activeNotes.getSnapshot, activeNotes.getSnapshot);

  // Re-render when the palette changes.
  useSyncExternalStore(subscribeColors, getState, getState);

  // Keys she is pressing on her MIDI keyboard.
  const { pressed } = useMidiInput();
  // Her note color; the neutral grey when that note's color is switched off (plain black would vanish on black keys).
  const userColor = (midi: number) => {
    const c = noteColor(midi);
    return c === PLAIN_COLOR ? RING_NEUTRAL_COLOR : c;
  };

  // Keys grow with the window (up to MAX_WHITE_W); the keyboard is centered. Narrower than WHITE_KEYS * WHITE_W: it scrolls.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [boxW, setBoxW] = useState(0);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setBoxW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const whiteW = boxW > 0 ? Math.max(WHITE_W, Math.min(MAX_WHITE_W, Math.floor((boxW / WHITE_KEYS) * 10) / 10)) : WHITE_W;
  const geom = buildKeyboardGeometry(whiteW);

  // When it does not fit, start with middle C in the middle of the view.
  const overflows = boxW > 0 && geom.totalWidth > boxW + 1;
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !overflows) return;
    const c = geom.keys.find((k) => k.midi === MIDDLE_C);
    if (c) el.scrollLeft = c.x + c.width / 2 - el.clientWidth / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overflows, whiteW]);

  const showRH = isolation !== "lh";
  const showLH = isolation !== "rh";

  const isActive = (midi: number): "RH" | "LH" | null => {
    if (showRH && activeNotes.isActive(midi, "RH")) return "RH";
    if (showLH && activeNotes.isActive(midi, "LH")) return "LH";
    return null;
  };

  const whites = geom.keys.filter((k) => !k.isBlack);
  const blacks = geom.keys.filter((k) => k.isBlack);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="piano-panel"
        aria-label={open ? "Ocultar piano" : "Mostrar piano"}
        title={`${open ? "Ocultar piano" : "Mostrar piano"} (tecla p)`}
        className="flex h-6 w-full items-center justify-center gap-1.5 border-t border-border bg-card text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        Piano
      </button>
      <div
        id="piano-panel"
        inert={!open}
        aria-hidden={!open}
        className={`grid ${animate ? "transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none" : ""} ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
      <div className="min-h-0 overflow-hidden">
      <div ref={scrollRef} className="h-[172px] w-full overflow-x-auto overflow-y-hidden bg-muted/30">
      <div className="mx-auto" style={{ width: geom.totalWidth }}>
      <svg
        width={geom.totalWidth}
        height={WHITE_H}
        viewBox={`0 0 ${geom.totalWidth} ${WHITE_H}`}
        className="block"
      >
        {/* White keys */}
        {whites.map((k) => {
          const active = isActive(k.midi);
          const fill = active
            ? (pianoKeyColor(k.midi) ?? (active === "RH" ? "var(--color-rh)" : "var(--color-lh)"))
            : "white";
          const stroke = "var(--color-border)";
          const mine = pressed.has(k.midi);
          return (
            <g key={k.midi}>
              <rect
                x={k.x}
                y={0}
                width={k.width}
                height={WHITE_H}
                fill={mine ? userColor(k.midi) : fill}
                stroke={stroke}
                strokeWidth={1}
                rx={2}
              />
              {mine && <UserMark x={k.x} w={k.width} h={WHITE_H} dotY={WHITE_H - 14} />}
              {active && !mine && (
                <text
                  x={k.x + k.width / 2}
                  y={WHITE_H - 14}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill={active === "RH" ? "var(--color-rh-foreground)" : "var(--color-lh-foreground)"}
                >
                  {midiToName(k.midi)}
                </text>
              )}
            </g>
          );
        })}
        {/* Black keys (drawn on top) */}
        {blacks.map((k) => {
          const active = isActive(k.midi);
          const fill = active
            ? (pianoKeyColor(k.midi) ?? (active === "RH" ? "var(--color-rh)" : "var(--color-lh)"))
            : BLACK_KEY_COLOR;
          const mine = pressed.has(k.midi);
          return (
            <g key={k.midi}>
              <rect
                x={k.x}
                y={0}
                width={k.width}
                height={BLACK_H}
                fill={mine ? userColor(k.midi) : fill}
                stroke={BLACK_KEY_COLOR}
                strokeWidth={1}
                rx={2}
              />
              {mine && <UserMark x={k.x} w={k.width} h={BLACK_H} dotY={BLACK_H - 12} />}
              {active && !mine && (
                <text
                  x={k.x + k.width / 2}
                  y={BLACK_H - 10}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight={600}
                  fill={active === "RH" ? "var(--color-rh-foreground)" : "var(--color-lh-foreground)"}
                >
                  {midiToName(k.midi)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      </div>
      </div>
      </div>
      </div>
    </div>
  );
}

/**
 * Marks a key she is pressing on her MIDI keyboard: a dark ring with a white inner ring, plus a dot.
 * Playback of the piece only fills the key, so the two never look alike.
 */
function UserMark({ x, w, h, dotY }: { x: number; w: number; h: number; dotY: number }) {
  return (
    <g pointerEvents="none" data-user-key>
      <rect x={x + 1.5} y={1.5} width={w - 3} height={h - 3} rx={2} fill="none" stroke="#0B1220" strokeWidth={3} />
      <rect x={x + 3.5} y={3.5} width={w - 7} height={h - 7} rx={1} fill="none" stroke="#ffffff" strokeWidth={1.5} />
      <circle cx={x + w / 2} cy={dotY} r={Math.min(4, w / 3)} fill="#ffffff" stroke="#0B1220" strokeWidth={1.5} />
    </g>
  );
}
