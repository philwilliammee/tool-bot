// server/openai/openai.service.ts
import OpenAI from "openai";
import {
  ConverseResponse,
  Message,
  ToolConfiguration,
  ToolResultBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { serverRegistry } from "../../tools/server/registry";
import type {
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { FunctionParameters } from "openai/resources/shared.mjs";

export interface OpenAIServiceConfig {
  apiKey: string;
  baseUrl?: string;
}

export class OpenAIService {
  private static MAX_RETRIES = 2;
  private client: OpenAI;

  constructor(config: OpenAIServiceConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || "https://api.ai.it.cornell.edu",
    });
  }

  async converse(
    modelId: string,
    messages: Message[],
    systemPrompt: string
  ): Promise<ConverseResponse> {
    modelId = "openai.gpt-4o.2024-08-06"; // override model ID @todo do this in client.
    return this.executeWithRetry(modelId, messages, systemPrompt);
  }

  private transformToOpenAIMessage(msg: Message): ChatCompletionMessageParam {
    console.log("Transforming message:", JSON.stringify(msg, null, 2));

    // Handle tool results
    if (msg.content?.[0]?.toolResult) {
      const toolResult = msg.content[0].toolResult as any; // @todo properly type this
      console.log("Found tool result:", JSON.stringify(toolResult, null, 2));
      return {
        role: "tool",
        content: toolResult.content[0].text,
        tool_call_id: toolResult.toolUseId,
      } as ChatCompletionToolMessageParam;
    }

    // Handle regular messages
    const content = msg.content?.[0]?.text || "";

    switch (msg.role) {
      case "user":
        return {
          role: "user",
          content,
        } as ChatCompletionUserMessageParam;
      case "assistant":
        // Check if the message contains a tool use
        if (msg.content?.[0]?.toolUse) {
          const toolUse = msg.content[0].toolUse;
          console.log(
            "Found tool use in assistant message:",
            JSON.stringify(toolUse, null, 2)
          );
          return {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: toolUse.toolUseId,
                type: "function",
                function: {
                  name: toolUse.name,
                  arguments: JSON.stringify(toolUse.input),
                },
              },
            ],
          } as ChatCompletionAssistantMessageParam;
        }
        return {
          role: "assistant",
          content,
        } as ChatCompletionAssistantMessageParam;
      default:
        console.warn(`Unknown role "${msg.role}", defaulting to user`);
        return {
          role: "user",
          content,
        } as ChatCompletionUserMessageParam;
    }
  }

  private transformToolsToOpenAIFormat(
    toolConfig: ToolConfiguration
  ): ChatCompletionTool[] {
    if (!toolConfig.tools) return [];

    const tools: ChatCompletionTool[] = toolConfig.tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool!.toolSpec!.name || "",
        description: tool!.toolSpec!.description || "",
        parameters: tool!.toolSpec!.inputSchema!.json as FunctionParameters,
      },
    }));

    console.log("Transformed tools:", JSON.stringify(tools, null, 2));
    return tools;
  }

  private async executeWithRetry(
    modelId: string,
    messages: Message[],
    systemPrompt: string,
    retryCount = OpenAIService.MAX_RETRIES
  ): Promise<ConverseResponse> {
    try {
      const startTime = Date.now();

      console.log("Incoming messages:", JSON.stringify(messages, null, 2));

      // Get tools from registry and transform them
      const toolConfig = serverRegistry.getToolConfig();
      const tools = this.transformToolsToOpenAIFormat(toolConfig);

      // Transform messages to OpenAI format
      const openAIMessages: ChatCompletionMessageParam[] = messages.map((msg) =>
        this.transformToOpenAIMessage(msg)
      );

      // Add system message if provided
      if (systemPrompt) {
        openAIMessages.unshift({
          role: "system",
          content: systemPrompt,
        } as ChatCompletionSystemMessageParam);
      }

      console.log(
        "Transformed OpenAI messages:",
        JSON.stringify(openAIMessages, null, 2)
      );

      const body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming =
        {
          messages: openAIMessages,
          model: modelId,
          temperature: 0.7,
          max_tokens: 8000,
          tools: tools,
          tool_choice: "auto",
        };

      const completion = await this.client.chat.completions.create(body);

      console.log(
        "OpenAI response:",
        JSON.stringify(completion.choices[0].message, null, 2)
      );

      const assistantMessage = completion.choices[0].message;

      // If the assistant wants to use a tool
      if (
        assistantMessage.tool_calls &&
        assistantMessage.tool_calls.length > 0
      ) {
        console.log(
          "Tool call detected:",
          JSON.stringify(assistantMessage.tool_calls, null, 2)
        );

        const toolCall = assistantMessage.tool_calls[0]; // Take first tool call
        return {
          output: {
            message: {
              role: "assistant",
              content: [
                {
                  toolUse: {
                    toolUseId: toolCall.id,
                    name: toolCall.function.name,
                    input: JSON.parse(toolCall.function.arguments),
                  },
                },
              ],
            },
          },
          stopReason: "tool_use",
          usage: {
            inputTokens: completion.usage?.prompt_tokens || 0,
            outputTokens: completion.usage?.completion_tokens || 0,
            totalTokens: completion.usage?.total_tokens || 0,
          },
          metrics: {
            latencyMs: Date.now() - startTime,
          },
        };
      }

      // If no tool calls, return normal response
      return {
        output: {
          message: {
            role: "assistant",
            content: [{ text: assistantMessage.content || "" }],
          },
        },
        stopReason: completion.choices[0].finish_reason as any,
        usage: {
          inputTokens: completion.usage?.prompt_tokens || 0,
          outputTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        metrics: {
          latencyMs: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      console.error("Execute error:", {
        error: error.message,
        retryCount,
        modelId,
        stack: error.stack,
      });

      if (retryCount > 0) {
        console.warn(
          `Retry attempt ${OpenAIService.MAX_RETRIES - retryCount + 1}`
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
}
