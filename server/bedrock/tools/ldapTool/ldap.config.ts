// environment variables interface
export interface LdapEnvVars {
  LDAP_URL: string;
  LDAP_USER: string;
  LDAP_PASSWORD: string;
}

// Define the LDAP config interface
export interface LdapConfig {
  url: string;
  user: string;
  password: string;
}

// Define required environment variables
const requiredLdapEnvVars: (keyof LdapEnvVars)[] = [
  "LDAP_URL",
  "LDAP_USER",
  "LDAP_PASSWORD",
];

// Type the process.env
const typedEnv = process.env as unknown as LdapEnvVars;

// Validate required environment variables
requiredLdapEnvVars.forEach((key) => {
  if (typedEnv[key] === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

// Create the config object
export const ldapConfig: LdapConfig = {
  url: typedEnv.LDAP_URL,
  user: typedEnv.LDAP_USER,
  password: typedEnv.LDAP_PASSWORD,
};

// Optionally freeze the config to prevent modifications
Object.freeze(ldapConfig);

console.log(`LDAP config initialized. URL: ${ldapConfig.url}`);
