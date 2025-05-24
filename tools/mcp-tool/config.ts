import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";
import { globalMCPRegistry } from "./client/mcp.client.js";

export const mcpToolConfig: ToolConfiguration = {
  tools: []  // Will be populated dynamically
};

// Function to get dynamic MCP tool configurations
export async function getMCPToolConfig(): Promise<ToolConfiguration> {
  try {
    // Initialize MCP tools and get their configurations
    await globalMCPRegistry.initializeAll();
    const toolConfigs = globalMCPRegistry.getToolConfigs();

    return {
      tools: toolConfigs
    };
  } catch (error) {
    console.warn('⚠️ Failed to get MCP tool configurations:', error);
    return { tools: [] };
  }
}
