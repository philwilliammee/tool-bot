import { ClientTool } from "../../client/tool.interface";
import { HtmlToolInput, HtmlToolResponse } from "../types";

interface HtmlToolDocumentInput {
  html: string;
  css?: string;
  javascript?: string;
  libraries?: string[];
}

function createHtmlDocument({
  html,
  css,
  javascript,
  libraries,
}: HtmlToolDocumentInput): string {
  const data = window.availableData;
  const defaultStyles = `
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
  `;

  const libraryScripts =
    libraries && libraries.length > 0
      ? libraries
          .map((lib: string) => `<script src="${lib}"></script>`)
          .join("\n")
      : `
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
      <script src="https://d3js.org/d3.v7.min.js"></script>
      <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/vue@3.2.37/dist/vue.global.prod.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.min.js"></script>
      <script async src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.7/MathJax.js?config=TeX-MML-AM_CHTML"></script>
    `;

  return /*html*/ `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${libraryScripts}
        <style>
          ${defaultStyles}
          ${css || ""}
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
        ${html}
        <script>
          (function() {
            const logs = [];
            const originalConsole = console.log;
            console.log = (...args) => {
              logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
              originalConsole.apply(console, args);
            };
            try {
              ${javascript || ""}
              window.parent.postMessage({ type: 'html-tool-result', logs }, '*');
            } catch (error) {
              window.parent.postMessage({ type: 'html-tool-error', error: error.message, logs }, '*');
            }
          })();
        </script>
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

      // Create the HTML document to render
      const htmlContent = createHtmlDocument({
        html: input.html,
        css: input.css,
        javascript: input.javascript,
        libraries: input.libraries,
      });

      // Set the iframe content
      iframe.srcdoc = htmlContent;

      // Wait for postMessage response from the iframe
      const executePromise = new Promise<HtmlToolResponse>(
        (resolve, reject) => {
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("Execution timeout after 5000ms"));
          }, 5000);

          const handleMessage = (event: MessageEvent) => {
            if (
              event.data.type === "html-tool-result" ||
              event.data.type === "html-tool-error"
            ) {
              cleanup();
              if (event.data.type === "html-tool-error") {
                resolve({
                  error: true,
                  message: event.data.error,
                  logs: event.data.logs,
                });
              } else {
                resolve({
                  message: "HTML rendered successfully",
                  logs: event.data.logs,
                });
              }
            }
          };

          const cleanup = () => {
            clearTimeout(timeout);
            window.removeEventListener("message", handleMessage);
          };

          window.addEventListener("message", handleMessage);
        }
      );

      return await executePromise;
    } catch (error: any) {
      console.error("HTML Tool error:", error);
      return {
        error: true,
        message: error.message || "Failed to render HTML",
      };
    }
  },
};
