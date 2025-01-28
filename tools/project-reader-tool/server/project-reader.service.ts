// tools/project-reader-tool/server/project-reader.service.ts
import { ServerTool } from "../../server/tool.interface.js";
import { Request, Response } from "express";
import {
  ProjectReaderInput,
  ProjectReaderResponse,
  FileContent,
} from "../types.js";
import {
  PROJECT_READER_CONFIG,
  isPathSafe,
  isBinaryFile,
} from "./project-reader.types.js";
import * as fs from "fs/promises";
import * as path from "path";
import { glob } from "glob";

class ProjectReaderService {
  private async findFiles(
    basePath: string,
    patterns: string[],
    exclude: string[]
  ): Promise<string[]> {
    console.log("Starting file search:", { basePath, patterns, exclude });

    const allFiles = new Set<string>();

    for (const pattern of patterns) {
      console.log(`Processing pattern: ${pattern}`);
      try {
        const files = await glob(pattern, {
          cwd: basePath,
          ignore: exclude,
          nodir: true,
          dot: true,
          absolute: true,
          follow: false,
        });

        console.log(`Found ${files.length} files for pattern ${pattern}`);
        files.forEach((file) => allFiles.add(file));
      } catch (error) {
        console.error(`Error processing pattern ${pattern}:`, error);
      }
    }

    const result = Array.from(allFiles);
    console.log(`Total unique files found: ${result.length}`);
    return result;
  }

  async readFiles(input: ProjectReaderInput): Promise<ProjectReaderResponse> {
    console.log("Starting readFiles with input:", input);

    const basePath = PROJECT_READER_CONFIG.ALLOWED_BASE_PATH;
    const requestedPath = path.join(basePath, input.path);
    console.log("Resolved path:", requestedPath);

    if (!isPathSafe(requestedPath)) {
      throw new Error("Access to this path is not allowed");
    }

    const maxFiles = Math.min(
      input.maxFiles || PROJECT_READER_CONFIG.MAX_FILES_LIMIT,
      PROJECT_READER_CONFIG.MAX_FILES_LIMIT
    );

    try {
      let filesToProcess: string[] = [];

      if (input.mode === "single") {
        filesToProcess = [requestedPath];
      } else {
        filesToProcess = await this.findFiles(
          requestedPath,
          input.patterns || [],
          input.exclude || []
        );
      }

      console.log(`Found ${filesToProcess.length} files to process`);

      // Sort files for consistent ordering
      filesToProcess.sort();

      const results: FileContent[] = [];
      let totalSize = 0;
      let truncated = false;
      let processedCount = 0;

      for (const file of filesToProcess) {
        if (processedCount >= maxFiles) {
          console.log("Reached maxFiles limit");
          truncated = true;
          break;
        }

        try {
          const stats = await fs.stat(file);

          if (
            stats.size > (input.maxSize || PROJECT_READER_CONFIG.MAX_FILE_SIZE)
          ) {
            console.log(`Skipping ${file}: exceeds size limit`);
            continue;
          }

          if (totalSize + stats.size > PROJECT_READER_CONFIG.MAX_TOTAL_SIZE) {
            console.log("Reached total size limit");
            truncated = true;
            break;
          }

          if (!isBinaryFile(file)) {
            const content = await fs.readFile(file, "utf-8");
            results.push({
              path: path.relative(basePath, file),
              content,
              size: stats.size,
              type: path.extname(file) || "text/plain",
              lastModified: stats.mtimeMs,
            });
            totalSize += stats.size;
            processedCount++;
          }
        } catch (error) {
          console.warn(`Error processing file ${file}:`, error);
        }
      }

      console.log(`Successfully processed ${results.length} files`);
      return {
        files: results,
        totalFiles: results.length,
        totalSize,
        truncated,
      };
    } catch (error: any) {
      console.error("Error in readFiles:", error);
      throw new Error(`Failed to read files: ${error.message}`);
    }
  }
}

const projectReaderService = new ProjectReaderService();

export const projectReaderTool: ServerTool = {
  name: "project_reader",
  route: "/project-reader",
  handler: async (req: Request, res: Response): Promise<void> => {
    console.log("Received project reader request");

    try {
      const input: ProjectReaderInput = req.body;
      console.log("Processing request with input:", input);

      const result = await projectReaderService.readFiles(input);
      console.log("Sending response with", result.files.length, "files");

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
