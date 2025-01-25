import { MessageExtended } from "../../app.types";

export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessageDate: number;
}

// Stored separately in localStorage with key: `project_${id}_messages`
export interface ProjectMessages {
  projectId: string;
  messages: MessageExtended[];
}
