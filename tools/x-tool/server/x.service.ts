// tools/x-tool/server/x.service.ts
import { ServerTool } from "../../server/tool.interface.js";
import { Request, Response } from "express";
import { XInput, XOutput } from "../types.js";
import { TwitterApi } from "twitter-api-v2";

// Check required credentials
// if (
//   !process.env.X_CONSUMER_KEY ||
//   !process.env.X_CONSUMER_SECRET ||
//   !process.env.X_ACCESS_TOKEN ||
//   !process.env.X_ACCESS_SECRET ||
//   !process.env.X_BEARER_TOKEN
// ) {
//   throw new Error("X API credentials are required");
// }

// Client for write operations (posting)
const writeClient = new TwitterApi({
  appKey: process.env.X_CONSUMER_KEY || "",
  appSecret: process.env.X_CONSUMER_SECRET || "",
  accessToken: process.env.X_ACCESS_TOKEN || "",
  accessSecret: process.env.X_ACCESS_SECRET || "",
});

// Read-only client using Bearer token
const readOnlyClient = new TwitterApi(process.env.X_BEARER_TOKEN || "");

export const xTool: ServerTool = {
  name: "x",
  route: "/x",
  handler: async (req: Request, res: Response) => {
    try {
      const input: XInput = req.body;

      switch (input.operation) {
        case "create_post": {
          if (!input.content) {
            throw new Error("Post content is required");
          }

          const tweet = await writeClient.v2.tweet(input.content);

          res.json({
            success: true,
            data: {
              created_post: {
                id: tweet.data.id,
                content: tweet.data.text,
              },
            },
          });
          break;
        }

        case "get_posts": {
          if (!input.username) {
            throw new Error("Username is required to fetch posts");
          }

          const user = await readOnlyClient.v2.userByUsername(input.username);
          const tweets = await readOnlyClient.v2.userTimeline(user.data.id, {
            max_results: input.limit || 10,
          });

          res.json({
            success: true,
            data: {
              posts: tweets.data.data.map((tweet) => ({
                id: tweet.id,
                content: tweet.text,
                created_at: tweet.created_at || new Date().toISOString(),
              })),
            },
          });
          break;
        }

        default:
          throw new Error(`Unsupported operation: ${input.operation}`);
      }
    } catch (error: any) {
      console.error("X Service Error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
};
