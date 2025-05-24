import { Request, Response } from "express";
import { ServerTool } from "../../server/tool.interface.js";

// MCP tools are proxied to external MCP servers, so we create a generic handler
export const mcpProxyTool: ServerTool = {
  name: "mcp_proxy",
  route: "/mcp/:toolName",
  handler: async (req: Request, res: Response): Promise<void> => {
    try {
      const { toolName } = req.params;
      const input = req.body;

      // For now, hardcode the calculator MCP server
      // TODO: Make this dynamic based on tool name and registered servers
      const mcpServerUrl = 'http://localhost:3000';

      console.log(`🔧 Proxying MCP tool ${toolName} to ${mcpServerUrl}`);

      const response = await fetch(`${mcpServerUrl}/tools/${toolName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        const errorData = await response.json();
        res.status(response.status).json({
          error: 'MCP tool execution failed',
          details: errorData.details || errorData.error || 'Unknown error'
        });
        return;
      }

      const result = await response.json();
      res.json(result);

    } catch (error) {
      console.error('MCP proxy error:', error);
      res.status(500).json({
        error: 'MCP proxy failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};
