// src/components/DataUpload/DataUpload.ts
import { dataStore } from "../../stores/DataStore/DataStore";

export function createDataUpload(containerId: string) {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Container ${containerId} not found`);

  const template = document.getElementById(
    "data-upload-template"
  ) as HTMLTemplateElement;
  if (!template) throw new Error("Data upload template not found");

  const render = () => {
    container.innerHTML = "";
    const content = template.content.cloneNode(true) as DocumentFragment;
    container.appendChild(content);

    const fileInput = container.querySelector(
      ".file-input"
    ) as HTMLInputElement;
    const uploadButton = container.querySelector(
      ".upload-button"
    ) as HTMLButtonElement;

    uploadButton.onclick = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      try {
        const id = await dataStore.addFromFile(file);
        console.log("Data uploaded with ID:", id);
        fileInput.value = "";
      } catch (error) {
        console.error("Upload failed:", error);
      }
    };
  };

  render();

  return {
    destroy: () => {
      container.innerHTML = "";
    },
  };
}
