import { xToolConfig } from "./x-tool/config.js";
import { xTool } from "./x-tool/server/x.service.js";
import { bashToolConfig } from "./bash-tool/config.js";
import { bashTool } from "./bash-tool/server/bash.service.js";
import { dataStoreConfig } from "./data-store-tool/config.js";
import { octokitConfig } from "./octokit-tool/config.js";
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";
import { Router } from "express";
import { ServerToolRegistry, ServerTool } from "./server/tool.interface.js";

// Tool implementations
import { fetchTool } from "./fetch-tool/server/fetch.service.js";
import { ldapTool } from "./ldap-tool/server/ldap.service.js";
import { fileTreeTool } from "./file-tree-tool/server/file-tree.service.js";
import { projectReaderTool } from "./project-reader-tool/server/project-reader.service.js";
import { fileWriterTool } from "./file-writer/server/file-writer.service.js";
import { octokitTool } from "./octokit-tool/server/octokit.service.js";

// Tool configs
import { fetchToolConfig } from "./fetch-tool/config.js";
import { ldapToolConfig } from "./ldap-tool/config.js";
import { htmlToolConfig } from "./html-tool/config.js";
import { mathToolConfig } from "./math-tool/config.js";
import { fileTreeConfig } from "./file-tree-tool/config.js";
import { fileWriterConfig } from "./file-writer/config.js";
import { projectReaderConfig } from "./project-reader-tool/config.js";
import { codeExecutorConfig } from "./code-executor/config.js";

class ToolRegistry {
  private tools: ServerToolRegistry = {};
  private router: Router;

  constructor() {
    this.router = Router();
    // Register Server tools here
    this.registerTool(fetchTool);
    this.registerTool(ldapTool);
    this.registerTool(fileTreeTool);
    this.registerTool(projectReaderTool);
    this.registerTool(fileWriterTool);
    this.registerTool(octokitTool);
    this.registerTool(bashTool);
    this.registerTool(xTool);

    // end of register

    this.setupRoutes();
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
        ...(dataStoreConfig.tools || []),
        ...(bashToolConfig.tools || []),
        ...(xToolConfig.tools || []),
      ],
    };
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
}

export const serverRegistry = new ToolRegistry();
