import { effect, batch } from "@preact/signals-core";
import { converseStore } from "../../stores/ConverseStore/ConverseStore";
import { store } from "../../stores/AppStore";
import { MessageTable } from "./MessageTable";
import { WorkAreaModals } from "./WorkAreaModals";
import { MessageExtended } from "../../app.types";
import { dataStore } from "../../stores/DataStore/DataStore";
import { marked } from "marked"; // Add this import for markdown rendering
import { projectStore } from "../../stores/ProjectStore/ProjectStore";
import { ArchivedMessages } from "./ArchivedMessages";

export class WorkArea {
  private modals: WorkAreaModals;
  private messageTable: MessageTable;
  private archivedMessages: ArchivedMessages | null = null;
  private initialized: boolean = false;
  private cleanupFns: Array<() => void> = [];

  constructor(private element: HTMLElement) {
    console.log("WorkArea component initialized with element:", element);

    // Initialize message table with handlers
    this.messageTable = new MessageTable(
      this.handleViewMessage.bind(this),
      this.handleEditMessage.bind(this),
      this.handleDeleteMessage.bind(this)
    );

    // Initialize modals
    this.modals = new WorkAreaModals();

    // Complete initialization
    this.initialize();
    console.log("WorkArea initialization complete");
  }

  private initialize(): void {
    // Mount the message table to the DOM
    console.log("Mounting message table");
    this.messageTable.mount();

    // Set up event handlers
    this.setupEventListeners();

    // Initialize panels
    this.initializeDataContextPanel();
    this.initializeArchiveSummaryPanel();

    // Set up effects for reactive updates
    this.setupEffects();

    // Initial content update
    this.updateDynamicContent();

    // Mark as initialized
    this.initialized = true;
  }

  private setupEffects(): void {
    // Tab visibility effect
    this.cleanupFns.push(
      effect(() => {
        const isActive = store.activeTab.value === "work-area";
        console.log("WorkArea tab active:", isActive);

        // Update visibility
        this.element.style.display = isActive ? "block" : "none";

        // Update content if becoming visible
        if (isActive) {
          this.updateDynamicContent();
        }
      })
    );

    // UI state effect
    this.cleanupFns.push(
      effect(() => {
        if (store.isGenerating.value) {
          // this.disableInteractions();
        } else {
          this.enableInteractions();
        }
      })
    );

    // Active project effect
    this.cleanupFns.push(
      effect(() => {
        // This effect will run whenever the active project changes
        const project = projectStore.activeProject.value;
        if (project && store.activeTab.value === "work-area") {
          console.log("Active project changed, updating WorkArea");
          this.updateDynamicContent();
          this.updateArchiveSummaryDisplay().catch(console.error);
        }
      })
    );

    // Messages effect
    this.cleanupFns.push(
      effect(() => {
        const messages = projectStore.activeProjectMessages.value;
        if (store.activeTab.value === "work-area") {
          console.log(
            "Messages updated, updating WorkArea with",
            messages.length,
            "messages"
          );
          this.updateMessageCount();
          this.updateButtonStates();
        }
      })
    );

    // Legacy listener for compatibility
    converseStore.onMessagesChange((messages) => {
      console.log("Messages changed via callback, count:", messages.length);
      this.updateDynamicContent();
    });
  }

  // Add new method for data context panel
  private initializeDataContextPanel(): void {
    const button = this.element.querySelector(".data-context-button");
    const popover = this.element.querySelector(
      ".data-context-popover"
    ) as HTMLElement;
    const textElement = this.element.querySelector(".data-context-text");
    const panel = this.element.querySelector(".data-context-panel");

    if (!button || !popover || !textElement || !panel) {
      console.warn("Data context panel elements not found");
      return;
    }

    button.addEventListener("click", () => {
      console.log("Data context button clicked");
      popover.togglePopover();
    });

    const updateContent = async (content: string | null) => {
      if (content) {
        const rendered = await marked(content);
        textElement.innerHTML = rendered;
        panel.classList.add("has-data");
        button.classList.add("has-data");
      } else {
        textElement.textContent = "No data loaded";
        panel.classList.remove("has-data");
        button.classList.remove("has-data");
      }
    };

    this.cleanupFns.push(
      effect(() => {
        const dataContext = dataStore.getDataContextText();
        updateContent(dataContext);
      })
    );

    // Cleanup popover
    this.cleanupFns.push(() => {
      popover.hidePopover();
    });
  }

