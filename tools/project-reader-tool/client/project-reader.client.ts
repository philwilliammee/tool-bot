// tools/project-reader-tool/client/project-reader.client.ts
import { ClientTool } from "../../client/tool.interface";
import { ProjectReaderInput, ProjectReaderResponse } from "../types";

export const projectReaderTool: ClientTool = {
  name: "project_reader",
  execute: async (
    input: ProjectReaderInput
  ): Promise<ProjectReaderResponse> => {
    try {
      const response = await fetch("/api/tools/project-reader", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...input,
          // Ensure safe defaults if not provided
          maxFiles: input.maxFiles || 50,
          maxSize: input.maxSize || 1048576, // 1MB
          exclude: input.exclude || ["node_modules/**", ".git/**"],
        }),
      });

      if (!response.ok) {
        throw new Error(`Project reader failed: ${await response.text()}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error("Project reader tool error:", error);
      return {
        files: [],
        error: true,
        message: error.message || "Failed to read project files",
        totalFiles: 0,
        totalSize: 0,
        truncated: false,
      };
    }
  },
};
