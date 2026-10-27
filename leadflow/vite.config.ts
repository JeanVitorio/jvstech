import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/LeadFlow/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "jvs-boot-paint",
      transformIndexHtml(html) {
        // O CSS do app não pode bloquear o primeiro desenho: senão a tela
        // fica preta até o arquivo chegar, e o loading do HTML não aparece.
        return html.replace(
          /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
          `<link rel="preload" as="style" href="$1" onload="this.onload=null;this.rel='stylesheet'">` +
            `<noscript><link rel="stylesheet" href="$1"></noscript>`,
        );
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
