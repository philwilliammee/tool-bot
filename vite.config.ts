import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  optimizeDeps: {
    exclude: [],
  },
  server: {
    // If your Node server runs on port 3001
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
