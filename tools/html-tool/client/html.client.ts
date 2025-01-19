import { ClientTool } from "../../client/tool.interface";
import { HtmlToolInput, HtmlToolResponse } from "../types";

export const htmlTool: ClientTool = {
  name: "html",
  execute: async (input: HtmlToolInput): Promise<HtmlToolResponse> => {
    try {
      const iframe = document.querySelector(
        "#html-tool-frame"
      ) as HTMLIFrameElement;

      if (!iframe) {
        throw new Error("HTML tool iframe not found");
      }

      const htmlContent = createHtmlDocument(input.html);
      iframe.srcdoc = htmlContent;

      return {
        message: "HTML rendered successfully",
      };
    } catch (error: any) {
      console.error("HTML Tool error:", error);
      return {
        error: true,
        message: error.message || "Failed to render HTML",
      };
    }
  },
};

// Moved template creation to a separate function
function createHtmlDocument(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 1rem;
            font-family: system-ui, -apple-system, sans-serif;
            line-height: 1.5;
            color: #1f2937;
          }
          * { box-sizing: border-box; }

          /* Basic responsive defaults */
          img, video, canvas {
            max-width: 100%;
            height: auto;
          }

          /* Basic chart/visualization defaults */
          .chart-container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `;
}
