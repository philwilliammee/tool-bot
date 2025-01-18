import { defineConfig, UserConfigExport } from "vitest/config";

export default defineConfig({
  plugins: [],
  optimizeDeps: {
    exclude: [],
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
