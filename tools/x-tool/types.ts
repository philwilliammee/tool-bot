// tools/x-tool/types.ts
export interface XInput {
  operation: "create_post" | "get_posts";
  content?: string;
  username?: string;
  limit?: number;
}

export interface Post {
  id: string;
  content: string;
  created_at: string;
}

export interface XOutput {
  success: boolean;
  data?: {
    posts?: Post[];
    created_post?: Post;
  };
  error?: string;
}
