// src/stores/handlers/LLMHandler.ts
import { Message } from "@aws-sdk/client-bedrock-runtime";
import { postBedrock } from "../../apiClient";
import { MessageExtended } from "../../types/tool.types";

export class LLMHandler {
  constructor(private modelId: string, private systemPrompt: string) {}

  async callLLM(messages: MessageExtended[]): Promise<Message> {
    try {
      const response = await postBedrock(
        this.modelId,
        messages,
        this.systemPrompt
      );

      if (!response.output?.message?.content?.length) {
        throw new Error("No content in LLM response");
      }

      return {
        role: "assistant",
        content: response.output.message.content,
      };
    } catch (error) {
      console.error("LLM call failed:", error);
      throw error;
    }
  }
}
