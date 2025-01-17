import { Client, SearchOptions } from "ldapts";
import { LdapConfig } from "./ldap.config";

type LdapData = Record<string, string>;

/**
 * LDAP helper class
 * https://github.com/ldapts/ldapts#search-example
 */
export class LDAP {
  private dn!: string;
  private password!: string;
  private base = "ou=People,o=Cornell University,c=US";
  private ldapUrl!: string;
  private cache: Map<string, LdapData[]> = new Map();

  constructor(config: LdapConfig) {
    if (!config) {
      console.error("ERROR: LDAP configuration is missing");
      return;
    }
    this.dn = `uid=${config.user},ou=Directory Administrators,o=Cornell University,c=US`;
    this.password = config.password;
    this.ldapUrl = config.url;
  }

  public async searchUser(searchTerm: string): Promise<LdapData[]> {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    const filter = `(|(uid=${searchTerm}*)(sn=${searchTerm}*)(cn=${searchTerm}*))`;

    return this.getLdapRecords(filter);
  }

  /**
   * Self contained client for LDAP search
   */
  private async getLdapRecords(filter: string): Promise<LdapData[]> {
    if (this.cache.has(filter)) {
      return this.cache.get(filter) as LdapData[];
    }
    // sometimes this errors with connection time out. It may be better to have a retry mechanism. For now handle this in the caller.
    const client = new Client({
      url: this.ldapUrl,
      connectTimeout: 10000,
    });

    try {
      await client.bind(this.dn, this.password);

      const ldapSearchOptions: SearchOptions = {
        scope: "sub",
        filter,
        sizeLimit: 100,
        timeLimit: 60, // in seconds
      };

      const { searchEntries } = await client.search(
        this.base,
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
