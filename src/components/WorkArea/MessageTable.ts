import { converseStore } from "../../stores/ConverseStore";
import { store } from "../../stores/AppStore";
import { effect } from "@preact/signals-core";
import { MessageExtended } from "../../types/tool.types";
import { htmlTool } from "../../../tools/html-tool/client/html.client";

export class MessageTable {
  private tbody: HTMLTableSectionElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private roleFilter: HTMLSelectElement | null = null;
  private ratingFilter: HTMLSelectElement | null = null;
  private toolFilter: HTMLSelectElement | null = null;
  private archivedFilter: HTMLInputElement | null = null;
  private filterTimeout: number | null = null;
  private initialized: boolean = false;
  private cleanupFns: Array<() => void> = [];

  constructor(
    private onView: (id: string) => void,
    private onEdit: (id: string) => void,
    private onDelete: (id: string) => void
  ) {
    console.log("MessageTable constructor called");
  }

  public mount(): void {
    this.tbody = document.getElementById(
      "message-table-body"
    ) as HTMLTableSectionElement;
    this.searchInput = document.getElementById(
      "message-search"
    ) as HTMLInputElement;
    this.roleFilter = document.getElementById(
      "role-filter"
    ) as HTMLSelectElement;
    this.ratingFilter = document.getElementById(
      "rating-filter"
    ) as HTMLSelectElement;
    this.toolFilter = document.getElementById(
      "tool-filter"
    ) as HTMLSelectElement;
    this.archivedFilter = document.getElementById(
      "archived-filter"
    ) as HTMLInputElement;

    if (!this.tbody) {
      console.error("Message table body not found");
      return;
    }

    this.setupFilterListeners();

    const chatCleanup = converseStore.onMessagesChange(() => {
      this.updateContent();
    });

    const storeCleanup = effect(() => {
      const buttons = this.tbody?.querySelectorAll(".action-btn");
      buttons?.forEach((button) => {
        (button as HTMLButtonElement).disabled = store.isGenerating.value;
      });
    });

    this.cleanupFns.push(chatCleanup, storeCleanup);
    this.updateContent();
  }

  private setupFilterListeners(): void {
    this.searchInput?.addEventListener("input", () => {
      if (this.filterTimeout) {
        clearTimeout(this.filterTimeout);
      }
      this.filterTimeout = window.setTimeout(() => {
        this.updateContent();
      }, 300);
    });

    this.roleFilter?.addEventListener("change", () => this.updateContent());
    this.ratingFilter?.addEventListener("change", () => this.updateContent());
    this.archivedFilter?.addEventListener("change", () => this.updateContent());
    this.toolFilter?.addEventListener("change", () => this.updateContent());
  }

  private filterMessages(messages: MessageExtended[]): MessageExtended[] {
    return messages.filter((message) => {
      const searchTerm = this.searchInput?.value.toLowerCase() || "";
      const messageText = message.content
        ?.map((block) => block.text || "")
        .join(" ")
        .toLowerCase();
      const matchesSearch = !searchTerm || messageText?.includes(searchTerm);

      const roleValue = this.roleFilter?.value || "";
      const matchesRole = !roleValue || message.role === roleValue;

      const ratingValue = this.ratingFilter?.value;
      const matchesRating =
        ratingValue === undefined ||
        ratingValue === "" ||
        message.metadata?.userRating === parseInt(ratingValue);

      const includeArchived = this.archivedFilter?.checked || false;
      const matchesArchived = includeArchived || !message.metadata?.isArchived;

      const toolValue = this.toolFilter?.value || "";
      let matchesTool = true;

      if (toolValue) {
        const hasToolUse = message.content?.some((block) => block.toolUse);
        if (toolValue === "any") {
          matchesTool = hasToolUse || false;
        } else {
          matchesTool =
            message.content?.some(
              (block) => block.toolUse?.name === toolValue
            ) || false;
        }
      }

      return (
        matchesSearch &&
        matchesRole &&
        matchesRating &&
        matchesArchived &&
        matchesTool
      );
    });
  }

  private updateContent(): void {
    if (!this.tbody) return;

    this.tbody.innerHTML = "";
    const allMessages = converseStore.getMessages();
    const filteredMessages = this.filterMessages(allMessages);

    if (filteredMessages.length === 0) {
      this.renderEmptyState();
      return;
    }

    for (let i = filteredMessages.length - 1; i >= 0; i--) {
      const message = filteredMessages[i];
      const row = this.createMessageRow(message);
      this.tbody?.appendChild(row);
    }

    const countElement = document.querySelector(".message-count");
    if (countElement) {
      countElement.textContent = `${filteredMessages.length} of ${allMessages.length} messages`;
    }
  }

