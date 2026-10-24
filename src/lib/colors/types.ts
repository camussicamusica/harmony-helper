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
  { id: "notes", label: "Notes" },
  { id: "chords", label: "Chords" },
  { id: "intervals", label: "Intervals" },
  { id: "patterns", label: "Patterns" },
  { id: "functions", label: "Functions" },
  { id: "interface", label: "Interface" },
];

export const ALL_TARGETS: { id: ColorTarget; label: string }[] = [
  { id: "stem", label: "Stem" },
  { id: "notehead", label: "Notehead" },
  { id: "accidental", label: "Accidental" },
  { id: "pianoKey", label: "Piano key" },
  { id: "square", label: "Square" },
  { id: "circleOutline", label: "Circle" },
  { id: "band", label: "Band" },
];
