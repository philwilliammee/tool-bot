import { clientRegistry } from "./../../../../tools/registry.client";
import { Message, ToolResultStatus } from "@aws-sdk/client-bedrock-runtime";
import { ToolUse } from "../../../app.types";
import { store } from "../../../stores/AppStore";

/**
 * Handles the execution and interruption of tools in the application.
 * Manages active tools and their associated abort controllers.
 */
export class ToolHandler {
  /** Maps tool IDs to their abort controllers for interrupt management */
  private activeTools: Record<string, AbortController> = {};

  private cleanCDATA(content: string): string {
    if (content.includes("CDATA[")) {
      return content.replace(/<!\[CDATA\[(.*?)\]\]>/s, "$1");
    }
    return content;
  }

  /**
   * Interrupts a specific tool execution by its ID.
   * Updates UI state and cleans up resources.
   *
   * @param toolUseId - The unique identifier of the tool execution to interrupt
   * @returns boolean - True if the tool was found and interrupted, false otherwise
   */
  public interruptTool(toolUseId: string): boolean {
    const controller = this.activeTools[toolUseId];
    if (controller) {
      controller.abort();
      delete this.activeTools[toolUseId];
      // Update UI state
      if (store.currentToolId.value === toolUseId) {
        store.setCurrentToolId(null);
      }
      return true;
    }
    return false;
  }

  /**
   * Interrupts all currently running tool executions.
   * Updates UI state and cleans up resources.
   *
   * @returns boolean - True if any tools were interrupted, false if no tools were running
   */
  public interruptAllTools(): boolean {
    const toolIds = Object.keys(this.activeTools);
    if (toolIds.length === 0) return false;

    toolIds.forEach(id => {
      this.activeTools[id].abort();
      delete this.activeTools[id];
    });
    // Update UI state
    store.setCurrentToolId(null);
    return true;
  }

  /**
   * Executes a tool with the given parameters.
   * Manages abort controller lifecycle and handles interruptions.
   *
   * @param toolUse - The tool use configuration including name, ID, and input
   * @returns Promise<Message> - The result of the tool execution
   * @throws Error if tool execution fails or is interrupted
   */
  async executeTool(toolUse: ToolUse): Promise<Message> {
    const tool = clientRegistry.getTool(toolUse.name);
    if (!tool) {
      throw new Error(`Unknown tool requested: ${toolUse.name}`);
    }

    // Create a new AbortController for this tool execution
    const controller = new AbortController();
    this.activeTools[toolUse.toolUseId] = controller;

    try {
      // Clean CDATA from HTML input if present
      if (toolUse.name === "html" && toolUse.input.html) {
        toolUse.input.html = this.cleanCDATA(toolUse.input.html);
      }

      // Add abort signal to tool input
      const toolInput = {
        ...toolUse.input,
        signal: controller.signal
      };

      const result = await tool.execute(toolInput);

      // If this is an HTML tool execution, switch to preview tab
      if (toolUse.name === "html") {
        console.log("HTML tool executed, switching to preview tab");
        store.setHtmlContentView();
      }

      // Clean up the controller after successful execution
      delete this.activeTools[toolUse.toolUseId];

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
      // Clean up the controller after execution failure
      delete this.activeTools[toolUse.toolUseId];

      // Handle abort errors specifically
      if (error.name === "AbortError") {
        return {
          role: "user",
          content: [
            {
              toolResult: {
                toolUseId: toolUse.toolUseId,
                content: [{ text: "Tool execution interrupted" }],
                status: ToolResultStatus.ERROR,
              },
            },
          ],
        };
      }

      return {
        role: "user",
        content: [
          {
            toolResult: {
              toolUseId: toolUse.toolUseId,
              content: [{ text: `Tool execution failed: ${error.message}` }],
              status: ToolResultStatus.ERROR,
            },
          },
        ],
      };
    }
  }
}
