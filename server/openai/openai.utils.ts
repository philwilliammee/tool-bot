// src/utils/openai.utils.ts
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import {
  ConverseStreamResponse,
  Message,
  ToolConfiguration,
  ToolUseBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { FunctionParameters } from "openai/src/resources/shared.js";
import OpenAI from "openai";
import { Stream } from "openai/streaming.mjs";

export type BedrockStreamResponse = AsyncIterable<any> & ConverseStreamResponse;

export type OpenaiStream =
  Stream<OpenAI.Chat.Completions.ChatCompletionChunk> & {
    _request_id?: string | null;
  };

/**
 * Transforms a generic Bedrock Message object into a shape that OpenAI
 * (via litellm or similar) will accept. For the tool calls:
 */
export function transformToOpenAIMessage(
  msg: Message
): ChatCompletionMessageParam {
  // Concatenate all text segments (if any)
  const allText = (msg.content ?? [])
    .filter((segment) => !!segment.text)
    .map((segment) => segment.text)
    .join(" ");

  // Check if the first segment is a toolResult
  const firstSegment = msg.content?.[0];
  if (firstSegment?.toolResult) {
    const { content, toolUseId } = firstSegment.toolResult;
    const text = content?.[0]?.text ?? "";
    return {
      role: "tool",
      tool_call_id: toolUseId ?? "",
      content: text,
    };
  }

  // If the message is an assistant calling a tool, also include any text
  const toolUseSegment = msg.content?.find((segment) => segment.toolUse);
  if (toolUseSegment && msg.role === "assistant") {
    const { name, toolUseId, input } = toolUseSegment.toolUse as ToolUseBlock;
    // If there's no text at all, return null per the test expectation
    const finalContent = allText.trim().length > 0 ? allText : null;
    return {
      role: "assistant",
      content: finalContent,
      tool_calls: [
        {
          id: toolUseId ?? "",
          type: "function",
          function: {
            name: name ?? "",
            arguments: JSON.stringify(input),
          },
        },
      ],
    };
  }

  // Otherwise, it's a normal text-based message (assistant or user).
  switch (msg.role) {
    case "assistant":
      return {
        role: "assistant",
        content: allText,
      };
    case "user":
      return {
        role: "user",
        content: allText,
      };
    default:
      // If needed, handle system or other roles here
      return {
        role: "user",
        content: allText,
      };
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
