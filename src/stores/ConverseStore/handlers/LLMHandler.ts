import { Message } from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended } from "../../../app.types";
import { converseAgentConfig } from "../../../agents/converseAgent";

export interface StreamCallbacks {
  onChunk?: (chunk: any) => void;
  onComplete?: (finalMessage?: MessageExtended) => void;
  onError?: (error: any) => void;
}

export class LLMHandler {
  private currentController: AbortController | null = null;
  private defaultModelId = import.meta.env.VITE_DEFAULT_MODEL_ID;
  private accumulatedContent: any[] = [];

  // Method to interrupt the current stream
  public interruptStream(): boolean {
    if (this.currentController) {
      this.currentController.abort();
      this.currentController = null;
      return true;
    }
    return false;
  }

  public async callLLMStream(
    messages: Message[],
    callbacks: StreamCallbacks,
    enabledTools?: string[],
    modelId?: string
  ): Promise<Message> {
    // Reset accumulated content at the start of a new stream
    this.accumulatedContent = [];

    // Create a new AbortController for this stream
    this.currentController = new AbortController();
    const signal = this.currentController.signal;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: modelId || this.defaultModelId,
          messages,
          enabledTools,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Your existing streaming implementation here
      const reader = response.body!.getReader();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert the chunk to text and process it
        const chunk = new TextDecoder().decode(value);
        const lines = (buffer + chunk).split("\n");
        buffer = lines[lines.length - 1];

        // Process complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line) {
            try {
              const data = JSON.parse(line);

              // Handle text content accumulation
              if (data.contentBlockDelta?.delta?.text) {
                const textDelta = data.contentBlockDelta.delta.text;
                if (this.accumulatedContent.length === 0 || !this.accumulatedContent[this.accumulatedContent.length - 1].text) {
                  this.accumulatedContent.push({ text: textDelta });
                } else {
                  this.accumulatedContent[this.accumulatedContent.length - 1].text += textDelta;
                }
              }

              callbacks.onChunk?.(data);
            } catch (e) {
              console.warn("Failed to parse chunk:", line);
            }
          }
        }
      }

      // Process any remaining data in the buffer
      if (buffer) {
        try {
          const data = JSON.parse(buffer);
          if (data.contentBlockDelta?.delta?.text) {
            const textDelta = data.contentBlockDelta.delta.text;
            if (this.accumulatedContent.length === 0 || !this.accumulatedContent[this.accumulatedContent.length - 1].text) {
              this.accumulatedContent.push({ text: textDelta });
            } else {
              this.accumulatedContent[this.accumulatedContent.length - 1].text += textDelta;
            }
          }
          callbacks.onChunk?.(data);
        } catch (e) {
          console.warn("Failed to parse final chunk:", buffer);
        }
      }

      // Return a success message with accumulated content
      const finalMessage: Message = {
        role: "assistant",
        content: this.accumulatedContent.length > 0 ? this.accumulatedContent : [{ text: "Stream completed successfully" }],
      };
      callbacks.onComplete?.();
      return finalMessage;

    } catch (error: unknown) {
      // Handle interruption
      if (
        error instanceof Error && (
          error.name === "AbortError" ||
          error.message?.includes("interrupted")
        )
      ) {
        console.log("Stream interrupted by user");

        const interruptedMessage: MessageExtended = {
          id: `interrupted_${Date.now()}`,
          role: "assistant",
          content: this.accumulatedContent.length > 0
            ? [...this.accumulatedContent, { text: "\n\n[Message generation interrupted]" }]
            : [{ text: "Message generation was interrupted before any content was generated." }],
          metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            interrupted: true,
            isStreaming: false
          }
        };

        callbacks.onComplete?.(interruptedMessage);
        return interruptedMessage;
      }

      // Handle other errors
      console.error("Stream error:", error);
      callbacks.onError?.(error);
      throw error;
    } finally {
      this.currentController = null;
      this.accumulatedContent = [];
    }
  }

  public async invoke(
    messages: Message[],
    systemPrompt: string,
    enabledTools?: string[],
    modelId?: string
  ): Promise<Message> {
    try {
      const response = await fetch("/api/ai/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: modelId || this.defaultModelId,
          messages,
          systemPrompt,
          enabledTools,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();

      if (result.output?.message) {
        return result.output.message;
      }

      throw new Error("Invalid response format from /api/ai/invoke");
    } catch (error) {
      console.error("Invoke API error:", error);
      throw error;
    }
  }
}
