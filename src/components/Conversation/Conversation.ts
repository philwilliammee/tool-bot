import { effect, signal } from "@preact/signals-core";
import { converseStore } from "../../stores/ConverseStore/ConverseStore.js";
import { MessageExtended } from "../../app.types";
import { ChatMessage } from "./ChatMessage.js";
import { ConversationHeader } from "./ConversationHeader.js";
import { ConversationInput } from "./ConversationInput.js";

export class Conversation {
  private element: HTMLElement;
  private chatMessages: HTMLElement;
  private scrollButton: HTMLButtonElement;
  private headerContainer: HTMLElement;
  private inputContainer: HTMLElement;
  private cleanupFns: Array<() => void> = [];

  // Child components
  private header: ConversationHeader | null = null;
  private input: ConversationInput | null = null;

  // Component state
  private messageComponents = new Map<string, ChatMessage>();
  private isNearBottom = true;
  private debouncedRender: () => void;

  constructor(container: HTMLElement) {
    this.element = container;
    console.log(
      "Initializing Conversation component with container:",
      container
    );

    // Find elements within the chat container
    this.chatMessages = this.element.querySelector(
      ".chat-messages"
    ) as HTMLElement;
    this.scrollButton = this.element.querySelector(
      ".scroll-bottom-btn"
    ) as HTMLButtonElement;
    this.inputContainer = this.element.querySelector(
      ".prompt-container"
    ) as HTMLElement;

    // Find header in parent context - header is a sibling of the chat container
    this.headerContainer = document.querySelector(
      ".left-column > header"
    ) as HTMLElement;

    console.log("Chat messages element:", this.chatMessages);
    console.log("Scroll button element:", this.scrollButton);
    console.log("Header container element:", this.headerContainer);
    console.log("Input container element:", this.inputContainer);

    // Check required elements with improved error messages
    if (!this.chatMessages) {
      console.error(
        "Chat messages element (.chat-messages) not found in chat container"
      );
      throw new Error("Chat messages element not found");
    }

    if (!this.scrollButton) {
      console.error(
        "Scroll button element (.scroll-bottom-btn) not found in chat container"
      );
      throw new Error("Scroll button element not found");
    }

    if (!this.headerContainer) {
      console.error("Header container element not found in document");
      throw new Error("Header container element not found");
    }

    if (!this.inputContainer) {
      console.error(
        "Input container element (.prompt-container) not found in chat container"
      );
      throw new Error("Input container element not found");
    }

    this.debouncedRender = this.debounce(() => this.render(), 100);

    this.initialize();
  }

