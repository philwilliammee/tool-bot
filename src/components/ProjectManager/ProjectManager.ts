import { converseStore } from "../../stores/ConverseStore/ConverseStore";
import { projectStore } from "../../stores/ProjectStore/ProjectStore";

// src/components/ProjectManager/ProjectManager.ts
export class ProjectManager {
  private dropdown!: HTMLSelectElement;
  private modal!: HTMLDialogElement;
  private projectList!: HTMLElement;
  private cleanupFns: Array<() => void> = [];

  constructor() {
    this.initializeElements();
    this.setupEventListeners();
    this.render();
  }

  private initializeElements(): void {
    // Add this HTML to index.html
    const template = `
      <div class="project-controls">
        <select id="project-selector" class="project-selector">
          <option value="">Select Project</option>
        </select>
        <button class="btn btn-blue new-project-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <button class="btn btn-blue manage-projects-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </div>

      <dialog id="project-modal" class="modal">
        <div class="modal-content">
          <h2>Manage Projects</h2>
          <div class="project-list"></div>
          <div class="modal-actions">
            <button class="btn btn-blue new-project-btn">New Project</button>
            <button class="btn btn-secondary close-btn">Close</button>
          </div>
        </div>
      </dialog>

      <dialog id="project-form-modal" class="modal">
        <div class="modal-content">
          <h2 class="modal-title">New Project</h2>
          <form id="project-form">
            <div class="form-group">
              <label for="project-name">Project Name</label>
              <input type="text" id="project-name" required>
            </div>
            <div class="form-group">
              <label for="project-description">Description</label>
              <textarea id="project-description"></textarea>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
              <button type="submit" class="btn btn-blue">Save Project</button>
            </div>
          </form>
        </div>
      </dialog>
    `;

    // Insert template into DOM
    const header = document.querySelector("header");
    const controls = document.createElement("div");
    controls.innerHTML = template;
    header?.appendChild(controls);

    // Get references
    this.dropdown = document.getElementById(
      "project-selector"
    ) as HTMLSelectElement;
    this.modal = document.getElementById("project-modal") as HTMLDialogElement;
    this.projectList = this.modal.querySelector(".project-list") as HTMLElement;
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
      const nameInput = form.querySelector("#project-name") as HTMLInputElement;
      const descInput = form.querySelector(
        "#project-description"
      ) as HTMLTextAreaElement;

      const projectId = projectStore.createProject(
        nameInput.value,
        descInput.value
      );

      projectStore.setActiveProject(projectId);
      converseStore.setProject(projectId);

      form.reset();
      (
        document.getElementById("project-form-modal") as HTMLDialogElement
      ).close();
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

    this.projectList.innerHTML = projects
      .map(
        (project) => `
      <div class="project-item" data-id="${project.id}">
        <div class="project-info">
          <h3>${project.name}</h3>
          <p class="project-meta">
            ${project.messageCount} messages ·
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
    });
  }

  private showProjectForm(): void {
    const formModal = document.getElementById(
      "project-form-modal"
    ) as HTMLDialogElement;
    formModal.showModal();
  }

  public destroy(): void {
    this.cleanupFns.forEach((cleanup) => cleanup());
  }
}
