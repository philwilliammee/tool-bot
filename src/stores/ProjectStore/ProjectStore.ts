import { MessageExtended } from "../../app.types";
import { ProjectMetadata, ProjectMessages } from "./ProjectStore.types";

// src/stores/ProjectStore/ProjectStore.ts
export class ProjectStore {
  private static METADATA_KEY = "project_metadata";
  private static DEFAULT_PROJECT_KEY = "default_project_id";
  private metadata: Record<string, ProjectMetadata> = {};
  private activeProjectId: string | null = null;

  constructor() {
    this.loadMetadata();
    this.initializeDefaultProject();
  }

  private initializeDefaultProject(): void {
    // Check if we have any projects
    if (Object.keys(this.metadata).length === 0) {
      // Create default project
      const defaultId = this.createProject(
        "Default Project",
        "Auto-generated default project"
      );
      this.setActiveProject(defaultId);
    }

    // If no active project, set to last used or first available
    if (!this.activeProjectId) {
      const lastUsedId = localStorage.getItem(ProjectStore.DEFAULT_PROJECT_KEY);
      if (lastUsedId && this.metadata[lastUsedId]) {
        this.setActiveProject(lastUsedId);
      } else {
        const firstProject = Object.keys(this.metadata)[0];
        if (firstProject) {
          this.setActiveProject(firstProject);
        }
      }
    }
  }

  // CRUD Operations
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
    // Don't allow deletion of last project
    if (Object.keys(this.metadata).length <= 1) {
      throw new Error("Cannot delete the last project");
    }

    delete this.metadata[id];
    localStorage.removeItem(this.getProjectKey(id));
    this.saveMetadata();

    // If active project was deleted, switch to another project
    if (this.activeProjectId === id) {
      const firstAvailable = Object.keys(this.metadata)[0];
      this.setActiveProject(firstAvailable);
    }
  }

  public setActiveProject(id: string | null): void {
    if (id && !this.metadata[id]) return;

    this.activeProjectId = id;
    localStorage.setItem(ProjectStore.DEFAULT_PROJECT_KEY, id || "");

    // Notify subscribers if we implement any
    this.notifyProjectChange();
  }

  public getActiveProject(): string | null {
    return this.activeProjectId;
  }

  public getAllProjects(): ProjectMetadata[] {
    return Object.values(this.metadata).sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
  }

  // Storage Operations
  private getProjectKey(id: string): string {
    return `project_${id}_messages`;
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

  // Optional: Add event handling for project changes
  private changeListeners: Set<() => void> = new Set();

  public onProjectChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyProjectChange(): void {
    this.changeListeners.forEach((listener) => listener());
  }
}

export const projectStore = new ProjectStore();
