import { Request, Response } from "express";

/**
 * Interface for server-side tools
 */
export interface ServerTool {
  /** Unique identifier for the tool */
  name: string;

  /** Path for the tool's endpoint */
  route: string;

  /** Handler for the tool's HTTP endpoint */
  handler: (req: Request, res: Response) => Promise<void>;
}

/**
 * Type for the registry of server tools
 */
export type ServerToolRegistry = {
  [key: string]: ServerTool;
};
