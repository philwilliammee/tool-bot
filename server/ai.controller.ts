import express from "express";
import { BedrockService } from "./bedrock/bedrock.service.js";
import { OpenAIService } from "./openai/openai.service.js";

const router = express.Router();

const AI_CLIENT = process.env.AI_CLIENT || "bedrock";

let aiService: BedrockService | OpenAIService;

if (AI_CLIENT === "bedrock") {
  aiService = new BedrockService();
} else if (AI_CLIENT === "openai") {
  aiService = new OpenAIService(); // No config needed if you read from ENV, etc.
} else {
  throw new Error(`Unsupported AI client: ${AI_CLIENT}`);
}

router.post("/", async (req, res) => {
  try {
    const { modelId, messages, systemPrompt } = req.body;
    console.log(
      `[ROUTER] POST request with messages count: ${messages.length} using ${AI_CLIENT}`
    );
    
    console.debug('messages:', JSON.stringify(messages, null, 2));

    // Call the streaming method on whichever service we're using
    const response = await aiService.converseStream(
      modelId,
      messages,
      systemPrompt
    );

    if (!response.stream) {
      throw new Error("No stream in response");
    }

    // Set headers for JSON streaming
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");

    // Process the stream and pass through each chunk
    for await (const chunk of response.stream) {
      // Pass through the raw chunk
      res.write(JSON.stringify(chunk) + "\n");

      // If we encounter any "exception" fields, throw them
      if (
        chunk.internalServerException ||
        chunk.modelStreamErrorException ||
        chunk.validationException ||
        chunk.throttlingException ||
        chunk.serviceUnavailableException
      ) {
        throw chunk;
      }
    }
    res.end();
  } catch (error: any) {
    console.error(`${AI_CLIENT} error:`, error);
    res.status(error.status || 500).json({
      error: true,
      message: error.message || "Internal Server Error",
    });
  }
});

// ai.controller.ts
router.post("/invoke", async (req, res) => {
  try {
    const { modelId, messages, systemPrompt } = req.body;
    console.log(
      `[ROUTER] POST invoke request with modelId: ${modelId} and messages count: ${messages.length} using ${AI_CLIENT}`
    );

    const response = await aiService.invoke(modelId, messages, systemPrompt);
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
