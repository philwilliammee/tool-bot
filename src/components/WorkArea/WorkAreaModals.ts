import { Message } from "@aws-sdk/client-bedrock-runtime";

export class WorkAreaModals {
  private viewDialog!: HTMLDialogElement;
  private editDialog!: HTMLDialogElement;
  private newDialog!: HTMLDialogElement;

  constructor() {
    this.createModals();
    this.setupGlobalModalEvents();
  }

  private createModals(): void {
    this.createViewModal();
    this.createEditModal();
    this.createNewModal();
  }

  private setupGlobalModalEvents(): void {
    // Close modals when clicking outside
    [this.viewDialog, this.editDialog, this.newDialog].forEach((dialog) => {
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) dialog.close();
      });
    });
  }

  private createViewModal(): void {
    this.viewDialog = document.createElement("dialog");
    this.viewDialog.className = "modal view-modal";
    this.viewDialog.innerHTML = `
      <div class="modal-content">
        <h3>View Message</h3>
        <div class="message-details"></div>
        <div class="modal-actions">
          <button class="btn btn-blue close-btn">Close</button>
        </div>
      </div>
    `;

    this.viewDialog
      .querySelector(".close-btn")
      ?.addEventListener("click", () => {
        this.viewDialog.close();
      });

    document.body.appendChild(this.viewDialog);
  }

  private createEditModal(): void {
    this.editDialog = document.createElement("dialog");
    this.editDialog.className = "modal edit-modal";
    this.editDialog.innerHTML = `
      <div class="modal-content">
        <h3>Edit Message</h3>
        <form class="edit-form">
          <div class="form-group">
            <label for="messageContent">Message Content</label>
            <textarea id="messageContent" rows="4" required></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-danger cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-blue save-btn">Save Changes</button>
          </div>
        </form>
      </div>
    `;

    const form = this.editDialog.querySelector(
      ".edit-form"
    ) as HTMLFormElement | null;
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const textarea = this.editDialog.querySelector(
        "#messageContent"
      ) as HTMLTextAreaElement;
      const callback = (this.editDialog as any).onSave;
      if (callback && textarea.value.trim()) {
        callback(textarea.value.trim());
        this.editDialog.close();
      }
    });

    this.editDialog
      .querySelector(".cancel-btn")
      ?.addEventListener("click", () => {
        this.editDialog.close();
      });

    document.body.appendChild(this.editDialog);
  }

  private createNewModal(): void {
    this.newDialog = document.createElement("dialog");
    this.newDialog.className = "modal new-modal";
    this.newDialog.innerHTML = `
      <div class="modal-content">
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
      </div>
    `;

    const form = this.newDialog.querySelector(
      ".new-message-form"
    ) as HTMLFormElement | null;
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const roleSelect = this.newDialog.querySelector(
        "#messageRole"
      ) as HTMLSelectElement;
      const textarea = this.newDialog.querySelector(
        "#newMessageContent"
      ) as HTMLTextAreaElement;
      const callback = (this.newDialog as any).onAdd;

      if (callback && roleSelect.value && textarea.value.trim()) {
        callback(
          roleSelect.value as "user" | "assistant",
          textarea.value.trim()
        );
        this.newDialog.close();
        form.reset();
      }
    });

    this.newDialog
      .querySelector(".cancel-btn")
      ?.addEventListener("click", () => {
        this.newDialog.close();
      });

    document.body.appendChild(this.newDialog);
  }

  public showViewModal(message: Message): void {
    const detailsElement = this.viewDialog.querySelector(".message-details");
    if (detailsElement) {
      const content = message.content?.[0]?.text || "";
      detailsElement.innerHTML = `
        <div class="message-detail">
          <strong>Role:</strong> ${message.role}
        </div>
        <div class="message-detail">
          <strong>Content:</strong>
          <pre>${content}</pre>
        </div>
        <div class="message-detail">
          <strong>Timestamp:</strong> ${new Date().toLocaleString()}
        </div>
      `;
    }
    this.viewDialog.showModal();
  }

  public showEditModal(
    message: Message,
    onSave: (content: string) => void
  ): void {
    const textarea = this.editDialog.querySelector(
      "#messageContent"
    ) as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = message.content?.[0]?.text || "";
    }
    (this.editDialog as any).onSave = onSave;
    this.editDialog.showModal();
  }

  public showNewMessageModal(
    onAdd: (role: "user" | "assistant", content: string) => void
  ): void {
    const form = this.newDialog.querySelector("form");
    if (form) {
      form.reset();
    }
    (this.newDialog as any).onAdd = onAdd;
    this.newDialog.showModal();
  }

  public destroy(): void {
    this.viewDialog.remove();
    this.editDialog.remove();
    this.newDialog.remove();
  }
}
