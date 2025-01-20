import { Message } from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended } from "../../types/tool.types";
import { converseStore } from "../../stores/ConverseStore";

export class WorkAreaModals {
  private initialized: boolean = false;
  private viewDialog!: HTMLDialogElement;
  private editDialog!: HTMLDialogElement;
  private newDialog!: HTMLDialogElement;
  private modals: HTMLDialogElement[] = [];
  private currentEditId: string | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized) return;

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
    this.setupEditFormEvents();
    this.initialized = true;
  }

  private setupGlobalEvents(): void {
    this.modals.forEach((dialog) => {
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) dialog.close();
      });

      dialog.addEventListener("close", () => {
        const form = dialog.querySelector("form");
        if (form) form.reset();
        this.currentEditId = null;
      });
    });

    this.modals.forEach((modal) => {
      modal
        .querySelector(".cancel-btn")
        ?.addEventListener("click", () => modal.close());
      modal
        .querySelector(".close-btn")
        ?.addEventListener("click", () => modal.close());
    });
  }

  private setupEditFormEvents(): void {
    const editForm = this.editDialog.querySelector(".edit-form");
    if (!editForm) return;

    const heartToggle = editForm.querySelector(".heart-toggle") as HTMLElement;
    const ratingInput = editForm.querySelector(
      "#messageRating"
    ) as HTMLInputElement;

    if (heartToggle && ratingInput) {
      heartToggle.addEventListener("click", () => {
        const newRating = ratingInput.value === "1" ? "0" : "1";
        ratingInput.value = newRating;
        heartToggle.textContent = newRating === "1" ? "❤️" : "🤍";
      });
    }

    editForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!this.currentEditId) return;

      const content = (
        editForm.querySelector("#messageContent") as HTMLTextAreaElement
      ).value;
      const tagsInput = (
        editForm.querySelector("#messageTags") as HTMLInputElement
      ).value;
      const rating = parseInt(
        (editForm.querySelector("#messageRating") as HTMLInputElement).value
      );

      const tags = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const message = converseStore.getMessage(this.currentEditId);
      if (message) {
        const updatedMessage: MessageExtended = {
          ...message,
          content: [{ text: content }],
          metadata: {
            ...message.metadata,
            tags,
            userRating: rating,
            updatedAt: Date.now(),
          },
        };

        converseStore.updateMessage(this.currentEditId, updatedMessage);
      }

      this.editDialog.close();
    });
  }

  public showViewModal(message: MessageExtended): void {
    const roleElement = this.viewDialog.querySelector(".role-value");
    const contentElement = this.viewDialog.querySelector(".content-value");
    const tagsElement = this.viewDialog.querySelector(".tags-value");
    const ratingElement = this.viewDialog.querySelector(".rating-value");
    const timestampElement = this.viewDialog.querySelector(".timestamp-value");

    if (roleElement) roleElement.textContent = message.role || "unknown";
    if (contentElement)
      contentElement.textContent = this.formatMessageContent(message);

    if (tagsElement) {
      tagsElement.innerHTML = "";
      if (message.metadata?.tags?.length) {
        message.metadata.tags.forEach((tag) => {
          const tagSpan = document.createElement("span");
          tagSpan.className = "message-tag";
          tagSpan.textContent = tag;
          tagsElement.appendChild(tagSpan);
        });
      } else {
        tagsElement.textContent = "No tags";
      }
    }

    if (ratingElement) {
      ratingElement.textContent = message.metadata?.userRating ? "❤️" : "🤍";
    }

    if (timestampElement) {
      timestampElement.textContent = new Date(
        message.metadata.createdAt
      ).toLocaleString();
    }

    this.viewDialog.showModal();
  }

  public showEditModal(message: MessageExtended, onSave: () => void): void {
    const textarea = this.editDialog.querySelector(
      "#messageContent"
    ) as HTMLTextAreaElement;
    const tagsInput = this.editDialog.querySelector(
      "#messageTags"
    ) as HTMLInputElement;
    const ratingInput = this.editDialog.querySelector(
      "#messageRating"
    ) as HTMLInputElement;
    const heartToggle = this.editDialog.querySelector(
      ".heart-toggle"
    ) as HTMLElement;

    if (textarea) {
      textarea.value = message.content?.[0]?.text || "";
    }

    if (tagsInput) {
      tagsInput.value = message.metadata?.tags?.join(", ") || "";
    }

    if (ratingInput && heartToggle) {
      const rating = message.metadata?.userRating || 0;
      ratingInput.value = rating.toString();
      heartToggle.textContent = rating ? "❤️" : "🤍";
    }

    this.currentEditId = message.id;

    const editForm = this.editDialog.querySelector(".edit-form");
    if (editForm) {
      const newForm = editForm.cloneNode(true) as HTMLFormElement;
      editForm.parentNode?.replaceChild(newForm, editForm);

      newForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const content = (
          newForm.querySelector("#messageContent") as HTMLTextAreaElement
        ).value;
        const tagsInput = (
          newForm.querySelector("#messageTags") as HTMLInputElement
        ).value;
        const rating = parseInt(
          (newForm.querySelector("#messageRating") as HTMLInputElement).value
        );

        const tags = tagsInput
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);

        const updatedMessage: MessageExtended = {
          ...message,
          content: [{ text: content }],
          metadata: {
            ...message.metadata,
            tags,
            userRating: rating,
            updatedAt: Date.now(),
          },
        };

        converseStore.updateMessage(message.id, updatedMessage);
        onSave();
        this.editDialog.close();
      });
    }

    this.editDialog.showModal();
  }

  public showNewMessageModal(
    onAdd: (
      role: "user" | "assistant",
      content: string,
      tags: string[],
      rating: number
    ) => void
  ): void {
    const form = this.newDialog.querySelector(".new-message-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const roleSelect = form.querySelector(
        "#messageRole"
      ) as HTMLSelectElement;
      const contentInput = form.querySelector(
        "#newMessageContent"
      ) as HTMLTextAreaElement;
      const tagsInput = form.querySelector(
        "#newMessageTags"
      ) as HTMLInputElement;
      const ratingInput = form.querySelector(
        "#newMessageRating"
      ) as HTMLInputElement;

      if (roleSelect?.value && contentInput?.value.trim()) {
        const tags = tagsInput.value
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);

        const rating = parseInt(ratingInput.value) || 0;

        onAdd(
          roleSelect.value as "user" | "assistant",
          contentInput.value.trim(),
          tags,
          rating
        );

        this.newDialog.close();
      }
    });

    this.newDialog.showModal();
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

  public destroy(): void {
    this.modals.forEach((modal) => {
      const newModal = modal.cloneNode(true);
      modal.parentNode?.replaceChild(newModal, modal);
    });

    this.initialized = false;
  }
}
