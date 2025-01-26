// src/components/DataArea/DataArea.ts
import { effect } from "@preact/signals-core";
import { dataStore } from "../../stores/DataStore/DataStore";

export class DataArea {
  private container: HTMLElement;

  constructor() {
    this.container = document.querySelector(".data-list") as HTMLElement;
    if (!this.container) {
      throw new Error("Data list container not found");
    }

    this.render();
    this.setupEffects();
  }

  private setupEffects() {
    effect(() => {
      const data = dataStore.getData();
      this.updateDataStatus(data);
      this.render();
    });
  }

  private updateDataStatus(data: any) {
    const countElement = document.querySelector(".data-count");
    if (countElement) {
      countElement.textContent = data ? "Data Loaded" : "No Data";
    }
  }

  private setupDragAndDrop(emptyState: HTMLElement) {
    emptyState.addEventListener("dragover", (e) => {
      e.preventDefault();
      emptyState.classList.add("drag-over");
    });

    emptyState.addEventListener("dragleave", (e) => {
      e.preventDefault();
      emptyState.classList.remove("drag-over");
    });

    emptyState.addEventListener("drop", async (e) => {
      e.preventDefault();
      emptyState.classList.remove("drag-over");

      const file = e.dataTransfer?.files[0];
      if (file && (file.name.endsWith(".csv") || file.name.endsWith(".json"))) {
        try {
          await dataStore.addFromFile(file);
        } catch (error: any) {
          console.error("Upload failed:", error);
        }
      }
    });

    // Also handle click to upload
    emptyState.onclick = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv,.json";
      input.style.display = "none";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          try {
            await dataStore.addFromFile(file);
          } catch (error: any) {
            console.error("Upload failed:", error);
          }
        }
      };
      document.body.appendChild(input);
      input.click();
      input.remove();
    };
  }

  private render() {
    const data = dataStore.getData();

    if (!data) {
      this.container.innerHTML = `
        <div class="empty-state">
          <div class="upload-prompt">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p>Drop CSV file here or click to upload</p>
          </div>
        </div>`;

      const emptyState = this.container.querySelector(
        ".empty-state"
      ) as HTMLElement;
      if (emptyState) {
        this.setupDragAndDrop(emptyState);
      }
      return;
    }

    const element = document.createElement("div");
    element.className = "data-object";

    element.innerHTML = `
      <div class="data-object-header">
        <span class="data-object-name">${data.name}</span>
        <span class="data-object-meta">
          ${data.type.toUpperCase()} •
          ${data.metadata.rowCount ? `${data.metadata.rowCount} rows • ` : ""}
          ${new Date(data.metadata.createdAt).toLocaleString()}
        </span>
      </div>
      <div class="data-object-content">
        <pre>${JSON.stringify(data.data, null, 2)}</pre>
      </div>
    `;

    this.container.innerHTML = "";
    this.container.appendChild(element);
  }

  public destroy() {
    this.container.innerHTML = "";
  }
}
