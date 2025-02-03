// server/openai/openai.service.ts
import OpenAI from "openai";
import { ConverseResponse, Message } from "@aws-sdk/client-bedrock-runtime";
import { serverRegistry } from "../../tools/server/registry.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  transformToolsToOpenAIFormat,
  transformToOpenAIMessage,
} from "./openai.utils.js";
import fs from "fs/promises";
import path from "path";

export class OpenAIService {
  private static MAX_RETRIES = 2;
  private client!: OpenAI;
  private static SESSION_KEY_PATH = path.join(
    process.cwd(),
    "private",
    "openai_session_key"
  );
  private static CONFIG = {
    API_KEY: process.env.OPENAI_API_KEY || "",
    API_BASE: process.env.OPENAI_API_BASE || "",
    API_MODEL: process.env.OPENAI_API_MODEL || "",
  };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    const sessionKey = await this.getOrGenerateSessionKey();

    this.client = new OpenAI({
      apiKey: sessionKey,
      baseURL: OpenAIService.CONFIG.API_BASE,
    });
  }

  private async getOrGenerateSessionKey(): Promise<string> {
    try {
      // Try to read existing session key
      const keyFile = await fs.readFile(
        OpenAIService.SESSION_KEY_PATH,
        "utf-8"
      );
      const { key, expiresAt } = JSON.parse(keyFile);

      // Check if key is expired (10 minutes buffer)
      if (new Date(expiresAt).getTime() - Date.now() > 10 * 60 * 1000) {
        return key;
      }

      // If key is expired or about to expire, generate new one
      return await this.generateNewSessionKey();
    } catch (error) {
      // If file doesn't exist or is invalid, generate new key
      return await this.generateNewSessionKey();
    }
  }

  private async generateNewSessionKey(): Promise<string> {
    try {
      const response = await fetch(
        `${OpenAIService.CONFIG.API_BASE}/key/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OpenAIService.CONFIG.API_KEY}`,
          },
          body: JSON.stringify({
            models: [OpenAIService.CONFIG.API_MODEL],
            duration: "24h",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to generate session key: ${response.statusText}`
        );
      }

      const data = await response.json();
      const sessionKey = data.key;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Ensure private directory exists
      await fs.mkdir(path.dirname(OpenAIService.SESSION_KEY_PATH), {
        recursive: true,
      });

      // Save session key and expiration
      await fs.writeFile(
        OpenAIService.SESSION_KEY_PATH,
        JSON.stringify({
          key: sessionKey,
          expiresAt: expiresAt.toISOString(),
        })
      );

      return sessionKey;
    } catch (error) {
      console.error("Failed to generate session key:", error);
      throw new Error("Failed to generate session key");
    }
  }

  async converse(
    modelId: string,
    messages: Message[],
    systemPrompt: string
  ): Promise<ConverseResponse> {
    // Use configured model ID instead of passed parameter
    return this.executeWithRetry(
      OpenAIService.CONFIG.API_MODEL,
      messages,
      systemPrompt
    );
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
