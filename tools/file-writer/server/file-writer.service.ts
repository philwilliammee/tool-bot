// tools/file-writer/server/file-writer.service.ts
import { ServerTool } from "../../server/tool.interface.js";
import { Request, Response } from "express";
import { FileWriterInput } from "../types.js";
import * as fs from "fs/promises";
import * as path from "path";
import { FILE_WRITER_CONFIG, isPathSafe } from "./file-writer.types.js";

class FileWriterService {
  private async ensureDirectoryExists(filePath: string) {
    const directory = path.dirname(filePath);
    try {
      await fs.access(directory);
    } catch {
      await fs.mkdir(directory, { recursive: true });
    }
  }

  async writeFile(input: FileWriterInput) {
    const basePath = FILE_WRITER_CONFIG.ALLOWED_BASE_PATH;
    const requestedPath = path.join(basePath, input.path);

    if (!isPathSafe(requestedPath)) {
      throw new Error("Access to this path is not allowed");
    }

    // Validate file extension if configured
    if (FILE_WRITER_CONFIG.ALLOWED_EXTENSIONS.length > 0) {
      const ext = path.extname(requestedPath).toLowerCase();
      if (!FILE_WRITER_CONFIG.ALLOWED_EXTENSIONS.includes(ext)) {
        throw new Error(`File extension ${ext} is not allowed`);
      }
    }

    // Ensure the file size is within limits
    const contentSize = Buffer.byteLength(input.content, "utf8");
    if (contentSize > FILE_WRITER_CONFIG.MAX_FILE_SIZE) {
      throw new Error("File size exceeds maximum allowed size");
    }

    await this.ensureDirectoryExists(requestedPath);
    await fs.writeFile(requestedPath, input.content, "utf8");

    return {
      success: true,
      path: path.relative(basePath, requestedPath),
    };
  }
}

const fileWriterService = new FileWriterService();

export const fileWriterTool: ServerTool = {
  name: "file_writer",
  route: "/file-writer",
  handler: async (req: Request, res: Response) => {
    try {
      const input: FileWriterInput = req.body;
      const result = await fileWriterService.writeFile(input);
      res.json(result);
    } catch (error: any) {
      console.error("File writer error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to write file",
        path: req.body.path || ".",
      });
    }
  },
};
