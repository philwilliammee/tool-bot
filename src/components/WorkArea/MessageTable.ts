import { Message } from "@aws-sdk/client-bedrock-runtime";
import { chatContext } from "../Chat/chat-context";
import { store } from "../../stores/AppStore";
import { effect } from "@preact/signals-core";
import { htmlTool } from "../../tools/htmlTool/htmlTool";

export class MessageTable {
  private tbody: HTMLTableSectionElement | null = null;
  private initialized: boolean = false;
  private cleanupFns: Array<() => void> = [];

  constructor(
    private onView: (index: number) => void,
    private onEdit: (index: number) => void,
    private onDelete: (index: number) => void
  ) {
    console.log("MessageTable constructor called");
  }

  public mount(): void {
    // Get existing table body
    this.tbody = document.getElementById(
      "message-table-body"
    ) as HTMLTableSectionElement;
    if (!this.tbody) {
      console.error("Message table body not found");
      return;
    }

    // Subscribe to chat context changes
    const chatCleanup = chatContext.onMessagesChange(() => {
      this.updateContent();
    });

    // Subscribe to store changes for button states
    const storeCleanup = effect(() => {
      const buttons = this.tbody?.querySelectorAll(".action-btn");
      buttons?.forEach((button) => {
        (button as HTMLButtonElement).disabled = store.isGenerating.value;
      });
    });

    this.cleanupFns.push(chatCleanup, storeCleanup);
    this.updateContent();
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
    const template = document.getElementById(
      "empty-state-template"
    ) as HTMLTemplateElement;
    if (!template || !this.tbody) return;

    const clone = template.content.cloneNode(true);
    this.tbody.appendChild(clone);
  }

  private createMessageRow(message: Message, index: number): HTMLElement {
    const template = document.getElementById(
      "message-row-template"
    ) as HTMLTemplateElement;
    if (!template) throw new Error("Message row template not found");

    const clone = template.content.cloneNode(true) as HTMLElement;
    const row = clone.querySelector("tr");
    if (!row) throw new Error("Row not found in template");

    // Set row metadata
    row.dataset.index = index.toString();

    // Update role badge
    const roleBadge = row.querySelector(".role-badge");
    if (roleBadge) {
      const role = message.role || "unknown";
      roleBadge.className = `role-badge role-${role}`;
      roleBadge.textContent = role;
    }

    // Update content
    const contentCell = row.querySelector(".message-content");
    if (contentCell) {
      this.fillContentCell(contentCell, message);
    }

    // Update timestamp
    const timestampCell = row.querySelector(".timestamp-cell");
    if (timestampCell) {
      timestampCell.textContent = new Date().toLocaleString(undefined, {
        year: "2-digit",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }

    // Setup action buttons
    this.setupActionButtons(row, message, index);

    return row;
  }

  private fillContentCell(cell: Element, message: Message): void {
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
  }

  private setupActionButtons(
    row: Element,
    message: Message,
    index: number
  ): void {
    const actionButtons = row.querySelector(".action-buttons");
    if (!actionButtons) return;

    // Add re-execute button if needed
    if (message.content?.some((block) => block.toolUse?.name === "html")) {
      const reExecuteTemplate = document.getElementById(
        "re-execute-button-template"
      ) as HTMLTemplateElement;
      if (reExecuteTemplate) {
        const reExecuteBtn = reExecuteTemplate.content.cloneNode(
          true
        ) as HTMLElement;
        reExecuteBtn
          .querySelector("button")
          ?.addEventListener("click", async () => {
            const htmlToolUse = message.content?.find(
              (block) => block.toolUse?.name === "html"
            );
            if (htmlToolUse?.toolUse && !store.isGenerating.value) {
              try {
                await htmlTool.execute(htmlToolUse.toolUse.input);
                store.setActiveTab("preview");
              } catch (error) {
                console.error("Failed to re-execute HTML:", error);
                store.showToast("Failed to re-execute HTML");
              }
            }
          });
        actionButtons.insertBefore(reExecuteBtn, actionButtons.firstChild);
      }
    }

    // Setup standard action buttons
    const viewBtn = actionButtons.querySelector(".view-btn");
    const editBtn = actionButtons.querySelector(".edit-btn");
    const deleteBtn = actionButtons.querySelector(".delete-btn");

    viewBtn?.addEventListener("click", () => this.onView(index));
    editBtn?.addEventListener("click", () => this.onEdit(index));
    deleteBtn?.addEventListener("click", () => this.onDelete(index));
  }

  public destroy(): void {
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];
    this.tbody = null;
  }
}
