export type ThemePref = "auto" | "light" | "dark";

export const THEME_ORDER: ThemePref[] = ["light", "dark", "auto"];

export const THEME_LABEL: Record<ThemePref, string> = { light: "Claro", dark: "Oscuro", auto: "Automático" };

export function parseTheme(v: unknown): ThemePref {
  return v === "light" || v === "dark" || v === "auto" ? v : "auto";
}

/** Claro -> Oscuro -> Automático -> Claro. */
export function nextTheme(cur: ThemePref): ThemePref {
  return THEME_ORDER[(THEME_ORDER.indexOf(cur) + 1) % THEME_ORDER.length];
}

/** The theme actually drawn: "auto" follows the system. */
export function resolveTheme(pref: ThemePref, systemDark: boolean): "light" | "dark" {
  return pref === "auto" ? (systemDark ? "dark" : "light") : pref;
}

/**
 * Runs in <head> before the first paint (and before hydration), so the page never flashes the wrong theme.
 * Same rule as resolveTheme, reading hh.ui.v1.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t="auto";try{var o=JSON.parse(localStorage.getItem("hh.ui.v1")||"null");if(o&&(o.theme==="light"||o.theme==="dark"||o.theme==="auto"))t=o.theme}catch(e){}var d=t==="dark"||(t==="auto"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d){r.classList.add("dark")}r.setAttribute("data-theme",d?"dark":"light");r.style.colorScheme=d?"dark":"light"}catch(e){}})();`;
