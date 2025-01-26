// main.ts
import { MainApplication } from "./MainApplication/MainApplication";
import { dataStore } from "./stores/DataStore/DataStore";
import { effect } from "@preact/signals-core";

// Make dataStore available globally for tools
declare global {
  interface Window {
    availableData?: Record<string, any>[];
  }
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    const app = new MainApplication();

    // Keep window.availableData in sync with dataStore
    effect(() => {
      window.availableData = dataStore.getIframeData();
    });

    // Optional: Store the instance for cleanup
    window.addEventListener("unload", () => {
      app.destroy();
      window.availableData = undefined;
    });
  } catch (error) {
    console.error("Failed to initialize application:", error);
  }
});
