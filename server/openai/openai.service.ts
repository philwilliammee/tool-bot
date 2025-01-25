// server/openai/openai.service.ts
import OpenAI from "openai";
import { ConverseResponse, Message } from "@aws-sdk/client-bedrock-runtime";
import { serverRegistry } from "../../tools/server/registry";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  transformToolsToOpenAIFormat,
  transformToOpenAIMessage,
} from "./openai.utils";

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
      baseURL: config.baseUrl,
    });
  }

  async converse(
    modelId: string,
    messages: Message[],
    systemPrompt: string
  ): Promise<ConverseResponse> {
    modelId = process.env.OPENAI_API_MODEL || ""; // override model ID @todo do this in client.
    return this.executeWithRetry(modelId, messages, systemPrompt);
  }

  private async executeWithRetry(
    modelId: string,
    messages: Message[],
    systemPrompt: string,
    retryCount = OpenAIService.MAX_RETRIES
  ): Promise<ConverseResponse> {
    try {
      const startTime = Date.now();

      // Get tools from registry and transform them
      const toolConfig = serverRegistry.getToolConfig();
      const tools = transformToolsToOpenAIFormat(toolConfig);

      // Transform messages to OpenAI format
      const openAIMessages: ChatCompletionMessageParam[] = messages.map(
        transformToOpenAIMessage
      );

      // Add system message to the beginning
      if (systemPrompt) {
        openAIMessages.unshift({
          role: "system",
          content: systemPrompt,
        });
      }

      const completion = await this.client.chat.completions.create({
        messages: openAIMessages,
        model: modelId,
        temperature: 0.7,
        max_tokens: 8000,
        tools: tools,
        tool_choice: "auto",
      });

      const assistantMessage = completion.choices[0].message;

      // If the assistant wants to use a tool
      if (assistantMessage.tool_calls?.length) {
        const toolCall = assistantMessage.tool_calls[0];
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
