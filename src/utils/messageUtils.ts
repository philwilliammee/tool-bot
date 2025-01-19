// src/utils/messageUtils.ts

import { Message } from "@aws-sdk/client-bedrock-runtime";

export interface MessageExtended extends Message {
  metadata?: {
    isArchived?: boolean;
    hasToolUse?: boolean;
    hasToolResult?: boolean;
    sequenceNumber?: number;
    tags?: string[]; // New: Array of tags/labels
    userRating?: number; // New: User rating (1-5)
  };
}

// Helper function to extract tags from AI responses
function extractTags(message: Message): string[] {
  // Look for tags in AI responses - this is a basic implementation
  // You might want to enhance this based on your AI's response format
  const text = message.content?.map((block) => block.text).join(" ") || "";
  const tags: string[] = [];

  // Example tag extraction (you can make this more sophisticated):
  // Look for hashtags or explicit tag markers
  const hashTags = text.match(/#\w+/g) || [];
  tags.push(...hashTags.map((tag) => tag.substring(1)));

  // Look for "tags:" or "labels:" sections
  const tagSection = text.match(/(?:tags|labels):\s*\[(.*?)\]/i);
  if (tagSection) {
    const extractedTags = tagSection[1].split(",").map((t) => t.trim());
    tags.push(...extractedTags);
  }

  return Array.from(new Set(tags)); // Remove duplicates
}

export function extendMessages(
  messages: Message[],
  threshold = 10
): MessageExtended[] {
  let activeStartIndex =
    messages.length > threshold ? messages.length - threshold : 0;

  // Find nearest user message that's not a tool result
  const userMessageIndices = messages
    .map((msg, index) => {
      const hasToolResult = msg.content?.some((block) => block.toolResult);
      return msg.role === "user" && !hasToolResult ? index : -1;
    })
    .filter((index) => index !== -1);

  // Find the nearest user message index to our activeStartIndex
  if (userMessageIndices.length > 0) {
    activeStartIndex = userMessageIndices.reduce((nearest, current) => {
      return Math.abs(current - activeStartIndex) <
        Math.abs(nearest - activeStartIndex)
        ? current
        : nearest;
    });
  }

  return messages.map((message, index) => {
    const hasToolUse = message.content?.some((block) => block.toolUse);
    const hasToolResult = message.content?.some((block) => block.toolResult);

    // Extract or preserve existing metadata
    const existingMetadata = (message as MessageExtended).metadata || {};

    return {
      ...message,
      metadata: {
        ...existingMetadata, // Preserve existing metadata
        hasToolUse,
        hasToolResult,
        sequenceNumber: index,
        isArchived: index < activeStartIndex,
        tags: existingMetadata.tags || extractTags(message), // New: Extract or preserve tags
        userRating: existingMetadata.userRating || 0, // New: Initialize or preserve rating
      },
    };
  });
}

// New utility functions for tags and ratings
export function updateMessageTags(
  message: MessageExtended,
  tags: string[]
): MessageExtended {
  return {
    ...message,
    metadata: {
      ...(message.metadata || {}),
      tags: Array.from(new Set(tags)), // Ensure uniqueness
    },
  };
}

export function updateMessageRating(
  message: MessageExtended,
  rating: number
): MessageExtended {
  if (rating < 0 || rating > 5) {
    throw new Error("Rating must be between 0 and 5");
  }

  return {
    ...message,
    metadata: {
      ...(message.metadata || {}),
      userRating: rating,
    },
  };
}

// New utility function to get message stats
export function getMessageStats(messages: MessageExtended[]) {
  return {
    totalMessages: messages.length,
    averageRating:
      messages.reduce((acc, msg) => acc + (msg.metadata?.userRating || 0), 0) /
      messages.length,
    topTags: Array.from(
      new Set(messages.flatMap((msg) => msg.metadata?.tags || []))
    ),
  };
}
