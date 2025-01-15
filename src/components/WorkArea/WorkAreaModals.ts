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

    this.createModals();
    this.setupGlobalEvents();
    this.initialized = true;
  }

  private createModals(): void {
    // Create all modals
    this.viewDialog = this.createModal("view-modal");
    this.editDialog = this.createModal("edit-modal");
    this.newDialog = this.createModal("new-modal");

    this.modals = [this.viewDialog, this.editDialog, this.newDialog];
    this.modals.forEach((modal) => document.body.appendChild(modal));
  }

  private createModal(className: string): HTMLDialogElement {
    const dialog = document.createElement("dialog");
    dialog.className = `modal ${className}`;
    const content = document.createElement("div");
    content.className = "modal-content";
    dialog.appendChild(content);
    return dialog;
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
  }

  private renderViewModal(message: Message): void {
    const content = this.viewDialog.querySelector(".modal-content");
    if (!content) return;

    content.innerHTML = `
      <h3>View Message</h3>
      <div class="message-details">
        <div class="message-detail">
          <strong>Role: </strong>
          <span>${message.role || "unknown"}</span>
        </div>
        <div class="message-detail">
          <strong>Content: </strong>
          <pre>${this.formatMessageContent(message)}</pre>
        </div>
        <div class="message-detail">
          <strong>Timestamp: </strong>
          <span>${new Date().toLocaleString()}</span>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-blue close-btn">Close</button>
      </div>
    `;

    content
      .querySelector(".close-btn")
      ?.addEventListener("click", () => this.viewDialog.close());
  }

  private renderEditModal(message: Message): void {
    const content = this.editDialog.querySelector(".modal-content");
    if (!content) return;

    const initialContent = message.content?.[0]?.text || "";

    content.innerHTML = `
      <h3>Edit Message</h3>
      <form class="edit-form">
        <div class="form-group">
          <label for="messageContent">Message Content</label>
          <textarea id="messageContent" rows="4" required>${initialContent}</textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-danger cancel-btn">Cancel</button>
          <button type="submit" class="btn btn-blue save-btn">Save Changes</button>
        </div>
      </form>
    `;

    const form = content.querySelector(".edit-form") as HTMLFormElement;
    form?.addEventListener("submit", this.handleEditSubmit.bind(this));

    content
      .querySelector(".cancel-btn")
      ?.addEventListener("click", () => this.editDialog.close());
  }

  private renderNewMessageModal(): void {
    const content = this.newDialog.querySelector(".modal-content");
    if (!content) return;

    content.innerHTML = `
      <h3>New Message</h3>
      <form class="new-message-form">
        <div class="form-group">
          <label for="messageRole">Role</label>
          <select id="messageRole" required>
            <option value="user">User</option>
            <option value="assistant">Assistant</option>
          </select>
        </div>
        <div class="form-group">
          <label for="newMessageContent">Message Content</label>
          <textarea id="newMessageContent" rows="4" required></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-danger cancel-btn">Cancel</button>
          <button type="submit" class="btn btn-blue save-btn">Add Message</button>
        </div>
      </form>
    `;

    const form = content.querySelector(".new-message-form") as HTMLFormElement;
    form?.addEventListener("submit", this.handleNewMessageSubmit.bind(this));

    content
      .querySelector(".cancel-btn")
      ?.addEventListener("click", () => this.newDialog.close());
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
    this.renderViewModal(message);
    this.viewDialog.showModal();
  }

  public showEditModal(
    message: Message,
    onSave: (content: string) => void
  ): void {
    this.editCallback = onSave;
    this.renderEditModal(message);
    this.editDialog.showModal();
  }

  public showNewMessageModal(
    onAdd: (role: "user" | "assistant", content: string) => void
  ): void {
    this.newMessageCallback = onAdd;
    this.renderNewMessageModal();
    this.newDialog.showModal();
  }

  public destroy(): void {
    this.modals.forEach((modal) => {
      modal.remove();
    });
    this.initialized = false;
    this.editCallback = null;
    this.newMessageCallback = null;
  }
}
