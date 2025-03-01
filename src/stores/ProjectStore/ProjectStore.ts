import { MessageExtended } from "../../app.types";
import { Project, ProjectUpdate } from "./ProjectStore.types";

export class ProjectStore {
  private static STORAGE_KEY = "projects";
  private static DEFAULT_PROJECT_KEY = "default_project_id";
  private projects: Record<string, Project> = {};
  private activeProjectId: string | null = null;

  constructor() {
    console.log("Initializing ProjectStore");
    this.loadProjects();
    this.initializeDefaultProject();
  }

  private initializeDefaultProject(): void {
    console.log(
      "Checking for default project. Current projects:",
      this.projects
    );

    // Check if we have any projects
    if (Object.keys(this.projects).length === 0) {
      console.log("No projects found, creating default project");
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

      if (lastUsedId && this.projects[lastUsedId]) {
        this.setActiveProject(lastUsedId);
      } else {
        const firstProject = Object.keys(this.projects)[0];
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

    this.projects[id] = {
      id,
      name,
      description,
      createdAt: now,
      updatedAt: now,
      status: "active",
      version: 1,
      messages: [],
      archiveSummary: {
        summary: null,
        lastSummarizedMessageIds: [],
        lastSummarization: 0,
      },
      config: {
        model: "default", // Default model
        systemPrompt: "", // Empty by default
        persistentUserMessage: "", // Empty by default
      },
    };

    this.saveProjects();
    return id;
  }

  public getProject(id: string): Project | null {
    const project = this.projects[id];
    if (!project) {
      console.log(`No project found for id ${id}`);
      return null;
    }
    console.log(
      `Loaded project with ${project.messages.length} messages for id ${id}`
    );
    return project;
  }

  public updateProject(id: string, updates: ProjectUpdate): void {
    if (!this.projects[id]) {
      console.warn(`Attempted to update non-existent project: ${id}`);
      return;
    }

    console.log(`Updating project ${id}:`, updates);

    this.projects[id] = {
      ...this.projects[id],
      ...updates,
      updatedAt: Date.now(),
    };

    this.saveProjects();
  }

  public deleteProject(id: string): void {
    // Don't allow deletion of last project
    if (Object.keys(this.projects).length <= 1) {
      console.warn("Attempted to delete the last project");
      throw new Error("Cannot delete the last project");
    }

    console.log(`Deleting project ${id}`);

    delete this.projects[id];
    this.saveProjects();

    // If active project was deleted, switch to another project
    if (this.activeProjectId === id) {
      const firstAvailable = Object.keys(this.projects)[0];
      console.log(`Active project deleted, switching to ${firstAvailable}`);
      this.setActiveProject(firstAvailable);
    }
  }

  public setActiveProject(id: string | null): void {
    if (id && !this.projects[id]) {
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

  public getAllProjects(): Project[] {
    const projects = Object.values(this.projects).sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
    console.log("Getting all projects:", projects);
    return projects;
  }

  // Message Operations
  public updateProjectMessages(id: string, messages: MessageExtended[]): void {
    if (!this.projects[id]) {
      console.warn(
        `Attempted to save messages for non-existent project: ${id}`
      );
      return;
    }

    console.log(`Updating ${messages.length} messages for project ${id}`);

    this.projects[id] = {
      ...this.projects[id],
      messages: messages.map((msg) => ({ ...msg, projectId: id })),
      updatedAt: Date.now(),
    };

    this.saveProjects();
    console.log(`Successfully updated messages for project ${id}`);
  }

  // Storage Operations
  private loadProjects(): void {
    const stored = localStorage.getItem(ProjectStore.STORAGE_KEY);
    if (stored) {
      try {
        this.projects = JSON.parse(stored);
      } catch (error) {
        console.error("Error parsing projects:", error);
        this.projects = {};
      }
    }
  }

  private saveProjects(): void {
    console.log("Saving projects");
    localStorage.setItem(
      ProjectStore.STORAGE_KEY,
      JSON.stringify(this.projects)
    );
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
    console.log("Projects:", this.projects);
    console.log("localStorage keys:", Object.keys(localStorage));
    console.groupEnd();
  }

  // New method to update project configuration
  public updateProjectConfig(
    id: string,
    config: {
      model?: string;
      systemPrompt?: string;
      persistentUserMessage?: string;
      enabledTools?: string[];
    }
  ): void {
    if (!this.projects[id]) {
      console.warn(
        `Attempted to update config for non-existent project: ${id}`
      );
      return;
    }

    console.log(`Updating project ${id} configuration:`, config);

    // Create config object if it doesn't exist
    if (!this.projects[id].config) {
      this.projects[id].config = {};
    }

    // Update only the provided fields
    this.projects[id].config = {
      ...this.projects[id].config,
      ...config,
    };

    this.projects[id].updatedAt = Date.now();
    this.saveProjects();
    this.notifyProjectChange();
  }

  // New method to get project configuration
  public getProjectConfig(id: string): Project["config"] {
    if (!this.projects[id]) {
      console.warn(`Attempted to get config for non-existent project: ${id}`);
      return {};
    }

    return this.projects[id].config || {};
  }

  /**
   * Clone an existing project
   * @param id ID of the project to clone
   * @param newName Optional name for the cloned project (defaults to "Copy of [Original Name]")
   * @param cloneMessages Whether to clone the messages (defaults to true)
   * @returns ID of the newly created project
   */
  public cloneProject(
    id: string,
    newName?: string,
    cloneMessages: boolean = true
  ): string {
    const sourceProject = this.getProject(id);

    if (!sourceProject) {
      console.error(`Cannot clone non-existent project: ${id}`);
      throw new Error(`Project not found: ${id}`);
    }

    // Generate a name for the cloned project if not provided
    const cloneName = newName || `Copy of ${sourceProject.name}`;

    // Create a new project with the same properties as the source
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: cloneName,
      description: sourceProject.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "active",
      version: sourceProject.version || 1,
      messages: cloneMessages
        ? JSON.parse(JSON.stringify(sourceProject.messages))
        : [], // Deep clone messages if requested
      archiveSummary: {
        summary: null,
        lastSummarizedMessageIds: [],
        lastSummarization: 0,
      },
      config: sourceProject.config ? { ...sourceProject.config } : {},
    };

    // Add the new project to the store
    this.projects[newProject.id] = newProject;
    this.saveProjects();
    this.notifyProjectChange();

    return newProject.id;
  }
}

export const projectStore = new ProjectStore();
