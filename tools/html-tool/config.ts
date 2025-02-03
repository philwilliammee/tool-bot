import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const htmlToolConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "html",
        description: `
Render HTML content in an isolated iframe environment. The iframe:
  - Receives HTML, CSS, and JavaScript inline and executes them securely.
  - Sends console output (console.log) back to the parent via postMessage.
  - Does not preserve state across render calls.

Requirements:
  - Escape special characters.
  - Use HTML5, CSS3, and modern ES6+ JavaScript.
  - Keep responses concise and inline.
  - No comments.

If additional data is provided:
  - It is accessible via \`window.availableData\`.
  - Wrap JavaScript in an IIFE that gracefully handles errors.
  - Keep the HTML a reusable template; place the JavaScript in a separate script tag to dynamically update the content with the data.
`,
        inputSchema: {
          json: {
            type: "object",
            properties: {
              html: {
                type: "string",
                description: "Raw HTML markup",
              },
              css: {
                type: "string",
                description: "CSS styles",
              },
              javascript: {
                type: "string",
                description:
                  "JavaScript code to execute; use console.log for output",
              },
              libraries: {
                type: "array",
                description: "List of CDN libraries to include in the iframe",
                items: {
                  type: "string",
                  enum: [
                    "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
                    "https://cdn.jsdelivr.net/npm/d3@7.8.5/dist/d3.min.js",
                    "https://unpkg.com/react@18/umd/react.production.min.js",
                    "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
                    "https://cdn.jsdelivr.net/npm/vue@3.2.37/dist/vue.global.prod.js",
                    "https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.min.js",
                    "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.7/MathJax.js?config=TeX-MML-AM_CHTML",
                  ],
                },
                default: [],
              },
            },
            required: ["html"],
          },
        },
      },
    },
  ],
};
