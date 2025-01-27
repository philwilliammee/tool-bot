import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const octokitConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "octokit",
        description: "Execute GitHub API operations using Octokit. Supports both REST API and GraphQL queries.",
        inputSchema: {
          json: {
            type: "object",
            properties: {
              operation: {
                type: "string",
                description: "The GitHub API operation to perform (e.g., 'GET /repos/{owner}/{repo}')",
                minLength: 1
              },
              parameters: {
                type: "object",
                description: "Parameters for the operation (e.g., { owner: 'octokit', repo: 'octokit.js' })",
                additionalProperties: true
              },
              auth: {
                type: "string",
                description: "Optional GitHub authentication token"
              }
            },
            required: ["operation"],
            additionalProperties: false
          }
        }
      }
    }
  ]
};