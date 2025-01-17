// src/server/bedrock/tools/ldapTool/ldapTool.config.ts
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const ldapToolConfig: ToolConfiguration = {
  tools: [
    {
      toolSpec: {
        name: "ldap_search",
        description: "Search for users in the Cornell LDAP directory",
        inputSchema: {
          json: {
            type: "object",
            properties: {
              searchTerm: {
                type: "string",
                description: "Search term (name, username, or email)",
                minLength: 2,
              },
            },
            required: ["searchTerm"],
          },
        },
      },
    },
  ],
};
