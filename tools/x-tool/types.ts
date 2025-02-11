// tools/x-tool/types.ts
export interface XInput {
  operation: "create_post" | "get_posts";
  content?: string;
  username?: string;
  limit?: number;
}

export interface XOutput {
  success: boolean;
  data?: {
    posts?: Array<{
      id: string;
      content: string;
      created_at: string;
    }>;
    created_post?: {
      id: string;
      content: string;
    };
  };
  error?: string;
}
