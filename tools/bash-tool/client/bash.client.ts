// tools/bash_tool/client/bash.client.ts
import { ClientTool } from "../../client/tool.interface";
import { BashInput, BashOutput } from "../types";

export const bashTool: ClientTool = {
  name: "bash",
  execute: async (input: BashInput): Promise<BashOutput> => {
    try {
      const response = await fetch("/api/tools/bash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Bash execution failed: ${await response.text()}`);
      }

      return await response.json();
    } catch (error: any) {
      return {
        stdout: "",
        stderr: "",
        exitCode: 1,
        error: true,
        message: error.message || "Failed to execute command",
      };
    }
  },
};
