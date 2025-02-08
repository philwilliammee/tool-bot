// src/utils/__tests__/openai.utils.test.ts
import { describe, it, expect } from "vitest";

import {
  ConverseStreamOutput,
  Message,
  ToolConfiguration,
} from "@aws-sdk/client-bedrock-runtime";
import {
  OpenaiStream,
  transformToBedrockStream,
  transformToOpenAIMessage,
  transformToolsToOpenAIFormat,
} from "./openai.utils";

describe("openai.utils", () => {
  describe("transformToOpenAIMessage", () => {
    it("should transform a user message correctly", () => {
      const message: Message = {
        role: "user",
        content: [{ text: "Hello" }],
      };

      const result = transformToOpenAIMessage(message);

      expect(result).toEqual({
        role: "user",
        content: "Hello",
      });
    });

    it("should transform an assistant message correctly", () => {
      const message: Message = {
        role: "assistant",
        content: [{ text: "Hello back" }],
      };

      const result = transformToOpenAIMessage(message);

      expect(result).toEqual({
        role: "assistant",
        content: "Hello back",
      });
    });

    it("should transform a tool result message correctly", () => {
      const message: Message = {
        role: "assistant",
        content: [
          {
            toolResult: {
              content: [{ text: "Tool result" }],
              toolUseId: "tool-123",
            },
          },
        ],
      };

      const result = transformToOpenAIMessage(message);

      expect(result).toEqual({
        role: "tool",
        content: "Tool result",
        tool_call_id: "tool-123",
      });
    });

    it("should transform an assistant message with tool use correctly", () => {
      const message: Message = {
        role: "assistant",
        content: [
          {
            toolUse: {
              toolUseId: "tool-123",
              name: "calculator",
              input: { num1: 1, num2: 2 },
            },
          },
        ],
      };

      const result = transformToOpenAIMessage(message);

      expect(result).toEqual({
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "tool-123",
            type: "function",
            function: {
              name: "calculator",
              arguments: JSON.stringify({ num1: 1, num2: 2 }),
            },
          },
        ],
      });
    });
  });

  describe("transformToolsToOpenAIFormat", () => {
    it("should transform valid tools correctly", () => {
      const toolConfig: ToolConfiguration = {
        tools: [
          {
            toolSpec: {
              name: "calculator",
              description: "Performs calculations",
              inputSchema: {
                json: {
                  type: "object",
                  properties: {
                    num1: { type: "number" },
                    num2: { type: "number" },
                  },
                },
              },
            },
          },
        ],
      };

      const result = transformToolsToOpenAIFormat(toolConfig);

      expect(result).toEqual([
        {
          type: "function",
          function: {
            name: "calculator",
            description: "Performs calculations",
            parameters: {
              type: "object",
              properties: {
                num1: { type: "number" },
                num2: { type: "number" },
              },
            },
          },
        },
      ]);
    });

    it("should return empty array for undefined tools", () => {
      const toolConfig: ToolConfiguration = {} as any;
      const result = transformToolsToOpenAIFormat(toolConfig);
      expect(result).toEqual([]);
    });

    it("should filter out invalid tools", () => {
      const toolConfig: any = {
        tools: [
          {
            toolSpec: {
              name: "valid",
              inputSchema: { json: { type: "object" } },
            },
          },
          {
            toolSpec: {
              // Missing name
              inputSchema: { json: { type: "object" } },
            },
          },
        ],
      };

      const result = transformToolsToOpenAIFormat(toolConfig);
      expect(result).toHaveLength(1);
      expect(result[0].function.name).toBe("valid");
    });
  });

  describe("transformToBedrockStream", () => {
    it("should transform basic content stream", async () => {
      const mockChunks = [
        {
          id: "test-id",
          choices: [
            { index: 0, delta: { role: "assistant", content: "Hello" } },
          ],
        },
        {
          id: "test-id",
          choices: [{ index: 0, delta: { content: " world" } }],
        },
        {
          id: "test-id",
          choices: [{ index: 0, finish_reason: "stop", delta: {} }],
        },
      ];

      const openAIStream = {
        [Symbol.asyncIterator]() {
          let index = 0;
          return {
            async next() {
              if (index < mockChunks.length) {
                return { value: mockChunks[index++], done: false };
              }
              return { value: undefined, done: true };
            },
          };
        },
      } as OpenaiStream;

      const bedrockStream = await transformToBedrockStream(openAIStream);
      const chunks: ConverseStreamOutput[] = [];
      const stream =
        bedrockStream.stream as AsyncIterable<ConverseStreamOutput>;
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toHaveProperty("messageStart");
      expect(chunks[chunks.length - 1]).toHaveProperty("messageStop");
    });

    it("should handle tool usage properly", async () => {
      const mockChunks = [
        {
          id: "test-id",
          choices: [
            {
              index: 0,
              delta: {
                role: "assistant",
                content: "Let's use the tool",
              },
            },
          ],
        },
        {
          id: "test-id",
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [
                  {
                    id: "tooluse_123",
                    function: {
                      name: "someTool",
                      arguments: '{"foo":"bar"}',
                    },
                  },
                ],
              },
            },
          ],
        },
        {
          id: "test-id",
          choices: [
            {
              index: 0,
              finish_reason: "function_call",
              delta: {},
            },
          ],
        },
      ];

      const openAIStream = {
        [Symbol.asyncIterator]() {
          let index = 0;
          return {
            async next() {
              if (index < mockChunks.length) {
                return { value: mockChunks[index++], done: false };
              }
              return { value: undefined, done: true };
            },
          };
        },
      } as OpenaiStream;

      const bedrockStream = await transformToBedrockStream(openAIStream);
      const chunks: ConverseStreamOutput[] = [];
      const stream =
        bedrockStream.stream as AsyncIterable<ConverseStreamOutput>;
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      // Validate the structure
      expect(chunks[0]).toMatchObject({
        messageStart: { role: "assistant" },
      });
      expect(chunks[1]).toMatchObject({
        contentBlockDelta: {
          contentBlockIndex: 0,
          delta: { text: "Let's use the tool" },
        },
      });
      expect(chunks[2]).toMatchObject({
        contentBlockStart: {
          contentBlockIndex: 1,
          start: {
            toolUse: {
              name: "someTool",
              toolUseId: "tooluse_123",
            },
          },
        },
      });
      expect(chunks[3]).toMatchObject({
        contentBlockDelta: {
          contentBlockIndex: 1,
          delta: {
            toolUse: {
              input: '{"foo":"bar"}',
            },
          },
        },
      });
      expect(chunks[4]).toMatchObject({
        contentBlockStop: { contentBlockIndex: 1 },
      });
      expect(chunks[5]).toMatchObject({
        messageStop: { stopReason: "tool_use" },
      });
    });
  });
});
