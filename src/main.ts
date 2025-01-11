// main.ts
import { MainApplication } from "./components/MainApplication/MainApplication";

document.addEventListener("DOMContentLoaded", () => {
  try {
    const app = new MainApplication();

    // Optional: Store the instance for cleanup
    window.addEventListener('unload', () => {
      app.destroy();
    });
  } catch (error) {
    console.error("Failed to initialize application:", error);
  }
});
