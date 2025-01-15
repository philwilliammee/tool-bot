import { Message } from "@aws-sdk/client-bedrock-runtime";
import { chatContext } from "../Chat/chat-context";
import { store } from "../../stores/AppStore";
import { effect } from "@preact/signals-core";
import { htmlTool } from "../../tools/htmlTool/htmlTool";

export class MessageTable {
  private container: HTMLElement | null = null;
  private table: HTMLTableElement | null = null;
  private tbody: HTMLTableSectionElement | null = null;
  private initialized: boolean = false;
  private cleanupFns: Array<() => void> = []; // Add cleanup functions array

  constructor(
    private onView: (index: number) => void,
    private onEdit: (index: number) => void,
    private onDelete: (index: number) => void
  ) {
    console.log("MessageTable component initialized");
  }

  public mount(container: HTMLElement): void {
    this.container = container;
    this.render();

    // Subscribe to chat context changes - no cleanup function needed here
    chatContext.onMessagesChange(() => {
      this.render();
    });

    // Subscribe to store changes for button states
    const storeCleanup = effect(() => {
      if (this.table) {
        const buttons = this.table.querySelectorAll(".action-btn");
        buttons.forEach((button) => {
          (button as HTMLButtonElement).disabled = store.isGenerating.value;
        });
      }
    });

    // Only add the effect cleanup to our cleanup functions
    this.cleanupFns.push(storeCleanup);
  }

  private render(): void {
    if (!this.container) return;

    if (!this.initialized) {
      this.initializeStructure();
      this.initialized = true;
    }

    this.updateContent();
  }

  private initializeStructure(): void {
    if (!this.container) return;

    // Create table
    this.table = document.createElement("table");
    this.table.className = "chat-admin-table";

    // Create header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    ["Role", "Content", "Timestamp", "Actions"].forEach((headerText) => {
      const th = document.createElement("th");
      th.textContent = headerText;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    this.table.appendChild(thead);

    this.tbody = document.createElement("tbody");
    this.table.appendChild(this.tbody);

    this.container.appendChild(this.table);
  }

  private updateContent(): void {
    if (!this.tbody) return;

    this.tbody.innerHTML = "";
    const messages = chatContext.getMessages();

    if (messages.length === 0) {
      this.renderEmptyState();
      return;
    }

    messages.forEach((message, index) => {
      const row = this.createMessageRow(message, index);
      this.tbody?.appendChild(row);
    });
  }

  private renderEmptyState(): void {
    if (!this.tbody) return;

    const emptyRow = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "empty-state";
    cell.textContent = "No messages available";
    emptyRow.appendChild(cell);
    this.tbody.appendChild(emptyRow);
  }

  private createMessageRow(
    message: Message,
    index: number
  ): HTMLTableRowElement {
    const row = document.createElement("tr");
    row.className = "message-row";
    row.dataset.index = index.toString(); // Add for easier debugging

    const cells = {
      role: this.createRoleCell(message),
      content: this.createContentCell(message),
      timestamp: this.createTimestampCell(),
      actions: this.createActionsCell(index),
    };

    row.append(cells.role, cells.content, cells.timestamp, cells.actions);
    return row;
  }

  private createRoleCell(message: Message): HTMLTableCellElement {
    const cell = document.createElement("td");
    const roleSpan = document.createElement("span");
    const role = message.role || "unknown";
    roleSpan.className = `role-badge role-${role}`;
    roleSpan.textContent = role;
    cell.appendChild(roleSpan);
    return cell;
  }

  private createContentCell(message: Message): HTMLTableCellElement {
    const cell = document.createElement("td");
    cell.className = "message-content";

    (message.content || []).forEach((block) => {
      if (block.text) {
        const textDiv = document.createElement("div");
        textDiv.textContent = block.text;
        cell.appendChild(textDiv);
      } else if (block.toolResult || block.toolUse) {
        const pre = document.createElement("pre");
        pre.className = "tool-code";
        const type = block.toolResult ? "Tool Result" : "Tool Usage";
        const content = block.toolResult || block.toolUse;
        pre.textContent = `${type}:\n${JSON.stringify(content, null, 2)}`;
        cell.appendChild(pre);
      }
    });

    return cell;
  }

  private createTimestampCell(): HTMLTableCellElement {
    const cell = document.createElement("td");
    cell.textContent = new Date().toLocaleString();
    return cell;
  }

  private createActionsCell(index: number): HTMLTableCellElement {
    const cell = document.createElement("td");
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "action-buttons";

    const message = chatContext.getMessages()[index];
    const actions = [];

    // @TODO Here can we apply the re-apply to each tooltip
    // Add re-execute action for HTML tool messages
    if (message.content?.some((block) => block.toolUse?.name === "html")) {
      const htmlToolUse = message.content.find(
        (block) => block.toolUse?.name === "html"
      );
      if (htmlToolUse?.toolUse) {
        actions.push({
          name: "re-execute",
          label: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
            <path d="M21 3v5h-5"></path>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
            <path d="M8 16H3v5"></path>
          </svg>`,
          handler: async () => {
            if (!store.isGenerating.value) {
              try {
                const result = await htmlTool.execute(
                  htmlToolUse.toolUse.input
                );
                store.setActiveTab("preview");
              } catch (error) {
                console.error("Failed to re-execute HTML:", error);
                store.showToast("Failed to re-execute HTML");
              }
            }
          },
        });
      }
    }

    // Add standard actions
    actions.push(
      { name: "view", label: "View", handler: () => this.onView(index) },
      { name: "edit", label: "Edit", handler: () => this.onEdit(index) },
      { name: "delete", label: "Delete", handler: () => this.onDelete(index) }
    );

    actions.forEach(({ name, label, handler }) => {
      const button = document.createElement("button");
      button.className = `action-btn ${name}-btn`;
      if (name === "re-execute") {
        button.innerHTML = label; // Use innerHTML for SVG
        button.title = "Re-execute HTML"; // Add tooltip
      } else {
        button.textContent = label;
      }
      button.disabled = store.isGenerating.value;

      button.onclick = (e: MouseEvent) => {
        e.preventDefault();
        if (!store.isGenerating.value) {
          handler();
        }
      };

      actionsDiv.appendChild(button);
    });

    cell.appendChild(actionsDiv);
    return cell;
  }

  public update(): void {
    this.render();
  }

  public destroy(): void {
    // Clean up all subscriptions
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];

    // Clear DOM
    if (this.container) {
      this.container.innerHTML = "";
    }

    // Reset state
    this.initialized = false;
    this.table = null;
    this.tbody = null;
    this.container = null;
  }
}
