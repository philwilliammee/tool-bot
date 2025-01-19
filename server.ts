import express from "express";
import bedrockRouter from "./server/bedrock/bedrock.controller";
import { serverRegistry } from "./tools/server/registry";

const app = express();
app.use(express.json({ limit: "500mb" }));

// Bedrock router
app.use("/api/bedrock", bedrockRouter);

// Tool routes - now using the server registry
app.use("/api/tools", serverRegistry.getRouter());

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
