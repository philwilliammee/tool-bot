// server/bedrock/bedrock.service.ts
import {
  BedrockRuntimeClient,
  ContentBlock,
  ConverseCommand,
  ConverseResponse,
  Message,
  SystemContentBlock,
  ToolConfiguration,
  ToolUseBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { fetchTool, FetchToolInput } from "./tools/fetch.tool";

export interface BedrockServiceConfig {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
}

interface ServiceResponse {
  parsed: any | null;
  raw: ConverseResponse;
  stopReason: string;
  messageContent?: ContentBlock[];
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
  ): Promise<ServiceResponse> {
    return this.executeWithRetry(modelId, messages, systemPrompt);
  }

  private async executeWithRetry(
    modelId: string,
    messages: Message[],
    systemPrompt: string,
    retryCount = BedrockService.MAX_RETRIES
  ): Promise<ServiceResponse> {
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
      const response = await this.client.send(command);
      console.log("Response:", response);
      const parsedResponse = this.parseResponse(response);

      // Handle tool use request
      if (parsedResponse.stopReason === "tool_use") {
        const toolUse = parsedResponse.messageContent?.find(
          (content) => content.toolUse
        )?.toolUse;
        if (toolUse) {
          const toolResult = await this.handleToolUse(toolUse as ToolUseBlock);

          // Add assistant message first (the tool request)
          messages.push({
            role: "assistant",
            content: parsedResponse.messageContent || [],
          });

          // Then add user message with tool result
          messages.push({
            role: "user",
            content: [
              {
                toolResult: {
                  toolUseId: toolUse.toolUseId,
                  content: [{ json: toolResult }],
                  status: toolResult.error ? "error" : "success",
                },
              },
            ],
          });

          // Recursive call to continue the conversation
          return this.executeWithRetry(
            modelId,
            messages,
            systemPrompt,
            retryCount
          );
        }
      }

      return parsedResponse;
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

  private async handleToolUse(toolUse: ToolUseBlock): Promise<any> {
    try {
      switch (toolUse.name) {
        case "fetch_url": {
          console.log("fetching url", toolUse.input);
          const fetchToolInput = toolUse.input as unknown as FetchToolInput;
          const result = await fetchTool(fetchToolInput);
          return {
            statusCode: result.status,
            headers: result.headers,
            content: result.data,
            error: result.error || false,
            errorMessage: result.message || "",
          };
        }
        default:
          throw new Error(`Unknown tool: ${toolUse.name}`);
      }
    } catch (error: any) {
      return {
        error: true,
        errorMessage: error.message || "Tool execution failed",
        statusCode: 500,
      };
    }
  }

  private parseResponse(response: ConverseResponse): ServiceResponse {
    const messageContent = response?.output?.message?.content || [];

    // Look for text content in the message
    const textContent =
      messageContent.find((content) => content.text)?.text || "";

    let parsed = null;
    if (textContent) {
      try {
        parsed = JSON.parse(textContent);
      } catch (error) {
        // If it's not JSON, that's okay - leave parsed as null
        console.debug("Response is not JSON:", textContent);
      }
    }

    return {
      parsed,
      raw: response,
      stopReason: response.stopReason || "",
      messageContent: messageContent,
    };
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
