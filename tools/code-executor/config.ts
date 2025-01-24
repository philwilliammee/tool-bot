// tools/code-executor-tool/config.ts
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const codeExecutorConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "code_executor",
        description:
          "Execute JavaScript code in a sandboxed environment with access to common libraries.",
        inputSchema: {
          json: {
            type: "object",
            properties: {
              code: {
                type: "string",
                description:
                  "JavaScript code to execute. Can use console.log for output.",
              },
              timeout: {
                type: "number",
                description: "Maximum execution time in milliseconds",
                default: 5000,
                maximum: 10000,
              },
              libraries: {
                type: "array",
                description: "List of CDN libraries to include",
                items: {
                  type: "string",
                  enum: [
                    "https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js",
                    "https://cdn.jsdelivr.net/npm/moment@2.29.4/moment.min.js",
                    "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
                    "https://cdn.jsdelivr.net/npm/mathjs@12.2.1/lib/browser/math.min.js",
                  ],
                },
                default: [],
              },
            },
            required: ["code"],
          },
        },
      },
    },
  ],
};
