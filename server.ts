import express from "express";
import { serverRegistry } from "./tools/registry.server.js";
import aiRouter from "./server/ai.controller.js";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "500mb" }));
app.use(compression());

// Serve static files from dist directory with caching
app.use(
  express.static(path.join(__dirname, "../dist"), {
    // Built-in Express static file options
    setHeaders: (res, path) => {
      if (path.match(/\.(jpg|jpeg|png|gif|ico|svg|webp)$/i)) {
        // Cache for 1 week
        res.set("Cache-Control", "public, max-age=604800, immutable");
      }
    },
  })
);

// API routes
app.use("/api/ai", aiRouter);
app.use("/api/tools", serverRegistry.getRouter());

// Serve index.html for all other routes (SPA support)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist", "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT} in ${
      process.env.NODE_ENV || "development"
    } mode`
  );
});
