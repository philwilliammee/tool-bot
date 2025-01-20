// src/utils/messageUtils.ts

import { Message } from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended } from "../types/tool.types";

function extractTags(message: Message): string[] {
  const text = message.content?.map((block) => block.text).join(" ") || "";
  const tags: string[] = [];

  const hashTags = text.match(/#\w+/g) || [];
  tags.push(...hashTags.map((tag) => tag.substring(1)));

  const tagSection = text.match(/(?:tags|labels):\s*\[(.*?)\]/i);
  if (tagSection) {
    const extractedTags = tagSection[1].split(",").map((t) => t.trim());
    tags.push(...extractedTags);
  }

  return Array.from(new Set(tags));
}

// This is the primary utility function used by MessageManager and ConverseStore
export function determineActiveMessageRange(
  messages: MessageExtended[],
  threshold: number
): {
  splitIndex: number;
  activeMessages: MessageExtended[];
} {
  // Find genuine user messages (excluding tool results)
  const userMessageIndices = messages
    .map((msg, index) => ({
      index,
      isUserMessage: msg.role === "user" && !msg.metadata.hasToolResult,
    }))
    .filter((item) => item.isUserMessage)
    .map((item) => item.index);

  // If we have no valid user messages, use standard threshold
  if (userMessageIndices.length === 0) {
    const splitIndex = Math.max(0, messages.length - threshold);
    return {
      splitIndex,
      activeMessages: messages.slice(splitIndex),
    };
  }

  // Find the appropriate split point based on user messages
  const targetIndex = Math.max(0, messages.length - threshold);
  const splitIndex = userMessageIndices.reduce((nearest, current) => {
    return Math.abs(current - targetIndex) < Math.abs(nearest - targetIndex)
      ? current
      : nearest;
  });

  return {
    splitIndex,
    activeMessages: messages.slice(splitIndex),
  };
}

// This function is kept for testing purposes only.
// The actual message extension and archival logic is now handled by MessageManager
export function extendMessages(
  messages: Message[],
  threshold = 10
): MessageExtended[] {
  const now = Date.now();

  // First, extend all messages with basic metadata
  const extendedMessages = messages.map((message) => {
    const hasToolUse = message.content?.some((block) => block.toolUse);
    const hasToolResult = message.content?.some((block) => block.toolResult);
    const existingMetadata = (message as MessageExtended).metadata || {};
    const messageTime = existingMetadata.createdAt || now;

    return {
      ...message,
      metadata: {
        ...existingMetadata,
        createdAt: messageTime,
        updatedAt: existingMetadata.updatedAt || messageTime,
        hasToolUse,
        hasToolResult,
        tags: existingMetadata.tags || extractTags(message),
        userRating: existingMetadata.userRating || 0,
      },
    };
  }) as MessageExtended[];

  const { splitIndex } = determineActiveMessageRange(
    extendedMessages,
    threshold
  );

  return extendedMessages.map((message, index) => ({
    ...message,
    metadata: {
      ...message.metadata,
      isArchived: index < splitIndex,
    },
  }));
}

export function updateMessageTags(
  message: MessageExtended,
  tags: string[]
): MessageExtended {
  return {
    ...message,
    metadata: {
      ...message.metadata,
      tags: Array.from(new Set(tags)),
      updatedAt: Date.now(),
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
      ...message.metadata,
      userRating: rating,
      updatedAt: Date.now(),
    },
  };
}

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
