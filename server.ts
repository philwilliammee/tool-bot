import express from "express";
import bedrockRouter from "./server/bedrock/bedrock.controller";

const app = express();
app.use(express.json());

app.use("/bedrock", bedrockRouter);

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
