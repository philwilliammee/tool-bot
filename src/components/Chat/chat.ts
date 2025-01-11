import { Message } from "@aws-sdk/client-bedrock-runtime";
import { chatContext } from "../../chat-context";
import { ButtonSpinner } from "../ButtonSpinner/ButtonSpinner";
import { chatBot } from "../../chat-bot";
import { store } from "../../stores/AppStore";
import { effect } from "@preact/signals-core";
import { WorkArea } from "../WorkArea/WorkArea";

interface ChatMessage {
  role: "user" | "assistant";
  message: string;
  timestamp: Date;
}

interface ChatDependencies {
  workArea: HTMLElement;
}

export class Chat {
  private buttonSpinner: ButtonSpinner;
  private promptInput: HTMLTextAreaElement;
  private chatMessages: HTMLElement;
  private button: HTMLButtonElement;
  private workArea: HTMLElement;
  private cleanupFns: Array<() => void> = [];

  constructor(dependencies: ChatDependencies) {
    // Store work area reference
    this.workArea = dependencies.workArea;
    new WorkArea(this.workArea);

    // Initialize DOM elements
    this.promptInput = document.querySelector(
      ".prompt-input"
    ) as HTMLTextAreaElement;
    this.chatMessages = document.querySelector(".chat-messages") as HTMLElement;

    if (!this.promptInput || !this.chatMessages) {
      throw new Error("Required DOM elements not found");
    }

    // Setup spinner and button
    this.buttonSpinner = new ButtonSpinner();
    this.button = this.buttonSpinner.getElement();
    this.button.onclick = this.handleGenerate;
    this.promptInput.onkeydown = this.handleKeyDown;

    // Initialize styles and listeners
    chatContext.onMessagesChange(this.updateChatUI);

    // Setup loading state effect
    this.cleanupFns.push(
      effect(() => {
        const isGenerating = store.isGenerating.value;
        this.promptInput.disabled = isGenerating;
        isGenerating ? this.buttonSpinner.show() : this.buttonSpinner.hide();
      })
    );

    // Setup error prompt handling
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
    await this.generateResponse();
  }

  private handleGenerate = (e: MouseEvent): void => {
    e.preventDefault();
    if (!store.isGenerating.value) {
      this.generateResponse();
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.handleGenerate(new MouseEvent("click"));
    }
  };

  private async generateResponse(retries = 1): Promise<void> {
    const prompt = this.promptInput?.value.trim();
    if (!prompt || store.isGenerating.value) return;

    chatContext.addUserMessage(prompt);
    store.setGenerating(true);
    store.setError(null);

    try {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const messages = chatContext.getTruncatedHistory();
          const response = await chatBot.generateResponse(messages);

          chatContext.addAssistantMessage(response);
          this.promptInput.value = "";
          store.showToast("Response generated successfully ✨");
          break;
        } catch (error: any) {
          if (attempt === retries) throw error;
          const errorMessage = `Attempt ${attempt + 1} failed: ${
            error.message
          }. Retrying...`;
          chatContext.addAssistantMessage(errorMessage);
          store.showToast(`Retrying attempt ${attempt + 1} of ${retries} ⏳`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } catch (error: any) {
      store.setError(error.message);
      chatContext.addAssistantMessage(
        `Error generating response: ${error.message}`
      );
      store.showToast("Error generating response ❌");
    } finally {
      store.setGenerating(false);
    }
  }

  private updateChatUI = (messages: Message[]): void => {
    this.chatMessages.innerHTML = "";
    messages.forEach((message) => {
      if (message.role === "user") {
        message.content?.forEach((content) => {
          this.appendMessageToDOM({
            role: message.role || "user",
            message: content.text || "",
            timestamp: new Date(),
          });
        });
      } else {
        const content = message.content?.[0]?.text;
        if (content) {
          this.appendMessageToDOM({
            role: message.role || "assistant",
            message: content,
            timestamp: new Date(),
          });
        }
      }
    });
  };

  private appendMessageToDOM(message: ChatMessage): void {
    const messageElement = document.createElement("div");
    messageElement.className = `chat-message ${message.role}`;
    messageElement.textContent = message.message;
    this.chatMessages.appendChild(messageElement);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  public destroy(): void {
    // Clean up all effects
    this.cleanupFns.forEach((cleanup) => cleanup());

    // Remove event listeners
    this.button.onclick = null;
    this.promptInput.onkeydown = null;

    // Clean up components
    this.buttonSpinner.destroy();
  }
}
