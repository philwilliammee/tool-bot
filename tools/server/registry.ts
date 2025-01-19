import { Router } from "express";
import { ServerTool, ServerToolRegistry } from "./tool.interface";
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";
import { fetchTool } from "../fetch-tool/server/fetch.service";
import { ldapTool } from "../ldap-tool/server/ldap.service";
import { htmlToolConfig } from "../html-tool/config";
import { fetchToolConfig } from "../fetch-tool/config";
import { mathToolConfig } from "../math-tool/config";
import { ldapToolConfig } from "../ldap-tool/config";

class ToolRegistry {
  private tools: ServerToolRegistry = {};
  private router: Router;

  constructor() {
    this.router = Router();
    this.registerTool(fetchTool);
    this.registerTool(ldapTool);
    this.setupRoutes();
  }

  private registerTool(tool: ServerTool): void {
    this.tools[tool.name] = tool;
    console.log(`Registered server tool: ${tool.name}`);
  }

  private setupRoutes(): void {
    Object.values(this.tools).forEach((tool) => {
      this.router.post(tool.route, tool.handler);
    });
  }

  public getRouter(): Router {
    return this.router;
  }

  public getTool(name: string): ServerTool | undefined {
    return this.tools[name];
  }

  public getAllTools(): ServerToolRegistry {
    return { ...this.tools };
  }

  public getToolConfig(): ToolConfiguration {
    return {
      tools: [
        ...(fetchToolConfig.tools || []),
        ...(ldapToolConfig.tools || []),
        ...(htmlToolConfig.tools || []),
        ...(mathToolConfig.tools || []),
      ],
    };
  }
}

export const serverRegistry = new ToolRegistry();
