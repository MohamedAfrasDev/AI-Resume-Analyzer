import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Base URL is configurable so the same codebase can be deployed anywhere:
//   Vercel / Docker → leave VITE_BASE_URL unset → defaults to "/"
//   GitHub Pages   → set VITE_BASE_URL=/AI-Resume-Analyzer/ in the CI env
const base = process.env.VITE_BASE_URL ?? "/";

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  base,
  build: {
    rollupOptions: {
      output: isSsrBuild
        ? {}
        : {
            // Keep pdfjs in its own chunk so it is only fetched on /upload,
            // not on every page load.
            manualChunks: {
              pdfjs: ["pdfjs-dist"],
            },
          },
    },
  },
}));
