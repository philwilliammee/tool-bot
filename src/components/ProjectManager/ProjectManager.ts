// src/components/ProjectManager/ProjectManager.ts
import { effect, batch } from "@preact/signals-core";
import { converseStore } from "../../stores/ConverseStore/ConverseStore";
import { projectStore } from "../../stores/ProjectStore/ProjectStore";
import { store } from "../../stores/AppStore";
import { converseAgentConfig } from "../../agents/converseAgent";
import { getGroupedModelOptions } from "../../utils/modelOptions";
import { clientRegistry } from "../../../tools/registry.client";
import { Project } from "../../stores/ProjectStore/ProjectStore.types";

export class ProjectManager {
  private dropdown!: HTMLSelectElement;
  private modal!: HTMLDialogElement;
  private formModal!: HTMLDialogElement;
  private projectList!: HTMLElement;
  private itemTemplate!: HTMLTemplateElement;
  private cleanupFns: Array<() => void> = [];

  constructor() {
    this.initializeElements();
    this.setupEventListeners();
    this.setupImportHandler();
    this.setupScrollHandler();

    // Add effect to update UI when projects change
    this.cleanupFns.push(
      effect(() => {
        // This will re-run whenever allProjects signal changes
        const projects = projectStore.allProjects.value;
        this.render();
        // Also update the project list if the modal is open
        if (this.modal.open) {
          this.renderProjectList();
        }
      })
    );

    // Add effect to update UI when active project changes
    this.cleanupFns.push(
      effect(() => {
        // This will re-run whenever activeProject signal changes
        const activeProject = projectStore.activeProject.value;
        this.render();
      })
    );

    this.render();
  }

  private initializeElements(): void {
    this.dropdown = document.getElementById(
      "project-selector"
    ) as HTMLSelectElement;
    this.modal = document.getElementById("project-modal") as HTMLDialogElement;
    this.formModal = document.getElementById(
      "project-form-modal"
    ) as HTMLDialogElement;
    this.projectList = this.modal.querySelector(".project-list") as HTMLElement;
    this.itemTemplate = document.getElementById(
      "project-item-template"
    ) as HTMLTemplateElement;

    if (
      !this.dropdown ||
      !this.modal ||
      !this.formModal ||
      !this.projectList ||
      !this.itemTemplate
    ) {
      throw new Error("Required project management elements not found");
    }
  }

