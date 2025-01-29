import { describe, expect, it } from "vitest";
import { ContentBlock, Message } from "@aws-sdk/client-bedrock-runtime";
import { testData as Data } from "./conversationTestData";
import { extendMessages } from "./messageUtils";

describe("extendMessages", () => {
  const testData = Data as Message[];

  it("should correctly identify tool use and results", () => {
    const extended = extendMessages(testData);

    // Test specific messages we know have tool use/results
    expect(extended[3].metadata).toMatchObject({
      hasToolUse: true,
      hasToolResult: false,
    });

    expect(extended[4].metadata).toMatchObject({
      hasToolUse: false,
      hasToolResult: true,
    });
  });

  it("should maintain message content integrity", () => {
    const extended = extendMessages(testData);

    // Test first message content remains unchanged
    expect(extended[0]).toMatchObject({
      role: "user",
      content: [{ text: "hi" }],
    });

    // Test a more complex message (HTML tool use)
    const htmlMessage = extended.find((msg) =>
      msg.content?.some((block: ContentBlock) => block.toolUse?.name === "html")
    );
    expect(htmlMessage?.content?.[0].text).toContain(
      "I'll create an engaging HTML presentation"
    );
  });

  it("should maintain conversation flows when archiving", () => {
    const threshold = 5;
    const extended = extendMessages(testData, threshold);

    // Find all user messages that aren't tool results
    const userQuestions = extended
      .map((msg, index) => ({
        index,
        isQuestion: msg.role === "user" && !msg.metadata?.hasToolResult,
      }))
      .filter((item) => item.isQuestion);

    // Log user questions for debugging
    console.log(
      "User questions found at indices:",
      userQuestions.map((q) => q.index)
    );

    // For each user question, verify its conversation flow
    userQuestions.forEach((question, i) => {
      const nextQuestionIndex = userQuestions[i + 1]?.index || extended.length;
      const conversation = extended.slice(question.index, nextQuestionIndex);

      // All messages in a conversation should have same archived status
      const isArchived = conversation[0].metadata?.isArchived;
      conversation.forEach((msg) => {
        expect(msg.metadata?.isArchived).toBe(isArchived);
      });
    });
  });

  it("should archive conversations based on threshold", () => {
    const threshold = 5;
    const extended = extendMessages(testData, threshold);

    // Find the actual split point (nearest user question to length - threshold)
    const userQuestions = extended
      .map((msg, index) => ({
        index,
        isQuestion: msg.role === "user" && !msg.metadata?.hasToolResult,
      }))
      .filter((item) => item.isQuestion);

    console.log("Threshold:", threshold);
    console.log("Total messages:", extended.length);
    console.log(
      "User questions at:",
      userQuestions.map((q) => q.index)
    );

    // Everything before the split should be archived
    const splitPoint = userQuestions
      .map((q) => q.index)
      .reduce((nearest, current) => {
        const target = extended.length - threshold;
        return Math.abs(current - target) < Math.abs(nearest - target)
          ? current
          : nearest;
      });

    console.log("Split point found at:", splitPoint);

    // Verify archival status
    extended.forEach((msg, index) => {
      if (index < splitPoint) {
        expect(msg.metadata?.isArchived).toBe(true);
      } else {
        expect(msg.metadata?.isArchived).toBe(false);
      }
    });
  });

  it("should handle threshold larger than message count", () => {
    const threshold = testData.length + 5;
    const extended = extendMessages(testData, threshold);

    // No messages should be archived if threshold is larger than message count
    extended.forEach((msg) => {
      expect(msg.metadata?.isArchived).toBe(false);
    });
  });
});
