import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5180 },
  build: {
    // Never publish sourcemaps: they hand the original source, comments and
    // all, to anyone who opens the network tab.
    sourcemap: false,
  },
});
