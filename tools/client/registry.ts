import { codeExecutorTool } from "./../code-executor/client/code-executor.client";
import { fileWriterTool } from "./../file-writer/client/file-writer.client";
import { ClientTool, ClientToolRegistry } from "./tool.interface";
import { htmlTool } from "../html-tool/client/html.client";
import { mathTool } from "../math-tool/client/math.client";
import { fetchTool } from "../fetch-tool/client/fetch.client";
import { ldapTool } from "../ldap-tool/client/ldap.client";
import { fileTreeTool } from "../file-tree-tool/client/file-tree.client";
import { projectReaderTool } from "../project-reader-tool/client/project-reader.client";
import { octokitTool } from "../octokit-tool/client/octokit.client";

// Make dataStore available globally for tools
declare global {
  interface Window {
    availableData?: Record<string, any>[];
  }
}
class ToolRegistry {
  private tools: ClientToolRegistry = {};

  constructor() {
    this.registerTool(htmlTool);
    this.registerTool(mathTool);
    this.registerTool(fetchTool);
    this.registerTool(ldapTool);
    this.registerTool(fileTreeTool);
    this.registerTool(projectReaderTool);
    this.registerTool(fileWriterTool);
    this.registerTool(codeExecutorTool);
    this.registerTool(octokitTool);
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
