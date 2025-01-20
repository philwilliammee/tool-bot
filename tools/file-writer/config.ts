// tools/file-writer/config.ts

import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const fileWriterConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "file_writer",
        description:
          "Write content to a file. This tool will completely replace the existing content of the file if it exists. The path must be relative to the project root.",
        inputSchema: {
          json: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Relative path to the file to write to",
                minLength: 1,
              },
              content: {
                type: "string",
                description: "Content to write to the file",
              },
            },
            required: ["path", "content"],
            additionalProperties: false,
          },
        },
      },
    },
  ],
};
