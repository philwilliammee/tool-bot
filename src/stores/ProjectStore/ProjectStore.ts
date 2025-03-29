import { signal, computed, batch } from "@preact/signals-core";
import { MessageExtended } from "../../app.types";
import { Project, ProjectUpdate, isValidProject } from "./ProjectStore.types";

export class ProjectStore {
  private static STORAGE_KEY = "projects";
  private static DEFAULT_PROJECT_KEY = "default_project_id";

  // Core signals
  private projectsSignal = signal<Record<string, Project>>({});
  private activeProjectIdSignal = signal<string | null>(null);

  constructor() {
    console.log("Initializing ProjectStore with signals");
    this.loadProjects();
    this.initializeDefaultProject();
  }

  // Computed properties
  private get projects(): Record<string, Project> {
    return this.projectsSignal.value;
  }

  private set projects(value: Record<string, Project>) {
    this.projectsSignal.value = value;
  }

  // Computed properties for reactive access
  public readonly activeProject = computed(() => {
    const id = this.activeProjectIdSignal.value;
    return id ? this.projects[id] : null;
  });

  public readonly allProjects = computed(() => {
    return Object.values(this.projects).sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
  });

  public readonly activeProjectConfig = computed(() => {
    const project = this.activeProject.value;
    return project?.config || {};
  });

  public readonly activeProjectMessages = computed(() => {
    const project = this.activeProject.value;
    return project?.messages || [];
  });

  public readonly hasProjects = computed(() => {
    return Object.keys(this.projects).length > 0;
  });

