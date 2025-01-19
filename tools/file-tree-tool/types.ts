// tools/file-tree-tool/types.ts
export interface FileTreeInput {
  path?: string; // Optional - defaults to process.cwd()
  maxDepth?: number; // Optional - how deep to traverse
  exclude?: string[]; // Optional - patterns to exclude (e.g., node_modules)
}

export interface FileTreeNode {
  name: string;
  type: "file" | "directory";
  size?: number;
  children?: FileTreeNode[];
}

export interface FileTreeResponse {
  tree: FileTreeNode;
  error?: boolean;
  message?: string;
  path: string;
  totalFiles: number;
  totalDirectories: number;
}
