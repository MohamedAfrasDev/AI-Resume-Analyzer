import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// defineConfig receives isSsrBuild so we can apply manualChunks only to the
// client bundle. In SPA mode (ssr: false) the SSR bundle is discarded anyway,
// but Rollup still runs it and treats pdfjs-dist as external there — so
// manualChunks must be skipped for that pass.
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  base: '/AI-Resume-Analyzer/',
  build: {
    rollupOptions: {
      output: isSsrBuild
        ? {}
        : {
            // Keep pdfjs-dist in its own chunk so it's only fetched on the
            // /upload route, not on every page load.
            manualChunks: {
              pdfjs: ["pdfjs-dist"],
            },
          },
    },
  },
}));
