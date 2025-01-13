// src/tools/htmlTool/htmlTool.ts
import { ClientTool } from "../tools";
import { HtmlToolInput, HtmlToolResponse } from "./htmlTool.types";

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

      // Write the HTML content to the iframe
      const doc = iframe.contentDocument;
      if (!doc) {
        throw new Error("Could not access iframe document");
      }

      // Write the full HTML document with some default styles
      doc.open();
      doc.write(`
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
            ${input.html}
          </body>
        </html>
      `);
      doc.close();

      return {
        html: input.html,
        message: "HTML rendered successfully",
      };
    } catch (error: any) {
      console.error("HTML Tool error:", error);
      return {
        html: input.html,
        error: true,
        message: error.message || "Failed to render HTML",
      };
    }
  },
  systemPrompt: `You can generate and render HTML visualizations and web content using the html tool. The content will be displayed in an iframe in the right panel.

Capabilities:
- Generate any valid HTML markup
- Include embedded CSS styles
- Add basic interactivity with JavaScript
- Create visualizations, layouts, and UI components

Examples:

1. Data Visualization:
{
  "name": "html",
  "input": {
    "html": "
      <div class='chart-container'>
        <style>
          .bar { background: #3b82f6; margin: 4px; color: white; padding: 8px; }
        </style>
        <div class='bar' style='width: 80%'>80%</div>
        <div class='bar' style='width: 45%'>45%</div>
        <div class='bar' style='width: 60%'>60%</div>
      </div>
    "
  }
}

2. Interactive Component:
{
  "name": "html",
  "input": {
    "html": "
      <div class='widget'>
        <style>
          .color-preview {
            width: 100px;
            height: 100px;
            border: 1px solid #ccc;
          }
        </style>
        <input type='color' id='picker'>
        <div id='preview' class='color-preview'></div>
        <script>
          picker.oninput = e => preview.style.backgroundColor = e.target.value;
        </script>
      </div>
    "
  }
}

3. Responsive Layout:
{
  "name": "html",
  "input": {
    "html": "
      <style>
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        .card {
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
        }
      </style>
      <div class='grid'>
        <div class='card'>Card 1</div>
        <div class='card'>Card 2</div>
        <div class='card'>Card 3</div>
      </div>
    "
  }
}

Best Practices:
- Include all necessary CSS within the HTML
- Use responsive units (%, vh, vw, rem) for sizing
- Keep JavaScript scoped and simple
- Use semantic HTML elements
- Include fallback content when appropriate
- Consider iframe dimensions when designing layouts`,
};
