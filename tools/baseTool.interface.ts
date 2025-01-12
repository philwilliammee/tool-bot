// tools/baseTool.interface.ts
export interface BaseTool {
  name: string;
  description?: string;
  /**
   * The shape of the input an LLM or your application must provide.
   * Example: { url: string, method: 'GET' }
   */
  inputSchema: Record<string, unknown>;

  /**
   * A method for programmatically executing the tool. The server version
   * might talk directly to your server route (like /api/tools/fetch).
   * A local version could do the same logic in memory if needed.
   */
  execute(input: Record<string, any>): Promise<any>;
}
