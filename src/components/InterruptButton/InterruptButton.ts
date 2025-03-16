// src/components/InterruptButton/InterruptButton.ts
import { effect } from "@preact/signals-core";
import { converseStore } from "../../stores/ConverseStore/ConverseStore";
import { store } from "../../stores/AppStore";

/**
 * InterruptButton Component
 * 
 * Provides a way to interrupt currently running tool executions or AI text generation.
 * This button is enabled when either:
 * 1. A tool is actively running, or
 * 2. AI is generating text
 */
export class InterruptButton {
  private button: HTMLButtonElement;
  private cleanupFns: Array<() => void> = [];

  constructor() {
    this.button = document.querySelector(".interrupt-btn") as HTMLButtonElement;
    
    if (!this.button) {
      console.error("Interrupt button not found in the DOM");
      return;
    }
    
    this.setupEvents();
    this.setupEffects();
  }

  private setupEvents(): void {
    const handleClick = this.handleInterrupt.bind(this);
    this.button.addEventListener("click", handleClick);
    this.cleanupFns.push(() => {
      this.button.removeEventListener("click", handleClick);
    });
  }

  private setupEffects(): void {
    // Create an effect that updates button state based on interruptible status
    const dispose = effect(() => {
      const isInterruptible = store.isInterruptible.value;
      
      // Enable/disable button based on whether anything can be interrupted
      this.button.disabled = !isInterruptible;
    });
    
    this.cleanupFns.push(dispose);
  }

  private handleInterrupt(): void {
    try {
      // First, try to interrupt any running tool
      const toolHandler = converseStore["toolHandler"];
      if (toolHandler && store.isToolRunning.value) {
        const toolInterrupted = toolHandler.interruptCurrentTool();
        if (toolInterrupted) {
          store.showToast("Tool execution interrupted");
          return;
        }
      }
      
      // If no tool was running or interruption failed, try to interrupt text generation
      const llmHandler = converseStore["llmHandler"];
      if (llmHandler && store.isGenerating.value) {
        const interrupted = llmHandler.interruptStream();
        if (interrupted) {
          store.showToast("Text generation interrupted");
        } else {
          console.warn("Failed to interrupt text generation");
          store.showToast("Failed to interrupt operation");
        }
      }
    } catch (error) {
      console.error("Error during interrupt operation:", error);
      store.showToast("Error interrupting operation");
    }
  }

  public destroy(): void {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
    
    if (this.button) {
      this.button.disabled = true;
      // Remove all event listeners to prevent memory leaks
      this.button.replaceWith(this.button.cloneNode(true));
    }
  }
}