  public readonly activeProjectArchiveSummary = computed(() => {
    const project = this.activeProject.value;
    return (
      project?.archiveSummary || {
        summary: null,
        lastSummarizedMessageIds: [],
        lastSummarization: 0,
      }
    );
  });

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
    if (!this.activeProjectIdSignal.value) {
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

    // Use batch to prevent multiple renders
    batch(() => {
      const newProjects = { ...this.projects };
      newProjects[id] = {
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
      this.projectsSignal.value = newProjects;
      this.saveProjects();
    });

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

    batch(() => {
      const newProjects = { ...this.projects };
      newProjects[id] = {
        ...newProjects[id],
        ...updates,
        updatedAt: Date.now(),
      };
      this.projectsSignal.value = newProjects;
      this.saveProjects();
    });
  }

  /**
   * Renames a project
   * @param id ID of the project to rename
   * @param newName New name for the project
   * @returns boolean indicating success
   */
  public renameProject(id: string, newName: string): boolean {
    if (!this.projects[id]) {
      console.warn(`Attempted to rename non-existent project: ${id}`);
      return false;
    }

    if (!newName || newName.trim() === "") {
      console.warn("Cannot rename project to an empty name");
      return false;
    }

    console.log(`Renaming project ${id} to "${newName}"`);

    batch(() => {
      const newProjects = { ...this.projects };
      newProjects[id] = {
        ...newProjects[id],
        name: newName.trim(),
        updatedAt: Date.now(),
      };
      this.projectsSignal.value = newProjects;
      this.saveProjects();
    });

    return true;
  }

  public deleteProject(id: string): void {
    // Don't allow deletion of last project
    if (Object.keys(this.projects).length <= 1) {
      console.warn("Attempted to delete the last project");
      throw new Error("Cannot delete the last project");
    }

    console.log(`Deleting project ${id}`);

    batch(() => {
      const newProjects = { ...this.projects };
      delete newProjects[id];
      this.projectsSignal.value = newProjects;
      this.saveProjects();

      // If active project was deleted, switch to another project
      if (this.activeProjectIdSignal.value === id) {
        const firstAvailable = Object.keys(newProjects)[0];
        console.log(`Active project deleted, switching to ${firstAvailable}`);
        this.setActiveProject(firstAvailable);
      }
    });
  }

  public setActiveProject(id: string | null): void {
    if (id && !this.projects[id]) {
      console.warn(`Attempted to set invalid project as active: ${id}`);
      return;
    }

    console.log(`Setting active project to: ${id}`);
    this.activeProjectIdSignal.value = id;
    localStorage.setItem(ProjectStore.DEFAULT_PROJECT_KEY, id || "");
  }

  public getActiveProject(): string | null {
    return this.activeProjectIdSignal.value;
  }

  public getAllProjects(): Project[] {
    return this.allProjects.value;
  }

  // Message Operations
  public updateProjectMessages(id: string, messages: MessageExtended[]): void {
    if (!this.projects[id]) {
      console.warn(
        `Attempted to save messages for non-existent project: ${id}`
      );
      return;
    }

    // console.log(`Updating ${messages.length} messages for project ${id}`);

    batch(() => {
      const newProjects = { ...this.projects };
      newProjects[id] = {
        ...newProjects[id],
        messages: messages.map((msg) => ({ ...msg, projectId: id })),
        updatedAt: Date.now(),
      };
      this.projectsSignal.value = newProjects;
      this.saveProjects();
    });

    // console.log(`Successfully updated messages for project ${id}`);
  }

  // Storage Operations
  private loadProjects(): void {
    const stored = localStorage.getItem(ProjectStore.STORAGE_KEY);
    if (stored) {
      try {
        this.projectsSignal.value = JSON.parse(stored);
      } catch (error) {
        console.error("Error parsing projects:", error);
        this.projectsSignal.value = {};
      }
    }
  }

  private saveProjects(): void {
    // console.log("Saving projects");
    localStorage.setItem(
      ProjectStore.STORAGE_KEY,
      JSON.stringify(this.projects)
    );
  }

  // Event handling for project changes - keeping for backward compatibility
  private changeListeners: Set<() => void> = new Set();

  public onProjectChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  // Debug method
  public debug(): void {
    console.group("ProjectStore Debug");
    console.log("Active Project:", this.activeProjectIdSignal.value);
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

    batch(() => {
      const newProjects = { ...this.projects };

      // Create config object if it doesn't exist
      if (!newProjects[id].config) {
        newProjects[id].config = {};
      }

      // Update only the provided fields
      newProjects[id].config = {
        ...newProjects[id].config,
        ...config,
      };

      newProjects[id].updatedAt = Date.now();
      this.projectsSignal.value = newProjects;
      this.saveProjects();
    });
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
    const newId = crypto.randomUUID();
    const now = Date.now();

    batch(() => {
      const newProjects = { ...this.projects };
      newProjects[newId] = {
        id: newId,
        name: cloneName,
        description: sourceProject.description,
        createdAt: now,
        updatedAt: now,
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
      this.projectsSignal.value = newProjects;
      this.saveProjects();
    });

    return newId;
  }

  // Utility method to update archive summary for a project
  public updateProjectArchiveSummary(
    id: string,
    summary: string | null,
    lastSummarizedMessageIds: string[] = [],
    lastSummarization: number = Date.now()
  ): void {
    if (!this.projects[id]) {
      console.warn(
        `Attempted to update archive summary for non-existent project: ${id}`
      );
      return;
    }

    batch(() => {
      const newProjects = { ...this.projects };
      newProjects[id] = {
        ...newProjects[id],
        archiveSummary: {
          summary,
          lastSummarizedMessageIds,
          lastSummarization,
        },
        updatedAt: Date.now(),
      };
      this.projectsSignal.value = newProjects;
      this.saveProjects();
    });
  }

  // Add the missing showProjectManager method
  public showProjectManager(): void {
    console.log("Showing project manager modal");
    const projectModal = document.getElementById(
      "project-modal"
    ) as HTMLDialogElement;
    if (projectModal) {
      projectModal.showModal();
    } else {
      console.error("Project modal element not found");
    }
  }

  // Add the showNewProjectForm method
  public showNewProjectForm(): void {
    console.log("Showing new project form modal");
    const projectFormModal = document.getElementById(
      "project-form-modal"
    ) as HTMLDialogElement;
    if (projectFormModal) {
      projectFormModal.showModal();
    } else {
      console.error("Project form modal element not found");
    }
  }

  /**
   * Exports a project to a JSON file that can be downloaded
   * @param id ID of the project to export
   */
  public exportProject(id: string): void {
    const project = this.getProject(id);
    if (!project) {
      console.error(`Cannot export non-existent project: ${id}`);
      throw new Error(`Project not found: ${id}`);
    }

    // Create a copy of the project for export
    const exportData = {
      ...project,
      exportedAt: Date.now(),
      exportVersion: 1,
    };

    // Convert to JSON and create a Blob
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });

    // Create a download link and trigger it
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}_export.json`;
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Imports a project from a JSON file
   * @param jsonData The parsed JSON data from the import file
   * @returns ID of the newly created project
   */
  public importProject(jsonData: any): string {
    // Validate the imported data
    if (!isValidProject(jsonData)) {
      console.error("Invalid project data format");
      throw new Error("The imported file does not contain a valid project");
    }

    // Generate a new ID for the imported project
    const newId = crypto.randomUUID();
    const now = Date.now();

    // Create a new project based on the imported data
    batch(() => {
      const newProjects = { ...this.projects };
      newProjects[newId] = {
        ...jsonData,
        id: newId,
        name: `${jsonData.name} (Imported)`,
        createdAt: now,
        updatedAt: now,
        messages: jsonData.messages || [],
        // Make sure we have proper structure
        archiveSummary: jsonData.archiveSummary || {
          summary: null,
          lastSummarizedMessageIds: [],
          lastSummarization: 0,
        },
        config: jsonData.config || {},
      };
      this.projectsSignal.value = newProjects;
      this.saveProjects();
    });

    return newId;
  }
}

// Create a singleton instance
export const projectStore = new ProjectStore();
