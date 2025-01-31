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

If the user makes you aware of available data:
- it can be accessed via window.availableData.
- Access this in the html <script> tag make sure you're code is wrapped in an IIFE with error handling.
- always strive to make the html a reusable template with the javascript code as a separate script tag that updates the html content with the data.

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
