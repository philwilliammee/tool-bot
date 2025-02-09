// tools/bash_tool/server/bash.service.ts
import { ServerTool } from "../../server/tool.interface";
import { Request, Response } from "express";
import { BashInput, BashOutput, CommandType } from "../types";
import { BASH_CONFIG } from "../bash.config";
import { WORKING_DIRECTORY, gitHelpers, npmHelpers } from "./bash.types";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

class BashService {
  private isCommandAllowed(command: string, type: CommandType): boolean {
    const baseCommand = command.split(" ")[0];
    const fullCommand = command.split(" ").slice(0, 2).join(" ");

    return BASH_CONFIG.ALLOWED_COMMANDS[type].some(
      (allowed) => baseCommand === allowed || fullCommand === allowed
    );
  }

  private validateGitCommand(command: string, args: string[] = []): void {
    const hasBlockedArg = args.some((arg) => gitHelpers.isBlockedArg(arg));
    if (hasBlockedArg) {
      throw new Error("Blocked git argument detected");
    }

    if (command.includes("git remote") || command.includes("git clone")) {
      const url = args.find((arg) => arg.includes("://"));
      if (url && !gitHelpers.isAllowedOrigin(url)) {
        throw new Error("Git operation not allowed for this remote origin");
      }
    }
  }

  private validateNpmCommand(command: string, args: string[] = []): void {
    const hasBlockedPackage = args.some((arg) =>
      npmHelpers.isBlockedPackage(arg)
    );
    if (hasBlockedPackage) {
      throw new Error("Blocked npm package detected");
    }

    if (command.includes("npm run")) {
      const script = args[0];
      if (!npmHelpers.isAllowedScript(script)) {
        throw new Error(`npm script '${script}' not in allowed list`);
      }
    }
  }

  async execute(input: BashInput): Promise<BashOutput> {
    try {
      const type = (input.type || "general") as CommandType;

      if (!this.isCommandAllowed(input.command, type)) {
        throw new Error(`Command not allowed: ${input.command}`);
      }

      if (type === "git") {
        this.validateGitCommand(input.command, input.args);
      } else if (type === "npm") {
        this.validateNpmCommand(input.command, input.args);
      }

      const command = input.args
        ? `${input.command} ${input.args.join(" ")}`
        : input.command;

      const { stdout, stderr } = await execAsync(command, {
        cwd: input.cwd || WORKING_DIRECTORY,
        timeout: Math.min(
          input.timeout || BASH_CONFIG.DEFAULT_TIMEOUT,
          BASH_CONFIG.MAX_TIMEOUT
        ),
        env: {
          ...process.env,
          PATH: process.env.PATH,
          NODE_ENV: process.env.NODE_ENV,
        },
      });

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
        command,
      };
    } catch (error: any) {
      return {
        stdout: "",
        stderr: error.stderr || "",
        exitCode: error.code || 1,
        error: true,
        message: error.message,
        command: input.command,
      };
    }
  }
}

const bashService = new BashService();

export const bashTool: ServerTool = {
  name: "bash",
  route: "/bash",
  handler: async (req: Request, res: Response) => {
    try {
      const result = await bashService.execute(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        stdout: "",
        stderr: "",
        exitCode: 1,
        error: true,
        message: error.message || "Command execution failed",
      });
    }
  },
};
