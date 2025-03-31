// tools/project-search-tool/config.ts
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const projectSearchConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "project_search",
        description: "Search through project history and conversation messages with advanced filtering options.",
        inputSchema: {
          json: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query string to find in project messages"
              },
              filters: {
                type: "object",
                description: "Optional filters to narrow search results",
                properties: {
                  projectIds: {
                    type: "array",
                    items: {
                      type: "string"
                    },
                    description: "Optional list of project IDs to limit search to"
                  },
                  dateRange: {
                    type: "object",
                    properties: {
                      from: {
                        type: "number",
                        description: "Start timestamp for date range filter"
                      },
                      to: {
                        type: "number",
                        description: "End timestamp for date range filter"
                      }
                    }
                  },
                  messageType: {
                    type: "string",
                    enum: ["user", "assistant", "tool_result"],
                    description: "Filter by message type"
                  },
                  limit: {
                    type: "number",
                    description: "Maximum number of results to return (default: 50)",
                    default: 50
                  },
                  includeArchived: {
                    type: "boolean",
                    description: "Whether to include archived messages in search",
                    default: true
                  }
                }
              },
              sort: {
                type: "object",
                description: "Sorting options for search results",
                properties: {
                  field: {
                    type: "string",
                    enum: ["date", "relevance"],
                    description: "Field to sort results by",
                    default: "date"
                  },
                  direction: {
                    type: "string",
                    enum: ["asc", "desc"],
                    description: "Sort direction",
                    default: "desc"
                  }
                }
              }
            },
            required: ["query"]
          }
        }
      }
    }
  ]
};