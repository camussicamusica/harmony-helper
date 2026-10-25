import { createFileRoute } from "@tanstack/react-router";
import { ReaderPage } from "@/components/reader/ReaderPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Harmony Helper" },
      {
        name: "description",
        content:
          "Estudiá una partitura con colores, intervalos, acordes y un piano en pantalla.",
      },
      { property: "og:title", content: "Harmony Helper" },
      {
        property: "og:description",
        content:
          "Estudiá una partitura con colores, intervalos, acordes y un piano en pantalla.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <ReaderPage />;
}