  private setupEventListeners(): void {
    // Project selection change
    this.dropdown.addEventListener("change", (e) => {
      const projectId = (e.target as HTMLSelectElement).value;
      projectStore.setActiveProject(projectId);
    });

    // New project button
    document
      .querySelector(".new-project-btn")
      ?.addEventListener("click", () => {
        const systemPromptInput = document.querySelector(
          "#new-project-system-prompt"
        ) as HTMLTextAreaElement;
        if (systemPromptInput && !systemPromptInput.value) {
          systemPromptInput.value = converseAgentConfig.systemPrompt;
        }
        this.showProjectForm();
      });

    // Manage projects button
    document
      .querySelector(".manage-projects-btn")
      ?.addEventListener("click", () => {
        this.modal.showModal();
        this.renderProjectList();
      });

    // Close modal button in header
    const headerCloseBtn = this.modal.querySelector(".modal-header .close-btn");
    if (headerCloseBtn) {
      headerCloseBtn.addEventListener("click", () => {
        this.modal.close();
      });
    }

    // Modal show/hide listeners to manage project list updates
    this.modal.addEventListener("close", () => {
      // Clean up event listeners when modal closes
      this.projectList.innerHTML = "";
    });

    this.modal.addEventListener("show", () => {
      this.renderProjectList();
    });

    // Project form submission
    document.getElementById("project-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const submitter = e.submitter as HTMLButtonElement;

      console.log("Form submitted:", {
        submitter: submitter.textContent?.trim(),
        value: submitter.value,
        type: submitter.type
      });

      // Check if this was a cancel action
      if (submitter.value === "Novalidate close") {
        console.log("Cancel action detected, closing form");
        this.formModal.close();
        form.reset();
        return;
      }

      console.log("Processing project form submission...");

      try {
        // Handle project creation
        const nameInput = form.querySelector("#project-name") as HTMLInputElement;
        const descInput = form.querySelector("#project-description") as HTMLTextAreaElement;
        const modelSelect = form.querySelector("#new-project-model") as HTMLSelectElement;
        const systemPromptInput = form.querySelector("#new-project-system-prompt") as HTMLTextAreaElement;
        const persistentMessageInput = form.querySelector("#new-project-persistent-message") as HTMLTextAreaElement;

        // Get selected tools
        const enabledTools: string[] = [];
        form.querySelectorAll<HTMLInputElement>(".tool-checkbox").forEach((checkbox) => {
          if (checkbox.checked && checkbox.dataset.toolId) {
            enabledTools.push(checkbox.dataset.toolId);
          }
        });
        console.log("Selected tools:", enabledTools);

        // Validate project name
        if (!nameInput.value.trim()) {
          console.log("Project name validation failed - empty name");
          store.showToast("Project name is required");
          return; // Don't create project if name is empty
        }

        const projectName = nameInput.value.trim();
        const projectDesc = descInput.value.trim();
        console.log("Creating new project:", { name: projectName, description: projectDesc });

        // Step 1: Create the project
        console.log("About to call projectStore.createProject");
        try {
          // Check if the application is fully initialized
          if (window.app && !(await this.isAppInitialized())) {
            console.warn("Application is not fully initialized yet, waiting...");
            store.showToast("Application is still initializing. Please try again in a moment.");
            return;
          }

          // Check if store is initialized before proceeding
          if (!projectStore.isInitialized.value) {
            console.log("ProjectStore not initialized, forcing initialization");
            await new Promise<void>(resolve => {
              // Wait a maximum of 3 seconds for initialization
              const timeout = setTimeout(() => {
                console.warn("Timed out waiting for ProjectStore initialization");
                resolve();
              }, 3000);

              const unsubscribe = effect(() => {
                if (projectStore.isInitialized.value) {
                  clearTimeout(timeout);
                  unsubscribe();
                  resolve();
                }
              });
            });
          }

          console.log("ProjectStore initialization status:", projectStore.isInitialized.value);

          // Now create the project - use force mode if initialization timed out
          const useForceMode = !projectStore.isInitialized.value;
          if (useForceMode) {
            console.log("Using force mode for project creation due to initialization timeout");
          }

          const projectId = await projectStore.createProject(
            projectName,
            projectDesc,
            useForceMode // Pass true to force creation if initialization timed out
          );
          console.log("Project created with ID:", projectId);

          // Step 2: Update configuration
          console.log("About to call projectStore.updateProjectConfig");
          await projectStore.updateProjectConfig(projectId, {
            model: modelSelect.value,
            systemPrompt: systemPromptInput.value.trim(),
            persistentUserMessage: persistentMessageInput.value.trim(),
            enabledTools: enabledTools,
          });
          console.log("Project config updated");

          // Step 3: Set as active
          console.log("About to call projectStore.setActiveProject");
          projectStore.setActiveProject(projectId);
          console.log("Set as active project:", projectId);

          // Success!
          console.log("Project creation workflow completed successfully");
          store.showToast(`Project "${projectName}" created successfully`);

          // Reset form and close modal AFTER all operations complete successfully
          form.reset();
          this.formModal.close();
        } catch (error) {
          // Safely handle error properties for better debugging
          const errorObj = error as Error;
          console.error("Detailed error info:", {
            name: errorObj?.name || 'unknown',
            message: errorObj?.message || 'No error message',
            stack: errorObj?.stack,
            originalError: error // Log the full error object
          });

          // No fallback recovery - just show an error
          console.error("Project creation failed and no recovery is available");
          store.showToast(`Failed to create project: Database error`);

          // Close the modal
          form.reset();
          this.formModal.close();
        }
      } catch (error) {
        console.error("Error creating project:", error);
        store.showToast(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  private setupScrollHandler(): void {
    // Add scroll event listener to add shadow to header when scrolled
    const handleScroll = () => {
      const modalHeader = this.modal.querySelector('.modal-header');
      if (modalHeader && this.projectList) {
        if (this.projectList.scrollTop > 0) {
          modalHeader.classList.add('scrolled');
        } else {
          modalHeader.classList.remove('scrolled');
        }
      }
    };

    // Add the scroll event listener to the project list
    if (this.projectList) {
      this.projectList.addEventListener('scroll', handleScroll);
      this.cleanupFns.push(() => {
        if (this.projectList) {
          this.projectList.removeEventListener('scroll', handleScroll);
        }
      });
    }
  }

  private setupImportHandler(): void {
    const importBtn = document.querySelector('.import-project-btn');
    const importFileInput = document.getElementById('import-project-file') as HTMLInputElement;

    if (importBtn && importFileInput) {
      const handleImportClick = () => {
        importFileInput.click();
      };

      importBtn.addEventListener('click', handleImportClick);
      this.cleanupFns.push(() => importBtn.removeEventListener('click', handleImportClick));

      const handleFileChange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          const reader = new FileReader();

          reader.onload = (e) => {
            (async () => {
              try {
                const jsonData = JSON.parse(e.target?.result as string);
                const newProjectId = await projectStore.importProject(jsonData);

                // Select the newly imported project
                projectStore.setActiveProject(newProjectId);

                // Force a reload of the project in the converseStore to load messages
                await converseStore.setProject(null);
                await converseStore.setProject(newProjectId);

                // Close the modal
                const modal = document.getElementById('project-modal') as HTMLDialogElement;
                if (modal) modal.close();

                // Get message count from the import
                const messageCount = jsonData.project?.messages?.length || 0;

                // Show success message
                store.showToast(`Project "${jsonData.project?.name || 'Unknown'}" successfully imported with ${messageCount} messages`);

                // Reset the file input
                target.value = '';
              } catch (error) {
                console.error('Error importing project:', error);
                store.showToast(`Error importing project: ${error instanceof Error ? error.message : 'Invalid format'}`);
              }
            })();
          };

          reader.readAsText(target.files[0]);
        }
      };

      importFileInput.addEventListener('change', handleFileChange);
      this.cleanupFns.push(() => importFileInput.removeEventListener('change', handleFileChange));
    }
  }

  private render(): void {
    // Update dropdown options using signals
    const projects = projectStore.allProjects.value;
    const activeId = projectStore.getActiveProject();

    this.dropdown.innerHTML = `
      <option value="">Select Project</option>
      ${projects
        .map(
          (p) => `
        <option value="${p.id}" ${p.id === activeId ? "selected" : ""}>
          ${p.name}
        </option>
      `
        )
        .join("")}
    `;
  }

  private renderProjectList(): void {
    // Clear existing project items
    this.projectList.innerHTML = '';

    // Use signals for reactive data
    const projects = projectStore.allProjects.value;
    const groupedModelOptions = getGroupedModelOptions();

    // Get available tools from registry
    const toolsRegistry = clientRegistry.getAllTools();
    const availableTools = Object.keys(toolsRegistry).map((id) => ({
      id,
      name: id,
      description: "Tool",
    }));

    // Iterate through projects and create items from template
    projects.forEach(project => {
      // Clone the template
      const template = document.getElementById('project-item-template') as HTMLTemplateElement;
      const projectItem = template.content.cloneNode(true) as DocumentFragment;
      const projectElement = projectItem.querySelector('.project-item') as HTMLElement;

      if (!projectElement) return;

      // Set project ID
      projectElement.dataset.id = project.id;

      // Set project info
      const nameElement = projectElement.querySelector('.project-name');
      if (nameElement) nameElement.textContent = project.name;

      const metaElement = projectElement.querySelector('.project-meta');
      if (metaElement) {
        // Get message count from the store instead of using project.messages
        const messageCount = projectStore.projectMessageCount(project.id);
        metaElement.textContent = `${messageCount} messages · Last updated: ${new Date(project?.updatedAt || 0).toLocaleDateString()}`;
      }

      const descriptionElement = projectElement.querySelector('.project-description');
      if (descriptionElement) {
        if (project.description) {
          descriptionElement.textContent = project.description;
        } else {
          descriptionElement.remove();
        }
      }

      // Add rename button (the only button not in the template)
      const actionsElement = projectElement.querySelector('.project-actions');
      if (actionsElement) {
        const renameBtn = document.createElement('button');
        renameBtn.className = 'btn btn-small btn-blue rename-btn';
        renameBtn.textContent = 'Rename';

        // Insert after clone button and before export button
        const exportBtn = actionsElement.querySelector('.export-btn');
        if (exportBtn) {
          actionsElement.insertBefore(renameBtn, exportBtn);
        } else {
          actionsElement.appendChild(renameBtn);
        }
      }

      // Get the config section from the template
      const configSection = projectElement.querySelector('.project-config-section');
      if (configSection) {
        // Keep the heading that's already in the template
        const heading = configSection.querySelector('h4');

        // Clear any placeholder content after the heading
        configSection.innerHTML = '';

        if (heading) {
          configSection.appendChild(heading);
        } else {
          const newHeading = document.createElement('h4');
          newHeading.textContent = 'Project Configuration';
          configSection.appendChild(newHeading);
        }

        // Add model selection using template literals for readability
        const modelConfigItem = document.createElement('div');
        modelConfigItem.className = 'config-item';
        modelConfigItem.innerHTML = `
          <label for="model-select-${project.id}">AI Model:</label>
          <select id="model-select-${project.id}" class="model-select" data-project-id="${project.id}">
            ${this.renderModelOptionsHtml(groupedModelOptions, project.config?.model)}
          </select>
        `;
        configSection.appendChild(modelConfigItem);

        // Add system prompt using template literals
        const systemPromptItem = document.createElement('div');
        systemPromptItem.className = 'config-item';
        systemPromptItem.innerHTML = `
          <label for="system-prompt-${project.id}">System Prompt:</label>
          <textarea
            id="system-prompt-${project.id}"
            class="system-prompt"
            data-project-id="${project.id}"
            placeholder="Custom instructions for the AI..."
            rows="2"
          >${project.config?.systemPrompt || ""}</textarea>
        `;
        configSection.appendChild(systemPromptItem);

        // Add persistent message using template literals
        const persistentMessageItem = document.createElement('div');
        persistentMessageItem.className = 'config-item';
        persistentMessageItem.innerHTML = `
          <label for="persistent-message-${project.id}">Persistent User Message:</label>
          <textarea
            id="persistent-message-${project.id}"
            class="persistent-message"
            data-project-id="${project.id}"
            placeholder="Message to include in every conversation..."
            rows="2"
          >${project.config?.persistentUserMessage || ""}</textarea>
        `;
        configSection.appendChild(persistentMessageItem);

        // Add tool selection
        configSection.appendChild(this.renderToolOptionsHtml(project, availableTools));

        // Add save button
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-small btn-blue save-config-btn';
        saveBtn.dataset.projectId = project.id;
        saveBtn.textContent = 'Save Configuration';
        configSection.appendChild(saveBtn);
      }

      // Append to project list
      this.projectList.appendChild(projectElement);

      // Set up event handlers for this project item
      this.setupProjectItemEventHandlers(projectElement, project);
    });
  }

  /**
   * Generates HTML string for model options
   */
  private renderModelOptionsHtml(groupedModelOptions: Record<string, any[]>, selectedModelId?: string): string {
    return Object.entries(groupedModelOptions)
      .map(([provider, models]) => `
        <optgroup label="${provider}">
          ${models.map((model: { id: string; name: string; }) => `
            <option value="${model.id}" ${selectedModelId === model.id ? "selected" : ""}>
              ${model.name}
            </option>
          `).join('')}
        </optgroup>
      `).join('');
  }

  /**
   * Creates tool options container using template literals for readability
   */
  private renderToolOptionsHtml(project: Project, availableTools: Array<{id: string, name: string, description: string}>): HTMLDivElement {
    const toolSelectionItem = document.createElement('div');
    toolSelectionItem.className = 'config-item';

    // Use template literal for the label
    toolSelectionItem.innerHTML = '<label>Enabled Tools:</label>';

    // Create tool selection container
    const toolSelection = document.createElement('div');
    toolSelection.className = 'tool-selection';

    // Use template literals for the tool options for better readability
    const toolOptionsHtml = availableTools.map(tool => {
      const isChecked = project.config?.enabledTools?.includes(tool.id) || !project.config?.enabledTools;

      return `
        <div class="tool-option">
          <input
            type="checkbox"
            id="tool-${project.id}-${tool.id}"
            class="tool-checkbox"
            data-tool-id="${tool.id}"
            ${isChecked ? "checked" : ""}
          >
          <label for="tool-${project.id}-${tool.id}" class="tool-label">
            ${tool.name}
            <span class="tool-description">${tool.description}</span>
          </label>
        </div>
      `;
    }).join('');

    // Set the HTML for the tool selection
    toolSelection.innerHTML = toolOptionsHtml;

    // Add the tool selection to the container
    toolSelectionItem.appendChild(toolSelection);

    return toolSelectionItem;
  }

  /**
   * Set up event handlers for a project item
   */
  private setupProjectItemEventHandlers(projectElement: HTMLElement, project: Project): void {
    const id = project.id;

    // Select button
    const selectBtn = projectElement.querySelector(".select-btn");
    if (selectBtn) {
      selectBtn.addEventListener("click", () => {
        projectStore.setActiveProject(id);
        this.modal.close();
      });
    }

    // Delete button
    const deleteBtn = projectElement.querySelector(".delete-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to delete this project?")) {
          try {
            projectStore.deleteProject(id);
          } catch (error) {
            alert("Cannot delete the last project.");
          }
        }
      });
    }

    // Rename button
    const renameBtn = projectElement.querySelector(".rename-btn");
    if (renameBtn) {
      renameBtn.addEventListener("click", () => {
        this.handleRenameProject(id);
      });
    }

    // Export button
    const exportBtn = projectElement.querySelector(".export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        try {
          projectStore.exportProject(id);
          store.showToast(`Project exported successfully`);
        } catch (error) {
          console.error("Export project error:", error);
          store.showToast(`Failed to export project: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      });
    }

    // Clone button
    const cloneBtn = projectElement.querySelector(".clone-btn");
    if (cloneBtn) {
      cloneBtn.addEventListener("click", () => {
        this.handleCloneProject(id);
      });
    }

    // Save config button
    const saveConfigBtn = projectElement.querySelector(".save-config-btn");
    if (saveConfigBtn) {
      saveConfigBtn.addEventListener("click", () => {
        this.handleSaveConfig(id, projectElement);
      });
    }
  }

  /**
   * Handle saving project configuration
   */
  private handleSaveConfig(id: string, projectElement: HTMLElement): void {
    // Get configuration inputs
    const modelSelect = projectElement.querySelector('.model-select') as HTMLSelectElement;
    const systemPrompt = projectElement.querySelector('.system-prompt') as HTMLTextAreaElement;
    const persistentMessage = projectElement.querySelector('.persistent-message') as HTMLTextAreaElement;

    // Get tool checkboxes
    const enabledTools: string[] = [];
    projectElement.querySelectorAll('.tool-checkbox').forEach((checkbox: Element) => {
      const toolCheckbox = checkbox as HTMLInputElement;
      if (toolCheckbox.checked && toolCheckbox.dataset.toolId) {
        enabledTools.push(toolCheckbox.dataset.toolId);
      }
    });

    // Save configuration
    (async () => {
      try {
        await projectStore.updateProjectConfig(id, {
          model: modelSelect.value,
          systemPrompt: systemPrompt.value,
          persistentUserMessage: persistentMessage.value,
          enabledTools: enabledTools,
        });

        // Show a toast notification for configuration saving
        store.showToast("Configuration saved successfully!");
      } catch (error) {
        console.error("Failed to save configuration:", error);
        store.showToast(`Error saving configuration: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    })();
  }

  /**
   * Handle renaming a project
   * @param projectId The ID of the project to rename
   */
  private handleRenameProject(projectId: string): void {
    (async () => {
      try {
        const project = await projectStore.getProject(projectId);
        if (!project) {
          console.error("Could not find project to rename");
          return;
        }

        // Ask for a new name
        const newName = prompt("Enter a new name for the project:", project.name);

        if (newName && newName.trim() !== "") {
          const success = await projectStore.renameProject(projectId, newName);
          if (success) {
            store.showToast(`Project renamed to "${newName}"`);
          } else {
            store.showToast("Failed to rename project");
          }
        }
      } catch (error) {
        console.error("Failed to rename project:", error);
        store.showToast(`Failed to rename project: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    })();
  }

  /**
   * Handle cloning a project
   */
  private handleCloneProject(id: string): void {
    (async () => {
      try {
        // Fetch the project from the store
        const sourceProject = await projectStore.getProject(id);

        if (!sourceProject) {
          console.error("Could not find project to clone");
          return;
        }

        // Ask for a new name
        const projectName = prompt(
          "Enter a name for the cloned project:",
          `Copy of ${sourceProject.name}`
        );

        if (projectName) {
          // Ask if messages should be cloned
          const cloneMessages = confirm(
            "Would you like to clone the messages as well? Click OK to include messages, or Cancel to create an empty project."
          );

          // Clone the project with the provided name and message preference
          const newProjectId = await projectStore.cloneProject(
            id,
            projectName,
            cloneMessages
          );
          console.log(`Project cloned successfully: ${newProjectId}`);
          store.showToast(`Project cloned successfully`);
        }
      } catch (error) {
        console.error("Failed to clone project:", error);
        store.showToast(`Failed to clone project: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    })();
  }

  private showProjectForm(): void {
    const formModal = document.getElementById(
      "project-form-modal"
    ) as HTMLDialogElement;

    // Get the model select element in the form
    const modelSelect = formModal.querySelector(
      "#new-project-model"
    ) as HTMLSelectElement;

    // Clear existing options
    modelSelect.innerHTML = "";

    // Populate with grouped options
    const groupedModelOptions = getGroupedModelOptions();

    Object.entries(groupedModelOptions).forEach(([provider, models]) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = provider;

      models.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.name;
        option.selected = model.id === "default";
        optgroup.appendChild(option);
      });

      modelSelect.appendChild(optgroup);
    });

    // Populate tool selection
    const toolsContainer = formModal.querySelector("#new-project-tools");
    if (toolsContainer) {
      // Get available tools from registry
      const toolsRegistry = clientRegistry.getAllTools();
      const availableTools = Object.keys(toolsRegistry).map((id) => ({
        id,
        name: id, // Use the ID as the name if no name property exists
        description: "Tool", // Default description
      }));

      // Clear existing tool options
      toolsContainer.innerHTML = "";

      // Add tool checkboxes using template literals for readability
      availableTools.forEach((tool) => {
        const toolOption = document.createElement("div");
        toolOption.className = "tool-option";
        toolOption.innerHTML = `
          <input
            type="checkbox"
            id="new-tool-${tool.id}"
            class="tool-checkbox"
            data-tool-id="${tool.id}"
            checked
          >
          <label for="new-tool-${tool.id}" class="tool-label">
            ${tool.name}
            <span class="tool-description">${tool.description}</span>
          </label>
        `;
        toolsContainer.appendChild(toolOption);
      });
    }

    formModal.showModal();
  }

  public destroy(): void {
    this.cleanupFns.forEach((cleanup) => cleanup());
  }

  /**
   * Helper function to check if the application is fully initialized
   */
  private async isAppInitialized(): Promise<boolean> {
    if (!window.app) return false;

    try {
      // Try to wait for initialization with a timeout
      const timeoutPromise = new Promise<boolean>(resolve => {
        setTimeout(() => resolve(false), 2000);
      });

      const initPromise = window.app.waitForInitialization().then(() => true);
      return await Promise.race([initPromise, timeoutPromise]);
    } catch (error) {
      console.error("Error checking app initialization:", error);
      return false;
    }
  }
}
