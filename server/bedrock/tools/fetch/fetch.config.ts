// server/tools/fetch/fetch.config.ts
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const fetchToolConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "fetch_url",
        description: `Fetch content from a specified URL. Only HTTPS URLs from allowed domains are supported. Returns JSON or text content.
* for weather queries use: https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}
* for Cornell IT users and IT info search you can use: https://it.cornell.edu/search?search-help-query=YOUR_QUERY_HERE&btnG=go&sitesearch=on
* for General Cornell search https://www.cornell.edu/search/?q=YOUR_QUERY_HERE
* for Cornell articles search https://news.cornell.edu/search?search_api_fulltext=YOUR_QUERY_HERE
`,
        inputSchema: {
          json: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description:
                  "The HTTPS URL to fetch from. Must be from an allowed domain.",
                pattern: "^https://",
              },
              method: {
                type: "string",
                enum: ["GET"],
                default: "GET",
                description: "HTTP method (only GET is supported)",
              },
            },
            required: ["url"],
          },
        },
      },
    },
  ],
};
