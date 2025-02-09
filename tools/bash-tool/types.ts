// tools/bash_tool/types.ts
export type CommandType = "file" | "git" | "npm" | "general";

export interface BashInput {
  command: string;
  cwd?: string;
  timeout?: number;
  args?: string[];
  type?: CommandType;
}

export interface BashOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: boolean;
  message?: string;
  command?: string;
}
