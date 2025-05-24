import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const markdownPreviewConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "markdown_preview",
        description: `Render markdown content in the preview tab for better readability. Automatically called when fetch_url returns markdown content.

This tool converts markdown to clean HTML and displays it in the preview pane, making it easier to read and analyze fetched web content or documentation.`,
        inputSchema: {
          json: {
            type: "object",
            properties: {
              markdown: {
                type: "string",
                description: "Markdown content to render in the preview pane",
              },
              title: {
                type: "string",
                description: "Optional title for the preview (defaults to 'Markdown Preview')",
                default: "Markdown Preview",
              },
              autoShow: {
                type: "boolean",
                description: "Automatically switch to preview tab after rendering",
                default: true,
              },
            },
            required: ["markdown"],
          },
        },
      },
    },
  ],
};
