// src/components/ProjectManager/ProjectManager.ts
import { converseStore } from "../../stores/ConverseStore/ConverseStore";
import { projectStore } from "../../stores/ProjectStore/ProjectStore";

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

      // Validate project name
      if (!nameInput.value.trim()) {
        return; // Don't create project if name is empty
      }

      const projectId = projectStore.createProject(
        nameInput.value.trim(),
        descInput.value.trim()
      );

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
