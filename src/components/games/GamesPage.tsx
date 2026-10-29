import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { MidiControl } from "@/components/reader/MidiControl";
import { applyInterfaceVars } from "@/lib/colors/store";
import { NoteDeckGame } from "./NoteDeckGame";

/** The games that are planned but not built yet: greyed out. */
const SOON = ["Mazo de figuras", "Dictado rítmico", "Cantar"];

/** /juegos: a quiet page (grey, no scores). The only color on screen is her note colors on flipped cards. */
export function GamesPage() {
  useEffect(() => {
    applyInterfaceVars(); // same interface variables as the reader (reads her palette, writes nothing)
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-card px-4 py-2">
        <Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          ← Partitura
        </Link>
        <h1 className="text-base font-semibold tracking-tight">Juegos</h1>
        <div className="ml-auto">
          <MidiControl />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <nav aria-label="Juegos" className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-current="page"
            className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground"
          >
            Mazo de notas
          </button>
          {SOON.map((name) => (
            <button
              key={name}
              type="button"
              disabled
              className="cursor-not-allowed rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground opacity-60"
            >
              {name} <span className="text-xs italic">próximamente</span>
            </button>
          ))}
        </nav>

        <NoteDeckGame />
      </main>
    </div>
  );
}
