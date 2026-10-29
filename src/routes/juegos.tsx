import { createFileRoute } from "@tanstack/react-router";
import { GamesPage } from "@/components/games/GamesPage";

export const Route = createFileRoute("/juegos")({
  head: () => ({
    meta: [
      { title: "Juegos · Harmony Helper" },
      { name: "description", content: "Juegos cortos para practicar notas, figuras y ritmo." },
    ],
  }),
  component: GamesPage,
});
