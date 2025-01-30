import { HybridAutocomplete } from "./../AutoComplete/AutoComplete";
import { ButtonSpinner } from "../ButtonSpinner/ButtonSpinner";
import { store } from "../../stores/AppStore";
import { effect, signal } from "@preact/signals-core";
import { WorkArea } from "../WorkArea/WorkArea";
import { converseStore } from "../../stores/ConverseStore/ConverseStore";
import { MessageExtended } from "../../app.types";
import { marked } from "marked";
import { dataStore } from "../../stores/DataStore/DataStore";
import { ReExecuteButton } from "../../ReExecuteButton/ReExecuteButton";

declare global {
  interface Window {
    hljs?: {
      highlightElement(block: HTMLElement): void;
    };
  }
}

// Configure marked for safe rendering
marked.setOptions({
  gfm: true,
  breaks: true,
});

interface ChatDependencies {
  workArea: HTMLElement;
}

export class Chat {
  private buttonSpinner!: ButtonSpinner;
  private promptInput!: HTMLTextAreaElement;
  private chatMessages!: HTMLElement;
  private generateButton!: HTMLButtonElement;
  private workArea: HTMLElement;
  private cleanupFns: Array<() => void> = [];
  private initialized = false;
  private scrollButton!: HTMLButtonElement;

  // "Dumb" autocomplete (no internal text-area listeners)
  private autocomplete: HybridAutocomplete | null = null;

  // This signal tracks the text in our textarea
  private inputValue = signal("");

  constructor(dependencies: ChatDependencies) {
    this.workArea = dependencies.workArea;
    this.initialize();
  }

  private initialize(): void {
    console.log("Chat component initialized");
    try {
      // Initialize WorkArea
      new WorkArea(this.workArea);

      // DOM
      this.initializeDOMElements();
      this.initializeButtonSpinner();
      this.setupPromptActions();

      // Render
      this.render();

      // Single input & keydown
      this.setupPromptListeners();

      // Additional store listeners/effects
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
    this.scrollButton = document.querySelector(
      ".scroll-bottom-btn"
    ) as HTMLButtonElement;

    if (!this.promptInput || !this.chatMessages || !this.scrollButton) {
      throw new Error("Required DOM elements not found");
    }

    // Create HybridAutocomplete
    this.autocomplete = new HybridAutocomplete(this.promptInput);

    this.setupScrollButton();
  }
  private setupScrollButton(): void {
    let timeout: number;

    // Show/hide button based on scroll position with debounce
    const toggleScrollButton = () => {
      clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = this.chatMessages;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const shouldShow = distanceFromBottom > 200; // Increased threshold

        // Only toggle if state actually changes
        if (shouldShow !== this.scrollButton.classList.contains("visible")) {
          this.scrollButton.classList.toggle("visible", shouldShow);
        }
      }, 100); // Small delay for smoothness
    };

    // Handle scroll events with passive option for better performance
    this.chatMessages.addEventListener("scroll", toggleScrollButton, {
      passive: true,
    });

    // Handle click with smooth scroll
    const handleClick = () => {
      this.scrollToBottom();
      // Hide button immediately on click
      this.scrollButton.classList.remove("visible");
    };

    this.scrollButton.addEventListener("click", handleClick);

    // Add to cleanup
    this.cleanupFns.push(() => {
      clearTimeout(timeout);
      this.chatMessages.removeEventListener("scroll", toggleScrollButton);
      this.scrollButton.removeEventListener("click", handleClick);
    });

