import express from "express";
import { serverRegistry } from "./tools/server/registry";
import aiRouter from "./server/ai.controller";

// DEVELOPMENT SERVER ONLY
const app = express();
app.use(express.json({ limit: "500mb" }));

// Bedrock router
app.use("/api/ai", aiRouter);

// Tool routes - now using the server registry
app.use("/api/tools", serverRegistry.getRouter());

app.listen(3001, () => {
  console.log("Dev Server running on http://localhost:3001");
});
