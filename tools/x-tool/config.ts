// tools/x-tool/config.ts
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const xToolConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "x",
        description: "Create and read posts on X (formerly Twitter)",
        inputSchema: {
          json: {
            type: "object",
            properties: {
              operation: {
                type: "string",
                enum: ["create_post", "get_posts"],
                description: "The X operation to perform",
              },
              content: {
                type: "string",
                description: "Post content for creation",
                maxLength: 280, // X's character limit
              },
              username: {
                type: "string",
                description: "X username to fetch posts from, if you don't know what username to use make sure to ask for clarification.",
              },
              limit: {
                type: "number",
                description: "Number of posts to fetch (max 100)",
                maximum: 100,
                default: 10,
              },
            },
            required: ["operation"],
          },
        },
      },
    },
  ],
};