// tools/bash_tool/server/bash.types.ts
import { fileURLToPath } from "url";
import { dirname } from "path";
import { BASH_CONFIG, BlockedGitArgs } from "../bash.config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const WORKING_DIRECTORY = dirname(dirname(dirname(__dirname)));

export const gitHelpers = {
  isBlockedArg: (arg: string): arg is BlockedGitArgs =>
    BASH_CONFIG.GIT_CONFIG.BLOCKED_ARGS.includes(arg as BlockedGitArgs),

  isAllowedOrigin: (url: string): boolean =>
    BASH_CONFIG.GIT_CONFIG.ALLOWED_ORIGINS.some((origin) =>
      url.includes(origin)
    ),
};

export const npmHelpers = {
  isBlockedPackage: (pkg: string): boolean =>
    BASH_CONFIG.NPM_CONFIG.BLOCKED_PACKAGES.includes(pkg),

  isAllowedScript: (script: string): boolean =>
    BASH_CONFIG.NPM_CONFIG.ALLOWED_SCRIPTS.includes(script),
};
