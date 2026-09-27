import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

// The voice model's engine loads two files at run time. Left alone it fetches
// them from a CDN, which the site's security policy (rightly) blocks, so the
// natural voices never loaded. They are served from the site itself instead,
// at /ort/, copied from the installed package so they always match it.
const ORT_DIR = path.resolve("node_modules/@huggingface/transformers/dist");
const ORT_FILES = { "ort-wasm-simd-threaded.jsep.mjs": "text/javascript", "ort-wasm-simd-threaded.jsep.wasm": "application/wasm" };
function ortFiles() {
  return {
    name: "dwiddle-ort-files",
    configureServer(server) {
      server.middlewares.use("/ort/", (req, res, next) => {
        const name = decodeURIComponent((req.url || "").split("?")[0].replace(/^\//, ""));
        if (!ORT_FILES[name]) return next();
        res.setHeader("Content-Type", ORT_FILES[name]);
        fs.createReadStream(path.join(ORT_DIR, name)).pipe(res);
      });
    },
    generateBundle() {
      for (const name of Object.keys(ORT_FILES)) {
        this.emitFile({ type: "asset", fileName: `ort/${name}`, source: fs.readFileSync(path.join(ORT_DIR, name)) });
      }
    },
  };
}

const desktop = process.env.DWIDDLE_TARGET === "desktop";

export default defineConfig({
  plugins: [react(), ortFiles()],
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
