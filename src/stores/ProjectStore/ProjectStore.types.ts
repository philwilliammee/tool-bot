import { MessageExtended } from "../../app.types";

/**
 * Core Project entity
 */
export interface Project {
  /** Unique identifier for the project */
  id: string;

  /** Display name of the project */
  name: string;

  /** Optional project description */
  description?: string;

  /** Timestamp of project creation */
  createdAt: number;

  /** Timestamp of last project update */
  updatedAt: number;

  /** Project status */
  status?: "active" | "archived";

  /** Version for data migrations */
  version?: number;

  /** Messages belonging to this project */
  messages: MessageExtended[];

  /** Project summary state */
  archiveSummary?: {
    summary: string | null;
    lastSummarizedMessageIds: string[];
    lastSummarization: number;
  };
}

/**
 * Helper type for project updates
 */
export type ProjectUpdate = Partial<
  Omit<Project, "id" | "createdAt" | "messages">
>;

/**
 * Helper function to validate project
 */
export function isValidProject(data: unknown): data is Project {
  const project = data as Project;
  return (
    typeof project === "object" &&
    typeof project.id === "string" &&
    typeof project.name === "string" &&
    typeof project.createdAt === "number" &&
    typeof project.updatedAt === "number" &&
    Array.isArray(project.messages)
  );
}
