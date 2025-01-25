// server/openai/openai.service.ts
import OpenAI from "openai";
import { ConverseResponse, Message } from "@aws-sdk/client-bedrock-runtime";
import type {
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
} from "openai/resources/chat/completions";

export interface OpenAIServiceConfig {
  apiKey: string;
}

export class OpenAIService {
  private static MAX_RETRIES = 2;
  private client: OpenAI;

  constructor(config: OpenAIServiceConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  async converse(
    modelId: string,
    messages: Message[],
    systemPrompt: string
  ): Promise<ConverseResponse> {
    modelId = process.env.OPENAI_API_MODEL || "anthropic.claude-3.5-sonnet.v2"; // override model ID @todo do this in client.
    return this.executeWithRetry(modelId, messages, systemPrompt);
  }

  private transformToOpenAIMessage(msg: Message): ChatCompletionMessageParam {
    const content = msg.content?.[0]?.text || "";

    switch (msg.role) {
      case "user":
        return {
          role: "user",
          content,
        } as ChatCompletionUserMessageParam;
      case "assistant":
        return {
          role: "assistant",
          content,
        } as ChatCompletionAssistantMessageParam;
      default:
        // Default to user message if role is unknown
        console.warn(`Unknown role "${msg.role}", defaulting to user`);
        return {
          role: "user",
          content,
        } as ChatCompletionUserMessageParam;
    }
  }

  private async executeWithRetry(
    modelId: string,
    messages: Message[],
    systemPrompt: string,
    retryCount = OpenAIService.MAX_RETRIES
  ): Promise<ConverseResponse> {
    try {
      const startTime = Date.now(); // Add this line to measure latency
      // Transform Bedrock messages to OpenAI format
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

      const completion = await this.client.chat.completions.create({
        messages: openAIMessages,
        model: modelId,
        temperature: 0.7,
        max_tokens: 8000,
      });

      // Transform OpenAI response to Bedrock format
      return {
        output: {
          message: {
            role: "assistant",
            content: [
              {
                text: completion.choices[0].message.content || "",
              },
            ],
          },
        },
        stopReason: completion.choices[0].finish_reason as any,
        usage: {
          inputTokens: completion.usage?.prompt_tokens || 0,
          outputTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        metrics: {
          latencyMs: Date.now() - startTime, // Calculate actual latency
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
