// server/tools/calculator/calculator.config.ts
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const calculatorToolConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "calculator",
        description:
          "Perform mathematical calculations. Supports basic operations and expression evaluation.",
        inputSchema: {
          json: {
            type: "object",
            properties: {
              operation: {
                type: "string",
                enum: ["add", "subtract", "multiply", "divide", "evaluate"],
                description: "The mathematical operation to perform",
              },
              expression: {
                type: "string",
                description:
                  "Mathematical expression to evaluate (for evaluate operation)",
              },
              values: {
                type: "array",
                items: { type: "number" },
                description: "Array of numbers for basic operations",
              },
            },
            required: ["operation"],
          },
        },
      },
    },
  ],
};
