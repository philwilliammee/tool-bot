import { ClientTool } from "../../client/tool.interface";
import { FetchToolInput, FetchToolResponse } from "../server/fetch.types";

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

    return await response.json();
  },
};
