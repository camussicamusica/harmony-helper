import { beforeAll, describe, expect, test } from "bun:test";

// The color store reads localStorage when it is first loaded; give it an in-memory one.
const mem = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};

let store: typeof import("../src/lib/colors/store");
let defaults: typeof import("../src/lib/colors/defaults");
beforeAll(async () => {
  store = await import("../src/lib/colors/store");
  defaults = await import("../src/lib/colors/defaults");
});

const palette = (roles: import("../src/lib/colors/types").ColorRole[], extra: object = {}) => ({
  id: "p1", name: "Mía", createdAt: "2026-01-01", updatedAt: "2026-01-01", roles, swatches: [], ...extra,
});

describe("mergeDefaults: updating an old saved palette", () => {
  test("keeps the colors she chose", () => {
    const roles = defaults.buildDefaultRoles();
    roles.find((r) => r.id === "note-0")!.color = "#123456";
    roles.find((r) => r.id === "chord-major")!.color = "#abcdef";
    const out = store.mergeDefaults(palette(roles));
    expect(out.roles.find((r) => r.id === "note-0")!.color).toBe("#123456");
    expect(out.roles.find((r) => r.id === "chord-major")!.color).toBe("#abcdef");
  });

  test("adds roles that a newer release brought (without touching the others)", () => {
    const roles = defaults.buildDefaultRoles().filter((r) => r.id !== "ui-text" && r.id !== "function-degree-7");
    const out = store.mergeDefaults(palette(roles));
    expect(out.roles.map((r) => r.id)).toContain("ui-text");
    expect(out.roles.map((r) => r.id)).toContain("function-degree-7");
    expect(out.roles).toHaveLength(defaults.buildDefaultRoles().length);
  });

  test("migrates the old placeholder grey of an interval she never repainted", () => {
    const roles = defaults.buildDefaultRoles();
    roles.find((r) => r.id === "interval-m2")!.color = "#D2D2D2"; // the old grey (any letter case)
    const out = store.mergeDefaults(palette(roles));
    expect(out.roles.find((r) => r.id === "interval-m2")!.color).toBe(defaults.INTERVAL_DEFAULTS.m2);
  });

  test("does NOT repaint an interval she colored herself", () => {
    const roles = defaults.buildDefaultRoles();
    roles.find((r) => r.id === "interval-M2")!.color = "#010203";
    const out = store.mergeDefaults(palette(roles));
    expect(out.roles.find((r) => r.id === "interval-M2")!.color).toBe("#010203");
  });

  test("keeps her custom roles, her swatches and a switched-off note", () => {
    const roles = defaults.buildDefaultRoles();
    roles.find((r) => r.id === "note-2")!.enabled = false;
    roles.push({ id: "custom-1", group: "chords", name: "Mi acorde", color: "#808080", targets: ["square"], builtIn: false, enabled: true });
    const out = store.mergeDefaults(palette(roles, { swatches: ["#ff0000"] }));
    expect(out.roles.find((r) => r.id === "note-2")!.enabled).toBe(false);
    expect(out.roles.find((r) => r.id === "custom-1")?.name).toBe("Mi acorde");
    expect(out.swatches).toEqual(["#ff0000"]);
  });

  test("fills in `enabled` on roles saved before that existed", () => {
    const roles = defaults.buildDefaultRoles().map((r) => { const { enabled, ...rest } = r; return rest as any; });
    const out = store.mergeDefaults(palette(roles));
    expect(out.roles.every((r) => r.enabled === true)).toBe(true);
  });
});

describe("versions are never deleted", () => {
  test("saving, duplicating and switching only ever add versions", () => {
    const start = store.listVersions().length;
    const firstId = store.getState().currentId;
    store.setRoleColor("note-0", "#111111");
    const savedId = store.saveVersion("Prueba 1");
    expect(store.listVersions()).toHaveLength(start + 1);
    store.duplicateVersion();
    expect(store.listVersions()).toHaveLength(start + 2);
    store.switchVersion(firstId);
    store.setRoleColor("note-0", "#222222"); // keeps editing the original
    expect(store.listVersions()).toHaveLength(start + 2);
    // the earlier snapshot still has the color it was saved with
    expect(store.listVersions().find((v) => v.id === savedId)!.roles.find((r) => r.id === "note-0")!.color).toBe("#111111");
  });

  test("there is no way to delete a version in the public API", () => {
    const names = Object.keys(store);
    expect(names.filter((n) => /delete|remove(Version|Palette)/i.test(n))).toEqual([]);
  });

  test("importing a palette adds a new version and leaves the others alone", () => {
    const before = store.listVersions().map((v) => v.id);
    const json = store.exportJson();
    expect(store.importJson(json)).toBeNull();
    const after = store.listVersions();
    expect(after).toHaveLength(before.length + 1);
    for (const id of before) expect(after.some((v) => v.id === id)).toBe(true);
  });

  test("a custom role is hidden, never destroyed; built-in roles cannot be hidden", () => {
    const id = store.addRole("chords", "Mío");
    store.hideRole(id);
    expect(store.getRole(id)?.hidden).toBe(true);
    store.hideRole("note-0");
    expect(store.getRole("note-0")?.hidden).toBeFalsy();
  });

  test("an invalid import is refused and changes nothing", () => {
    const n = store.listVersions().length;
    expect(store.importJson("not json")).toContain("JSON");
    expect(store.importJson(JSON.stringify({ palette: { name: "x", roles: "no" } }))).toContain("paleta");
    expect(store.listVersions()).toHaveLength(n);
  });
});
