import { ClientTool } from "../tools";

export const ldapTool: ClientTool = {
  name: "ldap_search",
  execute: async (input: { searchTerm: string }) => {
    const response = await fetch("/api/tools/ldap", {
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
