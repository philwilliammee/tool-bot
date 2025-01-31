import { Message } from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended } from "../../../app.types";
import { postMessage } from "../../../apiClient";

export class LLMHandler {
  private baseSystemPrompt = "You are a helpful assistant with tools.";
  private modelId = import.meta.env.VITE_BEDROCK_MODEL_ID;
  async callLLM(messages: MessageExtended[]): Promise<Message> {
    try {
      // Now just using base system prompt
      const response = await postMessage(
        this.modelId,
        messages,
        this.baseSystemPrompt
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
