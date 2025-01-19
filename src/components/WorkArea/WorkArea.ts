import { effect, batch } from "@preact/signals-core";
import { chatContext } from "../Chat/chat-context";
import { store } from "../../stores/AppStore";
import { MessageTable } from "./MessageTable";
import { WorkAreaModals } from "./WorkAreaModals";
import { MessageExtended } from "../../types/tool.types";

export class WorkArea {
  private modals: WorkAreaModals;
  private messageTable: MessageTable;
  private initialized: boolean = false;
  private cleanupFns: Array<() => void> = [];

  constructor(private element: HTMLElement) {
    console.log("WorkArea component initialized");
    this.modals = new WorkAreaModals(); // Make sure this is defined as a class property
    this.messageTable = new MessageTable(
      this.handleViewMessage.bind(this),
      this.handleEditMessage.bind(this),
      this.handleDeleteMessage.bind(this)
    );

    this.initialize();
  }

  private initialize(): void {
    // Initialize message table
    this.messageTable.mount();

    // Setup event listeners
    this.setupEventListeners();

    // Setup reactive effects
    this.cleanupFns.push(
      effect(() => {
        const isActive = store.activeTab.value === "work-area";
        this.element.style.display = isActive ? "block" : "none";
      })
    );

    this.cleanupFns.push(
      effect(() => {
        if (store.isGenerating.value) {
          this.disableInteractions();
        } else {
          this.enableInteractions();
        }
      })
    );

    // Update counts when messages change
    chatContext.onMessagesChange(() => {
      this.updateDynamicContent();
    });

    this.initialized = true;
  }

  private updateDynamicContent(): void {
    if (store.activeTab.value === "work-area") {
      this.updateMessageCount();
      this.updateButtonStates();
    }
  }

  private updateMessageCount(): void {
    const countElement = this.element.querySelector(".message-count");
    if (countElement) {
      countElement.textContent = `${chatContext.getMessages().length} messages`;
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
      const hasMessages = chatContext.getMessages().length > 0;
      const isGenerating = store.isGenerating.value;

      deleteAllBtn.disabled = !hasMessages || isGenerating;
      newMessageBtn.disabled = isGenerating;
    }
  }

  private disableInteractions(): void {
    this.element
      .querySelectorAll("button")
      .forEach((btn) => (btn.disabled = true));
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
            chatContext.addMessage({
              role,
              content: [{ text: content }],
              metadata: {
                tags,
                userRating: rating,
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
        chatContext.deleteAllMessages();
      }, "All messages deleted");
    }
  }

  private handleViewMessage(index: number): void {
    const message = chatContext.getMessages()[index];
    if (!message || store.isGenerating.value) return;
    this.modals.showViewModal(message);
  }

  private handleEditMessage(index: number): void {
    const message = chatContext.getMessages()[index] as MessageExtended;
    if (!message || store.isGenerating.value) return;

    this.modals.showEditModal(message, () => {
      this.handleMessageOperation(() => {
        // The actual update is now handled within the WorkAreaModals class
        // We just need to provide the success callback
      }, "Message updated successfully");
    });
  }

  private handleDeleteMessage(index: number): void {
    if (store.isGenerating.value) return;

    if (confirm("Are you sure you want to delete this message?")) {
      this.handleMessageOperation(() => {
        chatContext.deleteMessage(index);
      }, "Message deleted");
    }
  }

  public destroy(): void {
    // Cleanup all effects
    this.cleanupFns.forEach((cleanup) => cleanup());

    // Cleanup components
    this.modals.destroy();
    this.messageTable.destroy();
  }
}
