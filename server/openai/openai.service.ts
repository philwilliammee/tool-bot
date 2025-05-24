import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionCreateParamsStreaming,
} from "openai/resources/chat/completions";
import { serverRegistry } from "../../tools/registry.server.js";
import {
  ConverseStreamResponse,
  ConverseStreamOutput,
  Message,
  ConverseResponse,
} from "@aws-sdk/client-bedrock-runtime";
import {
  transformToOpenAIMessage,
  transformToolsToOpenAIFormat,
  transformToBedrockStream,
  OpenaiStream,
} from "./openai.utils.js";

// info https://platform.openai.com/docs/api-reference/streaming
// @todo support retries
export class OpenAIService {
  private static MAX_RETRIES = 2;
  private client!: OpenAI;

  private static CONFIG = {
    API_KEY: process.env.OPENAI_API_KEY || "",
    API_BASE: process.env.OPENAI_API_BASE || "",
    API_MODEL: process.env.OPENAI_API_MODEL || "", // e.g. "gpt-4"
  };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    console.log("Initializing OpenAIService");
    console.log("OpenAI Config:", {
      apiBase: OpenAIService.CONFIG.API_BASE,
      apiModel: OpenAIService.CONFIG.API_MODEL,
      hasApiKey: !!OpenAIService.CONFIG.API_KEY,
      keyLength: OpenAIService.CONFIG.API_KEY?.length ?? 0,
    });

    try {
      if (!OpenAIService.CONFIG.API_KEY) {
        throw new Error("OpenAI API key is required but not provided");
      }

      console.log("Creating OpenAI client instance");
      this.client = new OpenAI({
        apiKey: OpenAIService.CONFIG.API_KEY,
        baseURL: OpenAIService.CONFIG.API_BASE || undefined,
      });
      console.log("OpenAI client initialized successfully");
    } catch (error) {
      console.error("Failed to initialize OpenAIService:", error);
      if (error instanceof Error) {
        console.error("Error stack:", error.stack);
      }
      throw error; // Re-throw to allow higher-level handling
    }
  }

  /**
   * Optional non-streaming method that just consumes the stream fully.
   */
  async converse(
    modelId: string,
    messages: Message[],
    systemPrompt: string,
    enabledTools?: string[]
  ): Promise<any> {
    const response = await this.converseStream(
      modelId,
      messages,
      systemPrompt,
      enabledTools
    );
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
    systemPrompt: string,
    enabledTools?: string[]
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

    // Get tool configuration and filter based on enabledTools
    const toolConfig = await serverRegistry.getToolConfig();
    let filteredToolConfig = toolConfig;

    // Filter tools if enabledTools is provided
    if (enabledTools && toolConfig) {
      filteredToolConfig = {
        ...toolConfig,
        tools: toolConfig?.tools?.filter((tool) => {
          const toolName = tool.toolSpec?.name;
          return toolName && enabledTools.includes(toolName);
        }),
      };
    }

    // Transform filtered tools to OpenAI format
    const tools = transformToolsToOpenAIFormat(filteredToolConfig);

    console.log(`[OPENAI] Using ${tools.length} tools for model ${modelId}`);

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

  // openai.service.ts
  async invoke(
    modelId: string,
    messages: Message[],
    systemPrompt: string,
    enabledTools?: string[]
  ): Promise<ConverseResponse> {
    console.log("invoke", messages);
    const startTime = Date.now();

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

    // Get tool configuration and filter based on enabledTools
    // const toolConfig = serverRegistry.getToolConfig();
    // let filteredToolConfig = toolConfig;

    // Filter tools if enabledTools is provided
    // if (enabledTools && toolConfig) {
    //   filteredToolConfig = {
    //     ...toolConfig,
    //     tools: toolConfig.tools.filter((tool) => {
    //       const toolName = tool.toolSpec?.name;
    //       return toolName && enabledTools.includes(toolName);
    //     }),
    //   };
    // }

    // Transform filtered tools to OpenAI format
    // const tools = transformToolsToOpenAIFormat(filteredToolConfig);

    // console.log(
    //   `[OPENAI] Using ${tools.length} tools for invoke with model ${modelId}`
    // );

    const completion = await this.client.chat.completions.create({
      messages: openAIMessages,
      model: OpenAIService.CONFIG.API_MODEL,
      temperature: 0.7,
      max_tokens: 8000,
    });

    const assistantMessage = completion.choices[0].message;

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
  }
}
