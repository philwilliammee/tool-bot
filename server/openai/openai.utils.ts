// src/utils/openai.utils.ts
import type {
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { Message, ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";
import { FunctionParameters } from "openai/src/resources/shared.js";

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
