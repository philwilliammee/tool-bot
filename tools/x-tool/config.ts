import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

if (!process.env.X_BEARER_TOKEN) {
  throw new Error("X_BEARER_TOKEN is required");
}

export const X_CONFIG = {
  API_BASE_URL: "https://api.twitter.com/2",
  MAX_POST_LENGTH: 280,
  DEFAULT_POST_LIMIT: 10,
} as const;

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
                maxLength: X_CONFIG.MAX_POST_LENGTH,
              },
              username: {
                type: "string",
                description: "X username to fetch posts from",
              },
              limit: {
                type: "number",
                description: "Number of posts to fetch (max 100)",
                maximum: 100,
                default: X_CONFIG.DEFAULT_POST_LIMIT,
              },
            },
            required: ["operation"],
          },
        },
      },
    },
  ],
};
