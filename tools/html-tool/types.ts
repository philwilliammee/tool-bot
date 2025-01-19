export interface HtmlToolInput {
  html: string;
  context?: string;
}

export interface HtmlToolResponse {
  error?: boolean;
  message?: string;
  renderedElement?: HTMLElement;
}

export const HTML_TOOL_DEFINITION = {
  name: "html",
  description: `
Generate and render HTML content. Use for visualizations, layouts, and web development assistance.
Use basic CDN imports like <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
`,
  schema: {
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
} as const;
