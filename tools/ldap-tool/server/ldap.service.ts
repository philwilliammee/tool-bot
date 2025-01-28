import { ServerTool } from "../../server/tool.interface.js";
import { Request, Response } from "express";
import { Client, SearchOptions } from "ldapts";
import { ldapConfig, LdapData, LdapSearchInput } from "./ldap.types.js";

class LdapService {
  private cache: Map<string, LdapData[]> = new Map();

  public async searchUser(searchTerm: string): Promise<LdapData[]> {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    const filter = `(|(uid=${searchTerm}*)(sn=${searchTerm}*)(cn=${searchTerm}*))`;
    return this.getLdapRecords(filter);
  }

  private async getLdapRecords(filter: string): Promise<LdapData[]> {
    if (this.cache.has(filter)) {
      return this.cache.get(filter) as LdapData[];
    }

    const client = new Client({
      url: ldapConfig.url,
      connectTimeout: 30000,
    });

    try {
      await client.bind(ldapConfig.dn, ldapConfig.password);

      const ldapSearchOptions: SearchOptions = {
        scope: "one", // 'sub' for subtree
        filter,
        sizeLimit: 100,
        timeLimit: 30,
      };

      const { searchEntries } = await client.search(
        ldapConfig.base,
        ldapSearchOptions
      );
      const entries = searchEntries as LdapData[];
      this.cache.set(filter, entries);
      return entries;
    } finally {
      client.unbind();
    }
  }
}

const ldapService = new LdapService();

export const ldapTool: ServerTool = {
  name: "ldap_search",
  route: "/ldap-search",
  handler: async (req: Request, res: Response): Promise<void> => {
    try {
      const { searchTerm } = req.body as LdapSearchInput;

      if (!searchTerm || typeof searchTerm !== "string") {
        res.status(400).json({
          error: true,
          message: "Search term is required",
        });
        return;
      }

      const results = await ldapService.searchUser(searchTerm);
      res.json({
        status: "success",
        data: results,
      });
    } catch (error: any) {
      console.error("LDAP search error:", error);
      res.status(500).json({
        error: true,
        message: error.message || "Failed to search LDAP",
      });
    }
  },
};
