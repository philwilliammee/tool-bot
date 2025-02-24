import { effect, batch } from "@preact/signals-core";
import { converseStore } from "../../stores/ConverseStore/ConverseStore";
import { store } from "../../stores/AppStore";
import { MessageTable } from "./MessageTable";
import { WorkAreaModals } from "./WorkAreaModals";
import { MessageExtended } from "../../app.types";
import { dataStore } from "../../stores/DataStore/DataStore";
import { marked } from "marked"; // Add this import for markdown rendering
import { projectStore } from "../../stores/ProjectStore/ProjectStore";

export class WorkArea {
  private modals: WorkAreaModals;
  private messageTable: MessageTable;
  private initialized: boolean = false;
  private cleanupFns: Array<() => void> = [];

  constructor(private element: HTMLElement) {
    console.log("WorkArea component initialized");
    this.modals = new WorkAreaModals();
    this.messageTable = new MessageTable(
      this.handleViewMessage.bind(this),
      this.handleEditMessage.bind(this),
      this.handleDeleteMessage.bind(this)
    );

    this.initialize();
  }

  private initialize(): void {
    this.messageTable.mount();
    this.setupEventListeners();
    this.initializeDataContextPanel();
    this.initializeArchiveSummaryPanel();

    this.cleanupFns.push(
      effect(() => {
        const isActive = store.activeTab.value === "work-area";
        this.element.style.display = isActive ? "block" : "none";
      })
    );

    this.cleanupFns.push(
      effect(() => {
        if (store.isGenerating.value) {
          // this.disableInteractions();
        } else {
          this.enableInteractions();
        }
      })
    );

    converseStore.onMessagesChange(() => {
      this.updateDynamicContent();
    });

    this.initialized = true;
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

  private async updateArchiveSummaryText(textElement: Element, summaryText: string): Promise<void> {
    const rendered = await Promise.resolve(marked(summaryText));
    textElement.innerHTML = rendered;
  }
  
  private initializeArchiveSummaryPanel(): void {
    const button = this.element.querySelector(".archive-summary-button");
    const popover = this.element.querySelector(
      ".archive-summary-popover"
    ) as HTMLElement;
    const textElement = this.element.querySelector(".archive-summary-text");
    const panel = this.element.querySelector(".archive-summary-panel");
  
    if (!button || !popover || !textElement || !panel) {
      console.warn("Archive summary panel elements not found");
      return;
    }
  
    const updateSummaryDisplay = async () => {
      const summary = converseStore.getArchiveSummary();
      const isSummarizing = converseStore.getIsSummarizing();
      // Get only archived messages for current project
      const currentProjectId = projectStore.getActiveProject();
      const archivedMessages = converseStore.getMessages().filter(
        (msg) => msg.metadata.isArchived && msg.projectId === currentProjectId
      );
  
      if (isSummarizing) {
        textElement.innerHTML = "Generating summary...";
        button.classList.add("is-summarizing");
      } else {
        button.classList.remove("is-summarizing");
        if (summary) {
          await this.updateArchiveSummaryText(textElement, summary);
          button.classList.add("has-summary");
        } else {
          textElement.textContent = archivedMessages.length > 0 
            ? "No summary available yet" 
            : "No archived messages";
          button.classList.remove("has-summary");
        }
      }
  
      // Update button text to include count
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 8v13H3V8"></path>
          <path d="M1 3h22v5H1z"></path>
          <path d="M10 12h4"></path>
        </svg>
        Archive Summary ${archivedMessages.length > 0 ? `(${archivedMessages.length})` : ''}
        ${isSummarizing ? '<span class="spinner"></span>' : ''}
      `;
    };
  
    button.addEventListener("click", () => {
      console.log("Archive summary button clicked");
      updateSummaryDisplay().catch(console.error);
      popover.togglePopover();
    });
  
    // Update when messages change
    this.cleanupFns.push(
      converseStore.onMessagesChange(() => {
        updateSummaryDisplay().catch(console.error);
      })
    );
  
    // Initial update
    updateSummaryDisplay().catch(console.error);
  
    // Cleanup popover
    this.cleanupFns.push(() => {
      popover.hidePopover();
    });
  }
  // Rest of existing methods remain unchanged
  private updateDynamicContent(): void {
    if (store.activeTab.value === "work-area") {
      this.updateMessageCount();
      this.updateButtonStates();
    }
  }

  private updateMessageCount(): void {
    const countElement = this.element.querySelector(".message-count");
    if (countElement) {
      countElement.textContent = `${
        converseStore.getMessages().length
      } messages`;
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
      const hasMessages = converseStore.getMessages().length > 0;
      const isGenerating = store.isGenerating.value;

      deleteAllBtn.disabled = !hasMessages || isGenerating;
      newMessageBtn.disabled = isGenerating;
    }
  }

  // private disableInteractions(): void {
  //   this.element
  //     .querySelectorAll("button")
  //     .forEach((btn) => (btn.disabled = true));
  // }

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
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.modals.destroy();
    this.messageTable.destroy();
  }
}
