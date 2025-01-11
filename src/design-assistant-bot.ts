import { Message, ConverseResponse } from "@aws-sdk/client-bedrock-runtime";
import { postBedrock } from "./apiClient";
import { designAssistantSystemPrompt } from "./design-assistant.system";

export class DesignAssistantBot {
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

      // Extract the text content from the response
      const messageContent = response.output?.message?.content;
      if (!messageContent || messageContent.length === 0) {
        throw new Error("No content in response");
      }

      // Find the first text content block
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

  private truncateMessages(messages: Message[]): Message[] {
    return messages.slice(-DesignAssistantBot.MAX_MESSAGES);
  }
}

export const designAssistantInstance = new DesignAssistantBot();
