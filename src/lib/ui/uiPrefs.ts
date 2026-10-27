import { useCallback, useEffect, useRef, useState } from "react";

/** One localStorage entry for the layout choices: top menu and piano open/closed. */
export const UI_KEY = "hh.ui.v1";

export interface UiPrefs {
  menuOpen: boolean;
  pianoOpen: boolean;
}

const DEFAULTS: UiPrefs = { menuOpen: true, pianoOpen: true };

export function parseUiPrefs(raw: string | null): UiPrefs {
  if (!raw) return DEFAULTS;
  try {
    const o = JSON.parse(raw) as Partial<UiPrefs> | null;
    return {
      menuOpen: typeof o?.menuOpen === "boolean" ? o.menuOpen : DEFAULTS.menuOpen,
      pianoOpen: typeof o?.pianoOpen === "boolean" ? o.pianoOpen : DEFAULTS.pianoOpen,
    };
  } catch {
    return DEFAULTS;
  }
}

/**
 * Menu / piano visibility, remembered in localStorage. Read after mount so server and client markup match.
 * `animate` turns true a moment after the saved state is applied, so the first paint does not slide.
 */
export function useUiPrefs() {
  const [prefs, setPrefs] = useState<UiPrefs>(DEFAULTS);
  const ref = useRef(prefs);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    try {
      const p = parseUiPrefs(localStorage.getItem(UI_KEY));
      ref.current = p;
      setPrefs(p);
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => setAnimate(true), 60);
    return () => clearTimeout(t);
  }, []);

  const update = useCallback((patch: Partial<UiPrefs>) => {
    const next = { ...ref.current, ...patch };
    ref.current = next;
    setPrefs(next);
    try {
      localStorage.setItem(UI_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMenu = useCallback(() => update({ menuOpen: !ref.current.menuOpen }), [update]);
  const togglePiano = useCallback(() => update({ pianoOpen: !ref.current.pianoOpen }), [update]);

  return { ...prefs, animate, toggleMenu, togglePiano };
}
