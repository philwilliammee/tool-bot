import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const dataRowReaderConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "data_row_reader",
        description: "Read data rows from the uploaded dataset. Access specific rows or filter data based on field values.",
        inputSchema: {
          json: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["get_row", "get_rows", "filter_rows", "get_stats", "get_schema"],
                description: "Action to perform on the data",
              },
              index: {
                type: "number",
                description: "Row index for get_row action (zero-based)",
              },
              startIndex: {
                type: "number",
                description: "Starting row index for get_rows action (zero-based)",
                default: 0,
              },
              endIndex: {
                type: "number",
                description: "Ending row index for get_rows action (exclusive)",
              },
              limit: {
                type: "number",
                description: "Maximum number of rows to return",
                default: 10,
                maximum: 100,
              },
              field: {
                type: "string",
                description: "Field name to filter or get statistics on",
              },
              value: {
                type: "string",
                description: "Value to filter by (for filter_rows action)",
              },
              operator: {
                type: "string",
                enum: ["equals", "contains", "greater_than", "less_than", "not_equals"],
                description: "Comparison operator for filtering",
                default: "equals",
              },
              sortBy: {
                type: "string",
                description: "Field to sort results by",
              },
              sortOrder: {
                type: "string",
                enum: ["asc", "desc"],
                description: "Sort order (ascending or descending)",
                default: "asc",
              },
            },
            required: ["action"],
          },
        },
      },
    },
  ],
};