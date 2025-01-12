import { Message } from "@aws-sdk/client-bedrock-runtime";
import { chatContext } from "../../chat-context";

export class MessageTable {
  private container: HTMLElement | null = null;
  private draggedElement: HTMLElement | null = null;

  constructor(
    private onView: (index: number) => void,
    private onEdit: (index: number) => void,
    private onDelete: (index: number) => void,
    private onReorder: (fromIndex: number, toIndex: number) => void
  ) {}

  public mount(container: HTMLElement): void {
    this.container = container;
    this.update();
  }

  public update(): void {
    if (!this.container) return;
    const messages = chatContext.getMessages();

    // Build the table HTML
    this.container.innerHTML = `
      <table class="chat-admin-table">
        <thead>
          <tr>
            <th></th>
            <th>Role</th>
            <th>Content</th>
            <th>Timestamp</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${messages
            .map((message, index) => {
              // Convert all content blocks into a single string
              const combinedContent = (message.content || [])
                .map((block) => {
                  if (block.text) {
                    return block.text;
                  }
                  if (block.toolResult) {
                    return `Tool result: ${JSON.stringify(block.toolResult)}`;
                  }
                  if (block.toolUse) {
                    return `Tool use: ${JSON.stringify(block.toolUse)}`;
                  }
                  return "[Unknown block type]";
                })
                .join(" | "); // You can choose any separator you like

              // Basic date/time (or you could store a timestamp in the message object)
              const timestamp = new Date().toLocaleString();

              return `
                <tr data-message-index="${index}" draggable="true" class="message-row">
                  <td class="drag-handle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                         viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2">
                      <circle cx="9" cy="12" r="1"></circle>
                      <circle cx="9" cy="5" r="1"></circle>
                      <circle cx="9" cy="19" r="1"></circle>
                      <circle cx="15" cy="12" r="1"></circle>
                      <circle cx="15" cy="5" r="1"></circle>
                      <circle cx="15" cy="19" r="1"></circle>
                    </svg>
                  </td>
                  <td>
                    <span class="role-badge role-${message.role}">${message.role}</span>
                  </td>
                  <td class="message-content">${combinedContent}</td>
                  <td>${timestamp}</td>
                  <td>
                    <div class="action-buttons">
                      <button class="action-btn view-btn"
                              data-action="view" data-index="${index}">
                        View
                      </button>
                      <button class="action-btn edit-btn"
                              data-action="edit" data-index="${index}">
                        Edit
                      </button>
                      <button class="action-btn delete-btn"
                              data-action="delete" data-index="${index}">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;

    // Attach event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.container) return;

    // Action buttons
    this.container.querySelectorAll(".action-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.target as HTMLButtonElement;
        const action = target.dataset.action;
        const index = parseInt(target.dataset.index || "0", 10);

        switch (action) {
          case "view":
            this.onView(index);
            break;
          case "edit":
            this.onEdit(index);
            break;
          case "delete":
            this.onDelete(index);
            break;
        }
      });
    });

    // Drag and drop
    const rows = this.container.getElementsByClassName("message-row");
    Array.from(rows).forEach((row: any) => {
      row.addEventListener("dragstart", this.handleDragStart.bind(this));
      row.addEventListener("dragenter", this.handleDragEnter.bind(this));
      row.addEventListener("dragover", this.handleDragOver.bind(this));
      row.addEventListener("dragleave", this.handleDragLeave.bind(this));
      row.addEventListener("drop", this.handleDrop.bind(this));
      row.addEventListener("dragend", this.handleDragEnd.bind(this));
    });
  }

  private handleDragStart(e: DragEvent): void {
    const target = e.target as HTMLElement;
    if (!target.closest(".message-row")) return;

    this.draggedElement = target.closest(".message-row");
    if (this.draggedElement) {
      this.draggedElement.classList.add("dragging");
      e.dataTransfer?.setData("text/plain", ""); // Required for Firefox
    }
  }

  private handleDragEnter(e: DragEvent): void {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const row = target.closest(".message-row");
    if (row && row !== this.draggedElement) {
      row.classList.add("drag-over");
    }
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
  }

  private handleDragLeave(e: DragEvent): void {
    const target = e.target as HTMLElement;
    const row = target.closest(".message-row");
    if (row) {
      row.classList.remove("drag-over");
    }
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const dropRow = target.closest(".message-row") as HTMLElement;

    if (this.draggedElement && dropRow && this.draggedElement !== dropRow) {
      const fromIndex = parseInt(
        this.draggedElement.dataset.messageIndex || "0",
        10
      );
      const toIndex = parseInt(dropRow.dataset.messageIndex || "0", 10);

      this.onReorder(fromIndex, toIndex);
      dropRow.classList.remove("drag-over");
    }
  }

  private handleDragEnd(): void {
    if (this.draggedElement) {
      this.draggedElement.classList.remove("dragging");
      this.draggedElement = null;
    }
  }

  public destroy(): void {
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}
