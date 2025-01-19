// tools/file-tree-tool/config.ts
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const fileTreeConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "file_tree",
        description:
          "Generate a tree structure of files and directories from the current working directory. Use this to understand project structure.",
        inputSchema: {
          json: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description:
                  "Relative path from current working directory. Defaults to current directory.",
              },
              maxDepth: {
                type: "number",
                description: "Maximum depth to traverse (default: unlimited)",
                minimum: 1,
              },
              exclude: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "Patterns to exclude (e.g., node_modules, .git)",
              },
            },
          },
        },
      },
    },
  ],
};
