// tools/file-tree-tool/server/file-tree.service.ts
import { ServerTool } from "../../server/tool.interface";
import { Request, Response } from "express";
import { FileTreeInput, FileTreeResponse, FileTreeNode } from "../types";
import { FILE_TREE_CONFIG, isPathSafe } from "./file-tree.types";
import fs from "fs/promises";
import path from "path";

class FileTreeService {
  private fileCount = 0;
  private dirCount = 0;

  private async buildTree(
    currentPath: string,
    depth: number,
    maxDepth?: number,
    exclude: string[] = []
  ): Promise<FileTreeNode> {
    if (maxDepth !== undefined && depth > maxDepth) {
      return {
        name: path.basename(currentPath),
        type: "directory",
        children: [{ name: "...", type: "directory" }],
      };
    }

    const stats = await fs.stat(currentPath);
    const name = path.basename(currentPath);

    if (stats.isFile()) {
      this.fileCount++;
      return {
        name,
        type: "file",
        size: stats.size,
      };
    }

    if (stats.isDirectory()) {
      this.dirCount++;
      const entries = await fs.readdir(currentPath);
      const children = await Promise.all(
        entries
          .filter((entry) => !exclude.includes(entry))
          .map((entry) =>
            this.buildTree(
              path.join(currentPath, entry),
              depth + 1,
              maxDepth,
              exclude
            )
          )
      );

      return {
        name,
        type: "directory",
        children: children.sort((a, b) => {
          // Directories first, then files
          if (a.type !== b.type) {
            return a.type === "directory" ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        }),
      };
    }

    // For symlinks or other types, just show name
    return {
      name,
      type: "file",
    };
  }

  async generateTree(input: FileTreeInput): Promise<FileTreeResponse> {
    this.fileCount = 0;
    this.dirCount = 0;

    const basePath = FILE_TREE_CONFIG.ALLOWED_BASE_PATH;
    const requestedPath = path.join(basePath, input.path || "");

    if (!isPathSafe(requestedPath)) {
      throw new Error("Access to this path is not allowed");
    }

    const exclude = [
      ...FILE_TREE_CONFIG.DEFAULT_EXCLUDES,
      ...(input.exclude || []),
    ];

    const tree = await this.buildTree(
      requestedPath,
      0,
      input.maxDepth || FILE_TREE_CONFIG.MAX_DEPTH,
      exclude
    );

    return {
      tree,
      path: path.relative(basePath, requestedPath),
      totalFiles: this.fileCount,
      totalDirectories: this.dirCount,
    };
  }
}

const fileTreeService = new FileTreeService();

export const fileTreeTool: ServerTool = {
  name: "file_tree",
  route: "/file-tree",
  handler: async (req: Request, res: Response): Promise<void> => {
    try {
      const input: FileTreeInput = req.body;
      const result = await fileTreeService.generateTree(input);
      res.json(result);
    } catch (error: any) {
      console.error("File tree error:", error);
      res.status(500).json({
        tree: {
          name: ".",
          type: "directory",
          children: [],
        },
        error: true,
        message: error.message || "Failed to generate file tree",
        path: req.body.input?.path || ".",
        totalFiles: 0,
        totalDirectories: 0,
      });
    }
  },
};
