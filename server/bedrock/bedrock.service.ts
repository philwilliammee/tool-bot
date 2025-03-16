import {
  BedrockRuntimeClient,
  ContentBlock,
  ConverseCommand,
  ConverseCommandInput,
  ConverseResponse,
  ConverseStreamCommand,
  ConverseStreamCommandInput,
  ConverseStreamResponse,
  Message,
  SystemContentBlock,
  ToolConfiguration,
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

  /**
   * Get tool configuration based on enabled tools
   * @param enabledTools Optional array of tool IDs to enable
   * @returns Tool configuration for Bedrock API
   */
  private getFilteredToolConfig(
    enabledTools?: string[]
  ): ToolConfiguration | undefined {
    // If no enabledTools specified, return all tools
    if (!enabledTools) {
      return serverRegistry.getToolConfig();
    }

    // Get the full tool configuration
    const fullToolConfig = serverRegistry.getToolConfig();

    // If no tool configuration exists, return undefined
    if (
      !fullToolConfig ||
      !fullToolConfig.tools ||
      fullToolConfig.tools.length === 0
    ) {
      return undefined;
    }

    // Filter tools based on enabledTools array
    const filteredTools = fullToolConfig.tools.filter((tool) => {
      // Extract the tool name from the toolSpec
      const toolName = tool.toolSpec?.name;
      return toolName && enabledTools.includes(toolName);
    });

    // Return the filtered tool configuration
    return {
      ...fullToolConfig,
      tools: filteredTools,
    };
  }

  async converseStream(
    modelId: string,
    messages: Message[],
    systemPrompt: string,
    enabledTools?: string[]
  ): Promise<ConverseStreamResponse> {
    // Validation
    if (messages.length === 0) {
      throw new Error("Messages array cannot be empty");
    }

    if (messages[0].role !== "user") {
      throw new Error("First message must be from user");
    }

    // Preprocess and validate messages
    const validatedMessages = this.validateAndFixMessages(messages);

    const system: SystemContentBlock[] = [{ text: systemPrompt }];

    // Get filtered tool configuration
    const toolConfig = this.getFilteredToolConfig(enabledTools);

    // console.log(
    //   `[BEDROCK] Using ${
    //     toolConfig?.tools?.length || 0
    //   } tools for model ${modelId}`
    // );

    const input: ConverseStreamCommandInput = {
      modelId,
      system,
      messages: validatedMessages,
      toolConfig,
      inferenceConfig: {
        temperature: 0.7,
        maxTokens: 8000,
      },
    };

    try {
      const command = new ConverseStreamCommand(input);
      const response = await this.client.send(command);
      return response;
    } catch (error: any) {
      console.error("Stream execution error:", {
        error: error.message,
        modelId,
        stack: error.stack,
      });

      // Add detailed message debugging if there's a validation error
      if (error.message && error.message.includes("ContentBlock")) {
        this.debugMessageStructure(messages);
      }

      throw error;
    }
  }

  /**
   * Validates and fixes messages to ensure they meet Bedrock API requirements
   * @param messages Array of messages to validate
   * @returns Fixed messages array
   */
  private validateAndFixMessages(messages: Message[]): Message[] {
    return messages.map((message, index) => {
      // Create a deep copy to avoid modifying the original
      const fixedMessage: Message = { ...message };

      // Ensure content array exists
      if (!fixedMessage.content || !Array.isArray(fixedMessage.content)) {
        console.warn(
          `Message at index ${index} has no content array, creating empty one`
        );
        fixedMessage.content = [];
      }

      // Ensure each content block has appropriate structure
      fixedMessage.content = fixedMessage.content.map(
        (block: any, blockIndex) => {
          // If it's a tool result block, it doesn't need a text property
          if (block.toolResult) {
            return block;
          }

          // If it's a tool use block, it doesn't need a text property
          if (block.toolUse) {
            return block;
          }

          // For other blocks, ensure they have a text property
          if (!block.text || block.text.trim() === "") {
            console.warn(
              `Empty text in content block ${blockIndex} of message ${index}, adding placeholder`
            );
            return { ...block, text: "[Empty message content]" };
          }

          return block;
        }
      );

      // If content array is empty, add a default text block
      if (fixedMessage.content.length === 0) {
        console.warn(
          `Message at index ${index} has empty content array, adding default block`
        );
        fixedMessage.content.push({ text: "[Empty message]" });
      }

      return fixedMessage;
    });
  }

  /**
   * Debug helper to print detailed message structure for troubleshooting
   * @param messages Messages array to debug
   */
  private debugMessageStructure(messages: Message[]): void {
    console.error("=== DETAILED MESSAGE STRUCTURE DEBUG ===");
    messages.forEach((message, index) => {
      console.error(`Message ${index}:`);
      console.error(`  Role: ${message.role}`);
      console.error(`  Content blocks: ${message.content?.length || 0}`);

      if (message.content && Array.isArray(message.content)) {
        message.content.forEach((block: any, blockIndex) => {
          console.error(`    Block ${blockIndex}:`);
          // Use optional chaining to safely access type property
          console.error(`      Type: ${block.type ?? "text"}`);
          console.error(
            `      Text: ${
              block.text
                ? `"${block.text.substring(0, 50)}${
                    block.text.length > 50 ? "..." : ""
                  }"`
                : "EMPTY"
            }`
          );
          console.error(`      Text length: ${block.text?.length || 0}`);

          // Log additional properties for debugging
          const props = Object.keys(block).filter(
            (k) => k !== "text" && k !== "type"
          );
          if (props.length > 0) {
            console.error(`      Other properties: ${props.join(", ")}`);
          }
        });
      } else {
        console.error(`  Content is not an array or is undefined`);
      }
    });
    console.error("=========================================");
  }

  // Keep the original non-streaming method if needed
  async converse(
    modelId: string,
    messages: Message[],
    systemPrompt: string,
    enabledTools?: string[]
  ): Promise<ConverseStreamResponse> {
    return this.converseStream(modelId, messages, systemPrompt, enabledTools);
  }

  // bedrock.service.ts
  async invoke(
    modelId: string,
    messages: Message[],
    systemPrompt: string,
    enabledTools?: string[]
  ): Promise<ConverseResponse> {
    const system: SystemContentBlock[] = [{ text: systemPrompt }];

    // Ensure messages array starts with a user message
    if (messages.length === 0) {
      throw new Error("Messages array cannot be empty");
    }

    if (messages[0].role !== "user") {
      throw new Error("First message must be from user");
    }

    // Get filtered tool configuration
    // const toolConfig = this.getFilteredToolConfig(enabledTools);

    // console.log(
    //   `[BEDROCK] Using ${
    //     toolConfig?.tools?.length || 0
    //   } tools for model ${modelId}`
    // );

    const input: ConverseCommandInput = {
      modelId,
      system,
      messages,
      // toolConfig, // unused for now in invoke only by summary
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
