// src/stores/ProjectStore/ProjectStore.ts
import { MessageExtended } from "../../app.types";
import { ProjectMetadata, ProjectMessages } from "./ProjectStore.types";

export class ProjectStore {
  private static METADATA_KEY = "project_metadata";
  private static DEFAULT_PROJECT_KEY = "default_project_id";
  private metadata: Record<string, ProjectMetadata> = {};
  private activeProjectId: string | null = null;

  constructor() {
    console.log("Initializing ProjectStore");
    this.loadMetadata();
    this.initializeDefaultProject();
  }

  private initializeDefaultProject(): void {
    console.log(
      "Checking for default project. Current metadata:",
      this.metadata
    );
    // Check if we have any projects
    if (Object.keys(this.metadata).length === 0) {
      console.log("No projects found, creating default project");
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
      console.log("Last used project ID:", lastUsedId);

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

    console.log(`Creating new project: ${name} (${id})`);

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
    // Initialize with empty messages array
    this.saveProjectMessages(id, []);

    return id;
  }

  public getProject(id: string): ProjectMessages | null {
    const key = this.getProjectKey(id);
    const stored = localStorage.getItem(key);
    // console.log(`Loading project ${id} from ${key}:`, stored);

    if (!stored) {
      console.log(`No messages found for project ${id}`);
      return null;
    }

    try {
      const messages = JSON.parse(stored);
      console.log(`Loaded ${messages.length} messages for project ${id}`);
      return { projectId: id, messages };
    } catch (error) {
      console.error(`Error parsing messages for project ${id}:`, error);
      return null;
    }
  }

  public updateProject(id: string, updates: Partial<ProjectMetadata>): void {
    if (!this.metadata[id]) {
      console.warn(`Attempted to update non-existent project: ${id}`);
      return;
    }

    console.log(`Updating project ${id}:`, updates);

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
      console.warn("Attempted to delete the last project");
      throw new Error("Cannot delete the last project");
    }

    console.log(`Deleting project ${id}`);

    delete this.metadata[id];
    localStorage.removeItem(this.getProjectKey(id));
    this.saveMetadata();

    // If active project was deleted, switch to another project
    if (this.activeProjectId === id) {
      const firstAvailable = Object.keys(this.metadata)[0];
      console.log(`Active project deleted, switching to ${firstAvailable}`);
      this.setActiveProject(firstAvailable);
    }
  }

  public setActiveProject(id: string | null): void {
    if (id && !this.metadata[id]) {
      console.warn(`Attempted to set invalid project as active: ${id}`);
      return;
    }

    console.log(`Setting active project to: ${id}`);
    this.activeProjectId = id;
    localStorage.setItem(ProjectStore.DEFAULT_PROJECT_KEY, id || "");

    this.notifyProjectChange();
  }

  public getActiveProject(): string | null {
    return this.activeProjectId;
  }

  public getAllProjects(): ProjectMetadata[] {
    const projects = Object.values(this.metadata).sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
    console.log("Getting all projects:", projects);
    return projects;
  }

  // Storage Operations
  private getProjectKey(id: string): string {
    return `project_${id}_messages`;
  }

  private loadMetadata(): void {
    const stored = localStorage.getItem(ProjectStore.METADATA_KEY);
    // console.log("Loading project metadata:", stored);

    if (stored) {
      try {
        this.metadata = JSON.parse(stored);
      } catch (error) {
        console.error("Error parsing project metadata:", error);
        this.metadata = {};
      }
    }
  }

  private saveMetadata(): void {
    console.log("Saving project metadata:");
    localStorage.setItem(
      ProjectStore.METADATA_KEY,
      JSON.stringify(this.metadata)
    );
  }

  public saveProjectMessages(id: string, messages: MessageExtended[]): void {
    if (!this.metadata[id]) {
      console.warn(
        `Attempted to save messages for non-existent project: ${id}`
      );
      return;
    }

    const key = this.getProjectKey(id);
    console.log(`Saving ${messages.length} messages to ${key}`);

    try {
      localStorage.setItem(key, JSON.stringify(messages));

      this.metadata[id] = {
        ...this.metadata[id],
        messageCount: messages.length,
        lastMessageDate: Date.now(),
        updatedAt: Date.now(),
      };

      this.saveMetadata();
      console.log(`Successfully saved messages for project ${id}`);
    } catch (error) {
      console.error(`Error saving messages for project ${id}:`, error);
    }
  }

  // Event handling for project changes
  private changeListeners: Set<() => void> = new Set();

  public onProjectChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyProjectChange(): void {
    console.log("Notifying project change listeners");
    this.changeListeners.forEach((listener) => listener());
  }

  // Debug method
  public debug(): void {
    console.group("ProjectStore Debug");
    console.log("Active Project:", this.activeProjectId);
    console.log("Metadata:", this.metadata);
    console.log("localStorage keys:", Object.keys(localStorage));
    console.groupEnd();
  }
}

export const projectStore = new ProjectStore();
