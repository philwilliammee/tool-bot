import { ButtonSpinner } from "../ButtonSpinner/ButtonSpinner";
import { store } from "../../stores/AppStore";
import { effect } from "@preact/signals-core";
import { WorkArea } from "../WorkArea/WorkArea";
import { converseStore } from "../../stores/ConverseStore/ConverseStore";
import { MessageExtended } from "../../app.types";
import { marked } from "marked";
import { dataStore } from "../../stores/DataStore/DataStore";

declare global {
  interface Window {
    hljs?: {
      highlightElement(block: HTMLElement): void;
    };
  }
}

// Configure marked for safe rendering
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert \n to <br>
  // smartLists: true,
  // smartypants: true,
});

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
      this.setupPromptActions();

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

  private setupPromptActions(): void {
    const uploadBtn = this.promptInput.parentElement?.querySelector(
      ".data-upload-btn"
    ) as HTMLButtonElement;
    const fileInput = this.promptInput.parentElement?.querySelector(
      ".file-input"
    ) as HTMLInputElement;

    if (uploadBtn && fileInput) {
      uploadBtn.onclick = () => fileInput.click();

      fileInput.onchange = async () => {
        const file = fileInput.files?.[0];
        if (!file) return;

        try {
          const id = await dataStore.addFromFile(file);
          store.showToast(`Data uploaded: ${file.name}`);
          console.log("Data available with ID:", id);
          fileInput.value = ""; // Reset input
        } catch (error: any) {
          store.showToast(`Upload failed: ${error.message}`);
          console.error("Upload failed:", error);
        }
      };
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

  private async renderMessages(messages: MessageExtended[]): Promise<void> {
    this.chatMessages.innerHTML = "";

    // Sort messages by createdAt timestamp
    const sortedMessages = [...messages].sort(
      (a, b) => a.metadata.createdAt - b.metadata.createdAt
    );

    // console.log(sortedMessages);

    const lastAssistant = this.findLastAssistant(sortedMessages);

    // Process all messages first
    const processedMessages = await Promise.all(
      sortedMessages.map(async (message) => {
        const messageContent = message.content
          ?.map((block) => {
            if (block.text) {
              return block.text;
            } else if (block.toolResult || block.toolUse) {
              const type = block.toolResult ? "Tool Result" : "Tool Use";
              const content = block.toolResult || block.toolUse;
              return {
                type: type,
                content: `\`\`\`json\n${JSON.stringify(
                  content,
                  null,
                  2
                )}\n\`\`\``,
              };
            }
            return "";
          })
          .filter(Boolean);

        if (!messageContent) return null;

        const templateId = `${message.role}-message-template`;
        const template = document.getElementById(
          templateId
        ) as HTMLTemplateElement;
        if (!template) return null;

        const msgElem = template.content.cloneNode(true) as HTMLElement;
        const contentWrapper = msgElem.querySelector(
          ".message-content-wrapper"
        );
        if (!contentWrapper) return null;

        contentWrapper.setAttribute("data-message-id", message.id);
        contentWrapper.setAttribute(
          "data-timestamp",
          message.metadata.createdAt.toString()
        );

        // Check if this is the last assistant message
        const isLatestAI = message.id === lastAssistant?.id;

        messageContent.forEach(async (content) => {
          if (typeof content === "string") {
            if (content.length > 300) {
              const preview = document.createElement("div");
              preview.className = "message-preview markdown-body";
              preview.innerHTML = await marked(content.slice(0, 300) + "...");

              const full = document.createElement("div");
              full.className = "message-full-content markdown-body";
              full.innerHTML = await marked(content);

              const toggleBtn = document.createElement("button");
              toggleBtn.className = "read-more-btn";
              toggleBtn.textContent = isLatestAI ? "Show less" : "Read more";

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

              // Set initial visibility based on whether it's the latest AI message
              if (isLatestAI) {
                full.classList.remove("hidden");
                preview.classList.add("hidden");
              } else {
                full.classList.add("hidden");
                preview.classList.remove("hidden");
              }
            } else {
              contentWrapper.classList.add("markdown-body");
              contentWrapper.innerHTML = await marked(content);
            }
          } else {
            // Tool content
            const details = document.createElement("details");
            details.className = "tool-disclosure";
            // Open by default only if it's the latest AI message
            details.open = isLatestAI;

            const summary = document.createElement("summary");
            summary.className = "tool-header";
            // @todo add tool name
            summary.textContent = content.type;

            const contentDiv = document.createElement("div");
            contentDiv.className = "tool-content markdown-body";
            contentDiv.innerHTML = await marked(content.content);
            contentWrapper.classList.add("markdown-body");
            details.appendChild(summary);
            details.appendChild(contentDiv);
            contentWrapper.appendChild(details);
          }
        });

        return msgElem;
      })
    );

    // Filter out null results and add all messages to DOM at once
    const validMessages = processedMessages.filter(
      (msg): msg is HTMLElement => msg !== null
    );
    validMessages.forEach((msgElem) => {
      this.chatMessages.appendChild(msgElem);
    });

    // Process code blocks
    this.chatMessages.querySelectorAll("pre code").forEach((block) => {
      if (window.hljs) {
        window.hljs.highlightElement(block as HTMLElement);
      }
    });

    requestAnimationFrame(() => {
      this.scrollToBottom();
    });
  }

  private findLastAssistant(
    messages: MessageExtended[]
  ): MessageExtended | undefined {
    // Loop from end to start to find the last assistant message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        return messages[i];
      }
    }
    return undefined;
  }

  private scrollToBottom(): void {
    if (this.chatMessages) {
      const lastMessage = this.chatMessages.lastElementChild;
      lastMessage?.scrollIntoView({ behavior: "smooth", block: "end" });

      // Fallback direct scroll
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
  }

  private setupEventListeners(): void {
    this.button.onclick = this.handleGenerate;
    this.promptInput.onkeydown = this.handleKeyDown;

    const cleanup = converseStore.onMessagesChange(() => {
      this.render();
    });
    this.cleanupFns.push(cleanup);
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
