// tools/x-tool/client/x.client.ts
import { ClientTool } from "../../client/tool.interface.js";
import { XInput, XOutput } from "../types.js";

export const xTool: ClientTool = {
  name: "x",
  execute: async (input: XInput): Promise<XOutput> => {
    try {
      const response = await fetch("/api/tools/x", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`X operation failed: ${await response.text()}`);
      }

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to execute X operation",
      };
    }
  },
};
