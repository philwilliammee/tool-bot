// tools/bash_tool/config.ts
type GitConfig = {
  ALLOWED_ORIGINS: readonly string[];
  BLOCKED_ARGS: readonly string[];
};

type NpmConfig = {
  BLOCKED_PACKAGES: readonly string[];
  ALLOWED_SCRIPTS: readonly string[];
};

export const BASH_CONFIG = {
  ALLOWED_COMMANDS: {
    file: [
      "ls",
      "cat",
      "grep",
      "find",
      "mkdir",
      "touch",
      "rm",
      "cp",
      "mv",
      "echo",
    ] as string[],
    git: [
      "git init",
      "git add",
      "git commit",
      "git status",
      "git log",
      "git branch",
      "git checkout",
      "git pull",
      "git push",
      "git fetch",
      "git merge",
      "git diff",
      "git stash",
      "git reset",
      "git clean",
      "git", // Allow raw git command for multi-part operations
    ] as string[],
    npm: [
      "npm install",
      "npm uninstall",
      "npm run",
      "npm start",
      "npm test",
      "npm build",
      "npm update",
      "npm audit",
      "npm list",
      "npm outdated",
      "npm init",
      "npm", // Allow raw npm command for additional arguments
      "ng",
    ] as string[],
    general: ["pwd", "node", "npx", "tsc", "ng"] as string[],
  },
  MAX_TIMEOUT: 300000, // 5 minutes
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  BLOCKED_PATTERNS: [
    /\.\./, // No directory traversal
    /[&|;]/, // No command chaining
    />[^"']\s*\//, // No output redirection to files
    /rm\s+.+\s+-rf/, // No recursive force remove
  ] as readonly RegExp[],
  GIT_CONFIG: {
    ALLOWED_ORIGINS: ["github.com", "gitlab.com", "bitbucket.org"],
    BLOCKED_ARGS: ["--force", "-f", "--delete", "--remove"],
  } satisfies GitConfig,
  NPM_CONFIG: {
    BLOCKED_PACKAGES: ["malicious-package", "suspicious-module"],
    ALLOWED_SCRIPTS: [
      "start",
      "build",
      "test",
      "dev",
      "lint",
      // Add any additional npm scripts that should be allowed
    ],
  } satisfies NpmConfig,
} as const;

// Helper type to extract allowed args from config
export type BlockedGitArgs =
  (typeof BASH_CONFIG.GIT_CONFIG.BLOCKED_ARGS)[number];
export type AllowedNpmScripts =
  (typeof BASH_CONFIG.NPM_CONFIG.ALLOWED_SCRIPTS)[number];
