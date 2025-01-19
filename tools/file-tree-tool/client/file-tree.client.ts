// tools/file-tree-tool/client/file-tree.client.ts
import { ClientTool } from "../../client/tool.interface";
import { FileTreeInput, FileTreeResponse } from "../types";

export const fileTreeTool: ClientTool = {
  name: "file_tree",
  execute: async (input: FileTreeInput): Promise<FileTreeResponse> => {
    try {
      const response = await fetch("/api/tools/file-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(
          `File tree generation failed: ${await response.text()}`
        );
      }

      return await response.json();
    } catch (error: any) {
      console.error("File tree tool error:", error);
      return {
        tree: {
          name: ".",
          type: "directory",
          children: [],
        },
        error: true,
        message: error.message || "Failed to generate file tree",
        path: input.path || ".",
        totalFiles: 0,
        totalDirectories: 0,
      };
    }
  },
};
