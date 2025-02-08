import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionCreateParamsStreaming,
} from "openai/resources/chat/completions";
import { serverRegistry } from "../../tools/server/registry.js";
import {
  ConverseStreamResponse,
  ConverseStreamOutput,
  Message,
} from "@aws-sdk/client-bedrock-runtime";
import {
  transformToOpenAIMessage,
  transformToolsToOpenAIFormat,
  transformToBedrockStream,
  OpenaiStream,
} from "./openai.utils.js";
import fs from "fs/promises";
import path from "path";

// @todo support retries
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
    API_MODEL: process.env.OPENAI_API_MODEL || "", // e.g. "gpt-4"
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

      // Check if key is expired (within 10 min buffer)
      if (new Date(expiresAt).getTime() - Date.now() > 10 * 60 * 1000) {
        return key;
      }
      // Otherwise generate new
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
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hrs

      // Ensure private directory exists
      await fs.mkdir(path.dirname(OpenAIService.SESSION_KEY_PATH), {
        recursive: true,
      });

      // Save session key and expiration
      await fs.writeFile(
        OpenAIService.SESSION_KEY_PATH,
        JSON.stringify({ key: sessionKey, expiresAt: expiresAt.toISOString() })
      );

      return sessionKey;
    } catch (error) {
      console.error("Failed to generate session key:", error);
      throw new Error("Failed to generate session key");
    }
  }

  /**
   * Optional non-streaming method that just consumes the stream fully.
   */
  async converse(
    modelId: string,
    messages: Message[],
    systemPrompt: string
  ): Promise<any> {
    const response = await this.converseStream(modelId, messages, systemPrompt);
    const chunks: ConverseStreamOutput[] = [];
    const stream = response.stream as AsyncIterable<ConverseStreamOutput>;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return { chunks };
  }

  /**
   * Main streaming method. Returns a Bedrock-like { stream: AsyncIterable<ConverseStreamOutput> }.
   */
  public async converseStream(
    modelId: string,
    messages: Message[],
    systemPrompt: string
  ): Promise<ConverseStreamResponse> {
    if (!messages.length) {
      throw new Error("Messages array cannot be empty");
    }
    if (messages[0].role !== "user") {
      throw new Error("First message must be from user");
    }

    // console.log("incomingMessages", JSON.stringify(messages, null, 2));

    // Convert to OpenAI format
    const openAIMessages: ChatCompletionMessageParam[] = messages.map(
      transformToOpenAIMessage
    );
    if (systemPrompt) {
      openAIMessages.unshift({
        role: "system",
        content: systemPrompt,
      });
    }
    // console.log("openAIMessages", openAIMessages);

    // Convert your server's tool config into "functions"
    const toolConfig = serverRegistry.getToolConfig();
    const tools = transformToolsToOpenAIFormat(toolConfig);

    // Build a streaming request
    const request: ChatCompletionCreateParamsStreaming = {
      model: OpenAIService.CONFIG.API_MODEL || modelId,
      messages: openAIMessages,
      temperature: 0.7,
      max_tokens: 8000,
      tools,
      function_call: "auto",
      stream: true as true,
    };

    // Call OpenAI streaming
    const openAIStream: OpenaiStream =
      await this.client.chat.completions.create(request);

    // Transform the stream using our utility function
    return await transformToBedrockStream(openAIStream);
  }
}
