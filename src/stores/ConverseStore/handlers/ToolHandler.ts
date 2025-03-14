import { clientRegistry } from "./../../../../tools/registry.client";
import { Message, ToolResultStatus } from "@aws-sdk/client-bedrock-runtime";
import { ToolUse } from "../../../app.types";
import { store } from "../../../stores/AppStore";

export class ToolHandler {
  private cleanCDATA(content: string): string {
    if (content.includes("CDATA[")) {
      return content.replace(/<!\[CDATA\[(.*?)\]\]>/s, "$1");
    }
    return content;
  }

  async executeTool(toolUse: ToolUse): Promise<Message> {
    const tool = clientRegistry.getTool(toolUse.name);
    if (!tool) {
      throw new Error(`Unknown tool requested: ${toolUse.name}`);
    }

    try {
      // Clean CDATA from HTML input if present
      if (toolUse.name === "html" && toolUse.input.html) {
        toolUse.input.html = this.cleanCDATA(toolUse.input.html);
      }

      const result = await tool.execute(toolUse.input);

      // If this is an HTML tool execution, switch to preview tab
      if (toolUse.name === "html") {
        console.log("HTML tool executed, switching to preview tab");
        store.setHtmlContentView();
      }

      // Clean up CDATA if present in the result (keeping this just in case)
      // if (typeof result === "object" && result.html) {
      //   result.html = this.cleanCDATA(result.html);
      // }

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
      return {
        role: "user",
        // content: [{ text: `Tool execution failed: ${error.message}` }],
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
