import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const desktop = process.env.DWIDDLE_TARGET === "desktop";

export default defineConfig({
  plugins: [react()],
  server: { port: 5180 },
  // file:// has no origin, so absolute asset paths resolve to the root of the
  // disk. The web build keeps "/" because relative paths would break the
  // moment a route like /topics was open.
  base: desktop ? "./" : "/",
  build: {
    outDir: desktop ? "dist-desktop" : "dist",
    // Never publish sourcemaps: they hand the original source, comments and
    // all, to anyone who opens the network tab.
    sourcemap: false,
  },
});
