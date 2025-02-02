import { effect, batch } from "@preact/signals-core";
import { converseStore } from "../../stores/ConverseStore/ConverseStore";
import { store } from "../../stores/AppStore";
import { MessageTable } from "./MessageTable";
import { WorkAreaModals } from "./WorkAreaModals";
import { MessageExtended } from "../../app.types";
import { dataStore } from "../../stores/DataStore/DataStore";
import { marked } from "marked"; // Add this import for markdown rendering

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
