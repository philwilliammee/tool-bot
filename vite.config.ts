import { defineConfig, UserConfigExport } from "vitest/config";
import { resolve } from 'path';

export default defineConfig({
  plugins: [],
  optimizeDeps: {
    exclude: [],
  },
  build: {
    outDir: 'dist', // specify build output directory
    emptyOutDir: true, // clean the output directory before build
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "node",
  },
} satisfies UserConfigExport);
