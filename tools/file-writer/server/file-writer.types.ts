// tools/file-writer/server/file-writer.types.ts
import path from "path";

export const FILE_WRITER_CONFIG = {
  ALLOWED_BASE_PATH: process.cwd(), // Or another appropriate base path
  ALLOWED_EXTENSIONS: [
    ".txt",
    ".md",
    ".json",
    ".yaml",
    ".yml",
    ".ts",
    ".css",
    ".html",
  ],
  MAX_FILE_SIZE: 1024 * 1024, // 1MB max file size
};

export function isPathSafe(filePath: string): boolean {
  const normalizedPath = path.normalize(filePath);
  const relativePath = path.relative(
    FILE_WRITER_CONFIG.ALLOWED_BASE_PATH,
    normalizedPath
  );

  return (
    !relativePath.startsWith("..") && // Prevent directory traversal
    !path.isAbsolute(relativePath) && // Prevent absolute paths
    !relativePath.includes("node_modules") && // Prevent writing to node_modules
    !relativePath.includes(".git") // Prevent writing to .git directory
  );
}
