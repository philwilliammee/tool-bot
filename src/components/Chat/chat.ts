import { Message } from "@aws-sdk/client-bedrock-runtime";
import { ButtonSpinner } from "../ButtonSpinner/ButtonSpinner";
import { store } from "../../stores/AppStore";
import { effect } from "@preact/signals-core";
import { WorkArea } from "../WorkArea/WorkArea";
import { chatContext } from "./chat-context";

interface ChatMessage {
  role: "user" | "assistant";
  message: string;
  timestamp: Date;
}

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
      // First time initialization if needed
      this.initialized = true;
    }

    // Update chat messages
    const messages = chatContext.getMessages();
    this.renderMessages(messages);
  }

  private renderMessages(messages: Message[]): void {
    this.chatMessages.innerHTML = "";

    let lastAssistantIdx = this.findLastAssistantIndex(messages);

    messages.forEach((message, index) => {
      message.content?.forEach((block) => {
        if (block.text) {
          const chatMsg: ChatMessage = {
            role: message.role || "assistant",
            message: block.text,
            timestamp: new Date(),
          };
          const isLatestAI = index === lastAssistantIdx;
          this.appendMessageToDOM(chatMsg, isLatestAI);
        } else if (block.toolResult) {
          const toolResultJson = JSON.stringify(block.toolResult, null, 2);
          const chatMsg: ChatMessage = {
            role: message.role || "assistant",
            message: `Tool Result:\n${toolResultJson}`,
            timestamp: new Date(),
          };
          this.appendMessageToDOM(chatMsg, false);
        }
      });
    });

    this.scrollToBottom();
  }

  private findLastAssistantIndex(messages: Message[]): number {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        return i;
      }
    }
    return -1;
  }

  private scrollToBottom(): void {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  private setupEventListeners(): void {
    this.button.onclick = this.handleGenerate;
    this.promptInput.onkeydown = this.handleKeyDown;

    const cleanup = chatContext.onMessagesChange(() => {
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
    // No LLM call here — the user can just press send or we can auto-send if desired
  }

  private handleGenerate = (e: MouseEvent): void => {
    e.preventDefault();
    if (store.isGenerating.value) return; // skip if currently generating

    // 1) Grab text
    const prompt = this.promptInput.value.trim();
    if (!prompt) {
      store.showToast("Please type something before sending");
      return;
    }

    // 2) Add user message to chat
    chatContext.addMessage({
      role: "user",
      content: [{ text: prompt }],
    });

    // 3) Clear input
    this.promptInput.value = "";
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.handleGenerate(new MouseEvent("click"));
    }
  };

  private appendMessageToDOM(message: ChatMessage, isLatestAI: boolean): void {
    const msgElem = document.createElement("div");
    msgElem.className = `chat-message ${message.role}`;

    const contentWrapper = document.createElement("div");
    contentWrapper.className = "message-content-wrapper";

    if (message.message.length > 300) {
      // "Read more" approach
      const preview = document.createElement("div");
      preview.className = "message-preview";
      preview.textContent = message.message.slice(0, 300) + "...";

      const full = document.createElement("div");
      full.className = "message-full-content";
      full.textContent = message.message; // Use textContent instead of innerHTML

      const toggleBtn = document.createElement("button");
      toggleBtn.className = "read-more-btn";
      toggleBtn.textContent = "Show less";
      toggleBtn.onclick = () => {
        full.classList.toggle("hidden");
        preview.classList.toggle("hidden");
        toggleBtn.textContent = full.classList.contains("hidden")
          ? "Read more"
          : "Show less";
      };

      if (!isLatestAI) {
        full.classList.add("hidden");
        preview.classList.remove("hidden");
        toggleBtn.textContent = "Read more";
      } else {
        full.classList.remove("hidden");
        preview.classList.add("hidden");
      }

      contentWrapper.appendChild(preview);
      contentWrapper.appendChild(full);
      contentWrapper.appendChild(toggleBtn);
    } else {
      // Short content, display as-is
      contentWrapper.textContent = message.message; // Use textContent instead of innerHTML
    }

    msgElem.appendChild(contentWrapper);
    this.chatMessages.appendChild(msgElem);
  }

  // private formatMessageContent(content: string): string {
  //   // Basic formatting + code block highlighting
  //   return content
  //     .replace(/\n/g, "<br>")
  //     .replace(
  //       /```([\s\S]*?)```/g,
  //       (_, code) => `
  //         <pre class="code-block"><code>${code.trim()}</code></pre>
  //       `
  //     )
  //     .replace(/`([^`]+)`/g, "<code>$1</code>");
  // }

  public destroy(): void {
    try {
      // Cleanup effects and subscriptions
      this.cleanupFns.forEach((fn) => fn());
      this.cleanupFns = [];

      // Remove event listeners
      if (this.button) {
        this.button.onclick = null;
      }
      if (this.promptInput) {
        this.promptInput.onkeydown = null;
      }

      // Cleanup components
      if (this.buttonSpinner) {
        this.buttonSpinner.destroy();
      }

      // Reset state
      this.initialized = false;
    } catch (error) {
      console.error("Error during Chat cleanup:", error);
    }
  }
}
