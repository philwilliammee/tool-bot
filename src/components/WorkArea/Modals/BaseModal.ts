// src/components/WorkArea/Modals/BaseModal.ts
export abstract class BaseModal {
  protected dialog: HTMLDialogElement;

  constructor(modalId: string) {
    this.dialog = document.getElementById(modalId) as HTMLDialogElement;
    if (!this.dialog) {
      throw new Error(`Modal element ${modalId} not found in DOM`);
    }
    this.setupBaseEvents();
  }

  private setupBaseEvents(): void {
    this.dialog.addEventListener("click", (e) => {
      if (e.target === this.dialog) this.close();
    });

    this.dialog.addEventListener("close", () => {
      const form = this.dialog.querySelector("form");
      if (form) form.reset();
    });

    this.dialog
      .querySelector(".cancel-btn")
      ?.addEventListener("click", () => this.close());
    this.dialog
      .querySelector(".close-btn")
      ?.addEventListener("click", () => this.close());
  }

  public close(): void {
    this.dialog.close();
  }

  public destroy(): void {
    const newModal = this.dialog.cloneNode(true);
    this.dialog.parentNode?.replaceChild(newModal, this.dialog);
  }
}
