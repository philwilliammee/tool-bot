import { Message } from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended } from "../types/tool.types";

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

  console.log(`Active start index adjusted to: ${activeStartIndex}`);

  return messages.map((message, index) => {
    const hasToolUse = message.content?.some((block) => block.toolUse);
    const hasToolResult = message.content?.some((block) => block.toolResult);

    return {
      ...message,
      metadata: {
        hasToolUse,
        hasToolResult,
        sequenceNumber: index,
        isArchived: index < activeStartIndex,
      },
    };
  });
}
