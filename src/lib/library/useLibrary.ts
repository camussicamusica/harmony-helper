import { useCallback, useEffect, useRef, useState } from "react";
import { hashText } from "@/lib/music/analysis/useFicha";
import {
  buildEntry, exportLibraryJson, mergeLibraries, parseLibraryJson, sortByLastOpened, touchOrAdd, type LibraryEntry,
} from "./entry";
import { createIdbStore, recordOpened, type LibraryStore } from "./store";

/** Biblioteca state: IndexedDB-backed list of every score she opened. All failures degrade to "no library", never break the app. */
export function useLibrary() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(true);
  const storeRef = useRef<LibraryStore | null>(null);
  // Every read-modify-write goes through one queue, so a slow "touch" can never be overwritten by a stale "patch".
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = <T,>(fn: () => Promise<T>): Promise<T> => {
    const next = queueRef.current.then(fn, fn);
    queueRef.current = next.catch(() => undefined);
    return next;
  };
  const getStore = (): LibraryStore | null => {
    if (storeRef.current) return storeRef.current;
    try {
      storeRef.current = createIdbStore();
    } catch {
      storeRef.current = null;
      setAvailable(false);
    }
    return storeRef.current;
  };

  const refresh = useCallback(async () => {
    const s = getStore();
    if (!s) return;
    try {
      setEntries(sortByLastOpened(await s.all()));
      setReady(true);
    } catch {
      setAvailable(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** A score was opened (upload, drop, restore, or picked here): save it or refresh its "last opened". */
  const record = useCallback(
    async (xml: string, filename: string) => {
      const s = getStore();
      if (!s) return;
      try {
        await enqueue(() => recordOpened(s, buildEntry(hashText(xml), xml, filename, Date.now()), touchOrAdd));
        await refresh();
      } catch {
        setAvailable(false);
      }
    },
    [refresh],
  );

  const patch = useCallback(
    async (id: string, changes: Partial<LibraryEntry>) => {
      const s = getStore();
      if (!s) return;
      try {
        await enqueue(async () => {
          const cur = (await s.all()).find((e) => e.id === id);
          if (!cur || Object.entries(changes).every(([k, v]) => (cur as any)[k] === v)) return;
          await s.put({ ...cur, ...changes });
        });
        await refresh();
      } catch {
        setAvailable(false);
      }
    },
    [refresh],
  );

  const rename = (id: string, name: string) => patch(id, { titleOverride: name.trim() ? name.trim() : undefined });

  const remove = useCallback(
    async (id: string) => {
      const s = getStore();
      if (!s) return;
      try {
        await enqueue(() => s.remove(id));
        await refresh();
      } catch {
        setAvailable(false);
      }
    },
    [refresh],
  );

  const exportJson = () => exportLibraryJson(entries, Date.now());

  /** Merge a backup file; returns how many entries the file had. */
  const importJson = useCallback(
    async (text: string): Promise<number> => {
      const theirs = parseLibraryJson(text);
      const s = getStore();
      if (!s) throw new Error("Este navegador no permite guardar la biblioteca.");
      await enqueue(async () => {
        const merged = mergeLibraries(await s.all(), theirs);
        for (const e of merged) await s.put(e);
      });
      await refresh();
      return theirs.length;
    },
    [refresh],
  );

  return { entries, ready, available, record, patch, rename, remove, exportJson, importJson };
}

export type Library = ReturnType<typeof useLibrary>;
