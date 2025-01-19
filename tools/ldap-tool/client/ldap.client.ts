import { ClientTool } from "../../client/tool.interface";

interface LdapSearchInput {
  searchTerm: string;
}

interface LdapSearchResponse {
  status: string;
  data: Record<string, string>[];
  error?: boolean;
  message?: string;
}

export const ldapTool: ClientTool = {
  name: "ldap_search",
  execute: async (input: LdapSearchInput): Promise<LdapSearchResponse> => {
    const response = await fetch("/api/tools/ldap-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`LDAP search failed: ${await response.text()}`);
    }

    return await response.json();
  },
};
