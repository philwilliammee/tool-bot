/**
 * Interface for client-side tools
 */
export interface ClientTool {
  /** Unique identifier for the tool */
  name: string;

  /** Function that executes the tool's functionality */
  execute: (input: any) => Promise<any>;
}

/**
 * Type for the registry of client tools
 */
export type ClientToolRegistry = {
  [key: string]: ClientTool;
};
