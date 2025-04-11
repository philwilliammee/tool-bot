export interface BashInput {
  command: string;
  args?: string[];
  cwd?: string;
  timeout?: number;
}

export interface BashOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: boolean;
  message?: string;
}