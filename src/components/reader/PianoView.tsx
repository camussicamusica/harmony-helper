import { useSyncExternalStore } from "react";
import { activeNotes } from "@/lib/music/scheduler";
import { buildKeyboardGeometry, midiToName } from "@/lib/music/midiUtils";
import type { IsolationMode } from "@/lib/music/types";

interface Props {
  isolation: IsolationMode;
}

const WHITE_W = 22;
const WHITE_H = 160;
const BLACK_H = 100;

export function PianoView({ isolation }: Props) {
  // Subscribe to active-notes store.
  useSyncExternalStore(activeNotes.subscribe, activeNotes.getSnapshot, activeNotes.getSnapshot);

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
          const fill = active === "RH" ? "var(--color-rh)" : active === "LH" ? "var(--color-lh)" : "white";
          const stroke = "var(--color-border)";
          return (
            <g key={k.midi}>
              <rect
                x={k.x}
                y={0}
                width={k.width}
                height={WHITE_H}
                fill={fill}
                stroke={stroke}
                strokeWidth={1}
                rx={2}
              />
              {active && (
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
          const fill = active === "RH" ? "var(--color-rh)" : active === "LH" ? "var(--color-lh)" : "#1a1a1a";
          return (
            <g key={k.midi}>
              <rect
                x={k.x}
                y={0}
                width={k.width}
                height={BLACK_H}
                fill={fill}
                stroke="#1a1a1a"
                strokeWidth={1}
                rx={2}
              />
              {active && (
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
