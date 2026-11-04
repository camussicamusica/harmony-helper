import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MidiControl } from "@/components/reader/MidiControl";
import { applyInterfaceVars } from "@/lib/colors/store";
import { NoteDeckGame } from "./NoteDeckGame";
import { SingGame } from "./SingGame";

/** The games that are planned but not built yet: greyed out. */
const SOON = ["Mazo de figuras", "Dictado rítmico"];

const GAMES = [
  { id: "deck", label: "Mazo de notas" },
  { id: "sing", label: "Cantar" },
] as const;
type GameId = (typeof GAMES)[number]["id"];

/** /juegos: a quiet page (grey, no scores). The only color on screen is her note colors on flipped cards. */
export function GamesPage() {
  const [game, setGame] = useState<GameId>("deck");
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
          {GAMES.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-current={game === g.id ? "page" : undefined}
              onClick={() => setGame(g.id)}
              className={`rounded-md border border-border px-3 py-1.5 text-sm ${
                game === g.id ? "bg-secondary font-medium text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {g.label}
            </button>
          ))}
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

        {game === "deck" ? <NoteDeckGame /> : <SingGame />}
      </main>
    </div>
  );
}
