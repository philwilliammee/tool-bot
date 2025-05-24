import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const fetchToolConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "fetch_url",
        description: `Fetch and analyze content from any public website or API. Perfect for research, fact-checking, and gathering current information.

Key capabilities:
• Research current events, news, and real-time information
• Look up documentation, tutorials, and reference materials
• Access public APIs and data sources
• Verify facts and gather supporting evidence
• Analyze competitor websites and market data

For specific use cases:
• Weather data: https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}
• Web search: https://duckduckgo.com/?q={search_terms}&kp=-1&kl=us-en
• Any public HTTPS website for research and information gathering

HTML content is automatically converted to clean markdown for better readability and memory efficiency. The markdown content is also automatically displayed in the preview tab for easy reading and analysis.`,
        inputSchema: {
          json: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "The HTTPS URL to fetch from. Can be any public website or API endpoint.",
                pattern: "^https://",
              },
              method: {
                type: "string",
                enum: ["GET"],
                default: "GET",
                description: "HTTP method (only GET is supported)",
              },
              convertToMarkdown: {
                type: "boolean",
                description: "Convert HTML content to markdown for cleaner, more memory-efficient output",
                default: true,
              },
              autoPreview: {
                type: "boolean",
                description: "Automatically show the content in the preview tab when markdown is generated",
                default: true,
              },
            },
            required: ["url"],
          },
        },
      },
    },
  ],
};
