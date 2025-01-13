import { Message } from "@aws-sdk/client-bedrock-runtime";
import { chatContext } from "../Chat/chat-context";

export class MessageTable {
  private container: HTMLElement | null = null;
  private draggedElement: HTMLElement | null = null;
  private table: HTMLTableElement | null = null;
  private tbody: HTMLTableSectionElement | null = null;

  constructor(
    private onView: (index: number) => void,
    private onEdit: (index: number) => void,
    private onDelete: (index: number) => void,
    private onReorder: (fromIndex: number, toIndex: number) => void
  ) {}

  public mount(container: HTMLElement): void {
    this.container = container;
    this.initializeTable();
    this.update();
  }

  private initializeTable(): void {
    if (!this.container) return;

    // Create table
    this.table = document.createElement("table");
    this.table.className = "chat-admin-table";

    // Create header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    ["", "Role", "Content", "Timestamp", "Actions"].forEach((headerText) => {
      const th = document.createElement("th");
      th.textContent = headerText;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    this.table.appendChild(thead);

    // Create tbody
    this.tbody = document.createElement("tbody");
    this.table.appendChild(this.tbody);

    this.container.appendChild(this.table);
  }

  private createMessageRow(
    message: Message,
    index: number
  ): HTMLTableRowElement {
    const row = document.createElement("tr");
    row.className = "message-row";
    row.draggable = true;
    row.dataset.messageIndex = index.toString();

    // Drag handle cell
    const dragCell = document.createElement("td");
    dragCell.className = "drag-handle";
    dragCell.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
  viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="2">
  <circle cx="9" cy="12" r="1"></circle>
  <circle cx="9" cy="5" r="1"></circle>
  <circle cx="9" cy="19" r="1"></circle>
  <circle cx="15" cy="12" r="1"></circle>
  <circle cx="15" cy="5" r="1"></circle>
  <circle cx="15" cy="19" r="1"></circle>
</svg>`;

    // Role cell
    const roleCell = document.createElement("td");
    const roleSpan = document.createElement("span");
    const role = message.role || "unknown"; // Provide default value if undefined
    roleSpan.className = `role-badge role-${role}`;
    roleSpan.textContent = role;
    roleCell.appendChild(roleSpan);

    // Content cell
    const contentCell = document.createElement("td");
    contentCell.className = "message-content";

    // Handle different content blocks
    (message.content || []).forEach((block) => {
      if (block.text) {
        const textDiv = document.createElement("div");
        textDiv.textContent = block.text;
        contentCell.appendChild(textDiv);
      } else if (block.toolResult || block.toolUse) {
        const pre = document.createElement("pre");
        pre.className = "tool-code";

        const type = block.toolResult ? "Tool Result" : "Tool Usage";
        const content = block.toolResult || block.toolUse;

        pre.textContent = `${type}:\n${JSON.stringify(content, null, 2)}`;
        contentCell.appendChild(pre);
      }
    });

    // Timestamp cell
    const timestampCell = document.createElement("td");
    timestampCell.textContent = new Date().toLocaleString();

    // Actions cell
    const actionsCell = document.createElement("td");
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "action-buttons";

    ["view", "edit", "delete"].forEach((action) => {
      const button = document.createElement("button");
      button.className = `action-btn ${action}-btn`;
      button.textContent = action.charAt(0).toUpperCase() + action.slice(1);
      button.dataset.action = action;
      button.dataset.index = index.toString();
      actionsDiv.appendChild(button);
    });

    actionsCell.appendChild(actionsDiv);

    // Append all cells
    row.append(dragCell, roleCell, contentCell, timestampCell, actionsCell);

    return row;
  }

  public update(): void {
    if (!this.tbody) return;

    // Clear existing rows
    this.tbody.innerHTML = "";

    // Add new rows
    const messages = chatContext.getMessages();
    messages.forEach((message, index) => {
      const row = this.createMessageRow(message, index);
      this.tbody?.appendChild(row);
    });

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
