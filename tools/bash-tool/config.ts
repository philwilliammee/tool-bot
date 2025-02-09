// tools/bash_tool/config.ts
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const bashToolConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "bash",
        description: `Execute shell commands in a controlled environment.
Supported operations:
- File operations: ls, cat, grep, find, mkdir, touch, rm, cp, mv, echo
- Git operations: init, add, commit, status, log, branch, checkout, pull, push, etc.
- NPM operations: install, uninstall, run, start, test, build, update, etc.
- General: pwd, node, npx, tsc`,
        inputSchema: {
          json: {
            type: "object",
            properties: {
              command: {
                type: "string",
                description: "The command to execute",
                minLength: 1,
              },
              type: {
                type: "string",
                enum: ["file", "git", "npm", "general"],
                description: "Type of command for security validation",
              },
              args: {
                type: "array",
                items: { type: "string" },
                description: "Command arguments",
              },
              cwd: {
                type: "string",
                description: "Working directory for command execution",
              },
              timeout: {
                type: "number",
                description: "Command timeout in milliseconds",
                default: 30000,
                maximum: 300000,
              },
            },
            required: ["command"],
          },
        },
      },
    },
  ],
};
