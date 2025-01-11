import { Message, ConverseResponse } from "@aws-sdk/client-bedrock-runtime";
import { postBedrock } from "./apiClient";
import { designAssistantSystemPrompt } from "./design-assistant.system";
import { chatContext } from "./chat-context";

interface ToolUse {
  name: string;
  toolUseId: string;
  input: Record<string, any>;
}

export class ChatBot {
  private static MAX_MESSAGES = 5;
  private modelId: string;
  private systemPrompt: string;

  constructor() {
    this.modelId = import.meta.env.VITE_BEDROCK_MODEL_ID;
    this.systemPrompt = designAssistantSystemPrompt;
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
          // Add tool request to chat
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
              `Tool ${toolUse.name} returned: ${JSON.stringify(
                toolResult,
                null,
                2
              )}`
            );

            truncatedMessages.push({
              role: "assistant",
              content: response.output?.message?.content || [],
            });

            truncatedMessages.push({
              role: "user",
              content: [
                {
                  toolResult: {
                    toolUseId: toolUse.toolUseId,
                    content: [{ json: toolResult }],
                    status: toolResult.error ? "error" : "success",
                  },
                },
              ],
            });

            // Continue conversation with tool result
            return this.generateResponse(truncatedMessages);
          } catch (error: any) {
            // Add error to chat
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

  private async executeToolRequest(toolUse: ToolUse): Promise<any> {
    switch (toolUse.name) {
      case "fetch_url": {
        const response = await fetch("/api/tools/fetch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(toolUse.input),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Tool execution failed: ${error}`);
        }

        return await response.json();
      }
      default:
        throw new Error(`Unknown tool: ${toolUse.name}`);
    }
  }

  private truncateMessages(messages: Message[]): Message[] {
    return messages.slice(-ChatBot.MAX_MESSAGES);
  }
}

export const chatBot = new ChatBot();
