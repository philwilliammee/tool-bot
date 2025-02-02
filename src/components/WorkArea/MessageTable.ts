import { converseStore } from "../../stores/ConverseStore/ConverseStore";
import { effect } from "@preact/signals-core";
import { MessageExtended } from "../../app.types";
import { ReExecuteButton } from "../../ReExecuteButton/ReExecuteButton";

interface FilterState {
  search: string;
  role: string;
  rating: string | undefined;
  archived: boolean;
  tool: string;
}

export class MessageTable {
  private tbody: HTMLTableSectionElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private roleFilter: HTMLSelectElement | null = null;
  private ratingFilter: HTMLSelectElement | null = null;
  private toolFilter: HTMLSelectElement | null = null;
  private archivedFilter: HTMLInputElement | null = null;
  private cleanupFns: Array<() => void> = [];
  private initialized: boolean = false;
  private currentUpdateId: Symbol | null = null;
  private lastFilters: FilterState | null = null;
  private lastMessages: MessageExtended[] | null = null;
  private lastFilterResult: MessageExtended[] | null = null;
  private debouncedUpdate: () => void;

  constructor(
    private onView: (id: string) => void,
    private onEdit: (id: string) => void,
    private onDelete: (id: string) => void
  ) {
    console.log("MessageTable constructor called");
    this.debouncedUpdate = this.debounce(() => this.updateContent(), 300);
  }

