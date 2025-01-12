import { BaseTool } from "../baseTool.interface";

export const fetchTool: BaseTool = {
  name: "fetch_url",
  description: "Fetch content from a HTTPS URL",
  inputSchema: {
    url: { type: "string" },
    method: { type: "string", default: "GET" },
  },
  async execute(input) {
    const response = await fetch("/api/tools/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${await response.text()}`);
    }
    return await response.json();
  },
};
