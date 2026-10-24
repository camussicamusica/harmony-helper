import { useEffect, useState } from "react";

export type LineColorMode = "notas" | "intervalos" | "ambos";

export const LINE_MODES: { id: LineColorMode; label: string }[] = [
  { id: "notas", label: "Notas" },
  { id: "intervalos", label: "Intervalos" },
  { id: "ambos", label: "Ambos" },
];

const KEY = "hh.lineMode.v1";

/** Line color mode, remembered in localStorage (read after mount so server and client markup match). */
export function useLineMode(): [LineColorMode, (m: LineColorMode) => void] {
  const [mode, setModeState] = useState<LineColorMode>("notas");
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "notas" || v === "intervalos" || v === "ambos") setModeState(v);
    } catch {
      /* ignore */
    }
  }, []);
  const setMode = (m: LineColorMode) => {
    setModeState(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* ignore */
    }
  };
  return [mode, setMode];
}
