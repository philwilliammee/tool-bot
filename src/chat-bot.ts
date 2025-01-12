import {
  Message,
  ConverseResponse,
  ToolResultBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { postBedrock } from "./apiClient";
import { chatContext } from "./chat-context";
import { fetchTool } from "./tools/fetch/fetch.tool";
import { mathTool } from "./tools/math/math.tool";

const tools = {
  math: mathTool,
  fetch_url: fetchTool,
};

export interface Tool {
  execute: (input: any) => Promise<any>;
  validate: (input: any) => boolean;
  systemPrompt: string;
}

// Remove generic constraint from ToolUse
interface ToolUse {
  name: string;
  toolUseId: string;
  input: Record<string, any>;
}

export class ChatBot {
  private static MAX_MESSAGES = 7;
  private modelId: string;
  private systemPrompt: string;

  constructor() {
    this.modelId = import.meta.env.VITE_BEDROCK_MODEL_ID;
    this.systemPrompt = this.buildSystemPrompt();
  }

  private buildSystemPrompt(): string {
    const toolPrompts = Object.values(tools).map((tool) => tool.systemPrompt);

    return `You are an AI assistant with access to helpful tools.

${toolPrompts.join("\n\n")}

Guidelines:
- Be helpful and accurate
- Explain what you're doing before using tools
- Show expressions and results clearly
- If a tool request fails, explain the issue
- Break down complex tasks into steps

Remember: Your goal is to provide helpful and accurate information while making effective use of available tools.`;
  }

  private async executeToolRequest(toolUse: ToolUse): Promise<any> {
    switch (toolUse.name) {
      case "math":
        return await mathTool.execute(toolUse.input);
      case "fetch_url":
        return await fetchTool.execute(toolUse.input);
      default:
        throw new Error(`Unknown tool: ${toolUse.name}`);
    }
  }

  public async generateResponse(messages: Message[]): Promise<string> {
    const truncatedMessages = this.truncateMessages(messages);

    try {
      const response: ConverseResponse = await postBedrock(
        this.modelId,
        truncatedMessages,
        this.systemPrompt
      );

      // Check for tool use first
      if (response.stopReason === "tool_use") {
        const toolUse = response.output?.message?.content?.find(
          (content) => content.toolUse
        )?.toolUse;

        if (toolUse) {
          // Add tool request to chat this doesn't make ay sense why wouldn't I just update the chat context and then generateResponse just takes the chat context and doesn't get passed it.
          chatContext.addAssistantMessage(
            `I need to use the ${
              toolUse.name
            } tool. Making request to: ${JSON.stringify(toolUse.input)}`
          );
          try {
            // Execute tool
            const toolResult = await this.executeToolRequest(
              toolUse as ToolUse
            );

            // Add tool result to chat
            chatContext.addUserMessage(
              `Tool ${toolUse.name} returned: ${JSON.stringify(toolResult)}`
            );

            truncatedMessages.push({
              role: "assistant",
              content: response.output?.message?.content || [],
            });

            const toolResultContent: ToolResultBlock = {
              toolUseId: toolUse.toolUseId,
              content: [
                {
                  text: JSON.stringify(toolResult),
                },
              ],
              status: "success",
            };

            truncatedMessages.push({
              role: "user",
              content: [
                {
                  toolResult: toolResultContent,
                },
              ],
            });

            // Continue conversation with tool result
            return this.generateResponse(truncatedMessages);
          } catch (error: any) {
            // Add error to chat
            // (todo handle this)

            chatContext.addUserMessage(
              `Tool execution failed: ${error.message}`
            );
            throw error;
          }
        }
      }

      // Extract regular text content
      const messageContent = response.output?.message?.content;
      if (!messageContent || messageContent.length === 0) {
        throw new Error("No content in response");
      }

      const textContent = messageContent.find((content) => content.text)?.text;
      if (!textContent) {
        throw new Error("No text content found in response");
      }

      return textContent;
    } catch (error) {
      console.error("Response generation failed:", error);
      throw error;
    }
  }
  // need to find a better way to do this.
  // There may be issues here with out of order or user message not first.
  private truncateMessages(messages: Message[]): Message[] {
    return messages;
    // return messages.slice(-ChatBot.MAX_MESSAGES);
  }
}

export const chatBot = new ChatBot();
