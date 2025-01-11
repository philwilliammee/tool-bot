// src/types/tool.types.ts
export interface ToolUse {
  name: string;
  toolUseId: string;
  input: Record<string, any>;
}

export interface ToolResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
  error?: boolean;
  message?: string;
  contentType?: string;
}
