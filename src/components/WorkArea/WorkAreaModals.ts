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

    const content = document.createElement("div");
    content.className = "modal-content";

    // Header
    const header = document.createElement("h3");
    header.textContent = "View Message";

    // Message details container
    const details = document.createElement("div");
    details.className = "message-details";

    // Actions
    const actions = document.createElement("div");
    actions.className = "modal-actions";

    const closeBtn = document.createElement("button");
    closeBtn.className = "btn btn-blue close-btn";
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", () => this.viewDialog.close());

    actions.appendChild(closeBtn);
    content.append(header, details, actions);
    this.viewDialog.appendChild(content);
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

  /**
   * Show all text blocks in the message. If there are tool results, etc.,
   * you can also handle them here, or keep it simple (like below).
   */
  public showViewModal(message: Message): void {
    const detailsElement = this.viewDialog.querySelector(".message-details");
    if (!detailsElement) return;

    // Clear previous content
    detailsElement.innerHTML = "";

    // Role detail
    const roleDetail = document.createElement("div");
    roleDetail.className = "message-detail";

    const roleLabel = document.createElement("strong");
    roleLabel.textContent = "Role: ";

    const roleValue = document.createElement("span");
    roleValue.textContent = message.role || "unknown";

    roleDetail.append(roleLabel, roleValue);

    // Content detail
    const contentDetail = document.createElement("div");
    contentDetail.className = "message-detail";

    const contentLabel = document.createElement("strong");
    contentLabel.textContent = "Content: ";

    const contentPre = document.createElement("pre");

    // Process each content block
    (message.content || []).forEach((block, index) => {
      const blockDiv = document.createElement("div");

      if (block.text) {
        blockDiv.textContent = block.text;
      } else if (block.toolResult) {
        const pre = document.createElement("pre");
        pre.className = "tool-code";
        pre.textContent = `TOOL RESULT:\n${JSON.stringify(
          block.toolResult,
          null,
          2
        )}`;
        blockDiv.appendChild(pre);
      } else if (block.toolUse) {
        const pre = document.createElement("pre");
        pre.className = "tool-code";
        pre.textContent = `TOOL USAGE:\n${JSON.stringify(
          block.toolUse,
          null,
          2
        )}`;
        blockDiv.appendChild(pre);
      } else {
        blockDiv.textContent = "[Unknown block type]";
      }

      // Add separator if not last block
      if (index < (message.content?.length || 0) - 1) {
        const separator = document.createElement("div");
        separator.className = "content-separator";
        separator.textContent = "---";
        contentPre.append(blockDiv, separator);
      } else {
        contentPre.appendChild(blockDiv);
      }
    });

    contentDetail.append(contentLabel, contentPre);

    // Timestamp detail
    const timeDetail = document.createElement("div");
    timeDetail.className = "message-detail";

    const timeLabel = document.createElement("strong");
    timeLabel.textContent = "Timestamp: ";

    const timeValue = document.createElement("span");
    timeValue.textContent = new Date().toLocaleString();

    timeDetail.append(timeLabel, timeValue);

    // Add all details
    detailsElement.append(roleDetail, contentDetail, timeDetail);

    this.viewDialog.showModal();
  }

  public showEditModal(
    message: Message,
    onSave: (content: string) => void
  ): void {
    // For simplicity, just show/edit the FIRST text block
    // If you'd like to handle multiple text blocks, update accordingly
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
