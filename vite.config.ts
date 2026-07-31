import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    target: "es2020",
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split vendor code into stable, cacheable chunks.
        // Function form: route each module by its node_modules package name.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // Extract package name (handle @scope/pkg).
          const match = id.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
          if (!match) return undefined;
          const pkg = match[1];

          // React core + tiny runtime helpers that react/react-dom ship with.
          if (
            pkg === "react" ||
            pkg === "react-dom" ||
            pkg === "scheduler" ||
            pkg === "object-assign" ||
            pkg === "js-tokens" ||
            pkg === "loose-envify"
          ) {
            return "vendor-react";
          }

          // Tauri APIs + plugins.
          if (pkg.startsWith("@tauri-apps")) {
            return "vendor-tauri";
          }

          // Markdown rendering + syntax highlighting, including the
          // (numerous) transitive deps of react-markdown / react-syntax-highlighter.
          if (
            pkg === "react-markdown" ||
            pkg === "react-syntax-highlighter" ||
            pkg === "highlight.js" ||
            pkg === "prismjs" ||
            pkg === "refractor" ||
            pkg === "lowlight" ||
            pkg.startsWith("remark-") ||
            pkg.startsWith("rehype-") ||
            pkg.startsWith("mdast-") ||
            pkg.startsWith("micromark") ||
            pkg.startsWith("hast-") ||
            pkg.startsWith("unist-") ||
            pkg.startsWith("character-") ||
            pkg.startsWith("estree-") ||
            pkg === "unified" ||
            pkg === "vfile" ||
            pkg === "vfile-message" ||
            pkg === "fault" ||
            pkg === "devlop" ||
            pkg === "bail" ||
            pkg === "trough" ||
            pkg === "ccount" ||
            pkg === "comma-separated-tokens" ||
            pkg === "space-separated-tokens" ||
            pkg === "property-information" ||
            pkg === "html-url-attributes" ||
            pkg === "hastscript" ||
            pkg === "stringify-entities" ||
            pkg === "parse-entities" ||
            pkg === "decode-named-character-reference" ||
            pkg === "trim-lines" ||
            pkg === "longest-streak" ||
            pkg === "style-to-js" ||
            pkg === "style-to-object" ||
            pkg === "inline-style-parser" ||
            pkg === "zwitch" ||
            pkg === "is-alphabetical" ||
            pkg === "is-alphanumerical" ||
            pkg === "is-decimal" ||
            pkg === "is-hexadecimal"
          ) {
            return "vendor-markdown";
          }

          // Misc UI / state utilities.
          if (pkg === "lucide-react" || pkg === "uuid" || pkg === "zustand") {
            return "vendor-utils";
          }

          // Everything else (incl. all src/* code) stays in the default chunk.
          return undefined;
        },
      },
    },
  },
}));
