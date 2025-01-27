import { ClientTool } from "../../client/tool.interface";
import { OctokitInput, OctokitResponse } from "../types";

export const octokitTool: ClientTool = {
  name: "octokit",
  execute: async (input: OctokitInput): Promise<OctokitResponse> => {
    try {
      const response = await fetch("/api/tools/octokit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new Error(`GitHub API operation failed: ${await response.text()}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error("Octokit client error:", error);
      return {
        data: null,
        error: true,
        message: error.message || "Failed to execute GitHub API operation",
        status: error.status || 500
      };
    }
  }
};