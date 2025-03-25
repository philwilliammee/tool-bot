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

    // Track the accumulated message content
    const accumulatedContent: any[] = [];

    // Track the current tool use being accumulated
    let currentToolUse: any = null;
    let currentToolUseIndex = -1;

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

      // Use oboe.js for streaming JSON parsing
      return new Promise((resolve, reject) => {
        // Create a stream from the response
        const stream = response.body;
        if (!stream) {
          reject(new Error("No response body from /api/ai"));
          return;
        }

        let buffer = '';
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        // Process the stream
        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                // Process any remaining data in the buffer
                const lines = buffer.split('\n');
                for (const line of lines) {
                  if (line.trim()) {
                    processLine(line);
                  }
                }

                // Create the final message
                const finalMessage: Message = {
                  role: "assistant",
                  content: accumulatedContent,
                };

                callbacks.onComplete?.(finalMessage);
                resolve(finalMessage);
                return;
              }

              // Add new data to the buffer
              buffer += decoder.decode(value, { stream: true });

              // Process complete lines in the buffer
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep the last potentially incomplete line

              for (const line of lines) {
                if (line.trim()) {
                  processLine(line);
                }
              }
            }
          } catch (error: any) {
            // Handle interruption
            if (
              error.name === "AbortError" ||
              error.message?.includes("aborted") ||
              error.message?.includes("interrupted")
            ) {
              console.log("Stream interrupted by user");

              // Create a message with the partial content
              const interruptedMessage: MessageExtended = {
                id: `interrupted_${Date.now()}`,
                role: "assistant",
                content:
                  accumulatedContent.length > 0
                    ? accumulatedContent
                    : [{ text: "Message generation interrupted." }],
                metadata: {
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  interrupted: true,
                },
              };

              callbacks.onError?.(error);
              resolve(interruptedMessage);
            } else {
              callbacks.onError?.(error);
              reject(error);
            }
          }
        };

        // Helper function to process a single line of JSON
        const processLine = (line: string) => {
          if (!line.trim()) return;

          let chunk: ConverseStreamOutput;
          try {
            chunk = JSON.parse(line);
          } catch (error) {
            callbacks.onError?.(error);
            console.error('JSON parse error:', error, 'line:', line);
            return;
          }

          // Pass the chunk to the callback
          callbacks.onChunk?.(chunk);

          // Process message start
          if (chunk.messageStart) {
            // Reset accumulated content for a new message
            accumulatedContent.length = 0;
            currentToolUse = null;
            currentToolUseIndex = -1;
          }

          // Process text content
          if (chunk.contentBlockDelta?.delta?.text) {
            const textDelta = chunk.contentBlockDelta.delta.text;

            // If this is a new text block, add it to accumulated content
            if (accumulatedContent.length === 0 || !accumulatedContent[accumulatedContent.length - 1].text) {
              accumulatedContent.push({
                text: textDelta,
              });
            } else {
              // Otherwise, append to the existing text block
              accumulatedContent[accumulatedContent.length - 1].text += textDelta;
            }
          }

          // Handle toolUse start
          if (chunk.contentBlockStart?.start?.toolUse) {
            // Start a new tool use
            currentToolUse = { ...chunk.contentBlockStart.start.toolUse, input: "" };
            accumulatedContent.push({ toolUse: currentToolUse });
            currentToolUseIndex = accumulatedContent.length - 1;
          }

          // Handle toolUse input chunks
          if (chunk.contentBlockDelta?.delta?.toolUse?.input !== undefined) {
            const inputChunk = chunk.contentBlockDelta.delta.toolUse.input;

            // If we have a current tool use, append to its input
            if (currentToolUse && currentToolUseIndex >= 0) {
              currentToolUse.input += inputChunk;

              // Update the reference in accumulatedContent
              accumulatedContent[currentToolUseIndex].toolUse = currentToolUse;
            } else {
              // If we don't have a current tool use, this is a new one
              currentToolUse = {
                ...chunk.contentBlockDelta.delta.toolUse,
                input: inputChunk
              };
              accumulatedContent.push({ toolUse: currentToolUse });
              currentToolUseIndex = accumulatedContent.length - 1;
            }
          }

          // Handle toolUse completion
          if (chunk.contentBlockStop && currentToolUseIndex >= 0) {
            // If the tool use input is supposed to be JSON, validate it before completing
            if (currentToolUse.input.startsWith('{')) {
              try {
                // Attempt to parse it as JSON to validate
                JSON.parse(currentToolUse.input);
              } catch (e) {
                // If we have invalid JSON upon completion, try to fix it
                console.warn('Invalid JSON in tool use input upon completion:', e);
                currentToolUse.input = this.fixInvalidJson(currentToolUse.input);
              }
            }

            // The tool use is complete, reset tracking
            currentToolUse = null;
            currentToolUseIndex = -1;
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
              resolve(finalMessage);
            }
          }
        };

        // Start processing the stream
        processStream();
      });
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

  /**
   * Simplified function to fix invalid JSON strings
   * Handles the common edge cases we've seen in our tool use inputs
   */
  private fixInvalidJson(str: string): string {
    // Skip empty strings or non-JSON-like strings
    if (!str || (!str.startsWith('{') && !str.startsWith('['))) {
      return str;
    }

    console.log('Fixing invalid JSON:', str);
    let fixedJson = str;

    try {
      // Special handling for file_writer and project_reader
      if (fixedJson.includes('"path"') && (fixedJson.includes('"content"') || fixedJson.includes('"mode"'))) {
        // Extract path
        const pathMatch = /\"path\"\s*:\s*\"([^"]*)/.exec(fixedJson);
        const path = pathMatch ? pathMatch[1] : '';

        // Extract content or mode
        if (fixedJson.includes('"content"')) {
          const contentMatch = /\"content\"\s*:\s*\"([^"]*)/.exec(fixedJson);
          const content = contentMatch ? contentMatch[1] : '';
          return `{"path": "${path}", "content": "${content}"}`;
        } else if (fixedJson.includes('"mode"')) {
          const modeMatch = /\"mode\"\s*:\s*\"([^"]*)/.exec(fixedJson);
          const mode = modeMatch ? modeMatch[1] : 'single';
          return `{"mode": "${mode}", "path": "${path}"}`;
        }
      }

      // Add missing quotes
      if ((fixedJson.match(/"/g) || []).length % 2 !== 0) {
        fixedJson += '"';
      }

      // Add missing closing braces/brackets
      const openBraces = (fixedJson.match(/\{/g) || []).length;
      const closeBraces = (fixedJson.match(/\}/g) || []).length;
      if (openBraces > closeBraces) {
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixedJson += '}';
        }
      }

      const openBrackets = (fixedJson.match(/\[/g) || []).length;
      const closeBrackets = (fixedJson.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) {
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          fixedJson += ']';
        }
      }

      // Remove trailing commas
      fixedJson = fixedJson.replace(/,\s*$/g, '');
      fixedJson = fixedJson.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');

      // Validate the result
      JSON.parse(fixedJson);
      return fixedJson;
    } catch (e) {
      console.error('Failed to fix JSON:', e);
      // Return the best attempt even if it fails validation
      return fixedJson;
    }
  }

  /**
   * Helper method to clean a line of potential HTML or other non-JSON content
   * Returns null if the line doesn't contain valid JSON
   */
  private cleanJsonLine(line: string): string | null {
    // Skip empty lines
    if (!line || !line.trim()) {
      return null;
    }

    let cleanedLine = line.trim();

    // More careful HTML detection - only extract JSON if there are actual HTML tags
    // Avoid affecting URLs or URI components that might contain angle brackets
    const hasHtmlTags = /<\/?[a-z][\s\S]*?>/i.test(cleanedLine);

    if (hasHtmlTags) {
      console.warn('HTML content detected in response stream');

      // Try to extract JSON from within HTML
      const jsonMatch = cleanedLine.match(/(\{.*\})/);
      if (jsonMatch) {
        console.log('Extracted JSON from HTML-like content');
        cleanedLine = jsonMatch[1];
      } else {
        console.error('Unable to extract JSON from HTML content');
        return null;
      }
    }

    // Find the first valid JSON start character
    const firstValidChar = cleanedLine.search(/[\{\[]/);
    if (firstValidChar === -1) {
      // No JSON start character found
      return null;
    }

    // Remove anything before the first JSON start character
    if (firstValidChar > 0) {
      // Be careful with URLs - don't remove parts of URLs or URI components
      // Only remove prefixes that are clearly not part of a URL or JSON
      const prefix = cleanedLine.substring(0, firstValidChar);
      if (!prefix.includes('://') && !prefix.includes('?') && !prefix.includes('&')) {
        console.warn('Removing non-JSON prefix:', prefix);
        cleanedLine = cleanedLine.substring(firstValidChar);
      }
    }

    // Find the last valid JSON end character
    const lastBraceIndex = cleanedLine.lastIndexOf('}');
    const lastBracketIndex = cleanedLine.lastIndexOf(']');
    const lastValidChar = Math.max(lastBraceIndex, lastBracketIndex);

    // Remove anything after the last valid JSON end character
    if (lastValidChar !== -1 && lastValidChar < cleanedLine.length - 1) {
      // Be careful with URLs - don't remove parts of URLs or URI components
      const suffix = cleanedLine.substring(lastValidChar + 1);
      if (!suffix.includes('://') && !suffix.includes('?') && !suffix.includes('&')) {
        console.warn('Removing non-JSON suffix:', suffix);
        cleanedLine = cleanedLine.substring(0, lastValidChar + 1);
      }
    }

    // Basic validation: check if this looks like JSON
    if (!(cleanedLine.startsWith('{') || cleanedLine.startsWith('['))) {
      return null;
    }

    return cleanedLine;
  }
}
