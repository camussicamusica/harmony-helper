import { useRef, useState } from "react";
import { Download, Palette as PaletteIcon, Plus, Upload, EyeOff, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  addRole,
  applyPreset,
  duplicateVersion,
  exportJson,
  hideRole,
  importJson,
  removeSwatch,
  renameRole,
  renameVersion,
  saveSwatch,
  saveVersion,
  setRoleColor,
  setRoleEnabled,
  switchVersion,
  toggleRoleTarget,
  useColors,
} from "@/lib/colors/store";
import { NAMED_SWATCHES } from "@/lib/colors/defaults";
import { normalizeHex, similarPairs } from "@/lib/colors/color";
import { PRESETS } from "@/lib/colors/presets";
import { ALL_TARGETS, GROUPS, type ColorGroup, type ColorRole } from "@/lib/colors/types";

export function ColorStudio() {
  const { palette, versions } = useColors();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const doExport = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${palette.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "colors"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File) => {
    const err = importJson(await file.text());
    setMessage(err ?? "Imported as a new version.");
  };

  const saveAsNew = () => {
    const name = window.prompt("Name for the new version", `${palette.name} 2`);
    if (name) saveVersion(name);
  };

  return (
    <Sheet modal={false}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <PaletteIcon className="h-4 w-4" /> Colors
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        overlay={false}
        className="flex w-full flex-col gap-3 overflow-y-auto p-4 sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>Color studio</SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-2">
          <Input
            key={palette.id}
            defaultValue={palette.name}
            onBlur={(e) => renameVersion(e.target.value)}
            className="h-8 flex-1 text-sm"
            aria-label="Version name"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">Versions</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Switch to</DropdownMenuLabel>
              {versions.map((v) => (
                <DropdownMenuItem key={v.id} onSelect={() => switchVersion(v.id)}>
                  {v.id === palette.id ? "● " : ""}
                  {v.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => duplicateVersion()}>Duplicate this one</DropdownMenuItem>
              <DropdownMenuItem onSelect={saveAsNew}>Save as new version…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" className="gap-1" onClick={doExport}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" variant="ghost" className="gap-1" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = "";
            }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">Presets</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {PRESETS.map((p) => (
                <DropdownMenuItem key={p.id} onSelect={() => applyPreset(p.id)}>
                  {p.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {message && <span className="text-xs text-muted-foreground">{message}</span>}
        </div>

        <Tabs defaultValue="notes" className="flex-1">
          <TabsList className="flex h-auto flex-wrap">
            {GROUPS.map((g) => (
              <TabsTrigger key={g.id} value={g.id} className="text-xs">
                {g.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {GROUPS.map((g) => (
            <TabsContent key={g.id} value={g.id} className="mt-3">
              <GroupPanel group={g.id} roles={palette.roles} swatches={palette.swatches} />
            </TabsContent>
          ))}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function GroupPanel({ group, roles, swatches }: { group: ColorGroup; roles: ColorRole[]; swatches: string[] }) {
  const mine = roles.filter((r) => r.group === group && !r.hidden);
  const clashes = similarPairs(mine);
  const hiddenCount = roles.filter((r) => r.group === group && r.hidden).length;

  return (
    <div className="flex flex-col gap-2">
      {clashes.length > 0 && (
        <div className="rounded-md border border-border bg-muted/50 p-2 text-xs text-muted-foreground">
          {clashes.slice(0, 3).map((c) => (
            <div key={c.a.id + c.b.id}>
              {c.a.name} and {c.b.name} look almost the same
            </div>
          ))}
        </div>
      )}
      {mine.map((r) => (
        <RoleRow key={r.id} role={r} swatches={swatches} />
      ))}
      <Button
        size="sm"
        variant="outline"
        className="mt-1 gap-1 self-start"
        onClick={() => addRole(group, "New color")}
      >
        <Plus className="h-3.5 w-3.5" /> New color
      </Button>
      {hiddenCount > 0 && (
        <div className="text-xs text-muted-foreground">{hiddenCount} hidden (kept, not deleted)</div>
      )}
    </div>
  );
}

function RoleRow({ role, swatches }: { role: ColorRole; swatches: string[] }) {
  const isNote = role.group === "notes";
  const on = role.enabled !== false;
  const [hex, setHex] = useState(role.color);
  const shown = normalizeHex(hex) === role.color ? hex : role.color;

  return (
    <div className="rounded-md border border-border p-2" style={{ opacity: on ? 1 : 0.6 }}>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Pick color for ${role.name}`}
              className="h-7 w-7 shrink-0 rounded-md border border-border"
              style={{ backgroundColor: role.color }}
            />
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="grid grid-cols-7 gap-1.5">
              {NAMED_SWATCHES.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  title={s.name}
                  aria-label={s.name}
                  onClick={() => {
                    setRoleColor(role.id, s.color);
                    setHex(s.color);
                  }}
                  className="h-6 w-6 rounded border border-border"
                  style={{ backgroundColor: s.color }}
                />
              ))}
            </div>
            {swatches.length > 0 && (
              <>
                <div className="mt-3 text-xs text-muted-foreground">My swatches</div>
                <div className="mt-1 grid grid-cols-7 gap-1.5">
                  {swatches.map((s) => (
                    <button
                      key={s}
                      type="button"
                      title={`${s} (right-click to remove)`}
                      onClick={() => {
                        setRoleColor(role.id, s);
                        setHex(s);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        removeSwatch(s);
                      }}
                      className="h-6 w-6 rounded border border-border"
                      style={{ backgroundColor: s }}
                    />
                  ))}
                </div>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 w-full gap-1"
              onClick={() => saveSwatch(role.color)}
            >
              <Star className="h-3.5 w-3.5" /> Save this color
            </Button>
          </PopoverContent>
        </Popover>

        {role.builtIn ? (
          <span className="flex-1 text-sm">{role.name}</span>
        ) : (
          <Input
            defaultValue={role.name}
            onBlur={(e) => renameRole(role.id, e.target.value)}
            className="h-7 flex-1 text-sm"
            aria-label="Color name"
          />
        )}

        <Input
          value={shown}
          onChange={(e) => {
            setHex(e.target.value);
            const n = normalizeHex(e.target.value);
            if (n) setRoleColor(role.id, n);
          }}
          className="h-7 w-24 font-mono text-xs"
          aria-label="Hex color"
        />
        <input
          type="color"
          value={role.color}
          onChange={(e) => {
            setRoleColor(role.id, e.target.value);
            setHex(e.target.value);
          }}
          className="h-7 w-7 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0"
          aria-label="Color wheel"
        />
        {isNote && (
          <Switch
            checked={on}
            onCheckedChange={(v) => setRoleEnabled(role.id, v)}
            aria-label={`${role.name} colored`}
          />
        )}
        {!role.builtIn && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Hide (kept, not deleted)"
            onClick={() => hideRole(role.id)}
          >
            <EyeOff className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {role.group !== "interface" && (
        <div className="mt-2 flex flex-wrap gap-1">
          {ALL_TARGETS.map((t) => {
            const active = role.targets.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleRoleTarget(role.id, t.id)}
                className={`rounded-full border px-2 py-0.5 text-[11px] ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
