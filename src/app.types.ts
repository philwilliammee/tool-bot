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

export interface MessageMetadata {
  createdAt: number; // Required
  updatedAt: number; // Required
  isArchived?: boolean;
  hasToolUse?: boolean;
  hasToolResult?: boolean;
  sequenceNumber?: number;
  tags?: string[];
  userRating?: number;
  isStreaming?: boolean;
  error?: boolean;
  interrupted?: boolean;
}

export interface MessageExtended extends Message {
  id: string;
  projectId?: string;
  metadata: MessageMetadata; // Note: not optional
}
