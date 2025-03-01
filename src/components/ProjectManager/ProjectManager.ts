// src/components/ProjectManager/ProjectManager.ts
import { converseStore } from "../../stores/ConverseStore/ConverseStore";
import { projectStore } from "../../stores/ProjectStore/ProjectStore";
import { converseAgentConfig } from "../../agents/converseAgent";
import { getGroupedModelOptions } from "../../utils/modelOptions";
import { clientRegistry } from "../../../tools/registry.client";

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
      converseStore.setProject(projectId);
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

    // Close modal button
    this.modal.querySelector(".close-btn")?.addEventListener("click", () => {
      this.modal.close();
    });

    // Project form submission
    document.getElementById("project-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const submitter = e.submitter as HTMLButtonElement;

      // Check if this was a cancel action
      if (submitter.value === "Novalidate close") {
        this.formModal.close();
        form.reset();
        return;
      }

      // Handle project creation
      const nameInput = form.querySelector("#project-name") as HTMLInputElement;
      const descInput = form.querySelector(
        "#project-description"
      ) as HTMLTextAreaElement;

      // Get configuration values
      const modelSelect = form.querySelector(
        "#new-project-model"
      ) as HTMLSelectElement;
      const systemPromptInput = form.querySelector(
        "#new-project-system-prompt"
      ) as HTMLTextAreaElement;
      const persistentMessageInput = form.querySelector(
        "#new-project-persistent-message"
      ) as HTMLTextAreaElement;

      // Get selected tools
      const enabledTools: string[] = [];
      form
        .querySelectorAll(".tool-checkbox")
        .forEach((checkbox: HTMLInputElement) => {
          if (checkbox.checked) {
            enabledTools.push(checkbox.dataset.toolId || "");
          }
        });

      // Validate project name
      if (!nameInput.value.trim()) {
        return; // Don't create project if name is empty
      }

      const projectId = projectStore.createProject(
        nameInput.value.trim(),
        descInput.value.trim()
      );

      // Update project configuration
      projectStore.updateProjectConfig(projectId, {
        model: modelSelect.value,
        systemPrompt: systemPromptInput.value.trim(),
        persistentUserMessage: persistentMessageInput.value.trim(),
        enabledTools: enabledTools,
      });

      projectStore.setActiveProject(projectId);
      converseStore.setProject(projectId);

      form.reset();
      this.formModal.close();
      this.render();
    });
  }

  private render(): void {
    // Update dropdown options
    const projects = projectStore.getAllProjects();
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
    const projects = projectStore.getAllProjects();
    const groupedModelOptions = getGroupedModelOptions();

    // Get available tools from registry
    const toolsRegistry = clientRegistry.getAllTools();
    const availableTools = Object.keys(toolsRegistry).map((id) => ({
      id,
      name: id, // Use the ID as the name if no name property exists
      description: "Tool", // Default description
    }));

    this.projectList.innerHTML = projects
      .map(
        (project) => `
      <div class="project-item" data-id="${project.id}">
        <div class="project-header">
          <div class="project-info">
            <h3>${project.name}</h3>
            <p class="project-meta">
              ${project.messages.length} messages ·
              Last updated: ${new Date(project.updatedAt).toLocaleDateString()}
            </p>
            ${
              project.description
                ? `<p class="project-description">${project.description}</p>`
                : ""
            }
          </div>
          <div class="project-actions">
            <button class="btn btn-small btn-blue select-btn">Select</button>
            <button class="btn btn-small btn-green clone-btn">Clone</button>
            <button class="btn btn-small btn-danger delete-btn">Delete</button>
          </div>
        </div>

        <!-- Project Configuration Section -->
        <div class="project-config-section">
          <h4>Project Configuration</h4>
          <div class="config-item">
            <label for="model-select-${project.id}">AI Model:</label>
            <select id="model-select-${
              project.id
            }" class="model-select" data-project-id="${project.id}">
              ${Object.entries(groupedModelOptions)
                .map(
                  ([provider, models]) => `
                <optgroup label="${provider}">
                  ${models
                    .map(
                      (model: {
                        id: string;
                        name: string;
                        provider: string;
                        apiType: string;
                      }) => `
                    <option value="${model.id}" ${
                        project.config?.model === model.id ? "selected" : ""
                      }>
                      ${model.name}
                    </option>
                  `
                    )
                    .join("")}
                </optgroup>
              `
                )
                .join("")}
            </select>
          </div>

          <div class="config-item">
            <label for="system-prompt-${project.id}">System Prompt:</label>
            <textarea
              id="system-prompt-${project.id}"
              class="system-prompt"
              data-project-id="${project.id}"
              placeholder="Custom instructions for the AI..."
              rows="2"
            >${project.config?.systemPrompt || ""}</textarea>
          </div>

          <div class="config-item">
            <label for="persistent-message-${
              project.id
            }">Persistent User Message:</label>
            <textarea
              id="persistent-message-${project.id}"
              class="persistent-message"
              data-project-id="${project.id}"
              placeholder="Message to include in every conversation..."
              rows="2"
            >${project.config?.persistentUserMessage || ""}</textarea>
          </div>

          <!-- Tool Configuration -->
          <div class="config-item">
            <label>Enabled Tools:</label>
            <div class="tool-selection">
              ${availableTools
                .map(
                  (tool) => `
                <div class="tool-option">
                  <input
                    type="checkbox"
                    id="tool-${project.id}-${tool.id}"
                    class="tool-checkbox"
                    data-tool-id="${tool.id}"
                    ${
                      project.config?.enabledTools?.includes(tool.id) ||
                      !project.config?.enabledTools
                        ? "checked"
                        : ""
                    }
                  >
                  <label for="tool-${project.id}-${tool.id}" class="tool-label">
                    ${tool.name}
                    <span class="tool-description">${tool.description}</span>
                  </label>
                </div>
              `
                )
                .join("")}
            </div>
          </div>

          <button class="btn btn-small btn-blue save-config-btn" data-project-id="${
            project.id
          }">
            Save Configuration
          </button>
        </div>
      </div>
    `
      )
      .join("");

    // Add event listeners to project items
    this.projectList.querySelectorAll(".project-item").forEach((item) => {
      const id = item.getAttribute("data-id")!;

      item.querySelector(".select-btn")?.addEventListener("click", () => {
        projectStore.setActiveProject(id);
        converseStore.setProject(id);
        this.modal.close();
        this.render();
      });

      item.querySelector(".delete-btn")?.addEventListener("click", () => {
        if (confirm("Are you sure you want to delete this project?")) {
          projectStore.deleteProject(id);
          this.renderProjectList();
          this.render();
        }
      });

      // Add event listener for saving configuration
      item.querySelector(".save-config-btn")?.addEventListener("click", () => {
        const modelSelect = item.querySelector(
          `.model-select`
        ) as HTMLSelectElement;
        const systemPrompt = item.querySelector(
          `.system-prompt`
        ) as HTMLTextAreaElement;
        const persistentMessage = item.querySelector(
          `.persistent-message`
        ) as HTMLTextAreaElement;

        // Get selected tools
        const enabledTools: string[] = [];
        item
          .querySelectorAll(".tool-checkbox")
          .forEach((checkbox: HTMLInputElement) => {
            if (checkbox.checked) {
              enabledTools.push(checkbox.dataset.toolId || "");
            }
          });

        projectStore.updateProjectConfig(id, {
          model: modelSelect.value,
          systemPrompt: systemPrompt.value,
          persistentUserMessage: persistentMessage.value,
          enabledTools: enabledTools,
        });

        // Show a simple alert for configuration saving
        alert("Configuration saved successfully!");
      });

      // Add event listener for clone button
      item.querySelector(".clone-btn")?.addEventListener("click", () => {
        // Fetch the project from the store
        const sourceProject = projectStore.getProject(id);

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
          try {
            // Ask if messages should be cloned
            const cloneMessages = confirm(
              "Would you like to clone the messages as well? Click OK to include messages, or Cancel to create an empty project."
            );

            // Clone the project with the provided name and message preference
            const newProjectId = projectStore.cloneProject(
              id,
              projectName,
              cloneMessages
            );
            console.log(`Project cloned successfully: ${newProjectId}`);

            // Refresh the project list to show the new project
            this.renderProjectList();
          } catch (error) {
            console.error("Failed to clone project:", error);
          }
        }
      });
    });
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

      // Add tool checkboxes
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
}
