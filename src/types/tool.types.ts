// src/types/tool.types.ts
import { Message } from "@aws-sdk/client-bedrock-runtime";

export interface ToolUse {
  name: string;
  toolUseId: string;
  input: Record<string, any>;
}

export interface ToolResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
  error?: boolean;
  message?: string;
  contentType?: string;
}

export interface MessageExtended extends Message {
  metadata?: {
    isArchived?: boolean;
    hasToolUse?: boolean;
    hasToolResult?: boolean;
    sequenceNumber?: number;
    tags?: string[]; // For storing AI-generated labels/tags
    userRating?: number; // For storing user likes/ratings (e.g., 1 to 5)
  };
}
