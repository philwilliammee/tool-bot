import { HybridAutocomplete } from "./../AutoComplete/AutoComplete.js";
import { ButtonSpinner } from "../ButtonSpinner/ButtonSpinner.js";
import { store } from "../../stores/AppStore.js";
import { effect, signal } from "@preact/signals-core";
import { WorkArea } from "../WorkArea/WorkArea.js";
import { converseStore } from "../../stores/ConverseStore/ConverseStore.js";
import { MessageExtended } from "../../app.types";
import { dataStore } from "../../stores/DataStore/DataStore.js";
import { ChatMessage } from "./ChatMessage.js";

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
  private autocomplete: HybridAutocomplete | null = null;
  private inputValue = signal("");

  // We removed currentUpdateId and lastMessages
  private messageComponents = new Map<string, ChatMessage>();
  private debouncedRender: () => void;

  constructor(dependencies: ChatDependencies) {
    this.workArea = dependencies.workArea;
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
    console.log("Chat component initialized");
    try {
      new WorkArea(this.workArea);
      this.initializeDOMElements();
      this.initializeButtonSpinner();
      this.setupPromptActions();
      // Kick off initial render
      this.debouncedRender();
      this.setupPromptListeners();
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

    this.autocomplete = new HybridAutocomplete(this.promptInput);
  }

  private setupPromptListeners(): void {
    const onInput = () => {
      this.inputValue.value = this.promptInput.value;
    };

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
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleGenerate();
      }
    };

    this.promptInput.addEventListener("input", onInput);
    this.promptInput.addEventListener("keydown", onKeyDown);
    this.cleanupFns.push(() => {
      this.promptInput.removeEventListener("input", onInput);
      this.promptInput.removeEventListener("keydown", onKeyDown);
    });
  }

  private hasHighlightedSuggestion(): boolean {
    return true; // Simplified for now
  }

  private setupEventListeners(): void {
    // When user clicks generate
    this.generateButton.onclick = () => this.handleGenerate();

    // When messages change in the store, re-render
    const cleanupMessagesChange = converseStore.onMessagesChange(() => {
      this.debouncedRender();
    });
    this.cleanupFns.push(cleanupMessagesChange);
  }

  private setupEffects(): void {
    this.cleanupFns.push(
      effect(() => {
        const isGenerating = store.isGenerating.value;
        this.promptInput.disabled = isGenerating;
        isGenerating ? this.buttonSpinner.show() : this.buttonSpinner.hide();
      }),
      effect(() => {
        const errorPrompt = store.pendingErrorPrompt.value;
        if (errorPrompt) {
          this.handleErrorPrompt(errorPrompt);
        }
      }),
      effect(() => {
        if (!this.autocomplete) return;
        const text = this.inputValue.value;
        const lastWord = this.getLastWord(text);
        if (lastWord.length >= 2) {
          const suggestions = this.getSuggestions(lastWord);
          suggestions.length
            ? this.autocomplete.showSuggestions(suggestions)
            : this.autocomplete.hideSuggestions();
        } else {
          this.autocomplete.hideSuggestions();
        }
      })
    );
  }

  private getLastWord(text: string): string {
    const trimmed = text.trimEnd();
    if (!trimmed) return "";
    const parts = trimmed.split(/\s+/);
    return parts[parts.length - 1]?.toLowerCase() ?? "";
  }

  private getSuggestions(word: string): string[] {
    const expansions = this.autocomplete?.expansionsMap ?? {};
    const commands = Object.keys(expansions);
    return commands.includes(word)
      ? expansions[word]
      : commands.filter((cmd) => cmd.startsWith(word));
  }

  /**
   * Main render method: re-renders the chat messages based on the store data.
   */
  private async render(): Promise<void> {
    console.log("Rendering Chat component");

    // Grab fresh messages from the store, sorted by timestamp
    const messages = converseStore.getMessages();

    // If there are no messages, clear everything
    if (!messages.length) {
      this.messageComponents.forEach((component) => component.destroy());
      this.messageComponents.clear();
      this.chatMessages.innerHTML = "";
      return;
    }

    const sortedMessages = [...messages].sort(
      (a, b) => a.metadata.createdAt - b.metadata.createdAt
    );

    const lastAssistant = this.findLastAssistant(sortedMessages);

    // We'll track which components are still in use
    const currentComponents = new Map<string, ChatMessage>();

    for (const message of sortedMessages) {
      let component = this.messageComponents.get(message.id);

      if (!component) {
        // Create a new component if we don't have one for this ID
        component = new ChatMessage(message, message.id === lastAssistant?.id);
        const element = await component.render();
        if (element) {
          // Append to .chat-messages container
          this.chatMessages.appendChild(element);
        }
        this.messageComponents.set(message.id, component);
      } else {
        // Update existing component with new data (partial or final)
        await component.update(message);
      }

      currentComponents.set(message.id, component);
    }

    // Cleanup any old components that no longer exist in the store
    this.messageComponents.forEach((component, id) => {
      if (!currentComponents.has(id)) {
        component.destroy();
        this.messageComponents.delete(id);
      }
    });

    // After we finish adding/updating messages, scroll to bottom
    requestAnimationFrame(() => {
      this.scrollToBottom();
    });
  }

  private scrollToBottom(): void {
    // A simple approach to always scroll to bottom
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
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

  private handleGenerate(): void {
    if (store.isGenerating.value) return;

    const prompt = this.inputValue.value.trim();
    if (!prompt) {
      store.showToast("Please type something before sending");
      return;
    }

    // Add user's message to the store, triggers streaming, etc.
    converseStore.addMessage({
      role: "user",
      content: [{ text: prompt }],
    });

    // Clear input
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
          fileInput.value = "";
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

  /**
   * Cleans up event listeners, message components, etc.
   */
  public destroy(): void {
    try {
      this.cleanupFns.forEach((fn) => fn());
      this.cleanupFns = [];

      this.messageComponents.forEach((component) => component.destroy());
      this.messageComponents.clear();

      this.autocomplete?.destroy();
      this.buttonSpinner?.destroy();
    } catch (error) {
      console.error("Error during Chat cleanup:", error);
    }
  }
}
