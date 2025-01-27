import { octokitConfig } from "./../octokit-tool/config";
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";
import { Router } from "express";
import { ServerToolRegistry, ServerTool } from "./tool.interface";

// Tool implementations
import { fetchTool } from "../fetch-tool/server/fetch.service";
import { ldapTool } from "../ldap-tool/server/ldap.service";
import { fileTreeTool } from "../file-tree-tool/server/file-tree.service";
import { projectReaderTool } from "../project-reader-tool/server/project-reader.service";
import { fileWriterTool } from "../file-writer/server/file-writer.service";
import { octokitTool } from "../octokit-tool/server/octokit.service";
// Bedrock configs
import { fetchToolConfig } from "../fetch-tool/config";
import { ldapToolConfig } from "../ldap-tool/config";
import { htmlToolConfig } from "../html-tool/config";
import { mathToolConfig } from "../math-tool/config";
import { fileTreeConfig } from "../file-tree-tool/config";
import { fileWriterConfig } from "./../file-writer/config";
import { projectReaderConfig } from "../project-reader-tool/config";
import { codeExecutorConfig } from "./../code-executor/config";

class ToolRegistry {
  private tools: ServerToolRegistry = {};
  private router: Router;

  constructor() {
    this.router = Router();
    this.registerTool(fetchTool);
    this.registerTool(ldapTool);
    this.registerTool(fileTreeTool);
    this.registerTool(projectReaderTool);
    this.registerTool(fileWriterTool);
    this.registerTool(octokitTool);
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
        ...(fileTreeConfig.tools || []),
        ...(projectReaderConfig.tools || []),
        ...(fileWriterConfig.tools || []),
        ...(codeExecutorConfig.tools || []),
        ...(octokitConfig.tools || []),
      ],
    };
  }
}

export const serverRegistry = new ToolRegistry();
