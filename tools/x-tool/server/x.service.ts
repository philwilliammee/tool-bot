import { ServerTool } from "../../server/tool.interface";
import { Request, Response } from "express";
import { XInput, XOutput } from "../types";
import { X_CONFIG } from "../config";

class XService {
  private async makeRequest(
    endpoint: string,
    method: "GET" | "POST",
    body?: object
  ) {
    const response = await fetch(`${X_CONFIG.API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${process.env.X_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`X API error: ${await response.text()}`);
    }

    return response.json();
  }

  async execute(input: XInput): Promise<XOutput> {
    try {
      switch (input.operation) {
        case "create_post": {
          if (!input.content) {
            throw new Error("Post content is required");
          }

          if (input.content.length > X_CONFIG.MAX_POST_LENGTH) {
            throw new Error(
              `Post exceeds maximum length of ${X_CONFIG.MAX_POST_LENGTH} characters`
            );
          }

          const result = await this.makeRequest("/tweets", "POST", {
            text: input.content,
          });

          return {
            success: true,
            data: {
              created_post: {
                id: result.data.id,
                content: result.data.text,
                created_at: result.data.created_at,
              },
            },
          };
        }

        case "get_posts": {
          if (!input.username) {
            throw new Error("Username is required to fetch posts");
          }

          const userResponse = await this.makeRequest(
            `/users/by/username/${input.username}`,
            "GET"
          );

          const userId = userResponse.data.id;
          const limit = input.limit || X_CONFIG.DEFAULT_POST_LIMIT;

          const postsResponse = await this.makeRequest(
            `/users/${userId}/tweets?max_results=${limit}&tweet.fields=created_at`,
            "GET"
          );

          return {
            success: true,
            data: {
              posts: postsResponse.data.map((post: any) => ({
                id: post.id,
                content: post.text,
                created_at: post.created_at,
              })),
            },
          };
        }

        default:
          throw new Error(`Unsupported operation: ${input.operation}`);
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

const xService = new XService();

export const xTool: ServerTool = {
  name: "x",
  route: "/x",
  handler: async (req: Request, res: Response) => {
    try {
      const result = await xService.execute(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
};
