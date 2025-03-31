import { signal, computed, batch, effect } from "@preact/signals-core";
import { MessageExtended } from "../../app.types";
import { Project, ProjectUpdate, isValidProject } from "./ProjectStore.types";
import { dbService } from "../Database/DatabaseService";

/**
 * ProjectStore - Manages projects and their metadata
 *
 * This store handles project operations and maintains the active project state.
 * It uses IndexedDB for persistent storage via the DatabaseService.
 */
export class ProjectStore {
  private static ACTIVE_PROJECT_KEY = "active_project_id";

  // Core signals
  private projectsSignal = signal<Record<string, Project>>({});
  private activeProjectIdSignal = signal<string | null>(null);
  private initializedSignal = signal<boolean>(false);
  private loadingSignal = signal<boolean>(true);
  private messageCountsSignal = signal<Record<string, number>>({});
  private messagesMapSignal = signal<Record<string, MessageExtended[]>>({});

  constructor() {
    console.log("Initializing ProjectStore with IndexedDB");
    this.initialize();
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

  public readonly hasProjects = computed(() => {
    return Object.keys(this.projects).length > 0;
  });

  public readonly isInitialized = computed(() => {
    return this.initializedSignal.value;
  });

  public readonly isLoading = computed(() => {
    return this.loadingSignal.value;
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

  /**
   * Computed property for accessing the active project's messages
   */
  public readonly activeProjectMessages = computed(() => {
    const project = this.activeProject.value;
    if (!project) return [];

    const projectId = project.id;
    // Return messages from the messages map if available
    if (this.messagesMapSignal.value[projectId]) {
      return this.messagesMapSignal.value[projectId];
    }

    // If not available, start loading them (but return empty array for now)
    this.loadProjectMessagesInternal(projectId);
    return [];
  });

  /**
   * Get the message count for a project
   * This is reactive and will update when messages are loaded
   */
  public projectMessageCount(id: string): number {
    // Check if we already have a count
    if (this.messageCountsSignal.value[id] !== undefined) {
      return this.messageCountsSignal.value[id];
    }

    // If no count is available and the project exists, try to load it
    if (this.projects[id]) {
      // Asynchronously load the count but return 0 for now
      this.loadProjectMessageCount(id);
    }

    return 0;
  }

  /**
   * Load the message count for a project and update messageCountsSignal
   */
  private async loadProjectMessageCount(id: string): Promise<void> {
    try {
      const count = await dbService.getMessageCountForProject(id);
      this.messageCountsSignal.value = {
        ...this.messageCountsSignal.value,
        [id]: count
      };
      console.log(`Loaded message count for project ${id}: ${count}`);
    } catch (error) {
      console.error(`Error loading message count for project ${id}:`, error);
    }
  }

  /**
   * Initialize the store by loading projects from IndexedDB
   */
  private async initialize(): Promise<void> {
    console.log("Initializing ProjectStore");
    this.loadingSignal.value = true;

    try {
      // Step 1: Initialize the database
      await dbService.init();

      // Step 2: Load all projects from IndexedDB
      const projects = await dbService.getAllProjects();
      console.log(`Loaded ${projects.length} projects from IndexedDB`);

      // Step 3: Convert array to record and update state
      const projectsRecord: Record<string, Project> = {};
      projects.forEach(project => {
        projectsRecord[project.id] = project;
      });
      this.projectsSignal.value = projectsRecord;

      // Step 4: Preload message counts for all projects
      await this.preloadMessageCounts(projects.map(p => p.id));

      // Step 5: Handle project selection
      if (projects.length === 0) {
        await this.handleNoProjects();
      } else {
        this.setInitialActiveProject();
      }
    } catch (error) {
      console.error("Error initializing ProjectStore:", error);
      await this.recoverFromInitializationError();
    } finally {
      // Always mark as initialized to prevent blocking the application
      this.initializedSignal.value = true;
      this.loadingSignal.value = false;
      console.log("ProjectStore initialization complete (signals updated)");
    }
  }

  /**
   * Handle the case when no projects exist
   */
  private async handleNoProjects(): Promise<void> {
    console.log("No projects found, creating default project");
    try {
      const defaultId = await this.createProject(
        "Default Project",
        "Auto-generated default project"
      );
      this.setActiveProject(defaultId);
    } catch (error) {
      console.error("Failed to create default project:", error);
      this.createFallbackProject();
    }
  }

  /**
   * Set the initial active project based on localStorage or first available
   */
  private setInitialActiveProject(): void {
    // If no active project, set to last used or first available
    const lastUsedId = localStorage.getItem(ProjectStore.ACTIVE_PROJECT_KEY);
    console.log("Last used project ID:", lastUsedId);

    const projectIds = Object.keys(this.projectsSignal.value);
    if (lastUsedId && this.projectsSignal.value[lastUsedId]) {
      this.setActiveProject(lastUsedId);
    } else if (projectIds.length > 0) {
      this.setActiveProject(projectIds[0]);
    }
  }

  /**
   * Create an in-memory fallback project as a last resort
   */
  private createFallbackProject(): void {
    const fallbackId = crypto.randomUUID();
    const now = Date.now();

    const fallbackProject: Project = {
      id: fallbackId,
      name: "Default Project (Fallback)",
      description: "Emergency fallback project",
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
        model: "default",
        systemPrompt: "",
        persistentUserMessage: "",
      },
    };

    // Add to memory only without waiting for IndexedDB
    this.projectsSignal.value = {
      ...this.projectsSignal.value,
      [fallbackId]: fallbackProject,
    };

    this.setActiveProject(fallbackId);
    console.log("Created fallback project in memory:", fallbackId);
  }

  /**
   * Attempt to recover from initialization errors
   */
  private async recoverFromInitializationError(): Promise<void> {
    // Don't try to recover from localStorage, just create a fallback project
    console.log("Error during initialization, creating fallback project");
    this.createFallbackProject();
  }

  /**
   * Wait for the store to be initialized
   * Useful for async operations that depend on the store being ready
   */
  public async waitForInitialization(): Promise<void> {
    if (this.initializedSignal.value) return Promise.resolve();

    // Add a timeout to prevent waiting indefinitely
    return new Promise(resolve => {
      // Maximum time to wait for initialization (5 seconds)
      const maxWaitTime = 5000;
      const startTime = Date.now();

      // Check immediately first
      if (this.initializedSignal.value) {
        resolve();
        return;
      }

      // Set up an effect to watch for initialization
      const unsubscribe = effect(() => {
        if (this.initializedSignal.value || (Date.now() - startTime > maxWaitTime)) {
          unsubscribe();

          // If timeout occurred but we're still not initialized, force it
          if (!this.initializedSignal.value) {
            console.warn("Initialization timed out after 5 seconds, forcing initialization state");
            this.initializedSignal.value = true;
          }

          resolve();
        }
      });
    });
  }

  // CRUD Operations
  /**
   * Create a new project
   * @param name Project name
   * @param description Optional project description
   * @param forceCreate If true, bypass waiting for initialization
   */
  public async createProject(name: string, description?: string, forceCreate = false): Promise<string> {
    console.log("createProject: Waiting for initialization");

    // Only wait for initialization if not forcing creation
    if (!forceCreate) {
      await this.waitForInitialization();
    } else {
      console.log("createProject: Skipping initialization wait (force mode)");
      // Force initialization to true if it's still false
      if (!this.initializedSignal.value) {
        console.warn("createProject: Forcing initialization signal to true");

        // Try to force initialize the database as a last resort
        try {
          console.log("Attempting to force initialize the database");
          await dbService.forceInit();
          console.log("Force database initialization successful");
        } catch (forceInitError) {
          console.error("Force database initialization failed:", forceInitError);
          // Continue anyway - we'll work with in-memory data
        }

        // Mark as initialized so we can continue
        this.initializedSignal.value = true;
      }
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    console.log(`Creating new project: ${name} (${id})`);

    const newProject: Project = {
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

    // Save to IndexedDB
    console.log("createProject: About to save to IndexedDB:", { id, name });
    try {
      await dbService.saveProject(newProject);
      console.log("createProject: Successfully saved to IndexedDB");
    } catch (dbError) {
      console.error("createProject: Failed to save to IndexedDB:", dbError);
      // Continue with in-memory operation despite DB error
    }

    // Update local state regardless of IndexedDB success
    console.log("createProject: Updating local state with new project");
    this.projectsSignal.value = {
      ...this.projectsSignal.value,
      [id]: newProject,
    };
    console.log("createProject: Local state updated");

    return id;
  }

  /**
   * Get a project by ID
   */
  public async getProject(id: string): Promise<Project | null> {
    await this.waitForInitialization();

    // Check if project exists in memory
    if (this.projects[id]) {
      return this.projects[id];
    }

    // If not in memory, try to load from IndexedDB
    const project = await dbService.getProject(id);

    if (project) {
      // Update the projects signal with the loaded project
      this.projectsSignal.value = {
        ...this.projectsSignal.value,
        [id]: project
      };
      console.log(`Loaded project from IndexedDB: ${project.name} (${id})`);
    } else {
      console.log(`No project found for id ${id}`);
    }

    return project;
  }

  /**
   * Update a project
   */
  public async updateProject(id: string, updates: ProjectUpdate): Promise<void> {
    await this.waitForInitialization();

    // Get current project
    const project = await this.getProject(id);
    if (!project) {
      console.warn(`Attempted to update non-existent project: ${id}`);
      return;
    }

    console.log(`Updating project ${id}:`, updates);

    // Create updated project
    const updatedProject = {
      ...project,
      ...updates,
      updatedAt: Date.now()
    };

    // Save to IndexedDB
    await dbService.saveProject(updatedProject);

    // Update signal
    this.projectsSignal.value = {
      ...this.projectsSignal.value,
      [id]: updatedProject
    };
  }

  /**
   * Rename a project
   */
  public async renameProject(id: string, newName: string): Promise<boolean> {
    await this.waitForInitialization();

    if (!this.projects[id]) {
      console.warn(`Attempted to rename non-existent project: ${id}`);
      return false;
    }

    if (!newName || newName.trim() === "") {
      console.warn("Cannot rename project to an empty name");
      return false;
    }

    console.log(`Renaming project ${id} to "${newName}"`);

    await this.updateProject(id, { name: newName.trim() });
    return true;
  }

  /**
   * Delete a project and all its messages
   */
  public async deleteProject(id: string): Promise<void> {
    await this.waitForInitialization();

    // Don't allow deletion of last project
    if (Object.keys(this.projects).length <= 1) {
      console.warn("Attempted to delete the last project");
      throw new Error("Cannot delete the last project");
    }

    console.log(`Deleting project ${id}`);

    // Delete from IndexedDB
    await dbService.deleteProject(id);

    // Update local state
    const newProjects = { ...this.projects };
    delete newProjects[id];
    this.projectsSignal.value = newProjects;

    // If active project was deleted, switch to another project
    if (this.activeProjectIdSignal.value === id) {
      const firstAvailable = Object.keys(newProjects)[0];
      console.log(`Active project deleted, switching to ${firstAvailable}`);
      this.setActiveProject(firstAvailable);
    }
  }

  /**
   * Set the active project
   */
  public setActiveProject(id: string | null): void {
    if (id && !this.projects[id]) {
      console.warn(`Attempted to set invalid project as active: ${id}`);
      return;
    }

    console.log(`Setting active project to: ${id}`);
    this.activeProjectIdSignal.value = id;

    if (id) {
      localStorage.setItem(ProjectStore.ACTIVE_PROJECT_KEY, id);

      // Load messages for this project
      this.loadProjectMessagesInternal(id);
    } else {
      localStorage.removeItem(ProjectStore.ACTIVE_PROJECT_KEY);
    }
  }

  /**
   * Get the active project ID
   */
  public getActiveProject(): string | null {
    return this.activeProjectIdSignal.value;
  }

  /**
   * Get all projects
   */
  public getAllProjects(): Project[] {
    return this.allProjects.value;
  }

  // Message operations
  /**
   * Load messages for a project
   */
  public async loadProjectMessages(id: string): Promise<MessageExtended[]> {
    await this.waitForInitialization();

    console.log(`Loading messages for project ${id}`);
    return dbService.getMessagesForProject(id);
  }

  /**
   * Internal method to load messages for a project and update the messagesMapSignal
   * This is used by the activeProjectMessages computed property
   */
  private loadProjectMessagesInternal(id: string): void {
    // Don't await, just start the loading process
    this.loadProjectMessages(id).then(messages => {
      // Update the messages map and message counts
      this.messagesMapSignal.value = {
        ...this.messagesMapSignal.value,
        [id]: messages
      };
      this.messageCountsSignal.value = {
        ...this.messageCountsSignal.value,
        [id]: messages.length
      };
      console.log(`Loaded ${messages.length} messages for project ${id}`);
    }).catch(error => {
      console.error(`Error loading messages for project ${id}:`, error);
    });
  }

  /**
   * Update messages for a project
   */
  public async updateProjectMessages(id: string, messages: MessageExtended[]): Promise<void> {
    await this.waitForInitialization();

    if (!this.projects[id]) {
      console.warn(`Attempted to save messages for non-existent project: ${id}`);
      return;
    }

    // Add projectId to each message
    const messagesWithProjectId = messages.map(msg => ({
      ...msg,
      projectId: id
    }));

    // Save messages to IndexedDB
    await dbService.saveMessages(messagesWithProjectId);

    // Update local signal cache
    this.messagesMapSignal.value = {
      ...this.messagesMapSignal.value,
      [id]: messagesWithProjectId
    };

    // Update message count signal
    this.messageCountsSignal.value = {
      ...this.messageCountsSignal.value,
      [id]: messagesWithProjectId.length
    };

    // Update project's updatedAt timestamp
    await this.updateProject(id, { updatedAt: Date.now() });
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
    console.log("IndexedDB Metrics:", dbService.getMetrics());
    console.groupEnd();
  }

  // Update project configuration
  public async updateProjectConfig(
    id: string,
    config: {
      model?: string;
      systemPrompt?: string;
      persistentUserMessage?: string;
      enabledTools?: string[];
    }
  ): Promise<void> {
    await this.waitForInitialization();

    const project = await this.getProject(id);
    if (!project) {
      console.warn(`Attempted to update config for non-existent project: ${id}`);
      return;
    }

    console.log(`Updating project ${id} configuration:`, config);

    // Create updated project with new config
    const updatedProject = {
      ...project,
      config: {
        ...project.config,
        ...config,
      },
      updatedAt: Date.now()
    };

    // Save to IndexedDB
    await dbService.saveProject(updatedProject);

    // Update signal
    this.projectsSignal.value = {
      ...this.projectsSignal.value,
      [id]: updatedProject
    };
  }

  // Get project configuration
  public getProjectConfig(id: string): Project["config"] {
    if (!this.projects[id]) {
      console.warn(`Attempted to get config for non-existent project: ${id}`);
      return {};
    }

    return this.projects[id].config || {};
  }

  /**
   * Clone an existing project
   */
  public async cloneProject(
    id: string,
    newName?: string,
    cloneMessages: boolean = true
  ): Promise<string> {
    await this.waitForInitialization();

    const sourceProject = await this.getProject(id);

    if (!sourceProject) {
      console.error(`Cannot clone non-existent project: ${id}`);
      throw new Error(`Project not found: ${id}`);
    }

    // Generate a name for the cloned project if not provided
    const cloneName = newName || `Copy of ${sourceProject.name}`;

    // Create a new project with the same properties as the source
    const newId = crypto.randomUUID();
    const now = Date.now();

    const newProject: Project = {
      id: newId,
      name: cloneName,
      description: sourceProject.description,
      createdAt: now,
      updatedAt: now,
      status: "active",
      version: sourceProject.version || 1,
      messages: [],
      archiveSummary: {
        summary: null,
        lastSummarizedMessageIds: [],
        lastSummarization: 0,
      },
      config: sourceProject.config ? { ...sourceProject.config } : {},
    };

    // Save the new project to IndexedDB
    await dbService.saveProject(newProject);

    // Update local state
    this.projectsSignal.value = {
      ...this.projectsSignal.value,
      [newId]: newProject,
    };

    // Clone messages if requested
    if (cloneMessages) {
      const sourceMessages = await dbService.getMessagesForProject(id);

      if (sourceMessages.length > 0) {
        // Clone messages with new project ID
        const clonedMessages = sourceMessages.map(msg => ({
          ...msg,
          projectId: newId
        }));

        // Save cloned messages
        await dbService.saveMessages(clonedMessages);
      }
    }

    return newId;
  }

  /**
   * Update archive summary for a project
   */
  public async updateProjectArchiveSummary(
    id: string,
    summary: string | null,
    lastSummarizedMessageIds: string[] = [],
    lastSummarization: number = Date.now()
  ): Promise<void> {
    await this.waitForInitialization();

    const project = await this.getProject(id);
    if (!project) {
      console.warn(`Attempted to update archive summary for non-existent project: ${id}`);
      return;
    }

    // Create updated project
    const updatedProject = {
      ...project,
      archiveSummary: {
        summary,
        lastSummarizedMessageIds,
        lastSummarization,
      },
      updatedAt: Date.now()
    };

    // Save to IndexedDB
    await dbService.saveProject(updatedProject);

    // Update signal
    this.projectsSignal.value = {
      ...this.projectsSignal.value,
      [id]: updatedProject
    };
  }

  // UI methods
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
   * Export a project to a JSON file that can be downloaded
   */
  public async exportProject(id: string): Promise<void> {
    await this.waitForInitialization();

    try {
      // Get project data and messages from IndexedDB
      const { project, messages } = await dbService.exportProject(id);

      if (!project) {
        console.error(`Cannot export non-existent project: ${id}`);
        throw new Error(`Project not found: ${id}`);
      }

      // Create a copy of the project for export
      const exportData = {
        project: {
          ...project,
          messages: messages // Include messages in the export
        },
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

    } catch (error) {
      console.error("Error exporting project:", error);
      throw error;
    }
  }

  /**
   * Import a project from a JSON file
   */
  public async importProject(jsonData: any): Promise<string> {
    await this.waitForInitialization();

    try {
      // Validate the imported data
      if (!jsonData.project || !isValidProject(jsonData.project)) {
        console.error("Invalid project data format");
        throw new Error("The imported file does not contain a valid project");
      }

      // Extract project data
      const projectData = jsonData.project;

      // Handle messages - they could be in project.messages or in a separate messages array
      let messages = [];

      // Check if messages are in the project object (common export format)
      if (projectData.messages && Array.isArray(projectData.messages)) {
        console.log(`Found ${projectData.messages.length} messages in project object`);
        messages = projectData.messages;
      }
      // Also check for messages in the root object (alternative format)
      else if (jsonData.messages && Array.isArray(jsonData.messages)) {
        console.log(`Found ${jsonData.messages.length} messages in root object`);
        messages = jsonData.messages;
      }

      // Create a clean project object without the messages array
      const { messages: projectMessages, ...projectWithoutMessages } = projectData;

      // Import to IndexedDB
      const newId = await dbService.importProject({
        project: projectWithoutMessages,
        messages: messages
      });

      // Load the imported project to update local state
      const importedProject = await dbService.getProject(newId);

      if (importedProject) {
        this.projectsSignal.value = {
          ...this.projectsSignal.value,
          [newId]: importedProject
        };

        // Update message count for the imported project
        this.messageCountsSignal.value = {
          ...this.messageCountsSignal.value,
          [newId]: messages.length
        };
      }

      console.log(`Project imported with ID ${newId} and ${messages.length} messages`);
      return newId;
    } catch (error) {
      console.error("Error importing project:", error);
      throw error;
    }
  }

  /**
   * Debug method to force initialization state
   * This is for emergency recovery only
   */
  public debugInitialize(): void {
    console.log("DEBUG: Force initializing ProjectStore");

    // Force signals to initialized state
    this.loadingSignal.value = false;
    this.initializedSignal.value = true;

    // Create emergency fallback project if none exist
    if (Object.keys(this.projectsSignal.value).length === 0) {
      const fallbackId = crypto.randomUUID();
      const now = Date.now();

      const fallbackProject: Project = {
        id: fallbackId,
        name: "Emergency Project",
        description: "Auto-created emergency project due to initialization failure",
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
          model: "default",
          systemPrompt: "",
          persistentUserMessage: "",
        },
      };

      // Update the store directly
      this.projectsSignal.value = {
        [fallbackId]: fallbackProject
      };

      // Set as active project
      this.activeProjectIdSignal.value = fallbackId;
      localStorage.setItem(ProjectStore.ACTIVE_PROJECT_KEY, fallbackId);

      console.log("DEBUG: Created emergency fallback project:", fallbackId);
    }

    console.log("DEBUG: ProjectStore force initialized");
  }

  // Helper method to preload message counts for multiple projects
  private async preloadMessageCounts(projectIds: string[]): Promise<void> {
    for (const id of projectIds) {
      await this.loadProjectMessageCount(id);
    }
  }
}

// Create a singleton instance
export const projectStore = new ProjectStore();
