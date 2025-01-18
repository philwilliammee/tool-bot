import { Message } from "@aws-sdk/client-bedrock-runtime";

export class WorkAreaModals {
  private initialized: boolean = false;
  private viewDialog!: HTMLDialogElement;
  private editDialog!: HTMLDialogElement;
  private newDialog!: HTMLDialogElement;
  private modals: HTMLDialogElement[] = [];

  // Callbacks storage
  private editCallback: ((content: string) => void) | null = null;
  private newMessageCallback:
    | ((role: "user" | "assistant", content: string) => void)
    | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized) return;

    // Get existing modals instead of creating them
    this.viewDialog = document.getElementById(
      "view-modal"
    ) as HTMLDialogElement;
    this.editDialog = document.getElementById(
      "edit-modal"
    ) as HTMLDialogElement;
    this.newDialog = document.getElementById("new-modal") as HTMLDialogElement;

    if (!this.viewDialog || !this.editDialog || !this.newDialog) {
      throw new Error("Required modal elements not found in DOM");
    }

    this.modals = [this.viewDialog, this.editDialog, this.newDialog];
    this.setupGlobalEvents();
    this.initialized = true;
  }

  private setupGlobalEvents(): void {
    // Close on outside click
    this.modals.forEach((dialog) => {
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) dialog.close();
      });

      // Cleanup form on close
      dialog.addEventListener("close", () => {
        const form = dialog.querySelector("form");
        if (form) form.reset();
      });
    });

    // Setup form submit handlers
    this.editDialog
      .querySelector(".edit-form")
      ?.addEventListener("submit", this.handleEditSubmit.bind(this));

    this.newDialog
      .querySelector(".new-message-form")
      ?.addEventListener("submit", this.handleNewMessageSubmit.bind(this));

    // Setup cancel buttons
    this.modals.forEach((modal) => {
      modal
        .querySelector(".cancel-btn")
        ?.addEventListener("click", () => modal.close());
      modal
        .querySelector(".close-btn")
        ?.addEventListener("click", () => modal.close());
    });
  }

  private updateViewModal(message: Message): void {
    const roleElement = this.viewDialog.querySelector(".role-value");
    const contentElement = this.viewDialog.querySelector(".content-value");
    const timestampElement = this.viewDialog.querySelector(".timestamp-value");

    if (roleElement) roleElement.textContent = message.role || "unknown";
    if (contentElement)
      contentElement.textContent = this.formatMessageContent(message);
    if (timestampElement)
      timestampElement.textContent = new Date().toLocaleString();
  }

  private updateEditModal(message: Message): void {
    const textarea = this.editDialog.querySelector(
      "#messageContent"
    ) as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = message.content?.[0]?.text || "";
    }
  }

  private formatMessageContent(message: Message): string {
    let content = "";
    message.content?.forEach((block, index) => {
      if (block.text) {
        content += block.text;
      } else if (block.toolResult) {
        content += `TOOL RESULT:\n${JSON.stringify(block.toolResult, null, 2)}`;
      } else if (block.toolUse) {
        content += `TOOL USAGE:\n${JSON.stringify(block.toolUse, null, 2)}`;
      } else {
        content += "[Unknown block type]";
      }

      if (index < (message.content?.length || 0) - 1) {
        content += "\n---\n";
      }
    });
    return content;
  }

  private handleEditSubmit(e: Event): void {
    e.preventDefault();
    if (!this.editCallback) return;

    const form = e.target as HTMLFormElement;
    const textarea = form.querySelector(
      "#messageContent"
    ) as HTMLTextAreaElement;

    if (textarea.value.trim()) {
      this.editCallback(textarea.value.trim());
      this.editDialog.close();
    }
  }

  private handleNewMessageSubmit(e: Event): void {
    e.preventDefault();
    if (!this.newMessageCallback) return;

    const form = e.target as HTMLFormElement;
    const roleSelect = form.querySelector("#messageRole") as HTMLSelectElement;
    const textarea = form.querySelector(
      "#newMessageContent"
    ) as HTMLTextAreaElement;

    if (roleSelect.value && textarea.value.trim()) {
      this.newMessageCallback(
        roleSelect.value as "user" | "assistant",
        textarea.value.trim()
      );
      this.newDialog.close();
    }
  }

  // Public API
  public showViewModal(message: Message): void {
    this.updateViewModal(message);
    this.viewDialog.showModal();
  }

  public showEditModal(
    message: Message,
    onSave: (content: string) => void
  ): void {
    this.editCallback = onSave;
    this.updateEditModal(message);
    this.editDialog.showModal();
  }

  public showNewMessageModal(
    onAdd: (role: "user" | "assistant", content: string) => void
  ): void {
    this.newMessageCallback = onAdd;
    this.newDialog.showModal();
  }

  public destroy(): void {
    // Remove event listeners
    this.modals.forEach((modal) => {
      const newModal = modal.cloneNode(true);
      modal.parentNode?.replaceChild(newModal, modal);
    });

    this.initialized = false;
    this.editCallback = null;
    this.newMessageCallback = null;
  }
}
