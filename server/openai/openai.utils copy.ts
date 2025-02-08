// src/utils/openai.utils.ts

import type {
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
  // If you have a type for "FunctionSpecification" you can import it:
  // FunctionSpecification,
} from "openai/resources/chat/completions";

import { Message, ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

/**
 * Convert a Bedrock-style `Message` to an OpenAI `ChatCompletionMessageParam`.
 */
export function transformToOpenAIMessage(
  msg: Message
): ChatCompletionMessageParam {
  // If the message has a toolResult
  if (msg.content?.[0]?.toolResult) {
    const toolResult = msg.content[0].toolResult as any;
    return {
      role: "tool",
      content: toolResult.content[0].text,
      tool_call_id: toolResult.toolUseId,
    } as any;
    // "role: tool" is non-standard in official function calling.
    // If your usage allows it, that's fine. Otherwise use "assistant" etc.
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

/**
 * Convert your server's "ToolConfiguration" into an array of function definitions
 * that the official OpenAI library accepts under "functions".
 */
export function transformToolsToOpenAIFormat(
  toolConfig: ToolConfiguration
): any[] /* or FunctionSpecification[] */ {
  if (!toolConfig.tools) return [];

  const isValidTool = (tool: any): boolean => {
    return (
      tool?.toolSpec?.name &&
      typeof tool.toolSpec.name === "string" &&
      tool?.toolSpec?.inputSchema?.json
    );
  };

  return toolConfig.tools.filter(isValidTool).map((tool) => {
    // The official OpenAI function calling requires a shape like:
    // {
    //   name: string;
    //   description?: string;
    //   parameters: JSONSchemaDefinition;
    // }
    // For now we cast to `any` if JSONSchemaDefinition isn't available
    return {
      name: tool.toolSpec?.name,
      description: tool.toolSpec?.description || "",
      parameters: tool.toolSpec?.inputSchema?.json as any,
    };
  });
}
