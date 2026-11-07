import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [wasm()],
  root: ".",
  resolve: {
    alias: {
      "three-bvh-csg/src/core/Brush.js": path.join(rootDir, "src", "csg-brush.js"),
    },
  },
  server: {
    port: 8181,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ["@dimforge/rapier3d-simd"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "esnext",
  },
});
