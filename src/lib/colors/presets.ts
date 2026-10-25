export interface Preset {
  id: string;
  name: string;
  /** role id -> color. Applying a preset changes only these roles. */
  colors: Record<string, string>;
}

export const PRESETS: Preset[] = [
  {
    id: "callipari-chords",
    name: "Acordes Callipari",
    colors: {
      "chord-major": "#E8588F",
      "chord-minor": "#6CC4EE",
      "chord-diminished": "#A066E0",
      "chord-augmented": "#7AC943",
      "chord-dominant7": "#F5C46A",
    },
  },
];
