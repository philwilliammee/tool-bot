import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseResponse,
  Message,
  SystemContentBlock,
  ToolConfiguration,
} from "@aws-sdk/client-bedrock-runtime";

export interface BedrockServiceConfig {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
}

export class BedrockService {
  private static MAX_RETRIES = 2;
  private client: BedrockRuntimeClient;

  constructor(config: BedrockServiceConfig) {
    this.client = new BedrockRuntimeClient(config);
  }

  async converse(
    modelId: string,
    messages: Message[],
    systemPrompt: string
  ): Promise<ConverseResponse> {
    return this.executeWithRetry(modelId, messages, systemPrompt);
  }

  private async executeWithRetry(
    modelId: string,
    messages: Message[],
    systemPrompt: string,
    retryCount = BedrockService.MAX_RETRIES
  ): Promise<ConverseResponse> {
    try {
      const system: SystemContentBlock[] = [{ text: systemPrompt }];

      // Ensure messages array starts with a user message
      if (messages.length === 0) {
        throw new Error("Messages array cannot be empty");
      }

      if (messages[0].role !== "user") {
        throw new Error("First message must be from user");
      }

      const input = {
        modelId,
        system,
        messages,
        toolConfig: this.getToolConfig(),
        inferenceConfig: {
          temperature: 0.7,
          maxTokens: 8000,
        },
      };

      const command = new ConverseCommand(input);
      const response: ConverseResponse = await this.client.send(command);
      console.log("Response:", response);

      return response;
    } catch (error: any) {
      console.error("Execute error:", {
        error: error.message,
        retryCount,
        modelId,
        stack: error.stack,
      });

      if (retryCount > 0) {
        // Only retry certain types of errors
        if (
          error.name === "ValidationException" &&
          error.message.includes("alternating")
        ) {
          console.warn("Message sequence error detected, skipping retry");
          throw error;
        }

        console.warn(
          `Retry attempt ${BedrockService.MAX_RETRIES - retryCount + 1}`
        );
        return this.executeWithRetry(
          modelId,
          messages,
          systemPrompt,
          retryCount - 1
        );
      }
      throw error;
    }
  }

  private getToolConfig(): ToolConfiguration {
    return {
      tools: [
        {
          toolSpec: {
            name: "fetch_url",
            description:
              "Fetch content from a specified URL. Only HTTPS URLs from allowed domains are supported. Returns JSON or text content.",
            inputSchema: {
              json: {
                type: "object",
                properties: {
                  url: {
                    type: "string",
                    description:
                      "The HTTPS URL to fetch from. Must be from an allowed domain.",
                    pattern: "^https://",
                  },
                  method: {
                    type: "string",
                    enum: ["GET"],
                    default: "GET",
                    description: "HTTP method (only GET is supported)",
                  },
                },
                required: ["url"],
              },
            },
          },
        },
      ],
    };
  }
}
