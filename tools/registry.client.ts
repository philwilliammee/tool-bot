import { xTool } from "./x-tool/client/x.client.js";
import { bashTool } from "./bash-tool/client/bash.client.js";
import { dataStoreTool } from "./data-store-tool/client/data-store.client.js";
import { codeExecutorTool } from "./code-executor/client/code-executor.client.js";
import { fileWriterTool } from "./file-writer/client/file-writer.client.js";
import { ClientTool, ClientToolRegistry } from "./client/tool.interface.js";
import { htmlTool } from "./html-tool/client/html.client.js";
import { mathTool } from "./math-tool/client/math.client.js";
import { fetchTool } from "./fetch-tool/client/fetch.client.js";
import { ldapTool } from "./ldap-tool/client/ldap.client.js";
import { fileTreeTool } from "./file-tree-tool/client/file-tree.client.js";
import { projectReaderTool } from "./project-reader-tool/client/project-reader.client.js";
import { octokitTool } from "./octokit-tool/client/octokit.client.js";
import { dataRowReaderTool } from "./data-row-reader/client/data-row-reader.client.js";
import { projectSearchTool } from "./project-search-tool/client/project-search.client.js";
import { markdownPreviewTool } from "./markdown-preview-tool/client/markdown-preview.client.js";
import { getMCPTools } from "./mcp-tool/client/mcp.client.js";

// Make dataStore available globally for tools
// @todo have a tool-data-store that the client can subscribe to.
declare global {
  interface Window {
    availableData?: Record<string, any>[];
  }
}

class ToolRegistry {
  private tools: ClientToolRegistry = {};
  private mcpToolsInitialized: boolean = false;

  constructor() {
    this.initializeTools();
  }

  private async initializeTools(): Promise<void> {
    /** Register static Client tools here */
    this.registerTool(htmlTool);
    this.registerTool(mathTool);
    this.registerTool(fetchTool);
    // this.registerTool(ldapTool);
    this.registerTool(fileTreeTool);
    this.registerTool(projectReaderTool);
    this.registerTool(fileWriterTool);
    // this.registerTool(codeExecutorTool);
    this.registerTool(octokitTool);
    // this.registerTool(dataStoreTool);
    this.registerTool(bashTool);
    // this.registerTool(xTool);
    this.registerTool(dataRowReaderTool);
    this.registerTool(projectSearchTool);
    this.registerTool(markdownPreviewTool);

    /** Discover and register MCP tools */
    await this.initializeMCPTools();
  }

  private async initializeMCPTools(): Promise<void> {
    if (this.mcpToolsInitialized) return;

    try {
      console.log('🔍 Discovering MCP tools...');
      const mcpTools = await getMCPTools();

      for (const tool of mcpTools) {
        this.registerTool(tool);
      }

      this.mcpToolsInitialized = true;
      console.log(`✅ MCP tool discovery complete - ${mcpTools.length} tools registered`);
    } catch (error) {
      console.warn('⚠️ MCP tool discovery failed:', error);
      // Continue without MCP tools - app should still work
    }
  }

  private registerTool(tool: ClientTool): void {
    this.tools[tool.name] = tool;
    const isNewtool = !tool.name.startsWith('mcp_');
    const prefix = isNewtool ? '🔧' : '🔌';
    console.log(`${prefix} Registered client tool: ${tool.name}`);
  }

  public getTool(name: string): ClientTool | undefined {
    return this.tools[name];
  }

  public getAllTools(): ClientToolRegistry {
    return { ...this.tools };
  }

  // Ensure MCP tools are initialized before getting tools
  public async ensureMCPToolsInitialized(): Promise<void> {
    await this.initializeMCPTools();
  }
}

export const clientRegistry = new ToolRegistry();
