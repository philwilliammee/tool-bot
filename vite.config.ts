import { defineConfig } from "vite";

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
        // Remove the rewrite to keep the /api prefix
        // rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
