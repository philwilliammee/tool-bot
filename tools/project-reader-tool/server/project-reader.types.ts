// tools/project-reader-tool/server/project-reader.types.ts
import path from "path";

export const PROJECT_READER_CONFIG = {
  ALLOWED_BASE_PATH: process.cwd(),
  MAX_FILES_LIMIT: 100, // Hard limit regardless of user input
  MAX_FILE_SIZE: 2 * 1048576, // 2MB max per file
  MAX_TOTAL_SIZE: 10 * 1048576, // 10MB total size limit
  DEFAULT_EXCLUDES: [
    "node_modules/**",
    ".git/**",
    "dist/**",
    "build/**",
    ".env*",
    "**/*.lock",
    "**/*.log",
  ],
  BINARY_EXTENSIONS: [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".ico",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
    ".7z",
    ".rar",
    ".exe",
    ".dll",
    ".so",
  ],
};

export function isPathSafe(requestedPath: string): boolean {
  const normalizedPath = path.normalize(requestedPath);
  const resolvedPath = path.resolve(
    PROJECT_READER_CONFIG.ALLOWED_BASE_PATH,
    normalizedPath
  );
  return resolvedPath.startsWith(PROJECT_READER_CONFIG.ALLOWED_BASE_PATH);
}

export function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return PROJECT_READER_CONFIG.BINARY_EXTENSIONS.includes(ext);
}