  // Use effect for reactive updates with signals
  private initializeArchiveSummaryPanel(): void {
    const archiveSummaryPanel = this.element.querySelector(
      ".archive-summary-panel"
    );

    if (!archiveSummaryPanel) {
      console.warn("Archive summary panel element not found");
      return;
    }

    try {
      // Initialize the ArchivedMessages component with the panel element
      this.archivedMessages = new ArchivedMessages(
        archiveSummaryPanel as HTMLElement
      );

      // Add cleanup function
      this.cleanupFns.push(() => {
        this.archivedMessages?.destroy();
        this.archivedMessages = null;
      });
    } catch (error) {
      console.error("Failed to initialize archive summary panel:", error);
    }
  }

  private async updateArchiveSummaryDisplay(): Promise<void> {
    // This is now handled by the ArchivedMessages component through effects
    // We can keep this method as a no-op for backward compatibility
    return Promise.resolve();
  }

  // Rest of existing methods remain, but with signal-based updates
  private updateDynamicContent(): void {
    if (store.activeTab.value === "work-area") {
      console.log("Updating WorkArea dynamic content");
      this.updateMessageCount();
      this.updateButtonStates();
    }
  }

  private updateMessageCount(): void {
    const countElement = this.element.querySelector(".message-count");
    if (countElement) {
      // Use the active project messages signal
      const messages = projectStore.activeProjectMessages.value;
      countElement.textContent = `${messages.length} messages`;
      console.log("Updated message count to", messages.length);
    }
  }

  private updateButtonStates(): void {
    const deleteAllBtn = this.element.querySelector(
      ".delete-all-btn"
    ) as HTMLButtonElement;
    const newMessageBtn = this.element.querySelector(
      ".new-message-btn"
    ) as HTMLButtonElement;

    if (deleteAllBtn && newMessageBtn) {
      // Use the active project messages signal
      const messages = projectStore.activeProjectMessages.value;
      const hasMessages = messages.length > 0;
      const isGenerating = store.isGenerating.value;

      deleteAllBtn.disabled = !hasMessages || isGenerating;
      newMessageBtn.disabled = isGenerating;
    }
  }

  private enableInteractions(): void {
    this.updateButtonStates();
  }

  private setupEventListeners(): void {
    this.element
      .querySelector(".new-message-btn")
      ?.addEventListener("click", () => {
        this.handleMessageOperation(() => {
          this.modals.showNewMessageModal((role, content, tags, rating) => {
            converseStore.addMessage({
              role,
              content: [{ text: content }],
              metadata: {
                tags,
                userRating: rating,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            } as MessageExtended);
          });
        }, "New message added");
      });

    this.element
      .querySelector(".delete-all-btn")
      ?.addEventListener("click", () => {
        this.handleDeleteAll();
      });
  }

  private handleMessageOperation(
    operation: () => void,
    successMessage: string
  ): void {
    if (store.isGenerating.value) return;

    try {
      batch(() => {
        operation();
        store.showToast(successMessage);
      });
    } catch (error: any) {
      store.showToast(`Error: ${error.message}`);
      console.error("Message operation failed:", error);
    }
  }

  private handleDeleteAll(): void {
    if (store.isGenerating.value) return;

    if (
      confirm(
        "Are you sure you want to delete all messages? This cannot be undone."
      )
    ) {
      this.handleMessageOperation(() => {
        converseStore.deleteAllMessages();
      }, "All messages deleted");
    }
  }

  private handleViewMessage(id: string): void {
    const message = converseStore.getMessage(id);
    if (!message) return;
    this.modals.showViewModal(message);
  }

  private handleEditMessage(id: string): void {
    const message = converseStore.getMessage(id);
    if (!message || store.isGenerating.value) return;

    this.modals.showEditModal(message);
  }

  private handleDeleteMessage(id: string): void {
    if (store.isGenerating.value) return;

    if (confirm("Are you sure you want to delete this message?")) {
      this.handleMessageOperation(() => {
        converseStore.deleteMessage(id);
      }, "Message deleted");
    }
  }

  public destroy(): void {
    console.log("Destroying WorkArea component");
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.modals.destroy();
    this.messageTable.destroy();
  }
}
