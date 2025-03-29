// src/components/InterruptButton/InterruptButton.ts
import { store } from "../../stores/AppStore";
import { converseStore } from "../../stores/ConverseStore/ConverseStore";

/**
 * InterruptButton Component
 *
 * Provides a way to interrupt currently running tool executions or AI text generation.
 * Handles both specific tool interruption and fallback to interrupting all tools if needed.
 */
export class InterruptButton {
  private button: HTMLButtonElement;
  private boundHandleInterrupt: ((event: Event) => void) | null = null;

  constructor() {
    this.button = document.querySelector(".interrupt-btn") as HTMLButtonElement;
    if (!this.button) {
      console.error("Interrupt button not found in the DOM");
      return;
    }

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Store bound handler for proper cleanup
    this.boundHandleInterrupt = this.handleInterrupt.bind(this);
    this.button.addEventListener("click", this.boundHandleInterrupt);

    // Create an effect that updates button state based on interruptible status
    store.effect(() => {
      const isInterruptible = store.isInterruptible.value;
      const interruptType = store.interruptType.value;

      // Enable/disable button based on whether anything can be interrupted
      this.button.disabled = !isInterruptible;

      // Update button title based on what can be interrupted
      this.button.title = this.getButtonTitle(interruptType);
    });
  }

  private getButtonTitle(type: "tool" | "generation" | "none"): string {
    switch (type) {
      case "tool":
        return "Interrupt current tool execution";
      case "generation":
        return "Interrupt text generation";
      case "none":
        return "Nothing to interrupt";
    }
  }

  /**
   * Handles interrupt button clicks by attempting to interrupt in the following order:
   * 1. Current specific tool (if one is running)
   * 2. All tools (if no specific tool ID is available)
   * 3. Text generation (if no tools are running)
   */
  private handleInterrupt(): void {
    try {
      // First, try to interrupt any running tool
      if (store.isToolRunning.value) {
        const currentToolId = store.currentToolId.value;
        if (currentToolId) {
          // Try to interrupt specific tool first
          const toolInterrupted = converseStore.interruptCurrentTool();
          if (toolInterrupted) {
            store.showToast("Tool execution interrupted");
            return;
          }
        } else {
          // Fall back to interrupting all tools
          const allToolsInterrupted = converseStore.interruptAllTools();
          if (allToolsInterrupted) {
            store.showToast("All tool executions interrupted");
            return;
          }
        }
      }

      // If no tool was running or interruption failed, try to interrupt text generation
      if (store.isGenerating.value) {
        const llmHandler = converseStore["llmHandler"];
        if (llmHandler) {
          const interrupted = llmHandler.interruptStream();
          if (interrupted) {
            store.showToast("Text generation interrupted");
          } else {
            console.warn("Failed to interrupt text generation");
            store.showToast("Failed to interrupt operation");
          }
        }
      }
    } catch (error) {
      console.error("Error during interrupt operation:", error);
      store.showToast("Error interrupting operation");
    }
  }

  /**
   * Cleans up event listeners and resources when the component is destroyed.
   */
  public destroy(): void {
    // Remove event listeners using the stored bound handler
    if (this.boundHandleInterrupt) {
      this.button?.removeEventListener("click", this.boundHandleInterrupt);
      this.boundHandleInterrupt = null;
    }
  }
}
