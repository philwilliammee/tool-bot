// tools/bash_tool/config.ts
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const bashToolConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "bash",
        description: `Controlled shell command execution with strict security model.

Capabilities:
- Whitelist-based command execution
- Supports file, text, and development operations
- Restricted environment with timeout mechanisms

Domains:
- File management
- Text processing
- Development tool invocation
- System inspection

Constraints:
- No root/sudo access
- Limited to predefined command set
- Working directory restricted
- Max 5-minute execution time

Best Practices:
- Use for lightweight, non-destructive tasks
- Leverage built-in safety mechanisms`,
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
