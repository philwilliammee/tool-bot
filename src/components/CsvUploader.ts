// src/components/CsvUploader.ts
import { store } from "../stores/AppStore";
import { parseCSV } from "../utils/csvParser";
import { effect } from "@preact/signals-core";

export class CsvUploader {
  private fileInput: HTMLInputElement;
  private uploadButton: HTMLLabelElement;
  private uploadIcon: HTMLElement;
  private clearIcon: HTMLElement;
  private buttonText: HTMLElement;
  private cleanup!: () => void;

  constructor() {
    // Get DOM elements
    this.fileInput = document.querySelector("#csvFile") as HTMLInputElement;
    this.uploadButton = document.querySelector(
      ".file-button.upload"
    ) as HTMLLabelElement;
    this.uploadIcon = document.querySelector(".upload-icon") as HTMLElement;
    this.clearIcon = document.querySelector(".clear-icon") as HTMLElement;
    this.buttonText = document.querySelector(
      ".file-button.upload .button-text"
    ) as HTMLElement;

    if (
      !this.fileInput ||
      !this.uploadButton ||
      !this.uploadIcon ||
      !this.clearIcon ||
      !this.buttonText
    ) {
      throw new Error("Required CSV uploader elements not found");
    }

    this.setupEventListeners();
    this.setupStoreSubscription();
  }

  private setupStoreSubscription(): void {
    // React to store's hasData changes
    this.cleanup = effect(() => {
      const hasData = store.hasData.value;
      this.updateUIState(hasData);
    });
  }

  private setupEventListeners(): void {
    this.fileInput.addEventListener("change", this.handleFileUpload);
    this.uploadButton.addEventListener("click", this.handleButtonClick);
  }

  private handleButtonClick = (e: MouseEvent) => {
    if (store.hasData.value) {
      e.preventDefault();
      e.stopPropagation(); // Prevent label from triggering file input
      this.handleClearData();
    }
  };

  private handleFileUpload = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = parseCSV(text);
        store.setData(data);
        store.showToast("CSV data loaded successfully! 📊");
      } catch (error) {
        console.error("Error parsing CSV:", error);
        store.setError("Error parsing CSV file");
        store.showToast("Error parsing CSV file ❌");
      }
    };

    reader.readAsText(file);
  };

  private handleClearData = () => {
    store.clearData();
    this.fileInput.value = ""; // Clear the file input
    store.showToast("CSV data cleared 🗑️");
  };

  private updateUIState(hasData: boolean): void {
    // Update icons
    this.uploadIcon.classList.toggle("hidden", hasData);
    this.clearIcon.classList.toggle("hidden", !hasData);

    // Update text
    this.buttonText.textContent = hasData ? "Clear CSV" : "Upload CSV";

    // Update file input visibility
    if (hasData) {
      this.fileInput.style.pointerEvents = "none";
      this.fileInput.style.opacity = "0";
      this.fileInput.style.position = "absolute";
    } else {
      this.fileInput.style.pointerEvents = "auto";
      this.fileInput.style.opacity = "1";
      this.fileInput.style.position = "relative";
    }
  }

  public destroy(): void {
    this.cleanup(); // Clean up the effect
    this.fileInput.removeEventListener("change", this.handleFileUpload);
    this.uploadButton.removeEventListener("click", this.handleButtonClick);
  }
}
