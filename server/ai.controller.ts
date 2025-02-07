import express from "express";
import { BedrockService } from "./bedrock/bedrock.service.js";

const router = express.Router();

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
} else {
  throw new Error(`Unsupported AI client: ${AI_CLIENT}`);
}

router.post("/", async (req, res) => {
  try {
    const { modelId, messages, systemPrompt } = req.body;
    console.log(
      `[ROUTER] POST request with messages count: ${messages.length} using ${AI_CLIENT}`
    );

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
      // Pass through the raw chunk from AWS
      res.write(JSON.stringify(chunk) + "\n");

      // If we encounter any exceptions, throw them
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

export default router;
