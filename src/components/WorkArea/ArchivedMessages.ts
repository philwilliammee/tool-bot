import { effect, signal } from "@preact/signals-core";
import { converseStore } from "../../stores/ConverseStore/ConverseStore.js";
import { projectStore } from "../../stores/ProjectStore/ProjectStore.js";

/**
 * ArchivedMessages component for WorkArea
 * Manages the archived messages summary display in the WorkArea
 */
export class ArchivedMessages {
  private element: HTMLElement;
  private archiveSummaryButton!: HTMLButtonElement;
  private archiveSummaryText!: HTMLElement;
  private archiveSummaryPopover!: HTMLElement;
  private cleanupFns: Array<() => void> = [];

  // Track visibility state
  private isVisible = signal<boolean>(false);

  constructor(container: HTMLElement) {
    this.element = container;

    try {
      const buttonElement = this.element.querySelector(
        ".archive-summary-button"
      );
      const popoverElement = this.element.querySelector(
        ".archive-summary-popover"
      );
      const textElement = this.element.querySelector(".archive-summary-text");

      if (!buttonElement) {
        console.error(
          "Archive summary button not found in container",
          this.element
        );
        throw new Error("Archive summary button not found");
      }

      if (!popoverElement) {
        console.error(
          "Archive summary popover not found in container",
          this.element
        );
        throw new Error("Archive summary popover not found");
      }

      if (!textElement) {
        console.error(
          "Archive summary text not found in container",
          this.element
        );
        throw new Error("Archive summary text not found");
      }

      this.archiveSummaryButton = buttonElement as HTMLButtonElement;
      this.archiveSummaryPopover = popoverElement as HTMLElement;
      this.archiveSummaryText = textElement as HTMLElement;

      this.initialize();
    } catch (error) {
      console.error("Failed to initialize ArchivedMessages component:", error);
    }
  }

  private initialize(): void {
    // Set up button handler
    this.archiveSummaryButton.addEventListener("click", () =>
      this.toggleSummaryVisibility()
    );

    // Set up effects to respond to state changes
    this.setupEffects();

    // Close popover when clicking outside
    document.addEventListener("click", this.handleOutsideClick.bind(this));

    this.cleanupFns.push(() => {
      document.removeEventListener("click", this.handleOutsideClick.bind(this));
    });
  }

  private toggleSummaryVisibility(): void {
    this.isVisible.value = !this.isVisible.value;

    if (this.isVisible.value) {
      this.showPopover();
    } else {
      this.hidePopover();
    }
  }

  private showPopover(): void {
    try {
      if ("showPopover" in this.archiveSummaryPopover) {
        (this.archiveSummaryPopover as any).showPopover();
      } else {
        // Fallback for browsers without Popover API
        (this.archiveSummaryPopover as HTMLElement).classList.add("visible");
      }
    } catch (err) {
      console.error("Error showing popover:", err);
    }
  }

  private hidePopover(): void {
    try {
      if ("hidePopover" in this.archiveSummaryPopover) {
        (this.archiveSummaryPopover as any).hidePopover();
      } else {
        // Fallback for browsers without Popover API
        (this.archiveSummaryPopover as HTMLElement).classList.remove("visible");
      }
    } catch (err) {
      console.error("Error hiding popover:", err);
    }
  }

  private handleOutsideClick(event: MouseEvent): void {
    if (
      this.isVisible.value &&
      !this.archiveSummaryButton.contains(event.target as Node) &&
      !this.archiveSummaryPopover.contains(event.target as Node)
    ) {
      this.isVisible.value = false;
      this.hidePopover();
    }
  }

  private setupEffects(): void {
    // Update archive summary when it changes
    this.cleanupFns.push(
      effect(() => {
        const archiveSummary = converseStore.getArchiveSummary().value;
        this.updateSummaryText(archiveSummary);
      })
    );

    // Update loading state when summarizing
    this.cleanupFns.push(
      effect(() => {
        const isSummarizing = converseStore.getIsSummarizing().value;
        this.updateSummarizingState(isSummarizing);
      })
    );

    // Update visibility when active project changes
    this.cleanupFns.push(
      effect(() => {
        const activeProject = projectStore.activeProject.value;
        this.updateVisibility(!!activeProject);
      })
    );
  }

  private updateSummaryText(summary: string | null): void {
    if (summary) {
      this.archiveSummaryText.textContent = summary;
      this.archiveSummaryButton.classList.add("has-summary");
    } else {
      this.archiveSummaryText.textContent = "No archived messages";
      this.archiveSummaryButton.classList.remove("has-summary");
    }
  }

  private updateSummarizingState(isSummarizing: boolean): void {
    if (isSummarizing) {
      this.archiveSummaryButton.classList.add("loading");
      this.archiveSummaryButton.innerHTML = `
        <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
        Summarizing...
      `;
    } else {
      this.archiveSummaryButton.classList.remove("loading");
      this.archiveSummaryButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 8v13H3V8"></path>
          <path d="M1 3h22v5H1z"></path>
          <path d="M10 12h4"></path>
        </svg>
        Archive Summary
      `;
    }
  }

  private updateVisibility(hasActiveProject: boolean): void {
    if (hasActiveProject) {
      this.element.classList.remove("hidden");
    } else {
      this.element.classList.add("hidden");
      // Also hide popover if visible
      if (this.isVisible.value) {
        this.isVisible.value = false;
        this.hidePopover();
      }
    }
  }

  public destroy(): void {
    // Clean up event listeners
    this.archiveSummaryButton.removeEventListener("click", () =>
      this.toggleSummaryVisibility()
    );
    document.removeEventListener("click", this.handleOutsideClick.bind(this));

    // Run cleanup functions for effects
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }
}
