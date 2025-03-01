// src/components/ProjectManager/ProjectManager.ts
import { converseStore } from "../../stores/ConverseStore/ConverseStore";
import { projectStore } from "../../stores/ProjectStore/ProjectStore";
import { converseAgentConfig } from "../../agents/converseAgent";
import { getGroupedModelOptions } from "../../utils/modelOptions";

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

        projectStore.updateProjectConfig(id, {
          model: modelSelect.value,
          systemPrompt: systemPrompt.value,
          persistentUserMessage: persistentMessage.value,
        });

        // Show a confirmation message
        alert("Project configuration saved");
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

    formModal.showModal();
  }

  public destroy(): void {
    this.cleanupFns.forEach((cleanup) => cleanup());
  }
}
