import { xTool } from "./x-tool/client/x.client";
import { bashTool } from "./bash-tool/client/bash.client";
import { dataStoreTool } from "./data-store-tool/client/data-store.client";
import { codeExecutorTool } from "./code-executor/client/code-executor.client";
import { fileWriterTool } from "./file-writer/client/file-writer.client";
import { ClientTool, ClientToolRegistry } from "./client/tool.interface";
import { htmlTool } from "./html-tool/client/html.client";
import { mathTool } from "./math-tool/client/math.client";
import { fetchTool } from "./fetch-tool/client/fetch.client";
import { ldapTool } from "./ldap-tool/client/ldap.client";
import { fileTreeTool } from "./file-tree-tool/client/file-tree.client";
import { projectReaderTool } from "./project-reader-tool/client/project-reader.client";
import { octokitTool } from "./octokit-tool/client/octokit.client";
// Make dataStore available globally for tools
// @todo have a tool-data-store that the client can subscribe to.
declare global {
  interface Window {
    availableData?: Record<string, any>[];
  }
}
class ToolRegistry {
  private tools: ClientToolRegistry = {};

  constructor() {
    /** Register Client tools here */
    this.registerTool(htmlTool);
    this.registerTool(mathTool);
    this.registerTool(fetchTool);
    this.registerTool(ldapTool);
    this.registerTool(fileTreeTool);
    this.registerTool(projectReaderTool);
    this.registerTool(fileWriterTool);
    this.registerTool(codeExecutorTool);
    this.registerTool(octokitTool);
    this.registerTool(dataStoreTool);
    this.registerTool(bashTool);
    this.registerTool(xTool);
  }

  private registerTool(tool: ClientTool): void {
    this.tools[tool.name] = tool;
    console.log(`Registered client tool: ${tool.name}`);
  }

  public getTool(name: string): ClientTool | undefined {
    return this.tools[name];
  }

  public getAllTools(): ClientToolRegistry {
    return { ...this.tools };
  }
}

export const clientRegistry = new ToolRegistry();
