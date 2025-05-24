import { ClientTool } from "../../client/tool.interface";
import { FetchToolInput, FetchToolResponse } from "../server/fetch.types";
import { clientRegistry } from "../../registry.client";

export const fetchTool: ClientTool = {
  name: "fetch_url",
  execute: async (input: FetchToolInput): Promise<FetchToolResponse> => {
    const response = await fetch("/api/tools/fetch-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${await response.text()}`);
    }

    const result: FetchToolResponse = await response.json();

    // Auto-preview markdown content if enabled
    if (
      result.isMarkdown &&
      typeof result.data === 'string' &&
      input.autoPreview !== false
    ) {
      try {
        const markdownPreviewTool = clientRegistry.getTool('markdown_preview');
        if (markdownPreviewTool) {
          // Extract title from URL
          const urlObj = new URL(input.url);
          const title = urlObj.hostname;

          await markdownPreviewTool.execute({
            markdown: result.data,
            title: title,
            autoShow: true,
          });
        }
      } catch (error) {
        console.warn("Failed to auto-preview markdown:", error);
      }
    }

    return result;
  },
};
