import { ClientTool } from "../tools";

export const fetchTool: ClientTool = {
  name: "fetch_url",
  execute: async (input: { url: string; method?: "GET" }) => {
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
  systemPrompt: `You can fetch and analyze web content using the fetch_url tool.
- Can retrieve data from HTTPS URLs
- Supports JSON, text, HTML, and markdown content

Use it like this:
{
  "name": "fetch_url",
  "input": {
    "url": "https://api.example.com/data",
    "method": "GET"
  }
}`,
};
