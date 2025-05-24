import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const fetchToolConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "fetch_url",
        description: `🌐 **UNIVERSAL WEB RESEARCH TOOL** - Access any public HTTPS website or API for current information, fact-checking, and research.

Perfect for:
• **Current Events & News** - Get up-to-date information and breaking news
• **Research & Documentation** - Access tutorials, guides, and technical documentation
• **Fact Verification** - Cross-reference information from authoritative sources
• **Market Analysis** - Gather current data on trends, pricing, and competitors
• **API Integration** - Fetch data from public APIs and services

**Key Features:**
- Converts HTML to clean, readable markdown (80-90% memory reduction)
- Automatically displays content in preview tab for immediate reading
- Removes scripts, styles, and navigation for content focus
- Professional GitHub-style markdown rendering
- Perfect for AI analysis and human review

**Parameters:**
- url: HTTPS URL to fetch
- method: HTTP method (GET only)
- convertToMarkdown: Convert HTML to markdown (default: true)
- autoPreview: Show markdown in preview tab (default: true)
- autoSwitchTab: Switch to preview tab automatically (default: true)

Use this tool whenever you need current information that might not be in your training data.`,
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
