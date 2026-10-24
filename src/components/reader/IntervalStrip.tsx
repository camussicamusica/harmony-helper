import { INTERVAL_IDS, OFF_CHIP_COLOR, PILL_TEXT_DARK, PILL_TEXT_LIGHT } from "@/lib/colors/defaults";
import { readableTextOn } from "@/lib/colors/color";
import { setIntervalsEnabled, setRoleEnabled, useColors } from "@/lib/colors/store";
import { INTERVAL_KEY_LABEL } from "@/lib/music/naming";

/** Chips "2ª m … 8ª" + Todos / Ninguno + "Estudiar de a uno". Toggles each interval role's `enabled`. */
export function IntervalStrip() {
  const { palette } = useColors();
  const roles = INTERVAL_IDS.map((id) => ({ id, role: palette.roles.find((r) => r.id === `interval-${id}`) }));
  const on = roles.filter((r) => r.role && r.role.enabled !== false).map((r) => r.id);
  const allOn = on.length === roles.length;
  const allOff = on.length === 0;
  const active = on.length === 1 ? on[0] : null;

  const studyNext = () => {
    const i = active ? INTERVAL_IDS.indexOf(active as (typeof INTERVAL_IDS)[number]) : -1;
    setIntervalsEnabled(false, INTERVAL_IDS[(i + 1) % INTERVAL_IDS.length]);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Un salto a la vez</span>
      <div className="flex flex-wrap items-center gap-1">
        {roles.map(({ id, role }) => {
          if (!role) return null;
          const isOn = role.enabled !== false;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setRoleEnabled(role.id, !isOn)}
              aria-pressed={isOn}
              title={`${INTERVAL_KEY_LABEL[id]}: ${isOn ? "visible" : "apagado"}`}
              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-4"
              style={
                isOn
                  ? {
                      backgroundColor: role.color,
                      borderColor: role.color,
                      color: readableTextOn(role.color, PILL_TEXT_DARK, PILL_TEXT_LIGHT),
                    }
                  : { backgroundColor: "transparent", borderColor: OFF_CHIP_COLOR, color: OFF_CHIP_COLOR }
              }
            >
              {INTERVAL_KEY_LABEL[id]}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
        <button
          type="button"
          onClick={() => setIntervalsEnabled(true)}
          className={`rounded px-2 py-0.5 text-xs ${allOn ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Todos
        </button>
        <button
          type="button"
          onClick={() => setIntervalsEnabled(false)}
          className={`rounded px-2 py-0.5 text-xs ${allOff ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Ninguno
        </button>
      </div>
      <button
        type="button"
        onClick={studyNext}
        title="Deja un solo intervalo; cada clic pasa al siguiente"
        className={`rounded-md border px-2 py-0.5 text-xs ${active ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
      >
        Estudiar de a uno{active ? `: ${INTERVAL_KEY_LABEL[active]} →` : ""}
      </button>
    </div>
  );
}
