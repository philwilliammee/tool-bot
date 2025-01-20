import { Message } from "@aws-sdk/client-bedrock-runtime";
import { clientRegistry } from "../../../tools/client/registry";
import { ToolUse } from "../../types/tool.types";

// src/stores/handlers/ToolHandler.ts
export class ToolHandler {
  async executeTool(toolUse: ToolUse): Promise<Message> {
    const tool = clientRegistry.getTool(toolUse.name);
    if (!tool) {
      throw new Error(`Unknown tool requested: ${toolUse.name}`);
    }

    try {
      const result = await tool.execute(toolUse.input);
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
