// tools/project-reader-tool/types.ts
export interface FileContent {
  path: string;
  content: string;
  size: number;
  type: string; // file extension or mime type
  lastModified: number;
}

export interface ProjectReaderInput {
  mode: "single" | "multi";
  path: string; // For single file or starting directory
  patterns?: string[]; // For multi-mode: glob patterns like ["**/*.ts", "**/*.json"]
  exclude?: string[]; // Patterns to exclude
  maxFiles?: number; // Limit for multi-mode
  maxSize?: number; // Max size per file in bytes
}

export interface ProjectReaderResponse {
  files: FileContent[];
  error?: boolean;
  message?: string;
  totalFiles: number;
  totalSize: number;
  truncated?: boolean; // Indicates if response was limited by maxFiles or maxSize
}
