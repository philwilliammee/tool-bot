// Simple interface for tools
export interface ClientTool {
  name: string;
  execute: (input: any) => Promise<any>;
  systemPrompt?: string;
}
