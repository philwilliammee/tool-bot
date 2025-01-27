import { ServerTool } from "../../server/tool.interface";
import { Request, Response } from "express";
import { Octokit } from "octokit";
import { OctokitInput, OctokitResponse } from "../types";

class OctokitService {
  private octokit: Octokit;

  constructor() {
    // Initialize with auth token from environment variable
    this.octokit = new Octokit({
      userAgent: 'octokit-tool/v1.0.0',
      auth: process.env.GITHUB_AUTH_TOKEN
    });
  }

  async executeOperation(input: OctokitInput): Promise<OctokitResponse> {
    try {
      // Execute the GitHub API request using the configured Octokit instance
      const response = await this.octokit.request(input.operation, input.parameters || {});

      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, string>
      };
    } catch (error: any) {
      console.error("Octokit operation error:", error);
      return {
        data: null,
        error: true,
        message: error.message || "Failed to execute GitHub API operation",
        status: error.status || 500
      };
    }
  }
}

const octokitService = new OctokitService();

export const octokitTool: ServerTool = {
  name: "octokit",
  route: "/octokit",
  handler: async (req: Request, res: Response): Promise<void> => {
    try {
      const input: OctokitInput = req.body;
      const result = await octokitService.executeOperation(input);
      
      if (result.error) {
        res.status(result.status || 500).json(result);
      } else {
        res.json(result);
      }
    } catch (error: any) {
      console.error("Octokit tool error:", error);
      res.status(500).json({
        data: null,
        error: true,
        message: error.message || "Internal server error",
        status: 500
      });
    }
  }
};