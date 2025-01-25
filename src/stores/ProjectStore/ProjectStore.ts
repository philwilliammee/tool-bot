import { MessageExtended } from "../../app.types";

// src/stores/ProjectStore/ProjectStore.ts
export class ProjectStore {
  private static METADATA_KEY = "project_metadata";
  private metadata: Record<string, ProjectMetadata> = {};
  private activeProjectId: string | null = null;

  constructor() {
    this.loadMetadata();
  }

  private loadMetadata(): void {
    const stored = localStorage.getItem(ProjectStore.METADATA_KEY);
    if (stored) {
      this.metadata = JSON.parse(stored);
    }
  }

  private saveMetadata(): void {
    localStorage.setItem(
      ProjectStore.METADATA_KEY,
      JSON.stringify(this.metadata)
    );
  }

  private getProjectKey(id: string): string {
    return `project_${id}_messages`;
  }

  public createProject(name: string, description?: string): string {
    const id = crypto.randomUUID();
    const now = Date.now();

    this.metadata[id] = {
      id,
      name,
      description,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      lastMessageDate: now,
    };

    this.saveMetadata();
    localStorage.setItem(this.getProjectKey(id), JSON.stringify([]));
    return id;
  }

  public getProject(id: string): ProjectMessages | null {
    const stored = localStorage.getItem(this.getProjectKey(id));
    return stored ? JSON.parse(stored) : null;
  }

  public updateProject(id: string, updates: Partial<ProjectMetadata>): void {
    if (!this.metadata[id]) return;

    this.metadata[id] = {
      ...this.metadata[id],
      ...updates,
      updatedAt: Date.now(),
    };

    this.saveMetadata();
  }

  public deleteProject(id: string): void {
    delete this.metadata[id];
    localStorage.removeItem(this.getProjectKey(id));
    this.saveMetadata();

    if (this.activeProjectId === id) {
      this.activeProjectId = null;
    }
  }

  public setActiveProject(id: string | null): void {
    this.activeProjectId = id;
    localStorage.setItem("active_project", id || "");
  }

  public getActiveProject(): string | null {
    return this.activeProjectId;
  }

  public getAllProjects(): ProjectMetadata[] {
    return Object.values(this.metadata).sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
  }

  public saveProjectMessages(id: string, messages: MessageExtended[]): void {
    if (!this.metadata[id]) return;

    localStorage.setItem(this.getProjectKey(id), JSON.stringify(messages));

    this.metadata[id] = {
      ...this.metadata[id],
      messageCount: messages.length,
      lastMessageDate: Date.now(),
      updatedAt: Date.now(),
    };

    this.saveMetadata();
  }
}

export const projectStore = new ProjectStore();

interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessageDate: number;
}

// Stored separately in localStorage with key: `project_${id}_messages`
interface ProjectMessages {
  projectId: string;
  messages: MessageExtended[];
}
