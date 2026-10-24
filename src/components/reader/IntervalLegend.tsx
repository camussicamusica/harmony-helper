import { PILL_TEXT_DARK, PILL_TEXT_LIGHT } from "@/lib/colors/defaults";
import { readableTextOn } from "@/lib/colors/color";
import { useColors } from "@/lib/colors/store";
import { INTERVAL_KEY_LABEL } from "@/lib/music/naming";

/** Compact legend of the intervals present in the score. Never blocks the score (pointer-events-none). */
export function IntervalLegend({ keys }: { keys: string[] }) {
  const { palette } = useColors();
  if (!keys.length) return null;
  return (
    <div className="pointer-events-none absolute bottom-2 right-2 z-10 flex max-w-[60%] flex-wrap justify-end gap-1 rounded-md border border-border bg-card/90 p-1.5 shadow-sm">
      {keys.map((k) => {
        const role = palette.roles.find((r) => r.id === `interval-${k}`);
        if (!role) return null;
        const off = role.enabled === false && k !== "P1";
        return (
          <span
            key={k}
            className="rounded-full px-2 py-px text-[10px] font-semibold leading-4"
            style={{
              backgroundColor: role.color,
              color: readableTextOn(role.color, PILL_TEXT_DARK, PILL_TEXT_LIGHT),
              opacity: off ? 0.35 : 1,
            }}
          >
            {INTERVAL_KEY_LABEL[k]}
          </span>
        );
      })}
    </div>
  );
}
