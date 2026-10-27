import { describe, expect, test } from "bun:test";
import { nextTheme, parseTheme, resolveTheme, THEME_INIT_SCRIPT } from "../src/lib/ui/theme";
import { mergeUiPrefs, parseUiPrefs } from "../src/lib/ui/uiPrefs";

describe("theme", () => {
  test("cycles Claro -> Oscuro -> Automático", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("auto");
    expect(nextTheme("auto")).toBe("light");
  });
  test("auto follows the system, a choice wins", () => {
    expect(resolveTheme("auto", true)).toBe("dark");
    expect(resolveTheme("auto", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  test("unknown values fall back to auto", () => {
    expect(parseTheme("blue")).toBe("auto");
    expect(parseTheme(undefined)).toBe("auto");
  });
  test("stored in hh.ui.v1 next to the existing fields, which survive", () => {
    const raw = JSON.stringify({ menuOpen: false, pianoOpen: true, tipMore: true });
    expect(parseUiPrefs(raw).theme).toBe("auto");
    const merged = mergeUiPrefs(raw, { theme: "dark" });
    expect(merged).toMatchObject({ menuOpen: false, pianoOpen: true, tipMore: true, theme: "dark" });
    expect(parseUiPrefs(JSON.stringify(merged)).theme).toBe("dark");
  });
  test("the inline script reads the same key and sets the class", () => {
    expect(THEME_INIT_SCRIPT).toContain("hh.ui.v1");
    expect(THEME_INIT_SCRIPT).toContain('classList.add("dark")');
  });
});
