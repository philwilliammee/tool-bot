import { effect, batch } from "@preact/signals-core";
import { chatContext } from "../Chat/chat-context";
import { store } from "../../stores/AppStore";
import { MessageTable } from "./MessageTable";
import { WorkAreaModals } from "./WorkAreaModals";

export class WorkArea {
  private element: HTMLElement;
  private modals: WorkAreaModals;
  private messageTable: MessageTable;
  private initialized: boolean = false;
  private cleanupFns: Array<() => void> = [];

  constructor(container: HTMLElement) {
    console.log("WorkArea component initialized");
    this.element = container;
    this.modals = new WorkAreaModals();
    this.messageTable = new MessageTable(
      this.handleViewMessage.bind(this),
      this.handleEditMessage.bind(this),
      this.handleDeleteMessage.bind(this)
    );

    this.initialize();
  }

  private initialize(): void {
    this.render();

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

    chatContext.onMessagesChange(() => {
      this.render();
    });
  }

  private render(): void {
    // Don't update if not visible
    if (store.activeTab.value !== "work-area") return;

    if (!this.initialized) {
      this.element.innerHTML = `
        <div class="work-area-header">
          <div class="work-area-title-group">
            <h2 class="work-area-title">Chat Admin Interface</h2>
            <span class="message-count">${
              chatContext.getMessages().length
            } messages</span>
          </div>
          <div class="work-area-actions">
            <button class="btn btn-danger delete-all-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2">
                <path d="M3 6h18"></path>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Delete All
            </button>
            <button class="btn btn-blue new-message-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Message
            </button>
          </div>
        </div>
        <div id="message-table-container"></div>
      `;

      // Mount message table
      const tableContainer = this.element.querySelector(
        "#message-table-container"
      ) as HTMLElement | null;
      if (tableContainer) {
        this.messageTable.mount(tableContainer);
      }

      this.setupEventListeners();
      this.initialized = true;
    }

    // Update dynamic content
    this.updateMessageCount();
    // this.updateMessageTable(); // message table now updates on its own.
    this.updateButtonStates();
  }

  private updateMessageCount(): void {
    const countElement = this.element.querySelector(".message-count");
    if (countElement) {
      countElement.textContent = `${chatContext.getMessages().length} messages`;
    }
  }

  // private updateMessageTable(): void {
  //   if (store.isGenerating.value) {
  //     // Could add loading state visualization here
  //     return;
  //   }
  //   this.messageTable.update();
  // }

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
    this.updateButtonStates(); // This will properly re-enable buttons based on state
  }

  private setupEventListeners(): void {
    this.element
      .querySelector(".new-message-btn")
      ?.addEventListener("click", () => {
        this.handleMessageOperation(() => {
          this.modals.showNewMessageModal((role, content) => {
            chatContext.addMessage({
              role,
              content: [{ text: content }],
            });
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

    // Just show the modal without using handleMessageOperation
    this.modals.showViewModal(message);
  }

  private handleEditMessage(index: number): void {
    const message = chatContext.getMessages()[index];
    if (!message || store.isGenerating.value) return;

    // Show modal without wrapping in handleMessageOperation
    this.modals.showEditModal(message, (newContent) => {
      // handleMessageOperation only when saving
      this.handleMessageOperation(() => {
        chatContext.updateMessage(index, newContent);
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

  private handleReorderMessages(fromIndex: number, toIndex: number): void {
    if (store.isGenerating.value) return;

    this.handleMessageOperation(() => {
      chatContext.reorderMessages(fromIndex, toIndex);
    }, "Messages reordered");
  }

  public destroy(): void {
    // Cleanup all effects
    this.cleanupFns.forEach((cleanup) => cleanup());

    // Cleanup components
    this.modals.destroy();
    this.messageTable.destroy();

    // Clear DOM
    this.element.innerHTML = "";
  }
}
