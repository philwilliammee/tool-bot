import { ClientTool, ClientToolRegistry } from "./tool.interface";
import { htmlTool } from "../html-tool/client/html.client";
import { mathTool } from "../math-tool/client/math.client";
import { fetchTool } from "../fetch-tool/client/fetch.client";
import { ldapTool } from "../ldap-tool/client/ldap.client";

class ToolRegistry {
  private tools: ClientToolRegistry = {};

  constructor() {
    this.registerTool(htmlTool);
    this.registerTool(mathTool);
    this.registerTool(fetchTool);
    this.registerTool(ldapTool);
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
