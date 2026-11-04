// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Sitio público en GitHub Pages: build estático bajo /harmony-helper/.
// Solo se activa con GITHUB_PAGES=true; `bun run dev` y `bun run build` siguen igual.
const pages = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  ...(pages ? { vite: { base: "/harmony-helper/" } } : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ...(pages
      ? {
          router: { basepath: "/harmony-helper" },
          spa: { enabled: true, prerender: { outputPath: "/index.html", crawlLinks: false } },
        }
      : {}),
  },
});
