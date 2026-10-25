import { NOTE_SHORT, OFF_CHIP_COLOR } from "@/lib/colors/defaults";
import { noteChipLabel } from "@/lib/colors/labels";
import { setNotesEnabled, setRoleEnabled, useColors } from "@/lib/colors/store";

/** 12 round chips (C … B). Filled = colored, outlined grey = plain black. Click toggles. */
export function NoteColorStrip() {
  const { palette } = useColors();
  const roles = Array.from({ length: 12 }, (_, i) => palette.roles.find((r) => r.id === `note-${i}`));
  const allOn = roles.every((r) => r?.enabled !== false);
  const allOff = roles.every((r) => r?.enabled === false);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Colores de las notas</span>
      <div className="flex items-center gap-1">
        {roles.map((r, i) => {
          if (!r) return null;
          const on = r.enabled !== false;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRoleEnabled(r.id, !on)}
              aria-pressed={on}
              aria-label={`${noteChipLabel(i)}: ${on ? "con color" : "en negro"}`}
              title={`${noteChipLabel(i)}: ${on ? "con color" : "en negro"}`}
              className="flex h-5 w-5 items-center justify-center rounded-full border text-[8px] font-semibold leading-none"
              style={
                on
                  ? { backgroundColor: r.color, borderColor: r.color, color: "transparent" }
                  : { backgroundColor: "transparent", borderColor: OFF_CHIP_COLOR, color: OFF_CHIP_COLOR }
              }
            >
              {on ? "" : NOTE_SHORT[i].length === 1 ? NOTE_SHORT[i] : ""}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
        <button
          type="button"
          onClick={() => setNotesEnabled(true)}
          className={`rounded px-2 py-0.5 text-xs ${allOn ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Todas
        </button>
        <button
          type="button"
          onClick={() => setNotesEnabled(false)}
          className={`rounded px-2 py-0.5 text-xs ${allOff ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Ninguna
        </button>
      </div>
    </div>
  );
}
