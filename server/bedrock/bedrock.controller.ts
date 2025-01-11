// server/bedrock/bedrock.controller.ts
import express from "express";
import { BedrockService } from "./bedrock.service";

const router = express.Router();
const bedrockService = new BedrockService({
  region: process.env.VITE_AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.VITE_AWS_ACCESS_KEY || "",
    secretAccessKey: process.env.VITE_AWS_SECRET_KEY || "",
    sessionToken: process.env.VITE_AWS_SESSION_TOKEN || "",
  },
});

router.post("/", async (req, res) => {
  try {
    const { modelId, messages, systemPrompt } = req.body;
    const response = await bedrockService.converse(
      modelId,
      messages,
      systemPrompt
    );
    res.json(response);
  } catch (error: any) {
    console.error("Bedrock error:", error);
    res.status(error.status || 500).json({
      error: true,
      message: error.message || "Internal Server Error",
    });
  }
});

export default router;
