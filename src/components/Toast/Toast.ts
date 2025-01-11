// src/components/Toast/Toast.ts
import { store } from "../../stores/AppStore";
import { effect } from "@preact/signals-core";

export class Toast {
  private dialog: HTMLDialogElement;
  private content: HTMLParagraphElement;
  private cleanup: () => void;

  constructor() {
    console.log("Toast component initialized");
    this.dialog = document.getElementById("toast-message") as HTMLDialogElement;
    this.content = this.dialog.querySelector(
      ".toast-content"
    ) as HTMLParagraphElement;

    if (!this.dialog || !this.content) {
      throw new Error("Toast elements not found");
    }

    this.cleanup = effect(() => {
      const message = store.toastMessage.value;
      if (message) {
        this.show(message);
      }
    });
  }

  private show(message: string) {
    this.content.textContent = message;
    this.dialog.show();

    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.dialog.close();
      store.toastMessage.value = null;
    }, 3000);
  }

  public destroy() {
    this.cleanup();
  }
}
