// server/openai/openai.service.ts
import { ConverseResponse, Message } from "@aws-sdk/client-bedrock-runtime";

export interface OpenAIServiceConfig {
  apiKey: string;
  baseUrl?: string; // Add this to support custom endpoints
}

export class OpenAIService {
  private static MAX_RETRIES = 2;
  private baseUrl: string;
  private apiKey: string;

  constructor(config: OpenAIServiceConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://api.ai.it.cornell.edu";
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
    retryCount = OpenAIService.MAX_RETRIES
  ): Promise<ConverseResponse> {
    try {
      const startTime = Date.now();

      // Transform messages to OpenAI format
      const openAIMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content?.[0]?.text || "",
      }));

      // Add system message if provided
      // if (systemPrompt) {
      //   openAIMessages.unshift({
      //     role: "system",
      //     content: systemPrompt
      //   });
      // }
      console.log(
        "Transformed messages:",
        openAIMessages,
        this.baseUrl,
        this.apiKey
      );
      const fullUrl = "https://api.ai.it.cornell.edu/v1/chat/completions"; //`${this.baseUrl}/v1/chat/completions`;
      console.log(fullUrl);
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer sk-U3h87CDyCTIXKNjbjpdPRQ`,
        },
        body: JSON.stringify({
          model: "openai.gpt-4o.2024-08-06",
          messages: openAIMessages,
          temperature: 0.7,
          max_tokens: 8000,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const completion = await response.json();

      // Transform response to Bedrock format
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
        stopReason: completion.choices[0].finish_reason,
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
