// server/ai.controller.ts
import express from "express";
import { BedrockService } from "./bedrock/bedrock.service";
import { OpenAIService } from "./openai/openai.service";

const router = express.Router();

// Initialize the appropriate service based on environment variable
const AI_CLIENT = process.env.AI_CLIENT || "bedrock";

let aiService;

if (AI_CLIENT === "bedrock") {
  aiService = new BedrockService({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY || "",
      secretAccessKey: process.env.AWS_SECRET_KEY || "",
      sessionToken: process.env.AWS_SESSION_TOKEN || "",
    },
  });
} else if (AI_CLIENT === "openai") {
  aiService = new OpenAIService({
    apiKey: process.env.OPENAI_API_SESSION_KEY || "",
    baseUrl: process.env.OPENAI_API_BASE || "https://api.ai.it.cornell.edu",
  });
} else {
  throw new Error(`Unsupported AI client: ${AI_CLIENT}`);
}

router.post("/", async (req, res) => {
  try {
    const { modelId, messages, systemPrompt } = req.body;
    console.log(
      `[ROUTER] POST request with modelId: ${modelId} and messages count: ${messages.length} using ${AI_CLIENT}`
    );

    const response = await aiService.converse(modelId, messages, systemPrompt);
    res.json(response);
  } catch (error: any) {
    console.error(`${AI_CLIENT} error:`, error);
    res.status(error.status || 500).json({
      error: true,
      message: error.message || "Internal Server Error",
    });
  }
});

export default router;
