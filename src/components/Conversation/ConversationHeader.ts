import { effect } from "@preact/signals-core";
import { store } from "../../stores/AppStore.js";
import { projectStore } from "../../stores/ProjectStore/ProjectStore.js";

/**
 * ConversationHeader component handles the header section of the conversation area
 * including project selection and panel controls.
 *
 * NOTE: The toggle panel button click handler is intentionally NOT registered here
 * as it's already handled in MainApplication.ts. Adding it here would cause
 * duplicate event handling and UI state issues.
 */
export class ConversationHeader {
  private element: HTMLElement;
  private cleanupFns: Array<() => void> = [];
  private togglePanelBtn: HTMLButtonElement;
  private projectSelector: HTMLSelectElement;
  private newProjectBtn: HTMLButtonElement;
  private manageProjectsBtn: HTMLButtonElement;

  // Store handler references for proper cleanup
  private newProjectHandler: () => void;
  private manageProjectsHandler: () => void;
  private projectSelectorHandler: () => void;

  constructor(container: HTMLElement) {
    console.log("Initializing ConversationHeader");
    this.element = container;
    this.togglePanelBtn = this.element.querySelector(
      ".toggle-panel-btn"
    ) as HTMLButtonElement;
    this.projectSelector = this.element.querySelector(
      "#project-selector"
    ) as HTMLSelectElement;
    this.newProjectBtn = this.element.querySelector(
      ".new-project-btn"
    ) as HTMLButtonElement;
    this.manageProjectsBtn = this.element.querySelector(
      ".manage-projects-btn"
    ) as HTMLButtonElement;

    // Initialize event handler functions as class properties
    // This allows us to properly remove them later during cleanup
    this.newProjectHandler = () => {
      projectStore.showNewProjectForm();
    };

    this.manageProjectsHandler = () => {
      projectStore.showProjectManager();
    };

    this.projectSelectorHandler = () => {
      const selectedId = this.projectSelector.value;
      if (selectedId) {
        projectStore.setActiveProject(selectedId);
      }
    };

    if (
      !this.togglePanelBtn ||
      !this.projectSelector ||
      !this.newProjectBtn ||
      !this.manageProjectsBtn
    ) {
      console.error("Missing header elements:", {
        toggleBtn: !!this.togglePanelBtn,
        selector: !!this.projectSelector,
        newBtn: !!this.newProjectBtn,
        manageBtn: !!this.manageProjectsBtn,
      });
      throw new Error("Required header elements not found");
    }

    this.initialize();
  }

  private initialize(): void {
    console.log("Setting up ConversationHeader");

    // Set up project selector
    this.setupProjectSelector();

    // Set up button handlers
    // IMPORTANT: We DO NOT register a click handler for togglePanelBtn here
    // because it's already handled in MainApplication.ts. Adding it here would
    // cause the toggle action to fire twice on a single click.
    this.newProjectBtn.addEventListener("click", this.newProjectHandler);
    this.manageProjectsBtn.addEventListener(
      "click",
      this.manageProjectsHandler
    );

    // Set up effects to respond to state changes
    this.setupEffects();
  }

  private setupProjectSelector(): void {
    console.log("Setting up project selector");

    // Clear existing options
    while (this.projectSelector.options.length > 1) {
      this.projectSelector.remove(1);
    }

    // Add projects from store
    const projects = projectStore.getAllProjects();
    // console.log("Available projects:", projects);

    projects.forEach((project) => {
      const option = document.createElement("option");
      option.value = project.id;
      option.textContent = project.name;
      this.projectSelector.appendChild(option);
    });

    // Set initial value if there's an active project
    const activeProject = projectStore.activeProject.value;
    if (activeProject) {
      console.log("Setting active project in selector:", activeProject.id);
      this.projectSelector.value = activeProject.id;
    } else {
      console.log("No active project, using first option");
      this.projectSelector.selectedIndex = 0;
    }

    // Add change handler using the stored handler reference
    this.projectSelector.addEventListener(
      "change",
      this.projectSelectorHandler
    );
  }

  private setupEffects(): void {
    // Update project selector when projects change
    this.cleanupFns.push(
      effect(() => {
        // Use allProjects computed signal instead of projects
        const projects = projectStore.allProjects.value;
        console.log("Projects updated in store:", projects.length);
        this.updateProjectOptions(projects);
      })
    );

    // Update selected project when active project changes
    this.cleanupFns.push(
      effect(() => {
        const activeProject = projectStore.activeProject.value;
        console.log("Active project changed:", activeProject?.id);
        if (activeProject && this.projectSelector.value !== activeProject.id) {
          this.projectSelector.value = activeProject.id;
        } else if (!activeProject) {
          this.projectSelector.selectedIndex = 0;
        }
      })
    );

    // Update toggle button visual state based on UI layout
    // Note: We only update the visual state here, the click handling is in MainApplication.ts
    this.cleanupFns.push(
      effect(() => {
        const layout = store.uiLayout.value;
        console.log("UI layout changed:", layout);
        this.togglePanelBtn.classList.toggle(
          "active",
          layout === "left-expanded"
        );
      })
    );
  }

  private updateProjectOptions(
    projects: Array<{ id: string; name: string }>
  ): void {
    console.log("Updating project options:", projects.length);

    // Keep the first placeholder option
    while (this.projectSelector.options.length > 1) {
      this.projectSelector.remove(1);
    }

    // Add new options
    if (projects && projects.length > 0) {
      projects.forEach((project) => {
        const option = document.createElement("option");
        option.value = project.id;
        option.textContent = project.name;
        this.projectSelector.appendChild(option);
      });
    }

    // Restore selection if possible
    const activeProject = projectStore.activeProject.value;
    if (activeProject) {
      this.projectSelector.value = activeProject.id;
    } else {
      this.projectSelector.selectedIndex = 0;
    }
  }

  public destroy(): void {
    console.log("Destroying ConversationHeader");

    // Clean up event listeners using the stored handler references
    // This pattern ensures we remove the exact same handler functions we added
    this.newProjectBtn.removeEventListener("click", this.newProjectHandler);
    this.manageProjectsBtn.removeEventListener(
      "click",
      this.manageProjectsHandler
    );
    this.projectSelector.removeEventListener(
      "change",
      this.projectSelectorHandler
    );

    // Run cleanup functions for effects
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }
}