  private renderEmptyState(): void {
    const template = document.getElementById(
      "empty-state-template"
    ) as HTMLTemplateElement;
    if (!template || !this.tbody) return;

    const clone = template.content.cloneNode(true);
    this.tbody.appendChild(clone);
  }

  private createMessageRow(message: MessageExtended): HTMLElement {
    const template = document.getElementById(
      "message-row-template"
    ) as HTMLTemplateElement;
    if (!template) throw new Error("Message row template not found");

    const clone = template.content.cloneNode(true) as HTMLElement;
    const row = clone.querySelector("tr");
    if (!row) throw new Error("Row not found in template");

    if (message.metadata?.isArchived) {
      row.classList.add("archived-message");
      row.title = "Archived message - not included in context window";
    }

    row.dataset.messageId = message.id;

    const roleBadge = row.querySelector(".role-badge");
    if (roleBadge) {
      const role = message.role || "unknown";
      roleBadge.className = `role-badge role-${role}`;
      roleBadge.textContent = role;

      if (message.metadata?.isArchived) {
        const badgeTemplate = document.getElementById(
          "archive-badge-template"
        ) as HTMLTemplateElement;
        if (badgeTemplate) {
          const badgeClone = badgeTemplate.content.cloneNode(
            true
          ) as HTMLElement;
          roleBadge.parentElement?.appendChild(badgeClone);
        }
      }
    }

    const contentCell = row.querySelector(".message-content");
    if (contentCell) {
      this.fillContentCell(contentCell, message);
    }

    const ratingCell = row.querySelector(".rating-cell");
    if (ratingCell) {
      this.setupRating(ratingCell, message);
    }

    const timestampCell = row.querySelector(".timestamp-cell");
    if (timestampCell) {
      timestampCell.textContent = new Date(
        message.metadata.createdAt
      ).toLocaleString(undefined, {
        year: "2-digit",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }

    this.setupActionButtons(row, message);

    return row;
  }

  private setupRating(cell: Element, message: MessageExtended): void {
    const heartIcon = document.createElement("span");
    heartIcon.className = "heart-icon";
    heartIcon.innerHTML = message.metadata?.userRating ? "❤️" : "🤍";
    heartIcon.style.cursor = "pointer";

    heartIcon.addEventListener("click", () => {
      const newRating = message.metadata?.userRating ? 0 : 1;
      converseStore.updateMessageRating(message.id, newRating);
    });

    cell.appendChild(heartIcon);
  }

  private fillContentCell(cell: Element, message: MessageExtended): void {
    cell.innerHTML = "";

    const contentContainer = document.createElement("div");
    contentContainer.className = "message-content-container";

    (message.content || []).forEach((block) => {
      if (block.text) {
        const textDiv = document.createElement("div");
        textDiv.className = "message-text";
        textDiv.textContent = block.text;
        contentContainer.appendChild(textDiv);
      } else if (block.toolResult || block.toolUse) {
        const pre = document.createElement("pre");
        pre.className = "tool-code";
        const type = block.toolResult ? "Tool Result" : "Tool Usage";
        const content = block.toolResult || block.toolUse;
        pre.textContent = `${type}:\n${JSON.stringify(content, null, 2)}`;
        contentContainer.appendChild(pre);
      }
    });

    if (message.metadata?.tags?.length) {
      const tagsContainer = document.createElement("div");
      tagsContainer.className = "message-tags";

      message.metadata.tags.forEach((tag) => {
        const tagSpan = document.createElement("span");
        tagSpan.className = "message-tag";
        tagSpan.textContent = tag;
        tagsContainer.appendChild(tagSpan);
      });

      contentContainer.appendChild(tagsContainer);
    }

    cell.appendChild(contentContainer);
  }

  private setupActionButtons(row: Element, message: MessageExtended): void {
    const actionButtons = row.querySelector(".action-buttons");
    if (!actionButtons) return;

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

    const viewBtn = actionButtons.querySelector(".view-btn");
    const editBtn = actionButtons.querySelector(".edit-btn");
    const deleteBtn = actionButtons.querySelector(".delete-btn");

    viewBtn?.addEventListener("click", () => this.onView(message.id));
    editBtn?.addEventListener("click", () => this.onEdit(message.id));
    deleteBtn?.addEventListener("click", () => this.onDelete(message.id));
  }

  public destroy(): void {
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];
    this.tbody = null;
    this.searchInput = null;
    this.roleFilter = null;
    this.ratingFilter = null;
    this.toolFilter = null;
    this.archivedFilter = null;
  }
}
