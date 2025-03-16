import { clientRegistry } from "./../../../../tools/registry.client";
import {
  Message,
  ToolResultStatus,
  ContentBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { ToolUse } from "../../../app.types";
import { store } from "../../../stores/AppStore";
import { signal } from "@preact/signals-core";

/**
 * Type definition for a tool result message that conforms to Bedrock's expected format
 */
type ToolResultMessage = Message & {
  role: "user";
  content: ContentBlock.ToolResultMember[];
};

export class ToolHandler {
  // Signal to track the currently running tool execution
  private currentToolExecution = signal<{
    toolUseId: string;
    controller: AbortController;
  } | null>(null);

  private cleanCDATA(content: string): string {
    if (content.includes("CDATA[")) {
      return content.replace(/<!\\[CDATA\\[(.*?)\\]\\]>/s, "$1");
    }
    return content;
  }

  // Interrupt the current tool execution
  public interruptCurrentTool(): boolean {
    const currentExecution = this.currentToolExecution.value;
    if (currentExecution) {
      console.log(`Interrupting tool execution: ${currentExecution.toolUseId}`);
      currentExecution.controller.abort();
      this.currentToolExecution.value = null;

      // Update the AppStore
      store.setToolRunning(false);

      return true;
    }
    return false;
  }

  async executeTool(toolUse: ToolUse): Promise<ToolResultMessage> {
    const tool = clientRegistry.getTool(toolUse.name);
    if (!tool) {
      throw new Error(`Unknown tool requested: ${toolUse.name}`);
    }

    try {
      // Create an AbortController for this tool execution
      const controller = new AbortController();

      // Set the current tool execution
      this.currentToolExecution.value = {
        toolUseId: toolUse.toolUseId,
        controller,
      };

      // Update the AppStore with tool running status
      store.setToolRunning(true, toolUse.toolUseId);

      // Clean CDATA from HTML input if present
      if (toolUse.name === "html" && toolUse.input.html) {
        toolUse.input.html = this.cleanCDATA(toolUse.input.html);
      }

      // Add the abort signal to the tool input
      const inputWithSignal = {
        ...toolUse.input,
        signal: controller.signal,
      };

      // Execute the tool with the abort signal
      const result = await tool.execute(inputWithSignal);

      // If this is an HTML tool execution, switch to preview tab
      if (toolUse.name === "html") {
        console.log("HTML tool executed, switching to preview tab");
        store.setHtmlContentView();
      }

      // Return the result in the correct format for Bedrock
      return {
        role: "user",
        content: [
          {
            toolResult: {
              toolUseId: toolUse.toolUseId,
              content: [{ text: JSON.stringify(result) }],
              status: ToolResultStatus.SUCCESS,
            },
          },
        ],
      };
    } catch (error: any) {
      console.error(`Tool execution failed: ${error.message}`);

      // Check if this was an interruption
      const isInterrupted =
        error.name === "AbortError" ||
        error.message?.includes("aborted") ||
        error.message?.includes("interrupted");

      // Return appropriate message
      const message: ToolResultMessage = {
        role: "user",
        content: [
          {
            toolResult: {
              toolUseId: toolUse.toolUseId,
              content: [
                {
                  text: isInterrupted
                    ? "Tool execution was interrupted by user"
                    : `Tool execution failed: ${error.message}`,
                },
              ],
              status: ToolResultStatus.ERROR,
            },
          },
        ],
      };

      return message;
    } finally {
      // Always clean up and update state when done
      this.currentToolExecution.value = null;

      // Update the AppStore
      store.setToolRunning(false);
    }
  }
}
