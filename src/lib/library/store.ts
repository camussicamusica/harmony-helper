import type { LibraryEntry } from "./entry";

/** Thin storage adapter: IndexedDB in the browser, an in-memory fake in tests. */
export interface LibraryStore {
  all(): Promise<LibraryEntry[]>;
  put(entry: LibraryEntry): Promise<void>;
  remove(id: string): Promise<void>;
}

export function createMemoryStore(initial: LibraryEntry[] = []): LibraryStore {
  const m = new Map(initial.map((e) => [e.id, e] as const));
  return {
    async all() {
      return [...m.values()].map((e) => ({ ...e }));
    },
    async put(e) {
      m.set(e.id, { ...e });
    },
    async remove(id) {
      m.delete(id);
    },
  };
}

const DB_NAME = "hh-library";
const STORE = "scores";

export function createIdbStore(): LibraryStore {
  let dbp: Promise<IDBDatabase> | null = null;
  const open = () =>
    (dbp ??= new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  const run = async <T,>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = f(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  };
  return {
    all: () => run("readonly", (s) => s.getAll() as IDBRequest<LibraryEntry[]>),
    put: async (e) => void (await run("readwrite", (s) => s.put(e))),
    remove: async (id) => void (await run("readwrite", (s) => s.delete(id))),
  };
}

/** Save an opened score: new entry or a touch of the existing one. Returns the stored entry. */
export async function recordOpened(
  store: LibraryStore,
  fresh: LibraryEntry,
  touch: (list: readonly LibraryEntry[], fresh: LibraryEntry) => LibraryEntry[],
): Promise<LibraryEntry> {
  const list = touch(await store.all(), fresh);
  const stored = list.find((e) => e.id === fresh.id)!;
  await store.put(stored);
  return stored;
}
