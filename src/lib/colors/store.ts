import { useSyncExternalStore } from "react";
import { normalizeHex } from "./color";
import { buildDefaultRoles, PLAIN_COLOR } from "./defaults";
import { PRESETS } from "./presets";
import type { ColorGroup, ColorRole, ColorTarget, Palette } from "./types";

const STORAGE_KEY = "hh.colors.v1";

interface State {
  versions: Palette[];
  currentId: string;
}

const GROUP_IDS: ColorGroup[] = ["notes", "chords", "intervals", "patterns", "functions", "interface"];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const now = () => new Date().toISOString();

function defaultPalette(name = "My colors"): Palette {
  const t = now();
  return { id: uid(), name, createdAt: t, updatedAt: t, roles: buildDefaultRoles(), swatches: [] };
}

/** Add built-in roles that are missing (new releases) and fill in `enabled`. Never touches her values. */
function mergeDefaults(p: Palette): Palette {
  const have = new Map(p.roles.map((r) => [r.id, r]));
  const roles: ColorRole[] = p.roles.map((r) => ({ ...r, enabled: r.enabled !== false }));
  for (const d of buildDefaultRoles()) {
    if (!have.has(d.id)) roles.push(d);
    else {
      // keep structural defaults (cssVars) current without touching her values
      const r = roles.find((x) => x.id === d.id)!;
      if (d.cssVars && !r.cssVars) r.cssVars = d.cssVars;
    }
  }
  return { ...p, roles, swatches: Array.isArray(p.swatches) ? p.swatches : [] };
}

function isPalette(x: any): x is Palette {
  return (
    x &&
    typeof x === "object" &&
    typeof x.name === "string" &&
    Array.isArray(x.roles) &&
    x.roles.every(
      (r: any) =>
        r &&
        typeof r.id === "string" &&
        GROUP_IDS.includes(r.group) &&
        typeof r.name === "string" &&
        typeof r.color === "string" &&
        normalizeHex(r.color) !== null &&
        Array.isArray(r.targets),
    )
  );
}

function sanitize(p: Palette): Palette {
  const t = now();
  return mergeDefaults({
    id: typeof p.id === "string" ? p.id : uid(),
    name: p.name,
    createdAt: p.createdAt ?? t,
    updatedAt: p.updatedAt ?? t,
    swatches: (Array.isArray(p.swatches) ? p.swatches : [])
      .map((s) => normalizeHex(String(s)))
      .filter((s): s is string => !!s),
    roles: p.roles.map((r) => ({
      ...r,
      color: normalizeHex(r.color)!,
      builtIn: !!r.builtIn,
      enabled: r.enabled !== false,
    })),
  });
}

function load(): State {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.versions) && parsed.versions.every(isPalette) && parsed.versions.length) {
        const versions = parsed.versions.map(sanitize);
        const currentId = versions.some((v: Palette) => v.id === parsed.currentId)
          ? parsed.currentId
          : versions[0].id;
        return { versions, currentId };
      }
    }
  } catch {
    /* fall through to defaults */
  }
  const p = defaultPalette();
  return { versions: [p], currentId: p.id };
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

function currentPalette(): Palette {
  return state.versions.find((v) => v.id === state.currentId) ?? state.versions[0];
}

function commit(next: State) {
  state = next;
  persist();
  applyInterfaceVars();
  listeners.forEach((fn) => fn());
}

function updateCurrent(fn: (p: Palette) => Palette) {
  const cur = currentPalette();
  const updated = { ...fn(cur), updatedAt: now() };
  commit({ ...state, versions: state.versions.map((v) => (v.id === cur.id ? updated : v)) });
}

function updateRole(id: string, fn: (r: ColorRole) => ColorRole) {
  updateCurrent((p) => ({ ...p, roles: p.roles.map((r) => (r.id === id ? fn(r) : r)) }));
}

// ---------- reading ----------

export function getPalette(): Palette {
  return currentPalette();
}

