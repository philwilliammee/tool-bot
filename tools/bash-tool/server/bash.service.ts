import { ServerTool } from "../../server/tool.interface.js";
import { Request, Response } from "express";
import { BashInput, BashOutput } from "../types.js";
import { BASH_CONFIG } from "../bash.config.js";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

class BashService {
  private isCommandAllowed(fullCommand: string): boolean {
    // Check if the base command is in the allowed list
    const baseCommand = fullCommand.trim().split(' ')[0];
    return BASH_CONFIG.ALLOWED_COMMANDS.includes(baseCommand) || baseCommand === 'cd';
  }

  private validateCommand(command: string, cwd: string): void {
    // Prevent sudo commands
    if (command.includes('sudo')) {
      throw new Error('Sudo commands are not allowed');
    }

    // Resolve the current working directory to an absolute path
    const resolvedCwd = path.resolve(cwd);

    // Special handling for cd command
    const cdMatch = command.match(/cd\s+(.+)/);
    if (cdMatch) {
      const targetDir = cdMatch[1].trim();
      const resolvedTarget = path.resolve(resolvedCwd, targetDir);

      // Ensure the target directory is within or equal to the current working directory
      if (!resolvedTarget.startsWith(resolvedCwd)) {
        throw new Error('Cannot change directory outside the current working directory');
      }
    }

    // Allow pipes and command chaining, but with restrictions
    const chainedCommands = command.split(/[|;]/);
    for (const subCommand of chainedCommands) {
      const baseCommand = subCommand.trim().split(' ')[0];
      
      // Validate each command in the chain
      if (!BASH_CONFIG.ALLOWED_COMMANDS.includes(baseCommand) && 
          baseCommand !== 'cd') {
        throw new Error(`Command not allowed: ${baseCommand}`);
      }
    }
  }

  async execute(input: BashInput): Promise<BashOutput> {
    try {
      const workingDir = input.cwd || process.cwd();
      const fullCommand = input.args 
        ? `${input.command} ${input.args.join(' ')}` 
        : input.command;

      // Validate command before execution
      this.validateCommand(fullCommand, workingDir);

      // Check if command is allowed
      if (!this.isCommandAllowed(fullCommand)) {
        throw new Error(`Command not allowed: ${fullCommand}`);
      }

      // Execute command
      const { stdout, stderr } = await execAsync(fullCommand, {
        cwd: workingDir,
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
      };
    } catch (error: any) {
      return {
        stdout: '',
        stderr: error.stderr || '',
        exitCode: error.code || 1,
        error: true,
        message: error.message,
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
        stdout: '',
        stderr: '',
        exitCode: 1,
        error: true,
        message: error.message || 'Command execution failed',
      });
    }
  },
};