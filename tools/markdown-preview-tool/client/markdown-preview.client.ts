import { ClientTool } from "../../client/tool.interface";
import { MarkdownPreviewInput, MarkdownPreviewResponse } from "../types";
import { marked } from "marked";

// Helper function to switch to preview tab
function switchToPreviewTab() {
  try {
    // Find and click the preview tab
    const previewTab = document.querySelector('[data-tab="preview-tab"]') as HTMLElement;
    if (previewTab) {
      previewTab.click();
    } else {
      // Fallback: try to activate the preview tab directly
      const previewTabContent = document.querySelector('#preview-tab') as HTMLElement;
      const workAreaTab = document.querySelector('#work-area-tab') as HTMLElement;
      const dataTab = document.querySelector('#data-tab') as HTMLElement;

      if (previewTabContent && workAreaTab && dataTab) {
        // Remove active class from all tabs
        previewTabContent.classList.add('active');
        workAreaTab.classList.remove('active');
        dataTab.classList.remove('active');
      }
    }
  } catch (error) {
    console.warn("Could not switch to preview tab:", error);
  }
}

export const markdownPreviewTool: ClientTool = {
  name: "markdown_preview",
  execute: async (input: MarkdownPreviewInput): Promise<MarkdownPreviewResponse> => {
    try {
      const iframe = document.querySelector("#html-tool-frame") as HTMLIFrameElement;
      if (!iframe) {
        throw new Error("Preview iframe not found");
      }

      // Configure marked with safe options
      marked.setOptions({
        gfm: true,
        breaks: true,
      });

      // Convert markdown to HTML
      const htmlContent = await marked.parse(input.markdown);
      const title = input.title || "Markdown Preview";

      // Create a styled HTML document for the markdown content
      const styledDocument = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #24292e;
              background-color: #ffffff;
              max-width: 980px;
              margin: 0 auto;
              padding: 20px;
              box-sizing: border-box;
            }

            h1, h2, h3, h4, h5, h6 {
              margin-top: 24px;
              margin-bottom: 16px;
              font-weight: 600;
              line-height: 1.25;
              color: #1f2328;
            }

            h1 { font-size: 2em; border-bottom: 1px solid #d1d9e0; padding-bottom: 8px; }
            h2 { font-size: 1.5em; border-bottom: 1px solid #d1d9e0; padding-bottom: 8px; }
            h3 { font-size: 1.25em; }
            h4 { font-size: 1em; }
            h5 { font-size: 0.875em; }
            h6 { font-size: 0.85em; color: #656d76; }

            p {
              margin-top: 0;
              margin-bottom: 16px;
            }

            a {
              color: #0969da;
              text-decoration: none;
            }

            a:hover {
              text-decoration: underline;
            }

            code {
              padding: 0.2em 0.4em;
              margin: 0;
              font-size: 85%;
              background-color: rgba(175, 184, 193, 0.2);
              border-radius: 6px;
              font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
            }

            pre {
              padding: 16px;
              overflow: auto;
              font-size: 85%;
              line-height: 1.45;
              background-color: #f6f8fa;
              border-radius: 6px;
              border: 1px solid #d1d9e0;
            }

            pre code {
              background-color: transparent;
              border: 0;
              display: inline;
              line-height: inherit;
              margin: 0;
              max-width: auto;
              overflow: visible;
              padding: 0;
              word-wrap: normal;
            }

            blockquote {
              padding: 0 1em;
              color: #656d76;
              border-left: 0.25em solid #d1d9e0;
              margin: 0 0 16px 0;
            }

            ul, ol {
              padding-left: 2em;
              margin-top: 0;
              margin-bottom: 16px;
            }

            li {
              margin-bottom: 0.25em;
            }

            table {
              border-spacing: 0;
              border-collapse: collapse;
              display: block;
              width: max-content;
              max-width: 100%;
              overflow: auto;
              margin-bottom: 16px;
            }

            table th,
            table td {
              padding: 6px 13px;
              border: 1px solid #d1d9e0;
            }

            table th {
              font-weight: 600;
              background-color: #f6f8fa;
            }

            table tr {
              background-color: #ffffff;
              border-top: 1px solid #d1d9e0;
            }

            table tr:nth-child(2n) {
              background-color: #f6f8fa;
            }

            hr {
              height: 0.25em;
              padding: 0;
              margin: 24px 0;
              background-color: #d1d9e0;
              border: 0;
            }

            img {
              max-width: 100%;
              height: auto;
              border-radius: 6px;
            }

            .markdown-header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 16px 20px;
              margin: -20px -20px 20px -20px;
              border-radius: 8px 8px 0 0;
            }

            .markdown-header h1 {
              margin: 0;
              color: white;
              border: none;
              padding: 0;
              font-size: 1.5em;
            }

            .source-info {
              background-color: #f8fafc;
              border-left: 3px solid #3b82f6;
              padding: 8px 12px;
              margin-bottom: 24px;
              font-size: 0.875em;
              color: #475569;
              border-radius: 0 4px 4px 0;
            }

            .source-info strong {
              color: #1e293b;
            }

            .source-info small {
              color: #64748b;
            }

            @media (max-width: 768px) {
              body {
                padding: 10px;
              }

              .markdown-header {
                margin: -10px -10px 20px -10px;
              }
            }
          </style>
        </head>
        <body>
          <div class="markdown-header">
            <h1>${title}</h1>
          </div>
          <div class="source-info">
            <strong>🔗 Source:</strong> ${title.replace('Web Content: ', '')}<br>
            <small>Converted from HTML • ${new Date().toLocaleString()}</small>
          </div>
          ${htmlContent}
        </body>
        </html>
      `;

      // Set the iframe content
      iframe.srcdoc = styledDocument;

      // Auto-switch to preview tab if requested
      if (input.autoShow !== false) {
        switchToPreviewTab();
      }

      return {
        success: true,
        message: `Markdown preview rendered successfully: ${title}`,
        title,
      };
    } catch (error: any) {
      console.error("Markdown preview error:", error);
      return {
        success: false,
        error: true,
        message: error.message || "Failed to render markdown preview",
      };
    }
  },
};
