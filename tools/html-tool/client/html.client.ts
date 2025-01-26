import { ClientTool } from "../../client/tool.interface";
import { HtmlToolInput, HtmlToolResponse } from "../types";

function createHtmlDocument({ content }: { content: string }): string {
  const data = window.availableData;

  return /*html*/ `
    <!DOCTYPE html>
    <html>
      <head>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://d3js.org/d3.v7.min.js"></script>
        <style>
          body {
            margin: 0;
            padding: 1rem;
            font-family: system-ui, -apple-system, sans-serif;
            line-height: 1.5;
            color: #1f2937;
          }
          * { box-sizing: border-box; }

          img, video, canvas {
            max-width: 100%;
            height: auto;
          }

          .chart-container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
          }
        </style>
                ${
                  data
                    ? `
<script>
  (function() {
    try {
      window.availableData = ${JSON.stringify(data)};
    } catch (error) {
      console.error('Error initializing data:', error);
    }
  })();
</script>
        `
                    : ""
                }
      </head>
      <body>
        ${content}
      </body>
    </html>
  `;
}
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

      const htmlContent = createHtmlDocument({
        content: input.html,
      });

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
