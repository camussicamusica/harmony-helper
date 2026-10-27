import { useMemo, useRef, useState } from "react";
import { Download, FileMusic, Pencil, Search, Trash2, Upload } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { agoEs, displayTitle, searchEntries, type LibraryEntry } from "@/lib/library/entry";
import type { Library } from "@/lib/library/useLibrary";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  library: Library;
  /** Id of the score on screen. */
  currentId: string;
  onOpenEntry: (e: LibraryEntry) => void;
}

/** "Biblioteca": every score she has opened, kept in this browser. Side sheet like the Ficha. */
export function LibrarySheet({ open, onOpenChange, library, currentId, onOpenEntry }: Props) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [toRemove, setToRemove] = useState<LibraryEntry | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const shown = useMemo(() => searchEntries(library.entries, q), [library.entries, q]);
  const now = Date.now();

  const doExport = () => {
    const blob = new Blob([library.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `biblioteca-harmony-helper-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg(`Copia descargada (${library.entries.length} partituras).`);
  };

  const doImport = async (file: File) => {
    try {
      const n = await library.importJson(await file.text());
      setMsg(`Importadas ${n} partituras.`);
    } catch (e: any) {
      setMsg(e?.message ?? "No se pudo importar.");
    }
  };

  const commitRename = (id: string) => {
    void library.rename(id, draft);
    setEditing(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        overlay={false}
        className="flex w-full flex-col gap-3 overflow-y-auto p-4 sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        data-testid="library-sheet"
      >
        <SheetHeader>
          <SheetTitle>Biblioteca</SheetTitle>
        </SheetHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título, compositor o archivo" className="pl-8" aria-label="Buscar en la biblioteca" />
        </div>

        {library.entries.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Todavía no hay partituras. Abrí una y queda guardada acá.
          </p>
        ) : shown.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">Ninguna partitura coincide con la búsqueda.</p>
        ) : (
          <ul className="flex flex-col gap-1.5" aria-label="Partituras guardadas">
            {shown.map((e) => {
              const current = e.id === currentId;
              return (
                <li
                  key={e.id}
                  data-testid="library-row"
                  data-current={current ? "1" : "0"}
                  className={`group rounded-md border p-2.5 ${current ? "border-primary/60 bg-accent/40" : "border-border bg-card"}`}
                >
                  {editing === e.id ? (
                    <form
                      className="flex gap-2"
                      onSubmit={(ev) => {
                        ev.preventDefault();
                        commitRename(e.id);
                      }}
                    >
                      <Input autoFocus value={draft} onChange={(ev) => setDraft(ev.target.value)} aria-label="Nuevo título" className="h-8" />
                      <Button type="submit" size="sm">Guardar</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                    </form>
                  ) : (
                    <div className="flex items-start gap-2">
                      <button type="button" className="flex min-w-0 flex-1 items-start gap-2 text-left" onClick={() => onOpenEntry(e)} aria-label={`Abrir ${displayTitle(e)}`}>
                        <FileMusic className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {displayTitle(e)}
                            {current && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">abierta</span>}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[e.composer, e.keyLabel, e.measures ? `${e.measures} compases` : ""].filter(Boolean).join(" · ") || e.filename}
                          </span>
                          <span className="block text-xs text-muted-foreground">abierta {agoEs(e.lastOpenedAt, now)}</span>
                        </span>
                      </button>
                      <div className="flex shrink-0 gap-0.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Cambiar el título de ${displayTitle(e)}`} onClick={() => { setEditing(e.id); setDraft(displayTitle(e)); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Quitar de la biblioteca ${displayTitle(e)}`} onClick={() => setToRemove(e)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={doExport} disabled={!library.entries.length}>
              <Download className="mr-1 h-4 w-4" /> Exportar biblioteca
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" /> Importar biblioteca
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              data-testid="library-import-input"
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                ev.target.value = "";
                if (f) void doImport(f);
              }}
            />
          </div>
          {msg && <p className="text-xs text-foreground" role="status">{msg}</p>}
          {!library.available && <p className="text-xs text-destructive">Este navegador no deja guardar la biblioteca.</p>}
          <p className="text-xs text-muted-foreground">Se guarda en este navegador (Chrome, localhost:5190). Exportá una copia de vez en cuando.</p>
        </div>

        <AlertDialog open={!!toRemove} onOpenChange={(v) => !v && setToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Quitar de la biblioteca?</AlertDialogTitle>
              <AlertDialogDescription>
                {toRemove ? `“${displayTitle(toRemove)}” se quita de la lista de la app. ` : ""}
                Tu archivo original en la computadora NO se toca ni se borra. Si volvés a abrirlo, queda guardado de nuevo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (toRemove) void library.remove(toRemove.id);
                  setToRemove(null);
                }}
              >
                Quitar de la biblioteca
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
