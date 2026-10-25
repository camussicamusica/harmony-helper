import { useSyncExternalStore } from "react";
import { activeNotes } from "@/lib/music/scheduler";
import { buildKeyboardGeometry, midiToName } from "@/lib/music/midiUtils";
import type { IsolationMode } from "@/lib/music/types";
import { noteColor, pianoKeyColor, subscribe as subscribeColors, getState } from "@/lib/colors/store";
import { BLACK_KEY_COLOR, PLAIN_COLOR, RING_NEUTRAL_COLOR } from "@/lib/colors/defaults";
import { useMidiInput } from "@/lib/midi/input";

interface Props {
  isolation: IsolationMode;
}

const WHITE_W = 22;
const WHITE_H = 160;
const BLACK_H = 100;

export function PianoView({ isolation }: Props) {
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

  const geom = buildKeyboardGeometry(WHITE_W);

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
    <div className="h-full w-full overflow-x-auto overflow-y-hidden bg-muted/30">
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
