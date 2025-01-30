// tools/html-tool/config.ts
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const htmlToolConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "html",
        description: `
Renders HTML content with data visualization capabilities in a secure Iframe.

Requirements:
- Escape special characters properly.
- Use HTML5, CSS3, and modern ES6+ JavaScript.
- Keep responses concise and human-readable but inline (no multiline formatting).
- No comments.

If data is available it can be accessed via window.availableData. Access this in the html <script> tag make sure you're code is wrapped in an IIFE with error handling. Please ensure safe parsing for all numeric fields (parseFloat for decimals, parseInt for whole numbers) and include error handling for missing/invalid values with appropriate number formatting.
`,
        inputSchema: {
          json: {
            type: "object",
            properties: {
              html: {
                type: "string",
                description: "Raw HTML markup to render",
              },
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
