// tools/project-reader-tool/config.ts
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const projectReaderConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "project_reader",
        description: `Read file contents from the project. Can read single files or multiple files based on patterns.
Use 'single' mode for specific files and 'multi' mode for reading multiple files matching patterns.

Examples:
- Read a specific file: { "mode": "single", "path": "package.json" }
- Read all TypeScript files: { "mode": "multi", "path": "src", "patterns": ["**/*.ts"] }
- Read configuration files: { "mode": "multi", "path": ".", "patterns": ["**/*.json", "**/*.config.js"] }`,
        inputSchema: {
          json: {
            type: "object",
            properties: {
              mode: {
                type: "string",
                enum: ["single", "multi"],
                description: "Read mode - single file or multiple files",
              },
              path: {
                type: "string",
                description:
                  "File path for single mode, or starting directory for multi mode",
              },
              patterns: {
                type: "array",
                items: {
                  type: "string",
                },
                description:
                  "Glob patterns for multi mode (e.g., ['**/*.ts', '**/*.json'])",
              },
              exclude: {
                type: "array",
                items: {
                  type: "string",
                },
                description:
                  "Patterns to exclude (e.g., ['node_modules/**', '**/*.test.ts'])",
                default: ["node_modules/**", ".git/**"],
              },
              maxFiles: {
                type: "number",
                description: "Maximum number of files to read in multi mode",
                default: 50,
              },
              maxSize: {
                type: "number",
                description: "Maximum size per file in bytes",
                default: 1048576, // 1MB
              },
            },
            required: ["mode", "path"],
            if: {
              properties: { mode: { const: "multi" } },
            },
            then: {
              required: ["patterns"],
            },
          },
        },
      },
    },
  ],
};
