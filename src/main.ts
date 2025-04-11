// main.ts
import { MainApplication } from "./MainApplication/MainApplication";
import { dataStore } from "./stores/DataStore/DataStore";
import { effect } from "@preact/signals-core";

// Make dataStore available globally for tools
declare global {
  interface Window {
    availableData?: Record<string, any>[];
    app?: MainApplication;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const initializeApp = async () => {
    try {
      console.log(`Attempting initialization ${new Date().toString()}`);

      // Create the application
      const app = new MainApplication();

      // Store app instance globally for debugging and cleanup
      window.app = app;

      // Wait for complete initialization
      await app.waitForInitialization();

      console.log("Application fully initialized, setting up effects and event listeners");

      // Keep window.availableData in sync with dataStore
      effect(() => {
        window.availableData = dataStore.getIframeData();
      });

      // Optional: Store the instance for cleanup
      window.addEventListener("unload", () => {
        app.destroy();
        window.app = undefined;
        window.availableData = undefined;
      });

      console.log("Application ready");
    } catch (error) {
      console.error("Failed to initialize application:", error);
    }
  };

  // Start the initialization process
  initializeApp();
});
