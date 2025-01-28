// tools/data-store-tool/config.ts
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const dataStoreConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "data_store",
        description:
          "Store and manage data in the application's data store. Use this to maintain state between conversations.",
        inputSchema: {
          json: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["store", "retrieve", "update", "delete", "list"],
                description: "The action to perform on the data store",
              },
              key: {
                type: "string",
                description: "Unique identifier for the data",
              },
              data: {
                type: "object",
                description: "Data to store or update",
              },
              metadata: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string", enum: ["json"] },
                  description: { type: "string" },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
            required: ["action"],
          },
        },
      },
    },
  ],
};
