import { Message, ConverseStreamOutput } from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended } from "../../../app.types";
import { converseAgentConfig } from "../../../agents/converseAgent";
import { signal } from "@preact/signals-core";

export interface StreamCallbacks {
  onStart?: () => void;
  onChunk?: (chunk: ConverseStreamOutput) => void;
  onComplete?: (fullMessage: Message) => void;
  onError?: (error: any) => void;
}

export class LLMHandler {
  // Rename to make it clear this is a fallback
  private defaultModelId = import.meta.env.VITE_DEFAULT_MODEL_ID;

  // Track the current stream's AbortController
  private currentStreamController = signal<AbortController | null>(null);

  // Method to interrupt the current stream
  public interruptStream(): boolean {
    const controller = this.currentStreamController.value;
    if (controller) {
      controller.abort();
      this.currentStreamController.value = null;
      return true;
    }
    return false;
  }

  public async callLLMStream(
    messages: MessageExtended[],
    callbacks: StreamCallbacks,
    enabledTools?: string[],
    modelId?: string
  ): Promise<Message> {
    // Create a new AbortController for this stream
    const controller = new AbortController();
    this.currentStreamController.value = controller;

    // Move the declaration outside the try block
    const accumulatedContent: any[] = [];

    try {
      // Ensure we have a valid model ID
      if (!modelId) {
        console.warn(
          "No model ID provided, using default model:",
          this.defaultModelId
        );
      }

      // Notify that we're starting to stream
      if (callbacks.onStart) {
        callbacks.onStart();
      }

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: modelId || this.defaultModelId,
          messages,
          systemPrompt: converseAgentConfig.systemPrompt,
          enabledTools,
        }),
        signal: controller.signal, // Add abort signal to the fetch request
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body from /api/ai");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Stream ended
          const finalMessage: Message = {
            role: "assistant",
            content: accumulatedContent,
          };

          // Notify that we've completed the stream
          if (callbacks.onComplete) {
            callbacks.onComplete(finalMessage);
          }

          return finalMessage;
        }

        // Decode partial chunk
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Process all complete lines except the last partial
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          let chunk: ConverseStreamOutput;
          try {
            chunk = JSON.parse(line);
          } catch (e) {
            callbacks.onError?.(e);
            continue;
          }

          // Always pass chunk up (so the caller sees contentBlockStart, etc.)
          callbacks.onChunk?.(chunk);

          // Check for text deltas
          if (chunk.contentBlockDelta?.delta?.text) {
            accumulatedContent.push({
              text: chunk.contentBlockDelta.delta.text,
            });
          }

          // Check for toolUse partial
          if (chunk.contentBlockDelta?.delta?.toolUse) {
            accumulatedContent.push({
              toolUse: chunk.contentBlockDelta.delta.toolUse,
            });
          }

          // Check for any error objects
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

          // If there's a messageStop
          if (chunk.messageStop) {
            // If it's tool_use, do NOT finalize (the caller handles it).
            if (chunk.messageStop.stopReason !== "tool_use") {
              // For other stops: finalize.
              const finalMessage: Message = {
                role: "assistant",
                content: accumulatedContent,
              };
              callbacks.onComplete?.(finalMessage);
              return finalMessage;
            }
          }
        }

        // Keep trailing partial line
        buffer = lines[lines.length - 1];
      }
    } catch (error: any) {
      // Check if this was an interruption
      const isInterrupted =
        error.name === "AbortError" ||
        error.message?.includes("aborted") ||
        error.message?.includes("interrupted");

      if (isInterrupted) {
        console.log("Stream interrupted by user");

        // Create a message with the partial content
        const interruptedMessage: MessageExtended = {
          id: `interrupted_${Date.now()}`,
          role: "assistant",
          content:
            accumulatedContent.length > 0
              ? accumulatedContent
              : [{ text: "Message generation interrupted." }],
          // Add metadata to indicate this was interrupted
          metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            interrupted: true,
          },
        };

        // Notify of the interruption
        callbacks.onError?.(error);

        return interruptedMessage;
      } else {
        // For other errors, pass through to the error handler
        callbacks.onError?.(error);
        throw error;
      }
    } finally {
      // Always clean up the controller reference
      this.currentStreamController.value = null;
    }
  }

  // Update the invoke method to also accept a modelId parameter
  public async invoke(
    messages: Partial<MessageExtended[]> | Message[],
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
          systemPrompt: systemPrompt,
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

      // Extract the message from the ConverseResponse structure
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