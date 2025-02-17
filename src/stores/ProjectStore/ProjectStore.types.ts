import { MessageExtended } from "../../app.types";

/**
 * Metadata for a project, stored in localStorage under METADATA_KEY
 */
export interface ProjectMetadata {
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

  /** Number of messages in the project */
  messageCount: number;

  /** Timestamp of last message update */
  lastMessageDate: number;

  /** Optional project status */
  status?: "active" | "archived";

  /** Optional version for data migration */
  version?: number;
}

/**
 * Project messages stored separately in localStorage
 * under key: `project_${id}_messages`
 */
export interface ProjectMessages {
  /** Reference to parent project */
  projectId: string;

  /** Array of messages in the project */
  messages: MessageExtended[];

  /** Optional metadata for message collection */
  metadata?: {
    lastSync?: number;
    isCompressed?: boolean;
    messageIds?: string[]; // For integrity checking
    archiveSummary?: {
      summary: string | null;
      lastSummarizedMessageIds: string[];
      lastSummarization: number;
    };
  };
}

/**
 * Helper type for project updates
 */
export type ProjectUpdate = Partial<Omit<ProjectMetadata, "id" | "createdAt">>;

/**
 * Helper function to validate project metadata
 */
export function isValidProjectMetadata(data: unknown): data is ProjectMetadata {
  const metadata = data as ProjectMetadata;
  return (
    typeof metadata === "object" &&
    typeof metadata.id === "string" &&
    typeof metadata.name === "string" &&
    typeof metadata.createdAt === "number" &&
    typeof metadata.updatedAt === "number" &&
    typeof metadata.messageCount === "number" &&
    typeof metadata.lastMessageDate === "number"
  );
}
