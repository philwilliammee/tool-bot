import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandInput,
  ConverseResponse,
  ConverseStreamCommand,
  ConverseStreamCommandInput,
  ConverseStreamResponse,
  Message,
  SystemContentBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { serverRegistry } from "../../tools/registry.server.js";

export interface BedrockServiceConfig {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
}

// info https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/bedrock-runtime/command/ConverseStreamCommand/
// @todo add retry logic
export class BedrockService {
  private client: BedrockRuntimeClient;

  constructor() {
    const config = {
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY || "",
        secretAccessKey: process.env.AWS_SECRET_KEY || "",
        sessionToken: process.env.AWS_SESSION_TOKEN || "",
      },
    };
    this.client = new BedrockRuntimeClient(config);
  }

  async converseStream(
    modelId: string,
    messages: Message[],
    systemPrompt: string
  ): Promise<ConverseStreamResponse> {
    // Validation
    if (messages.length === 0) {
      throw new Error("Messages array cannot be empty");
    }

    if (messages[0].role !== "user") {
      throw new Error("First message must be from user");
    }

    const system: SystemContentBlock[] = [{ text: systemPrompt }];

    const input: ConverseStreamCommandInput = {
      modelId,
      system,
      messages,
      toolConfig: serverRegistry.getToolConfig(),
      inferenceConfig: {
        temperature: 0.7,
        maxTokens: 8000, // 128000 openai max tokens
      },
    };

    try {
      const command = new ConverseStreamCommand(input);
      const response = await this.client.send(command);
      // console.log("Stream execution response:", response);
      return response;
    } catch (error: any) {
      console.error("Stream execution error:", {
        error: error.message,
        modelId,
        stack: error.stack,
      });
      throw error;
    }
  }

  // Keep the original non-streaming method if needed
  async converse(
    modelId: string,
    messages: Message[],
    systemPrompt: string
  ): Promise<ConverseStreamResponse> {
    return this.converseStream(modelId, messages, systemPrompt);
  }
  
  // bedrock.service.ts
async invoke(
  modelId: string,
  messages: Message[],
  systemPrompt: string
): Promise<ConverseResponse> {
  const system: SystemContentBlock[] = [{ text: systemPrompt }];

  // Ensure messages array starts with a user message
  if (messages.length === 0) {
    throw new Error("Messages array cannot be empty");
  }

  if (messages[0].role !== "user") {
    throw new Error("First message must be from user");
  }

  const input: ConverseCommandInput = {
    modelId,
    system,
    messages,
    inferenceConfig: {
      temperature: 0.7,
      maxTokens: 8000,
    },
  };

  const command = new ConverseCommand(input);
  const response: ConverseResponse = await this.client.send(command);
  return response;
}
}
