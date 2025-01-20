import { ButtonSpinner } from "../ButtonSpinner/ButtonSpinner";
import { store } from "../../stores/AppStore";
import { effect } from "@preact/signals-core";
import { WorkArea } from "../WorkArea/WorkArea";
import { converseStore } from "../../stores/ConverseStore";
import { MessageExtended } from "../../types/tool.types";

interface ChatDependencies {
  workArea: HTMLElement;
}

export class Chat {
  private buttonSpinner!: ButtonSpinner;
  private promptInput!: HTMLTextAreaElement;
  private chatMessages!: HTMLElement;
  private button!: HTMLButtonElement;
  private workArea: HTMLElement;
  private cleanupFns: Array<() => void> = [];
  private initialized: boolean = false;

  constructor(dependencies: ChatDependencies) {
    this.workArea = dependencies.workArea;
    this.initialize();
  }

  private initialize(): void {
    console.log("Chat component initialized");
    try {
      // Initialize WorkArea
      new WorkArea(this.workArea);

      // Get DOM elements
      this.initializeDOMElements();
      this.initializeButtonSpinner();

      this.render();
      this.setupEventListeners();
      this.setupEffects();
    } catch (error) {
      console.error("Failed to initialize Chat:", error);
      throw error;
    }
  }

  private initializeDOMElements(): void {
    this.promptInput = document.querySelector(
      ".prompt-input"
    ) as HTMLTextAreaElement;
    this.chatMessages = document.querySelector(".chat-messages") as HTMLElement;

    if (!this.promptInput || !this.chatMessages) {
      throw new Error("Required DOM elements not found");
    }
  }

  private initializeButtonSpinner(): void {
    this.buttonSpinner = new ButtonSpinner();
    this.button = this.buttonSpinner.getElement();
  }

  private render(): void {
    if (!this.initialized) {
      this.initialized = true;
    }

    if (this.chatMessages) {
      const messages = converseStore.getMessages();
      this.renderMessages(messages);
    }
  }

  private renderMessages(messages: MessageExtended[]): void {
    this.chatMessages.innerHTML = "";
    const lastAssistant = this.findLastAssistant(messages);

    messages.forEach((message) => {
      message.content?.forEach((block) => {
        if (block.text) {
          const isLatestAI = message.id === lastAssistant?.id;
          this.appendMessageToDOM(message, block.text, isLatestAI);
        } else if (block.toolResult) {
          const toolResultText = `Tool Result:\n${JSON.stringify(
            block.toolResult,
            null,
            2
          )}`;
          this.appendMessageToDOM(message, toolResultText, false);
        }
      });
    });

    this.scrollToBottom();
  }

  private appendMessageToDOM(
    message: MessageExtended,
    content: string,
    isLatestAI: boolean
  ): void {
    const templateId = `${message.role}-message-template`;
    const template = document.getElementById(templateId) as HTMLTemplateElement;
    if (!template) {
      console.error(`Template not found: ${templateId}`);
      return;
    }

    const msgElem = template.content.cloneNode(true) as HTMLElement;
    const contentWrapper = msgElem.querySelector(".message-content-wrapper");

    if (!contentWrapper) {
      console.error("Required elements not found in template");
      return;
    }

    contentWrapper.setAttribute("data-message-id", message.id);
    contentWrapper.setAttribute(
      "data-timestamp",
      new Date(message.metadata.createdAt).toLocaleString()
    );

    if (content.length > 300) {
      const preview = document.createElement("div");
      preview.className = "message-preview";
      preview.textContent = content.slice(0, 300) + "...";

      const full = document.createElement("div");
      full.className = "message-full-content";
      full.textContent = content;

      const toggleBtn = document.createElement("button");
      toggleBtn.className = "read-more-btn";
      toggleBtn.textContent = "Read more";

      toggleBtn.addEventListener("click", () => {
        full.classList.toggle("hidden");
        preview.classList.toggle("hidden");
        toggleBtn.textContent = full.classList.contains("hidden")
          ? "Read more"
          : "Show less";
      });

      contentWrapper.appendChild(preview);
      contentWrapper.appendChild(full);
      contentWrapper.appendChild(toggleBtn);

      if (!isLatestAI) {
        full.classList.add("hidden");
        preview.classList.remove("hidden");
      } else {
        full.classList.remove("hidden");
        preview.classList.add("hidden");
        toggleBtn.textContent = "Show less";
      }
    } else {
      contentWrapper.textContent = content;
    }

    this.chatMessages.appendChild(msgElem);
  }

  private findLastAssistant(
    messages: MessageExtended[]
  ): MessageExtended | undefined {
    return messages
      .slice()
      .reverse()
      .find((msg) => msg.role === "assistant");
  }

  private scrollToBottom(): void {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  private setupEventListeners(): void {
    this.button.onclick = this.handleGenerate;
    this.promptInput.onkeydown = this.handleKeyDown;

    const cleanup = converseStore.onMessagesChange(() => {
      this.render();
    });
    this.cleanupFns.push(cleanup);
  }

  private setupEffects(): void {
    this.cleanupFns.push(
      effect(() => {
        const isGenerating = store.isGenerating.value;
        this.promptInput.disabled = isGenerating;
        isGenerating ? this.buttonSpinner.show() : this.buttonSpinner.hide();
      })
    );

    this.cleanupFns.push(
      effect(() => {
        const errorPrompt = store.pendingErrorPrompt.value;
        if (errorPrompt) {
          this.handleErrorPrompt(errorPrompt);
        }
      })
    );
  }

  private async handleErrorPrompt(prompt: string) {
    this.promptInput.value = prompt;
    store.clearPendingErrorPrompt();
  }

  private handleGenerate = (e: MouseEvent): void => {
    e.preventDefault();
    if (store.isGenerating.value) return;

    const prompt = this.promptInput.value.trim();
    if (!prompt) {
      store.showToast("Please type something before sending");
      return;
    }

    converseStore.addMessage({
      role: "user",
      content: [{ text: prompt }],
    });

    this.promptInput.value = "";
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.handleGenerate(new MouseEvent("click"));
    }
  };

  public destroy(): void {
    try {
      this.cleanupFns.forEach((fn) => fn());
      this.cleanupFns = [];

      if (this.button) {
        this.button.onclick = null;
      }
      if (this.promptInput) {
        this.promptInput.onkeydown = null;
      }

      if (this.buttonSpinner) {
        this.buttonSpinner.destroy();
      }

      this.initialized = false;
    } catch (error) {
      console.error("Error during Chat cleanup:", error);
    }
  }
}
