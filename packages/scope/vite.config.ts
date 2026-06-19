import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
  },
  define: {
    "process.env": JSON.stringify({}),
    // Replace bare `Buffer` global references (used by walrus.ts) with the
    // browser shim that main.tsx installs on globalThis before initStore().
    Buffer: "globalThis.Buffer",
  },
  resolve: {
    alias: {
      "@tusk/core": resolve(__dirname, "../core/src/index.ts"),
      "node:crypto": resolve(__dirname, "./shims/crypto.ts"),
    },
  },
});
