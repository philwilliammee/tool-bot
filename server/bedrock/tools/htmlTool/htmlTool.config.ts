// server/bedrock/tools/htmlTool/htmlTool.config.ts
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const htmlToolConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "html",
        description: `
Generate and render HTML content. Use for visualizations, layouts, and web development assistance.
Use basic CDN imports like <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
`,
        inputSchema: {
          json: {
            type: "object",
            properties: {
              html: {
                type: "string",
                description: "Raw HTML markup to render",
              },
              // Optional metadata for the AI to better understand the context
              context: {
                type: "string",
                description:
                  "Additional context about the visualization or HTML purpose",
              },
            },
            required: ["html"],
          },
        },
      },
    },
  ],
};
