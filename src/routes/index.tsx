import { createFileRoute } from "@tanstack/react-router";
import { ReaderPage } from "@/components/reader/ReaderPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sheet Reader — Interactive Piano Score" },
      {
        name: "description",
        content:
          "Active-reading sheet music tool: scrolling score paired with a color-coded virtual piano for building visual-motor connection.",
      },
      { property: "og:title", content: "Sheet Reader — Interactive Piano Score" },
      {
        property: "og:description",
        content:
          "Active-reading sheet music tool: scrolling score paired with a color-coded virtual piano.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <ReaderPage />;
}
