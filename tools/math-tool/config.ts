import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const mathToolConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "math",
        description:
          "A mathematical evaluation tool using mathjs library. Always use direct mathematical expressions, not natural language.",
        inputSchema: {
          json: {
            type: "object",
            properties: {
              expression: {
                type: "string",
                description: "Mathematical expression to evaluate",
                examples: [
                  "2 + 3 * 4",
                  "sqrt(16)",
                  "(15/100) * 80",
                  "mean([1,2,3,4])",
                  "std([2,4,6])",
                  "sin(45 * pi / 180)",
                  "cos(60 * pi / 180)",
                  "12.7 * 2.54",
                  "100 / 1.60934",
                  "[1,2,3] * 2",
                  "det([-1, 2; 3, 1])",
                ],
              },
            },
            required: ["expression"],
          },
        },
      },
    },
  ],
};
