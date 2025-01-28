// tools/file-tree-tool/server/file-tree.types.ts
import path from "path";

export const FILE_TREE_CONFIG = {
  MAX_DEPTH: 10,
  DEFAULT_EXCLUDES: [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".env",
    ".DS_Store",
  ],
  MAX_FILES: 1000, // Prevent excessive file listing
  ALLOWED_BASE_PATH: process.cwd(), // Only allow access to project directory
};

export function isPathSafe(requestedPath: string): boolean {
  const normalizedPath = path.normalize(requestedPath);
  const resolvedPath = path.resolve(
    FILE_TREE_CONFIG.ALLOWED_BASE_PATH,
    normalizedPath
  );
  return resolvedPath.startsWith(FILE_TREE_CONFIG.ALLOWED_BASE_PATH);
}
