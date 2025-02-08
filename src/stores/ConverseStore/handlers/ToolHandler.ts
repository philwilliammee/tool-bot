import { clientRegistry } from "./../../../../tools/client/registry";
import { Message } from "@aws-sdk/client-bedrock-runtime";
import { ToolUse } from "../../../app.types";

// src/stores/handlers/ToolHandler.ts
export class ToolHandler {
  // Helper function to clean CDATA wrapper
  private cleanCDATA(content: string): string {
    if (content.includes("CDATA[")) {
      return content.replace(/<!\[CDATA\[(.*?)\]\]>/s, "$1");
    }
    return content;
  }

  // In ToolHandler.ts
  async executeTool(toolUse: ToolUse): Promise<Message> {
    const tool = clientRegistry.getTool(toolUse.name);
    if (!tool) {
      throw new Error(`Unknown tool requested: ${toolUse.name}`);
    }

    try {
      const result = await tool.execute(toolUse.input);

      // Clean up CDATA if present in the result
      if (typeof result === "object" && result.html) {
        result.html = this.cleanCDATA(result.html);
      }

      return {
        role: "user",
        content: [
          {
            toolResult: {
              toolUseId: toolUse.toolUseId,
              content: [{ text: JSON.stringify(result) }],
              status: "success",
            },
          },
        ],
      };
    } catch (error: any) {
      return {
        role: "user",
        content: [{ text: `Tool execution failed: ${error.message}` }],
      };
    }
  }
}
