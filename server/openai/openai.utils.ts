// src/utils/openai.utils.ts
import type {
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import {
  ConverseStreamResponse,
  Message,
  ToolConfiguration,
} from "@aws-sdk/client-bedrock-runtime";
import { FunctionParameters } from "openai/src/resources/shared.js";
import OpenAI from "openai";
import { Stream } from "openai/streaming.mjs";

export type BedrockStreamResponse = AsyncIterable<any> & ConverseStreamResponse;

export type OpenaiStream =
  Stream<OpenAI.Chat.Completions.ChatCompletionChunk> & {
    _request_id?: string | null;
  };

export function transformToOpenAIMessage(
  msg: Message
): ChatCompletionMessageParam {
  // Handle tool results
  if (msg.content?.[0]?.toolResult) {
    const toolResult = msg.content[0].toolResult as any;
    return {
      role: "tool",
      content: toolResult.content[0].text,
      tool_call_id: toolResult.toolUseId,
    } as ChatCompletionToolMessageParam;
  }

  const content = msg.content?.[0]?.text || "";

  switch (msg.role) {
    case "user":
      return {
        role: "user",
        content,
      } as ChatCompletionUserMessageParam;
    case "assistant":
      if (msg.content?.[0]?.toolUse) {
        const toolUse = msg.content[0].toolUse;
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
      return {
        role: "user",
        content,
      } as ChatCompletionUserMessageParam;
  }
}

export function transformToolsToOpenAIFormat(
  toolConfig: ToolConfiguration
): ChatCompletionTool[] {
  if (!toolConfig.tools) return [];

  const isValidTool = (tool: any): boolean => {
    return (
      tool?.toolSpec?.name &&
      typeof tool.toolSpec.name === "string" &&
      tool?.toolSpec?.inputSchema?.json
    );
  };

  return toolConfig.tools.filter(isValidTool).map((tool) => {
    return {
      type: "function" as const,
      function: {
        name: tool!.toolSpec!.name || "",
        description: tool!.toolSpec!.description || "",
        parameters: tool!.toolSpec!.inputSchema!.json as FunctionParameters,
      },
    };
  });
}

export async function transformToBedrockStream(
  openaiStream: OpenaiStream
): Promise<ConverseStreamResponse> {
  let isFirstChunk = true;
  let lastToolCallId: string | undefined;

  return {
    stream: {
      async *[Symbol.asyncIterator]() {
        try {
          for await (const chunk of openaiStream) {
            const delta = chunk.choices[0].delta;
            const finishReason = chunk.choices[0].finish_reason;

            // Handle message start on the very first assistant chunk
            if (isFirstChunk && delta.role === "assistant") {
              isFirstChunk = false;
              yield {
                messageStart: {
                  role: "assistant",
                },
              };
            }

            // Handle content
            if (delta.content) {
              yield {
                contentBlockDelta: {
                  contentBlockIndex: 0,
                  delta: {
                    text: delta.content,
                  },
                },
              };
            }

            // Handle tool calls
            if (delta.tool_calls) {
              const toolCall = delta.tool_calls[0];

              // If it's a new tool call ID, start a new content block
              if (toolCall.id && toolCall.id !== lastToolCallId) {
                lastToolCallId = toolCall.id;
                yield {
                  contentBlockStart: {
                    contentBlockIndex: 1,
                    start: {
                      toolUse: {
                        name: toolCall.function?.name,
                        toolUseId: toolCall.id,
                      },
                    },
                  },
                };
              }

              // Stream out partial arguments if any
              if (toolCall.function?.arguments) {
                yield {
                  contentBlockDelta: {
                    contentBlockIndex: 1,
                    delta: {
                      toolUse: {
                        input: toolCall.function.arguments,
                      },
                    },
                  },
                };
              }
            }

            // Handle any finish reason
            if (finishReason) {
              // If a tool call was in progress, close it
              if (lastToolCallId) {
                yield {
                  contentBlockStop: {
                    contentBlockIndex: 1,
                  },
                };
              }

              // Map finish_reason to the appropriate stopReason
              yield {
                messageStop: {
                  stopReason:
                    finishReason === "function_call" ||
                    finishReason === "tool_calls"
                      ? "tool_use"
                      : "end_turn",
                },
              };
            }
          }
        } catch (error) {
          console.error("Error in stream transformation:", error);
        }
      },
    },
  } as ConverseStreamResponse;
}
