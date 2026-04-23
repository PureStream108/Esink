import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import manifest from "./manifest.config";

export default defineConfig(({ mode }) => ({
  plugins: [react(), crx({ manifest })],
  build: {
    emptyOutDir: true,
    outDir: mode === "development-seed" ? "dist-dev" : "dist",
    target: "es2022"
  }
}));
