import { chatContext } from "../Chat/chat-context";
import { store } from "../../stores/AppStore";
import { MessageTable } from "./MessageTable";
import { WorkAreaModals } from "./WorkAreaModals";

export class WorkArea {
  private element: HTMLElement;
  private modals: WorkAreaModals;
  private messageTable: MessageTable;

  constructor(container: HTMLElement) {
    this.element = container;
    this.modals = new WorkAreaModals();
    this.messageTable = new MessageTable(
      this.handleViewMessage.bind(this),
      this.handleEditMessage.bind(this),
      this.handleDeleteMessage.bind(this),
      this.handleReorderMessages.bind(this)
    );

    this.initialize();
  }

  private initialize(): void {
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

    const tableContainer = this.element.querySelector(
      "#message-table-container"
    ) as HTMLElement | null;
    if (tableContainer) {
      this.messageTable.mount(tableContainer);
    }

    this.setupEventListeners();
    chatContext.onMessagesChange(() => {
      this.messageTable.update();
      this.updateMessageCount();
    });
  }

  private updateMessageCount(): void {
    const countElement = this.element.querySelector(".message-count");
    if (countElement) {
      countElement.textContent = `${chatContext.getMessages().length} messages`;
    }
  }

  private setupEventListeners(): void {
    // New message button
    this.element
      .querySelector(".new-message-btn")
      ?.addEventListener("click", () => {
        // Show the modal for new message
        this.modals.showNewMessageModal((role, content) => {
          // Just add a single text block here
          chatContext.addMessage({
            role,
            content: [{ text: content }],
          });
          store.showToast("New message added");
        });
      });

    // Delete all button
    this.element
      .querySelector(".delete-all-btn")
      ?.addEventListener("click", () => {
        if (
          confirm(
            "Are you sure you want to delete all messages? This cannot be undone."
          )
        ) {
          chatContext.deleteAllMessages();
          store.showToast("All messages deleted");
        }
      });
  }

  private handleViewMessage(index: number): void {
    const messages = chatContext.getMessages();
    const message = messages[index];
    this.modals.showViewModal(message);
  }

  private handleEditMessage(index: number): void {
    const messages = chatContext.getMessages();
    const message = messages[index];
    this.modals.showEditModal(message, (newContent) => {
      // Our updateMessage sets the entire content array to [{ text: newContent }]
      chatContext.updateMessage(index, newContent);
      store.showToast("Message updated successfully");
    });
  }

  private handleDeleteMessage(index: number): void {
    if (confirm("Are you sure you want to delete this message?")) {
      chatContext.deleteMessage(index);
      store.showToast("Message deleted");
    }
  }

  private handleReorderMessages(fromIndex: number, toIndex: number): void {
    chatContext.reorderMessages(fromIndex, toIndex);
  }

  public destroy(): void {
    this.modals.destroy();
    this.messageTable.destroy();
    this.element.innerHTML = "";
  }
}
