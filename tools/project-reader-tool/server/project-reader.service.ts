// tools/project-reader-tool/server/project-reader.service.ts
import { ServerTool } from "../../server/tool.interface";
import { Request, Response } from "express";
import {
  ProjectReaderInput,
  ProjectReaderResponse,
  FileContent,
} from "../types";
import {
  PROJECT_READER_CONFIG,
  isPathSafe,
  isBinaryFile,
} from "./project-reader.types";
import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import { promisify } from "util";

const globPromise = promisify(glob);

class ProjectReaderService {
  private async readSingleFile(
    filePath: string,
    maxSize: number
  ): Promise<FileContent> {
    const stats = await fs.stat(filePath);

    if (stats.size > maxSize) {
      throw new Error(
        `File ${filePath} exceeds size limit of ${maxSize} bytes`
      );
    }

    if (isBinaryFile(filePath)) {
      throw new Error(`Binary file ${filePath} cannot be read`);
    }

    const content = await fs.readFile(filePath, "utf-8");

    return {
      path: filePath,
      content,
      size: stats.size,
      type: path.extname(filePath) || "text/plain",
      lastModified: stats.mtimeMs,
    };
  }

  private async findFiles(
    basePath: string,
    patterns: string[],
    exclude: string[]
  ): Promise<string[]> {
    const allFiles: string[] = [];

    for (const pattern of patterns) {
      const files = (await globPromise(pattern, {
        cwd: basePath,
        ignore: exclude,
        nodir: true,
        dot: true,
      })) as string[];

      allFiles.push(...files.map((f) => path.join(basePath, f)));
    }

    return [...new Set(allFiles)]; // Remove duplicates
  }

  async readFiles(input: ProjectReaderInput): Promise<ProjectReaderResponse> {
    const basePath = PROJECT_READER_CONFIG.ALLOWED_BASE_PATH;
    const requestedPath = path.join(basePath, input.path);

    if (!isPathSafe(requestedPath)) {
      throw new Error("Access to this path is not allowed");
    }

    const maxFiles = Math.min(
      input.maxFiles || PROJECT_READER_CONFIG.MAX_FILES_LIMIT,
      PROJECT_READER_CONFIG.MAX_FILES_LIMIT
    );

    const maxSize = Math.min(
      input.maxSize || PROJECT_READER_CONFIG.MAX_FILE_SIZE,
      PROJECT_READER_CONFIG.MAX_FILE_SIZE
    );

    const exclude = [
      ...PROJECT_READER_CONFIG.DEFAULT_EXCLUDES,
      ...(input.exclude || []),
    ];

    try {
      let filesToProcess: string[] = [];

      if (input.mode === "single") {
        filesToProcess = [requestedPath];
      } else {
        if (!input.patterns || input.patterns.length === 0) {
          throw new Error("Patterns are required for multi mode");
        }
        filesToProcess = await this.findFiles(
          requestedPath,
          input.patterns,
          exclude
        );
      }

      // Sort files for consistent ordering
      filesToProcess.sort();

      const results: FileContent[] = [];
      let totalSize = 0;
      let truncated = false;

      for (const file of filesToProcess.slice(0, maxFiles)) {
        try {
          const fileContent = await this.readSingleFile(file, maxSize);

          // Check total size limit
          if (
            totalSize + fileContent.size >
            PROJECT_READER_CONFIG.MAX_TOTAL_SIZE
          ) {
            truncated = true;
            break;
          }

          totalSize += fileContent.size;
          results.push(fileContent);
        } catch (error) {
          console.warn(`Skipping file ${file}:`, error);
          continue;
        }
      }

      if (filesToProcess.length > maxFiles) {
        truncated = true;
      }

      return {
        files: results,
        totalFiles: results.length,
        totalSize,
        truncated,
      };
    } catch (error: any) {
      throw new Error(`Failed to read files: ${error.message}`);
    }
  }
}

const projectReaderService = new ProjectReaderService();

export const projectReaderTool: ServerTool = {
  name: "project_reader",
  route: "/project-reader",
  handler: async (req: Request, res: Response): Promise<void> => {
    try {
      const input: ProjectReaderInput = req.body;
      const result = await projectReaderService.readFiles(input);
      res.json(result);
    } catch (error: any) {
      console.error("Project reader error:", error);
      res.status(500).json({
        files: [],
        error: true,
        message: error.message || "Failed to read project files",
        totalFiles: 0,
        totalSize: 0,
        truncated: false,
      });
    }
  },
};
