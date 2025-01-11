// design-assistant-bot.ts
import { Message } from "@aws-sdk/client-bedrock-runtime";
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

  public async generateWebDesign(messages: Message[]) {
    const truncatedMessages = this.truncateMessages(messages);

    try {
      const response = await postBedrock(
        this.modelId,
        truncatedMessages,
        this.systemPrompt
      );

      return response.parsed || response.raw;
    } catch (error) {
      console.error("Design generation failed:", error);
      throw error;
    }
  }

  private truncateMessages(messages: Message[]): Message[] {
    return messages.slice(-DesignAssistantBot.MAX_MESSAGES);
  }
}

export const designAssistantInstance = new DesignAssistantBot();
