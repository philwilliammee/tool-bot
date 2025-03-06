import { BaseModal } from "./BaseModal";

// src/components/WorkArea/Modals/NewMessageModal.ts
export class NewMessageModal extends BaseModal {
  constructor() {
    super("new-modal");
  }

  public show(
    onAdd: (
      role: "user" | "assistant",
      content: string,
      tags: string[],
      rating: number
    ) => void
  ): void {
    const form = this.dialog.querySelector(".new-message-form");
    if (!form) return;

    this.setupSubmitHandler(form, onAdd);
    this.dialog.showModal();
  }

  private setupSubmitHandler(
    form: Element,
    onAdd: (
      role: "user" | "assistant",
      content: string,
      tags: string[],
      rating: number
    ) => void
  ): void {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleSubmit(e.target as HTMLFormElement, onAdd);
    });
  }

  private handleSubmit(
    form: HTMLFormElement,
    onAdd: (
      role: "user" | "assistant",
      content: string,
      tags: string[],
      rating: number
    ) => void
  ): void {
    const roleSelect = form.querySelector("#messageRole") as HTMLSelectElement;
    const contentInput = form.querySelector(
      "#newMessageContent"
    ) as HTMLTextAreaElement;
    const tagsInput = form.querySelector("#newMessageTags") as HTMLInputElement;
    const ratingInput = form.querySelector(
      "#newMessageRating"
    ) as HTMLInputElement;

    if (roleSelect?.value && contentInput?.value.trim()) {
      const tags = tagsInput?.value
        ? tagsInput.value
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : [];

      const rating = ratingInput?.value ? parseInt(ratingInput.value) : 0;

      onAdd(
        roleSelect.value as "user" | "assistant",
        contentInput.value.trim(),
        tags,
        rating
      );

      this.close();
    }
  }
}
