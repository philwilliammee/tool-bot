// tools/x-tool/config.ts
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

// Check for required OAuth credentials
// const requiredEnvVars = [
//   "X_API_KEY",
//   "X_API_SECRET",
//   "X_ACCESS_TOKEN",
//   "X_ACCESS_SECRET",
// ] as const;

// requiredEnvVars.forEach((envVar) => {
//   if (!process.env[envVar]) {
//     throw new Error(`${envVar} is required for X tool`);
//   }
// });

export const X_CONFIG = {
  API_BASE_URL: "https://api.twitter.com/2",
  MAX_POST_LENGTH: 280,
  DEFAULT_POST_LIMIT: 10,
  OAUTH_CREDENTIALS: {
    apiKey: process.env.X_API_KEY!,
    apiSecretKey: process.env.X_API_SECRET!,
    accessToken: process.env.X_ACCESS_TOKEN!,
    accessTokenSecret: process.env.X_ACCESS_SECRET!,
  },
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
