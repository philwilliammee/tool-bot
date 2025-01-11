// vite.config.ts
import { defineConfig } from "file:///home/ds123/psw58/web-developer/node_modules/vite/dist/node/index.js";
var vite_config_default = defineConfig({
  plugins: [],
  optimizeDeps: {
    exclude: []
  },
  server: {
    // If your Node server runs on port 3001
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9kczEyMy9wc3c1OC93ZWItZGV2ZWxvcGVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9kczEyMy9wc3c1OC93ZWItZGV2ZWxvcGVyL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL2RzMTIzL3BzdzU4L3dlYi1kZXZlbG9wZXIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW10sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFtdLFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICAvLyBJZiB5b3VyIE5vZGUgc2VydmVyIHJ1bnMgb24gcG9ydCAzMDAxXG4gICAgcHJveHk6IHtcbiAgICAgIFwiL2FwaVwiOiB7XG4gICAgICAgIHRhcmdldDogXCJodHRwOi8vbG9jYWxob3N0OjMwMDFcIixcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpLywgXCJcIiksXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1EsU0FBUyxvQkFBb0I7QUFHNVMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDO0FBQUEsRUFDVixjQUFjO0FBQUEsSUFDWixTQUFTLENBQUM7QUFBQSxFQUNaO0FBQUEsRUFDQSxRQUFRO0FBQUE7QUFBQSxJQUVOLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQyxTQUFTLEtBQUssUUFBUSxVQUFVLEVBQUU7QUFBQSxNQUM5QztBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
