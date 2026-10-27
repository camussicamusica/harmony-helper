import { useCallback, useEffect, useRef, useState } from "react";
import { parseTheme, resolveTheme, type ThemePref } from "./theme";

/** One localStorage entry for the layout choices: top menu and piano open/closed. */
export const UI_KEY = "hh.ui.v1";

export interface UiPrefs {
  menuOpen: boolean;
  pianoOpen: boolean;
  /** Hover panel: the "Más" part (armonía, suenan ahora, melodía) is open. */
  tipMore: boolean;
  /** Claro / Oscuro / Automático (follows the Mac). */
  theme: ThemePref;
}

const DEFAULTS: UiPrefs = { menuOpen: true, pianoOpen: true, tipMore: false, theme: "auto" };

export function parseUiPrefs(raw: string | null): UiPrefs {
  if (!raw) return DEFAULTS;
  try {
    const o = JSON.parse(raw) as Partial<UiPrefs> | null;
    return {
      menuOpen: typeof o?.menuOpen === "boolean" ? o.menuOpen : DEFAULTS.menuOpen,
      pianoOpen: typeof o?.pianoOpen === "boolean" ? o.pianoOpen : DEFAULTS.pianoOpen,
      tipMore: typeof o?.tipMore === "boolean" ? o.tipMore : DEFAULTS.tipMore,
      theme: parseTheme(o?.theme),
    };
  } catch {
    return DEFAULTS;
  }
}

/** Merge `patch` into whatever is stored now (so independent readers never overwrite each other's fields). */
export function mergeUiPrefs(raw: string | null, patch: Partial<UiPrefs>): UiPrefs {
  return { ...parseUiPrefs(raw), ...patch };
}

/** Read / write one field straight from localStorage (for components that do not use the hook). */
export function readTipMore(): boolean {
  try {
    return parseUiPrefs(localStorage.getItem(UI_KEY)).tipMore;
  } catch {
    return false;
  }
}
export function writeTipMore(open: boolean) {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(mergeUiPrefs(localStorage.getItem(UI_KEY), { tipMore: open })));
  } catch {
    /* ignore */
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
    let next = { ...ref.current, ...patch };
    try {
      next = mergeUiPrefs(localStorage.getItem(UI_KEY), patch);
    } catch {
      /* ignore */
    }
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

  const setTheme = useCallback((theme: ThemePref) => update({ theme }), [update]);

  // Put the theme on <html>; "auto" follows the Mac live.
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const apply = () => {
      const t = resolveTheme(prefs.theme, !!mq?.matches);
      const r = document.documentElement;
      r.classList.toggle("dark", t === "dark");
      r.setAttribute("data-theme", t);
      r.style.colorScheme = t;
    };
    apply();
    if (prefs.theme !== "auto" || !mq) return;
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [prefs.theme]);

  return { ...prefs, animate, toggleMenu, togglePiano, setTheme };
}
