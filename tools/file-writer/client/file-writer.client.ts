// tools/file-writer/client/file-writer.client.ts
import { ClientTool } from "../../client/tool.interface";
import { FileWriterInput, FileWriterResponse } from "../types";

export const fileWriterTool: ClientTool = {
  name: "file_writer",
  execute: async (input: FileWriterInput) => {
    try {
      const response = await fetch("/api/tools/file-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(
          `File write operation failed: ${await response.text()}`
        );
      }

      return await response.json();
    } catch (error: any) {
      console.error("File writer tool error:", error);
      return {
        success: false,
        error: error.message || "Failed to write file",
        path: input.path,
      };
    }
  },
};
