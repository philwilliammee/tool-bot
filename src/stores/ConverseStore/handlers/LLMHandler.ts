import { Message, ConverseStreamOutput } from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended } from "../../../app.types";

export interface StreamCallbacks {
  onStart?: () => void;
  onChunk?: (chunk: ConverseStreamOutput) => void;
  onComplete?: (fullMessage: Message) => void;
  onError?: (error: any) => void;
}

export class LLMHandler {
  private baseSystemPrompt = "You are a helpful assistant with tools.";
  private modelId = import.meta.env.VITE_BEDROCK_MODEL_ID;

  async callLLMStream(
    messages: MessageExtended[],
    callbacks: StreamCallbacks
  ): Promise<Message> {
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelId: this.modelId,
          messages,
          systemPrompt: this.baseSystemPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      let accumulatedContent: any[] = [];
      let decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Append new data to buffer and split by newlines
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Process all complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line) {
            try {
              const chunk = JSON.parse(line) as ConverseStreamOutput;

              // Handle different types of chunks
              if (chunk.messageStart) {
                callbacks.onStart?.();
              }

              if (chunk.contentBlockDelta?.delta?.text) {
                accumulatedContent.push({
                  text: chunk.contentBlockDelta.delta.text,
                });
                callbacks.onChunk?.(chunk);
              }

              if (chunk.contentBlockDelta?.delta?.toolUse) {
                accumulatedContent.push({
                  toolUse: chunk.contentBlockDelta.delta.toolUse,
                });
                callbacks.onChunk?.(chunk);
              }

              // Handle any errors in the stream
              if (
                chunk.internalServerException ||
                chunk.modelStreamErrorException ||
                chunk.validationException ||
                chunk.throttlingException ||
                chunk.serviceUnavailableException
              ) {
                const error =
                  chunk.internalServerException ||
                  chunk.modelStreamErrorException ||
                  chunk.validationException ||
                  chunk.throttlingException ||
                  chunk.serviceUnavailableException;
                callbacks.onError?.(error);
                throw new Error(error.message);
              }

              if (chunk.messageStop) {
                const finalMessage: Message = {
                  role: "assistant",
                  content: accumulatedContent,
                };
                callbacks.onComplete?.(finalMessage);
                return finalMessage;
              }
            } catch (e) {
              console.error("Error parsing chunk:", e, line);
              callbacks.onError?.(e);
            }
          }
        }
        // Keep the last partial line in the buffer
        buffer = lines[lines.length - 1];
      }

      // If we get here without a messageStop, something went wrong
      throw new Error("Stream ended without messageStop");
    } catch (error) {
      console.error("LLM stream call failed:", error);
      callbacks.onError?.(error);
      throw error;
    }
  }

  // Keep the old method for backwards compatibility
  async callLLM(messages: MessageExtended[]): Promise<Message> {
    return this.callLLMStream(messages, {});
  }
}
