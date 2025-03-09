import { effect, signal } from "@preact/signals-core";
import { converseStore } from "../../stores/ConverseStore/ConverseStore.js";
import { store } from "../../stores/AppStore.js";
import { dataStore } from "../../stores/DataStore/DataStore.js";
import { HybridAutocomplete } from "../AutoComplete/AutoComplete.js";
import { ButtonSpinner } from "../ButtonSpinner/ButtonSpinner.js";

export class ConversationInput {
  private element: HTMLElement;
  private promptInput: HTMLTextAreaElement;
  private generateButton: HTMLButtonElement;
  private uploadBtn: HTMLButtonElement;
  private fileInput: HTMLInputElement;
  private buttonSpinner: ButtonSpinner;
  private autocomplete: HybridAutocomplete | null = null;
  private cleanupFns: Array<() => void> = [];

  // Input value signal
  private inputValue = signal<string>("");

  constructor(container: HTMLElement) {
    this.element = container;
    this.promptInput = this.element.querySelector(
      ".prompt-input"
    ) as HTMLTextAreaElement;
    this.uploadBtn = this.element.querySelector(
      ".data-upload-btn"
    ) as HTMLButtonElement;
    this.fileInput = this.element.querySelector(
      ".file-input"
    ) as HTMLInputElement;

    if (!this.promptInput || !this.uploadBtn || !this.fileInput) {
      throw new Error("Required input elements not found");
    }

    // Initialize button spinner
    this.buttonSpinner = new ButtonSpinner();
    this.generateButton = this.buttonSpinner.getElement();

    // Initialize autocomplete
    this.autocomplete = new HybridAutocomplete(this.promptInput);

    this.initialize();
  }

  private initialize(): void {
    // Set up event listeners
    this.setupPromptListeners();
    this.setupButtonHandlers();
    this.setupEffects();
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
    return this.autocomplete?.hasHighlightedSuggestion() || false;
  }

  private setupButtonHandlers(): void {
    // Generate button handler
    this.generateButton.addEventListener("click", () => this.handleGenerate());

    // Upload button handlers
    this.uploadBtn.addEventListener("click", () => this.fileInput.click());
    this.fileInput.addEventListener("change", async () => {
      const file = this.fileInput.files?.[0];
      if (!file) return;

      try {
        const id = await dataStore.addFromFile(file);
        store.showToast(`Data uploaded: ${file.name}`);
        console.log("Data available with ID:", id);
        this.fileInput.value = "";
      } catch (error: any) {
        store.showToast(`Upload failed: ${error.message}`);
        console.error("Upload failed:", error);
      }
    });

    this.cleanupFns.push(() => {
      this.generateButton.removeEventListener("click", () =>
        this.handleGenerate()
      );
      this.uploadBtn.removeEventListener("click", () => this.fileInput.click());
      this.fileInput.removeEventListener("change", () => {});
    });
  }

  private setupEffects(): void {
    // Watch for pending error prompts
    this.cleanupFns.push(
      effect(() => {
        const pendingPrompt = store.pendingErrorPrompt.value;
        if (pendingPrompt) {
          this.handleErrorPrompt(pendingPrompt);
        }
      })
    );

    // Watch the isGenerating state to update UI
    this.cleanupFns.push(
      effect(() => {
        const generating = store.isGenerating.value;
        if (generating) {
          // Only disable the generate button, not the input field
          this.generateButton.disabled = true;
          this.buttonSpinner.show();
        } else {
          this.generateButton.disabled = false;
          this.buttonSpinner.hide();
        }
      })
    );

    // Update button state based on input value
    this.cleanupFns.push(
      effect(() => {
        const inputValue = this.inputValue.value;
        this.generateButton.disabled =
          inputValue.trim() === "" || store.isGenerating.value;
      })
    );

    // Handle autocomplete suggestions
    this.cleanupFns.push(
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
    const parts = trimmed.split(/\\s+/);
    return parts[parts.length - 1]?.toLowerCase() ?? "";
  }

  private getSuggestions(word: string): string[] {
    const expansions = this.autocomplete?.expansionsMap ?? {};
    const commands = Object.keys(expansions);
    return commands.includes(word)
      ? expansions[word]
      : commands.filter((cmd) => cmd.startsWith(word));
  }

  private handleGenerate(): void {
    // Only check isGenerating for the submission, not the input
    if (store.isGenerating.value) {
      // Allow collecting input for next message, but don't send yet
      store.showToast("Please wait for the current response to complete");
      return;
    }

    const prompt = this.inputValue.value.trim();
    if (!prompt) {
      store.showToast("Please type something before sending");
      return;
    }

    // Add user's message to the store
    converseStore.addMessage({
      role: "user",
      content: [{ text: prompt }],
    });

    // Clear input
    this.inputValue.value = "";
    this.promptInput.value = "";
  }

  private handleErrorPrompt(prompt: string): void {
    this.inputValue.value = prompt;
    this.promptInput.value = prompt;
    store.clearPendingErrorPrompt();
  }

  public destroy(): void {
    // Clean up autocomplete and button spinner
    this.autocomplete?.destroy();
    this.buttonSpinner?.destroy();

    // Run cleanup functions for event listeners and effects
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }
}
