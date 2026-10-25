export type ColorGroup = "notes" | "chords" | "intervals" | "patterns" | "functions" | "interface";

export type ColorTarget =
  | "stem"
  | "notehead"
  | "accidental"
  | "pianoKey"
  | "square"
  | "circleOutline"
  | "band"
  | "cssVar";

export interface ColorRole {
  id: string;
  group: ColorGroup;
  name: string;
  /** #rrggbb */
  color: string;
  targets: ColorTarget[];
  builtIn: boolean;
  /** Custom roles are hidden, never destroyed. */
  hidden?: boolean;
  /** Fade-out switch. false = this role shows plain black (notes). Separate from `hidden`. Default true. */
  enabled: boolean;
  /** For interface roles: CSS variable names to write. */
  cssVars?: string[];
}

export interface Palette {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  roles: ColorRole[];
  /** Her saved swatches (#rrggbb). */
  swatches: string[];
}

export const GROUPS: { id: ColorGroup; label: string }[] = [
  { id: "notes", label: "Notas" },
  { id: "chords", label: "Acordes" },
  { id: "intervals", label: "Intervalos" },
  { id: "patterns", label: "Patrones" },
  { id: "functions", label: "Funciones" },
  { id: "interface", label: "Interfaz" },
];

export const ALL_TARGETS: { id: ColorTarget; label: string }[] = [
  { id: "stem", label: "Plica" },
  { id: "notehead", label: "Cabeza de nota" },
  { id: "accidental", label: "Alteración" },
  { id: "pianoKey", label: "Tecla del piano" },
  { id: "square", label: "Cuadrado" },
  { id: "circleOutline", label: "Círculo" },
  { id: "band", label: "Franja" },
];
