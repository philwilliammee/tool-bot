// server/tools/fetch/fetch.config.ts
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const fetchToolConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "fetch_url",
        description: `Fetch content from a specified URL. Only HTTPS URLs from allowed domains are supported. Returns JSON or text content.
          For weather queries use: https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}
          `,
        inputSchema: {
          json: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description:
                  "The HTTPS URL to fetch from. Must be from an allowed domain.",
                pattern: "^https://",
              },
              method: {
                type: "string",
                enum: ["GET"],
                default: "GET",
                description: "HTTP method (only GET is supported)",
              },
            },
            required: ["url"],
          },
        },
      },
    },
  ],
};
