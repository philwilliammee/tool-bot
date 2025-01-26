// src/components/WorkArea/WorkAreaModals.ts
import { MessageExtended } from "../../app.types";
import { createEditModal } from "./Modals/EditModal";
import { NewMessageModal } from "./Modals/NewModal";
import { ViewModal } from "./Modals/ViewModal";

/** @todo make all modals function */
export class WorkAreaModals {
  private viewModal: ViewModal;
  readonly editModal;
  private newModal: NewMessageModal;

  constructor() {
    this.viewModal = new ViewModal();
    this.editModal = createEditModal();
    this.newModal = new NewMessageModal();
  }

  public showViewModal(message: MessageExtended): void {
    this.viewModal.show(message);
  }

  public showEditModal(message: MessageExtended): void {
    this.editModal.show(message);
  }

  public showNewMessageModal(
    onAdd: (
      role: "user" | "assistant",
      content: string,
      tags: string[],
      rating: number
    ) => void
  ): void {
    this.newModal.show(onAdd);
  }

  public destroy(): void {
    this.viewModal.destroy();
    this.editModal.destroy();
    this.newModal.destroy();
  }
}