/** The snapshot changes (new object) on every edit, so it works with useSyncExternalStore. */
export function getState(): State {
  return state;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useColors(): { palette: Palette; versions: Palette[] } {
  const s = useSyncExternalStore(subscribe, getState, getState);
  return { palette: s.versions.find((v) => v.id === s.currentId) ?? s.versions[0], versions: s.versions };
}

export function listVersions(): Palette[] {
  return state.versions;
}

export function getRole(id: string): ColorRole | undefined {
  return currentPalette().roles.find((r) => r.id === id);
}

// ---------- note colors ----------

/** Color to paint a note (stem / accidental / square). Plain black when its role is switched off. */
export function noteColor(midi: number): string {
  const r = getRole(`note-${((midi % 12) + 12) % 12}`);
  if (!r || r.enabled === false) return PLAIN_COLOR;
  return r.color;
}

/** Does this target paint for this note? (role on, and the target chip switched on) */
export function noteTargetOn(midi: number, target: ColorTarget): boolean {
  const r = getRole(`note-${((midi % 12) + 12) % 12}`);
  if (!r || r.enabled === false) return true; // off => plain black is painted by caller
  return r.targets.includes(target);
}

/** Active piano key fill, or null to fall back to the hand color. */
export function pianoKeyColor(midi: number): string | null {
  const r = getRole(`note-${((midi % 12) + 12) % 12}`);
  if (!r || r.enabled === false || !r.targets.includes("pianoKey")) return null;
  return r.color;
}

/** Changes whenever anything that affects painted notes changes. */
export function noteSignature(): string {
  return currentPalette()
    .roles.filter((r) => r.group === "notes")
    .map((r) => `${r.id}:${r.color}:${r.enabled !== false ? 1 : 0}:${r.targets.join(",")}`)
    .join("|");
}

// ---------- editing ----------

export function setRoleColor(id: string, color: string) {
  const hex = normalizeHex(color);
  if (!hex) return;
  updateRole(id, (r) => ({ ...r, color: hex }));
}

export function setRoleEnabled(id: string, enabled: boolean) {
  updateRole(id, (r) => ({ ...r, enabled }));
}

export function setNotesEnabled(enabled: boolean) {
  updateCurrent((p) => ({
    ...p,
    roles: p.roles.map((r) => (r.group === "notes" ? { ...r, enabled } : r)),
  }));
}

export function toggleRoleTarget(id: string, target: ColorTarget) {
  updateRole(id, (r) => ({
    ...r,
    targets: r.targets.includes(target) ? r.targets.filter((t) => t !== target) : [...r.targets, target],
  }));
}

export function addRole(group: ColorGroup, name: string): string {
  const id = `custom-${uid()}`;
  const role: ColorRole = {
    id,
    group,
    name: name.trim() || "New color",
    color: "#808080",
    targets: group === "interface" ? ["cssVar"] : ["square", "band"],
    builtIn: false,
    enabled: true,
  };
  updateCurrent((p) => ({ ...p, roles: [...p.roles, role] }));
  return id;
}

export function renameRole(id: string, name: string) {
  updateRole(id, (r) => ({ ...r, name }));
}

/** Custom roles are hidden, never destroyed. Built-in roles cannot be hidden. */
export function hideRole(id: string, hidden = true) {
  updateRole(id, (r) => (r.builtIn ? r : { ...r, hidden }));
}

export function saveSwatch(color: string) {
  const hex = normalizeHex(color);
  if (!hex) return;
  updateCurrent((p) => (p.swatches.includes(hex) ? p : { ...p, swatches: [...p.swatches, hex] }));
}

export function removeSwatch(color: string) {
  updateCurrent((p) => ({ ...p, swatches: p.swatches.filter((s) => s !== color) }));
}

export function renameVersion(name: string) {
  updateCurrent((p) => ({ ...p, name: name.trim() || p.name }));
}

// ---------- versions (snapshots; never deleted) ----------

function cloneAs(p: Palette, name: string): Palette {
  const t = now();
  return {
    ...JSON.parse(JSON.stringify(p)),
    id: uid(),
    name,
    createdAt: t,
    updatedAt: t,
  };
}

/** Snapshot the current palette (colors, targets and on/off state) as a new version, and switch to it. */
export function saveVersion(name: string): string {
  const copy = cloneAs(currentPalette(), name.trim() || `${currentPalette().name} copy`);
  commit({ versions: [...state.versions, copy], currentId: copy.id });
  return copy.id;
}

export function duplicateVersion(id?: string): string {
  const src = state.versions.find((v) => v.id === (id ?? state.currentId)) ?? currentPalette();
  const copy = cloneAs(src, `${src.name} copy`);
  commit({ versions: [...state.versions, copy], currentId: copy.id });
  return copy.id;
}

export function switchVersion(id: string) {
  if (!state.versions.some((v) => v.id === id)) return;
  commit({ ...state, currentId: id });
}

export function applyPreset(presetId: string) {
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) return;
  updateCurrent((p) => ({
    ...p,
    roles: p.roles.map((r) => (preset.colors[r.id] ? { ...r, color: preset.colors[r.id] } : r)),
  }));
}

// ---------- export / import ----------

export function exportJson(): string {
  return JSON.stringify({ app: "harmony-helper", kind: "color-palette", version: 1, palette: currentPalette() }, null, 2);
}

/** Validates and adds the file as a NEW version (never overwrites). Returns an error message or null. */
export function importJson(text: string): string | null {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    return "That file is not valid JSON.";
  }
  const pal = data?.palette ?? data;
  if (!isPalette(pal)) return "That file is not a color palette.";
  const clean = sanitize(pal);
  const t = now();
  const imported: Palette = { ...clean, id: uid(), name: `${clean.name} (imported)`, createdAt: t, updatedAt: t };
  commit({ versions: [...state.versions, imported], currentId: imported.id });
  return null;
}

// ---------- interface roles -> CSS variables ----------

const DEFAULT_INTERFACE = new Map(
  buildDefaultRoles()
    .filter((r) => r.group === "interface")
    .map((r) => [r.id, r.color.toLowerCase()]),
);
const appliedVars = new Set<string>();

/** Writes CSS variables only for interface roles she changed, so light/dark themes keep working otherwise. */
export function applyInterfaceVars() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const next = new Set<string>();
  for (const r of currentPalette().roles) {
    if (r.group !== "interface" || !r.cssVars) continue;
    const changed = r.color.toLowerCase() !== DEFAULT_INTERFACE.get(r.id);
    if (!changed || r.enabled === false) continue;
    for (const v of r.cssVars) {
      root.style.setProperty(v, r.color);
      next.add(v);
    }
  }
  for (const v of appliedVars) if (!next.has(v)) root.style.removeProperty(v);
  appliedVars.clear();
  next.forEach((v) => appliedVars.add(v));
}