  private debounce(fn: Function, delay: number) {
    let timeoutId: number | null = null;
    return function (this: any, ...args: any[]) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => fn.apply(this, args), delay);
    };
  }

  private initialize(): void {
    console.log("Conversation component initialized");

    // Initialize child components
    this.header = new ConversationHeader(this.headerContainer);
    this.input = new ConversationInput(this.inputContainer);

    // Set up scroll handling
    this.setupScrollHandling();

    // Set up effects
    this.setupEffects();

    // Initial render
    this.debouncedRender();
  }

  private setupScrollHandling(): void {
    this.chatMessages.addEventListener("scroll", this.handleScroll.bind(this));
    this.scrollButton.addEventListener("click", () => this.scrollToBottom());

    // Initial check
    this.checkScrollPosition();

    this.cleanupFns.push(() => {
      this.chatMessages.removeEventListener(
        "scroll",
        this.handleScroll.bind(this)
      );
      this.scrollButton.removeEventListener("click", () =>
        this.scrollToBottom()
      );
    });
  }

  private handleScroll(): void {
    this.checkScrollPosition();
  }

  private checkScrollPosition(): void {
    const { scrollTop, scrollHeight, clientHeight } = this.chatMessages;
    const scrollFromBottom = scrollHeight - scrollTop - clientHeight;

    // Consider "near bottom" if within 100px of bottom
    this.isNearBottom = scrollFromBottom < 100;

    // Show/hide scroll button based on position
    if (this.isNearBottom) {
      this.scrollButton.classList.remove("visible");
    } else {
      this.scrollButton.classList.add("visible");
    }
  }

  private scrollToBottom(): void {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    this.checkScrollPosition(); // Update button visibility
  }

  private setupEffects(): void {
    // Use signals for message updates
    this.cleanupFns.push(
      effect(() => {
        // This effect will run whenever messages signal changes
        const messages = converseStore.getMessagesSignal().value;
        // The timestamp signal ensures the effect runs even when the messages array
        // reference hasn't changed but contents have
        const timestamp = converseStore.getMessagesUpdatedSignal().value;
        if (timestamp > 0) {
          // Only render if we have a valid timestamp
          this.debouncedRender();
        }
      })
    );
  }

  /**
   * Main render method: re-renders the chat messages based on the store data.
   */
  private async render(): Promise<void> {
    // Get messages from signal
    const messages = converseStore.getMessagesSignal().value;

    // If there are no messages, show empty state
    if (!messages.length) {
      this.messageComponents.forEach((component) => component.destroy());
      this.messageComponents.clear();

      // Get and clone the empty state template
      const emptyStateTemplate = document.getElementById(
        "chat-empty-state-template"
      ) as HTMLTemplateElement;
      if (!emptyStateTemplate) {
        throw new Error("Empty state template not found");
      }

      const emptyState = emptyStateTemplate.content.cloneNode(true);
      this.chatMessages.innerHTML = "";
      this.chatMessages.appendChild(emptyState);
      return;
    }

    // Clear any existing empty state
    const emptyState = this.chatMessages.querySelector(".chat-empty-state");
    if (emptyState) {
      this.chatMessages.innerHTML = "";
    }

    // Sort messages by timestamp
    const sortedMessages = [...messages].sort(
      (a, b) => a.metadata.createdAt - b.metadata.createdAt
    );

    // Find last assistant message for styling purposes
    const lastAssistant = this.findLastAssistant(sortedMessages);

    // Track which components are still in use
    const currentComponents = new Map<string, ChatMessage>();

    // Update or create components for each message
    for (const message of sortedMessages) {
      let component = this.messageComponents.get(message.id);

      if (!component) {
        // Create a new component
        component = new ChatMessage(message, message.id === lastAssistant?.id);
        const element = await component.render();
        if (element) {
          this.chatMessages.appendChild(element);
        } else {
          console.error(
            `Failed to render component for message ID ${message.id}`
          );
        }
        this.messageComponents.set(message.id, component);
      } else {
        // Update existing component
        await component.update(message);
      }

      // Track that this component is still in use
      currentComponents.set(message.id, component);
    }

    // Cleanup any components that are no longer needed
    const removedComponents: string[] = [];
    this.messageComponents.forEach((component, id) => {
      if (!currentComponents.has(id)) {
        removedComponents.push(id);

        // Force DOM removal for this component
        const msgElement = this.chatMessages.querySelector(
          `[data-message-id="${id}"]`
        );
        if (msgElement) {
          msgElement.remove(); // Directly remove from DOM to ensure it's gone
        }

        // Now call the component's destroy method
        component.destroy();
        this.messageComponents.delete(id);
      }
    });

    // Handle scrolling
    requestAnimationFrame(() => {
      if (this.isNearBottom) {
        this.scrollToBottom();
      } else {
        this.checkScrollPosition();
      }
    });
  }

  private findLastAssistant(
    messages: MessageExtended[]
  ): MessageExtended | undefined {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        return messages[i];
      }
    }
    return undefined;
  }

  public destroy(): void {
    console.log("Destroying Conversation component");

    // Destroy child components
    this.header?.destroy();
    this.input?.destroy();

    // Destroy message components
    this.messageComponents.forEach((component) => component.destroy());
    this.messageComponents.clear();

    // Clean up effects and event listeners
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }
}
