import { MessageExtended } from "../../app.types";
import { store } from "../../stores/AppStore";
import { converseStore } from "../../stores/ConverseStore/ConverseStore";

export class ResendButton {
  private button: HTMLButtonElement;
  private cleanupFns: Array<() => void> = [];

  constructor(message: MessageExtended) {
    const template = document.getElementById(
      "resend-button-template"
    ) as HTMLTemplateElement;

    if (!template) {
      throw new Error("Resend button template not found");
    }

    this.button = this.createButton(template);
    this.setupEventListeners(message);
  }

  private createButton(template: HTMLTemplateElement): HTMLButtonElement {
    const element = template.content.cloneNode(true) as HTMLElement;
    const button = element.querySelector("button");
    if (!button) {
      throw new Error("Button element not found in template");
    }
    return button as HTMLButtonElement;
  }

  private setupEventListeners(message: MessageExtended): void {
    const handler = async () => {
      if (!store.isGenerating.value && !store.isToolRunning.value) {
        try {
          console.log("Resending user message:", message);

          // Use the new resendLastUserMessage method to avoid duplicates
          const success = await converseStore.resendLastUserMessage();

          if (success) {
            store.showToast("Message resent to AI");
          } else {
            store.showToast("Failed to resend message");
          }
        } catch (error) {
          console.error("Failed to resend message:", error);
          store.showToast("Failed to resend message");
        }
      } else {
        store.showToast("Please wait for current operation to complete");
      }
    };

    this.button.addEventListener("click", handler);
    this.cleanupFns.push(() =>
      this.button.removeEventListener("click", handler)
    );
  }

  public getElement(): HTMLButtonElement {
    return this.button;
  }

  public destroy(): void {
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];
  }

  // Static helper to check if a message is the most recent user message
  public static isLastUserMessage(message: MessageExtended): boolean {
    const allMessages = converseStore.getMessages();
    if (allMessages.length === 0) return false;

    // Find the most recent actual user message (not error messages)
    const lastUserMessage = [...allMessages]
      .reverse()
      .find(msg =>
        msg.role === "user" &&
        !msg.metadata?.error &&
        !msg.content?.some(block => block.toolResult) // Skip tool results
      );

    if (!lastUserMessage) return false;

    // Check if this message is the last user message and it's actually from the user
    return lastUserMessage.id === message.id &&
      message.role === "user" &&
      !message.metadata?.error;
  }
}
