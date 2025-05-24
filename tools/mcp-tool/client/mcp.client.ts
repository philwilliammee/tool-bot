import { ClientTool } from "../../client/tool.interface.js";

interface MCPServerConfig {
  url: string;
  name: string;
}

interface MCPToolSpec {
  name: string;
  description: string;
  inputSchema?: any;
}

class MCPClient {
  private baseUrl: string;
  private clientId: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async initialize(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`MCP initialization failed: ${response.status}`);
      }

      const data = await response.json();
      this.clientId = data.clientId;
      console.log(`✅ MCP client initialized: ${this.baseUrl} (ID: ${this.clientId})`);
    } catch (error) {
      console.error('❌ MCP initialization error:', error);
      throw error;
    }
  }

  async getAvailableTools(): Promise<MCPToolSpec[]> {
    try {
      // Fetch tools from MCP server's initialize endpoint
      const response = await fetch(`${this.baseUrl}/tools/initialize`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        console.warn(`Failed to fetch MCP tools from ${this.baseUrl}: ${response.status}`);
        return [];
      }

      const data = await response.json();
      console.log(`🔍 Fetched MCP tools from ${this.baseUrl}:`, data.tools);

      return data.tools || [];
    } catch (error) {
      console.error('Error fetching MCP tools:', error);
      return [];
    }
  }

  async callTool(toolName: string, input: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/${toolName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `Tool execution failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error executing MCP tool ${toolName}:`, error);
      throw error;
    }
  }
}

export class MCPToolRegistry {
  private mcpClient: MCPClient;
  private serverConfig: MCPServerConfig;
  private registeredTools: Map<string, ClientTool> = new Map();
  private isInitialized: boolean = false;

  constructor(serverConfig: MCPServerConfig) {
    this.serverConfig = serverConfig;
    this.mcpClient = new MCPClient(serverConfig.url);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.mcpClient.initialize();
      this.isInitialized = true;
    } catch (error) {
      console.warn(`⚠️ Failed to initialize MCP server ${this.serverConfig.name}:`, error);
      // Don't throw - allow app to continue without MCP tools
    }
  }

  async discoverAndCreateTools(): Promise<ClientTool[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.isInitialized) {
      return []; // Failed to initialize, return empty array
    }

    try {
      const mcpTools = await this.mcpClient.getAvailableTools();
      const clientTools: ClientTool[] = [];

      for (const toolSpec of mcpTools) {
        const toolName = `mcp_${toolSpec.name}`;

        // Skip if already registered
        if (this.registeredTools.has(toolName)) {
          clientTools.push(this.registeredTools.get(toolName)!);
          continue;
        }

        // Create client tool wrapper
        const clientTool: ClientTool = {
          name: toolName,
          execute: async (input: any) => {
            try {
              console.log(`🔧 Executing MCP tool ${toolSpec.name}:`, input);
              const result = await this.mcpClient.callTool(toolSpec.name, input);
              console.log(`✅ MCP tool ${toolSpec.name} result:`, result);
              return result;
            } catch (error) {
              console.error(`❌ MCP tool ${toolSpec.name} failed:`, error);
              throw error;
            }
          }
        };

        this.registeredTools.set(toolName, clientTool);
        clientTools.push(clientTool);
        console.log(`🔌 Registered MCP tool: ${toolName} (${toolSpec.description})`);
      }

      return clientTools;
    } catch (error) {
      console.error(`❌ Failed to discover MCP tools from ${this.serverConfig.name}:`, error);
      return [];
    }
  }

  getToolConfigs(): any[] {
    if (!this.isInitialized) {
      return [];
    }

    // Return tool configurations for Bedrock
    return Array.from(this.registeredTools.keys()).map(toolName => {
      const originalName = toolName.replace('mcp_', '');
      return {
        toolSpec: {
          name: toolName,
          description: `MCP ${originalName} tool from ${this.serverConfig.name}`,
          inputSchema: {
            json: {
              type: "object",
              properties: {
                expression: {
                  type: "string",
                  description: "Mathematical expression to evaluate"
                }
              },
              required: ["expression"]
            }
          }
        }
      };
    });
  }
}

// Global MCP registry
class GlobalMCPRegistry {
  private mcpRegistries: MCPToolRegistry[] = [];
  private allTools: ClientTool[] = [];

  constructor() {
    // Add default MCP servers here
    this.addMCPServer({
      url: 'http://localhost:3000',
      name: 'Calculator MCP Server'
    });
  }

  addMCPServer(config: MCPServerConfig): void {
    const registry = new MCPToolRegistry(config);
    this.mcpRegistries.push(registry);
  }

  async initializeAll(): Promise<ClientTool[]> {
    console.log(`🚀 Initializing ${this.mcpRegistries.length} MCP servers...`);

    const allToolPromises = this.mcpRegistries.map(registry =>
      registry.discoverAndCreateTools()
    );

    const toolArrays = await Promise.all(allToolPromises);
    this.allTools = toolArrays.flat();

    console.log(`✅ Discovered ${this.allTools.length} MCP tools total`);
    return this.allTools;
  }

  getAllTools(): ClientTool[] {
    return [...this.allTools];
  }

  getToolConfigs(): any[] {
    return this.mcpRegistries.flatMap(registry => registry.getToolConfigs());
  }
}

// Export singleton instance
export const globalMCPRegistry = new GlobalMCPRegistry();

// Export individual tools for external registration
export async function getMCPTools(): Promise<ClientTool[]> {
  return await globalMCPRegistry.initializeAll();
}