  private debounce(fn: Function, delay: number) {
    let timeoutId: number | null = null;
    return function (this: any, ...args: any[]) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => fn.apply(this, args), delay);
    };
  }

  public mount(): void {
    if (this.initialized) {
      console.warn("MessageTable already initialized");
      return;
    }

    this.tbody = document.getElementById(
      "message-table-body"
    ) as HTMLTableSectionElement;
    this.searchInput = document.getElementById(
      "message-search"
    ) as HTMLInputElement;
    this.roleFilter = document.getElementById(
      "role-filter"
    ) as HTMLSelectElement;
    // this.ratingFilter = document.getElementById(
    //   "rating-filter"
    // ) as HTMLSelectElement;
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
      console.log("Messages changed, updating table");
      this.updateContent();
    });

    const storeCleanup = effect(() => {
      // const buttons = this.tbody?.querySelectorAll(".action-btn");
      // buttons?.forEach((button) => {
      //   (button as HTMLButtonElement).disabled = store.isGenerating.value;
      // });
    });

    this.cleanupFns.push(chatCleanup, storeCleanup);
    this.updateContent();
    this.initialized = true;
  }

  private setupFilterListeners(): void {
    const listeners = [
      {
        element: this.searchInput,
        event: "input",
        handler: this.debouncedUpdate,
      },
      {
        element: this.roleFilter,
        event: "change",
        handler: () => this.updateContent(),
      },
      {
        element: this.ratingFilter,
        event: "change",
        handler: () => this.updateContent(),
      },
      {
        element: this.archivedFilter,
        event: "change",
        handler: () => this.updateContent(),
      },
      {
        element: this.toolFilter,
        event: "change",
        handler: () => this.updateContent(),
      },
    ].map(({ element, event, handler }) => {
      element?.addEventListener(event, handler);
      return () => element?.removeEventListener(event, handler);
    });

    this.cleanupFns.push(...listeners);
  }

  private filterMessages(messages: MessageExtended[]): MessageExtended[] {
    const filters: FilterState = {
      search: this.searchInput?.value.toLowerCase() || "",
      role: this.roleFilter?.value || "",
      rating: this.ratingFilter?.value,
      archived: this.archivedFilter?.checked || false,
      tool: this.toolFilter?.value || "",
    };

    // Cache filter results
    if (
      this.lastFilters &&
      JSON.stringify(filters) === JSON.stringify(this.lastFilters) &&
      this.lastMessages === messages
    ) {
      return this.lastFilterResult || [];
    }

    this.lastFilters = filters;
    this.lastMessages = messages;

    const filteredMessages = messages.filter((message) => {
      const messageText = message.content
        ?.map((block) => block.text || "")
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        !filters.search || messageText?.includes(filters.search);

      const matchesRole = !filters.role || message.role === filters.role;

      const matchesRating =
        filters.rating === undefined ||
        filters.rating === "" ||
        message.metadata?.userRating === parseInt(filters.rating);

      const matchesArchived = filters.archived || !message.metadata?.isArchived;

      let matchesTool = true;
      if (filters.tool) {
        const hasToolUse = message.content?.some((block) => block.toolUse);
        matchesTool =
          filters.tool === "any"
            ? hasToolUse || false
            : message.content?.some(
                (block) => block.toolUse?.name === filters.tool
              ) || false;
      }

      return (
        matchesSearch &&
        matchesRole &&
        matchesRating &&
        matchesArchived &&
        matchesTool
      );
    });

    this.lastFilterResult = filteredMessages;
    return filteredMessages;
  }

  private async updateContent(): Promise<void> {
    console.log("UpdateContent called");

    if (!this.tbody) {
      console.error("Table body not found");
      return;
    }

    const updateId = Symbol("update");
    this.currentUpdateId = updateId;

    this.tbody.innerHTML = "";
    const allMessages = converseStore.getMessages();
    const filteredMessages = this.filterMessages(allMessages);

    // Check if this update is still valid
    if (this.currentUpdateId !== updateId) {
      console.log("Update no longer valid, skipping render");
      return;
    }

    if (filteredMessages.length === 0) {
      console.log("No messages to display");
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
    try {
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

      // const ratingCell = row.querySelector(".rating-cell");
      // if (ratingCell) {
      //   this.setupRating(ratingCell, message);
      // }

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
    } catch (error) {
      console.error("Error creating message row:", error);
      const errorRow = document.createElement("tr");
      errorRow.innerHTML = `<td colspan="4">Error displaying message: ${message.id}</td>`;
      return errorRow;
    }
  }

  // private setupRating(cell: Element, message: MessageExtended): void {
  //   const heartIcon = document.createElement("span");
  //   heartIcon.className = "heart-icon";
  //   heartIcon.innerHTML = message.metadata?.userRating ? "❤️" : "🤍";
  //   heartIcon.style.cursor = "pointer";

  //   const handler = () => {
  //     const newRating = message.metadata?.userRating ? 0 : 1;
  //     converseStore.updateMessageRating(message.id, newRating);
  //   };

  //   heartIcon.addEventListener("click", handler);
  //   this.cleanupFns.push(() => heartIcon.removeEventListener("click", handler));

  //   cell.appendChild(heartIcon);
  // }

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
    const actionButtons = row.querySelector("#action-buttons");
    if (!actionButtons) return;

    const buttonCleanups: Array<() => void> = [];

    // Add re-execute button if message has HTML tool
    if (ReExecuteButton.hasHtmlTool(message)) {
      const reExecuteButton = new ReExecuteButton(message);
      actionButtons.insertBefore(
        reExecuteButton.getElement(),
        actionButtons.firstChild
      );
      buttonCleanups.push(() => reExecuteButton.destroy());
    }

    const buttons = {
      view: {
        element: actionButtons.querySelector(".view-btn"),
        handler: () => this.onView(message.id),
      },
      edit: {
        element: actionButtons.querySelector(".edit-btn"),
        handler: () => this.onEdit(message.id),
      },
      delete: {
        element: actionButtons.querySelector(".delete-btn"),
        handler: () => this.onDelete(message.id),
      },
    };

    Object.values(buttons).forEach(({ element, handler }) => {
      element?.addEventListener("click", handler);
      buttonCleanups.push(() => element?.removeEventListener("click", handler));
    });

    this.cleanupFns.push(...buttonCleanups);
  }
  public destroy(): void {
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];
    this.tbody = null;
    this.searchInput = null;
    this.roleFilter = null;
    this.ratingFilter = null;
    this.toolFilter = null;
    this.archivedFilter = null;
    this.initialized = false;
    this.currentUpdateId = null;
    this.lastFilters = null;
    this.lastMessages = null;
    this.lastFilterResult = null;
  }
}
