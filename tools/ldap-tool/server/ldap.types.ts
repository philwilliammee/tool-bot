export interface LdapConfig {
  url: string;
  user: string;
  password: string;
}

export type LdapData = Record<string, string>;

export interface LdapSearchInput {
  searchTerm: string;
}

export interface LdapSearchResponse {
  status: string;
  data: LdapData[];
  error?: boolean;
  message?: string;
}

// Load and validate environment variables
const requiredEnvVars = [
  "LDAP_URL",
  "LDAP_USER",
  "LDAP_PASSWORD",
  "LDAP_BASE",
  "LDAP_DN",
] as const;

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const ldapConfig: LdapConfig = {
  url: process.env.LDAP_URL!,
  user: process.env.LDAP_USER!,
  password: process.env.LDAP_PASSWORD!,
};

Object.freeze(ldapConfig);