    // Initial check
    toggleScrollButton();
  }

  // Modify scrollToBottom to be smoother
  private scrollToBottom(): void {
    if (this.chatMessages) {
      const duration = 200; // milliseconds - adjust this to control speed
      const start = this.chatMessages.scrollTop;
      const end =
        this.chatMessages.scrollHeight - this.chatMessages.clientHeight;
      const change = end - start;
      const startTime = performance.now();

      const animateScroll = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        this.chatMessages.scrollTop = start + change * progress;

        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        }
      };

      requestAnimationFrame(animateScroll);
    }
  }

  private setupPromptListeners(): void {
    // 1) On input => update signal
    const onInput = () => {
      this.inputValue.value = this.promptInput.value;
    };
    this.promptInput.addEventListener("input", onInput);
    this.cleanupFns.push(() => {
      this.promptInput.removeEventListener("input", onInput);
    });

    // 2) Single keydown => arrow nav, Enter, etc.
    const onKeyDown = (e: KeyboardEvent) => {
      if (!this.autocomplete) return;

      if (this.autocomplete.isVisible()) {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            this.autocomplete.moveSelection(1);
            break;
          case "ArrowUp":
            e.preventDefault();
            this.autocomplete.moveSelection(-1);
            break;
          case "Enter":
            if (this.hasHighlightedSuggestion()) {
              e.preventDefault();
              e.stopPropagation();
              this.autocomplete.selectCurrent();
            }
            break;
          case "Escape":
            this.autocomplete.hideSuggestions();
            break;
        }
      } else {
        // If no suggestions => Enter => send message
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.handleGenerate();
        }
      }
    };
    this.promptInput.addEventListener("keydown", onKeyDown);
    this.cleanupFns.push(() => {
      this.promptInput.removeEventListener("keydown", onKeyDown);
    });

    // 3) Document click => hide suggestions if outside
    const onDocumentClick = (ev: MouseEvent) => {
      const target = ev.target as Node;
      if (
        this.autocomplete?.isVisible() &&
        !this.promptInput.contains(target) &&
        !this.autocomplete.suggestionBoxContains(target)
      ) {
        this.autocomplete.hideSuggestions();
      }
    };
    document.addEventListener("click", onDocumentClick);
    this.cleanupFns.push(() => {
      document.removeEventListener("click", onDocumentClick);
    });
  }

  private hasHighlightedSuggestion(): boolean {
    // If your HybridAutocomplete has a public getter for currentSelection >= 0,
    // you can use that. For now, just assume there's a highlight if visible.
    return true;
  }

  private setupEventListeners(): void {
    this.generateButton.onclick = () => this.handleGenerate();

    const cleanupMessagesChange = converseStore.onMessagesChange(() => {
      this.render();
    });
    this.cleanupFns.push(cleanupMessagesChange, () => {
      this.generateButton.onclick = null;
    });
  }

  private setupEffects(): void {
    // 1) Show/hide spinner while generating
    this.cleanupFns.push(
      effect(() => {
        const isGenerating = store.isGenerating.value;
        this.promptInput.disabled = isGenerating;
        isGenerating ? this.buttonSpinner.show() : this.buttonSpinner.hide();
      })
    );

    // 2) If there's a pendingErrorPrompt, fill & clear
    this.cleanupFns.push(
      effect(() => {
        const errorPrompt = store.pendingErrorPrompt.value;
        if (errorPrompt) {
          this.handleErrorPrompt(errorPrompt);
        }
      })
    );

    // 3) Show/hide suggestions (based on last word)
    this.cleanupFns.push(
      effect(() => {
        if (!this.autocomplete) return;
        const text = this.inputValue.value;
        const lastWord = this.getLastWord(text);
        if (lastWord.length >= 2) {
          const suggestions = this.getSuggestions(lastWord);
          if (suggestions.length) {
            this.autocomplete.showSuggestions(suggestions);
          } else {
            this.autocomplete.hideSuggestions();
          }
        } else {
          this.autocomplete.hideSuggestions();
        }
      })
    );
  }

  /**
   * Trim trailing spaces so "show " => "show".
   */
  private getLastWord(text: string): string {
    const trimmed = text.trimEnd(); // remove trailing spaces
    if (!trimmed) return "";
    const parts = trimmed.split(/\s+/);
    return parts[parts.length - 1]?.toLowerCase() ?? "";
  }

  /**
   * Example "dumb" logic: if user typed a known command in full,
   * show expansions. Otherwise show partial commands.
   */
  private getSuggestions(word: string): string[] {
    const expansions = this.autocomplete?.expansionsMap ?? {};
    const commands = Object.keys(expansions);

    if (commands.includes(word)) {
      return expansions[word];
    }
    return commands.filter((cmd) => cmd.startsWith(word));
  }

  private handleGenerate(): void {
    if (store.isGenerating.value) return;

    const prompt = this.inputValue.value.trim();
    if (!prompt) {
      store.showToast("Please type something before sending");
      return;
    }
    converseStore.addMessage({
      role: "user",
      content: [{ text: prompt }],
    });

    // Clear
    this.inputValue.value = "";
    this.promptInput.value = "";
  }

  private async handleErrorPrompt(prompt: string) {
    this.inputValue.value = prompt;
    this.promptInput.value = prompt;
    store.clearPendingErrorPrompt();
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
          fileInput.value = ""; // Reset
        } catch (error: any) {
          store.showToast(`Upload failed: ${error.message}`);
          console.error("Upload failed:", error);
        }
      };
    }
  }

  private initializeButtonSpinner(): void {
    this.buttonSpinner = new ButtonSpinner();
    this.generateButton = this.buttonSpinner.getElement();
  }

  // Update existing render method to check scroll button visibility
  private render(): void {
    if (!this.initialized) {
      this.initialized = true;
    }
    if (this.chatMessages) {
      const messages = converseStore.getMessages();
      this.renderMessages(messages).then(() => {
        // Check scroll button visibility after rendering
        const event = new Event("scroll");
        this.chatMessages.dispatchEvent(event);
      });
    }
  }

  private async renderMessages(messages: MessageExtended[]): Promise<void> {
    this.chatMessages.innerHTML = "";

    // Sort by timestamp
    const sortedMessages = [...messages].sort(
      (a, b) => a.metadata.createdAt - b.metadata.createdAt
    );
    const lastAssistant = this.findLastAssistant(sortedMessages);

    // Process messages
    const processed = await Promise.all(
      sortedMessages.map(async (message) => {
        const contentBlocks = message.content
          ?.map((block) => {
            if (block.text) return block.text;
            if (block.toolResult || block.toolUse) {
              const type = block.toolResult ? "Tool Result" : "Tool Use";
              const c = block.toolResult || block.toolUse;
              return {
                type,
                content: `\`\`\`json\n${JSON.stringify(c, null, 2)}\n\`\`\``,
              };
            }
            return "";
          })
          .filter(Boolean);

        if (!contentBlocks) return null;

        const templateId = `${message.role}-message-template`;
        const template = document.getElementById(
          templateId
        ) as HTMLTemplateElement;
        if (!template) return null;

        const msgElem = template.content.cloneNode(true) as HTMLElement;
        const wrapper = msgElem.querySelector(".message-content-wrapper");
        if (!wrapper) return null;

        wrapper.setAttribute("data-message-id", message.id);
        wrapper.setAttribute(
          "data-timestamp",
          message.metadata.createdAt.toString()
        );

        const isLatestAI = message.id === lastAssistant?.id;

        // Insert content
        for (const content of contentBlocks) {
          if (typeof content === "string") {
            if (content.length > 300) {
              // show partial
              const preview = document.createElement("div");
              preview.className = "message-preview markdown-body";
              preview.innerHTML = await marked(content.slice(0, 300) + "...");

              const full = document.createElement("div");
              full.className = "message-full-content markdown-body";
              full.innerHTML = await marked(content);

              wrapper.appendChild(preview);
              wrapper.appendChild(full);

              // Get or create actions div
              let actionsDiv = msgElem.querySelector(".message-actions");
              if (!actionsDiv) {
                actionsDiv = document.createElement("div");
                actionsDiv.className = "message-actions";
                msgElem.appendChild(actionsDiv);
              }

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

              actionsDiv.appendChild(toggleBtn);

              if (isLatestAI) {
                full.classList.remove("hidden");
                preview.classList.add("hidden");
              } else {
                full.classList.add("hidden");
                preview.classList.remove("hidden");
              }
            } else {
              // short text
              wrapper.classList.add("markdown-body");
              wrapper.innerHTML = await marked(content);
            }
          } else {
            // Tool content
            const details = document.createElement("details");
            details.className = "tool-disclosure";
            details.open = isLatestAI;

            const summary = document.createElement("summary");
            summary.className = "tool-header";
            summary.textContent = content.type;

            const cDiv = document.createElement("div");
            cDiv.className = "tool-content markdown-body";
            cDiv.innerHTML = await marked(content.content);

            wrapper.classList.add("markdown-body");
            details.appendChild(summary);
            details.appendChild(cDiv);
            wrapper.appendChild(details);

            // Add re-execute button to actions if it's a tool use
            if (
              content.type === "Tool Use" &&
              ReExecuteButton.hasHtmlTool(message)
            ) {
              let actionsDiv = msgElem.querySelector(".message-actions");
              if (!actionsDiv) {
                actionsDiv = document.createElement("div");
                actionsDiv.className = "message-actions";
                msgElem.appendChild(actionsDiv);
              }

              const reExecuteButton = new ReExecuteButton(message);
              actionsDiv.appendChild(reExecuteButton.getElement());
              this.cleanupFns.push(() => reExecuteButton.destroy());
            }
          }
        }
        return msgElem;
      })
    );

    const valid = processed.filter((n): n is HTMLElement => n !== null);
    valid.forEach((elem) => {
      this.chatMessages.appendChild(elem);
    });

    // Syntax highlight if available
    this.chatMessages.querySelectorAll("pre code").forEach((block) => {
      if (window.hljs) {
        window.hljs.highlightElement(block as HTMLElement);
      }
    });

    // Check scroll button visibility after content is rendered
    const scrollEvent = new Event("scroll");
    this.chatMessages.dispatchEvent(scrollEvent);

    // Scroll down
    requestAnimationFrame(() => this.scrollToBottom());
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
    try {
      this.cleanupFns.forEach((fn) => fn());
      this.cleanupFns = [];

      if (this.generateButton) {
        this.generateButton.onclick = null;
      }
      if (this.promptInput) {
        this.promptInput.onkeydown = null;
      }
      if (this.scrollButton) {
        this.scrollButton.onclick = null;
      }
      this.autocomplete?.destroy();
      this.buttonSpinner?.destroy();

      this.initialized = false;
    } catch (error) {
      console.error("Error during Chat cleanup:", error);
    }
  }
}
