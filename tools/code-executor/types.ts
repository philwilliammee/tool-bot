// tools/code-executor-tool/types.ts
export interface CodeExecutorInput {
  code: string;
  timeout?: number;
  libraries?: string[];
}

export interface CodeExecutorOutput {
  result: any;
  logs: string[];
  error?: string;
  executionTime?: number;
}
