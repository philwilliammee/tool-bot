import express from "express";
import bedrockRouter from "./server/bedrock/bedrock.controller";
import { fetchToolRouter } from "./server/bedrock/tools/fetch/fetch.controller";

const app = express();
app.use(express.json());

app.use("/api/bedrock", bedrockRouter);

// Tool routes
app.use("/api/tools/fetch", fetchToolRouter);

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
