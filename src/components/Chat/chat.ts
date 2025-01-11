import { Message } from "@aws-sdk/client-bedrock-runtime";
import { chatContext } from "../../chat-context";
import { ButtonSpinner } from "../ButtonSpinner/ButtonSpinner";
import { designAssistantInstance } from "../../design-assistant-bot";
import { CodeEditorComponent } from "../CodeEditor/CodeEditorComponent";
import { CsvUploader } from "../CsvUploader";
import { store } from "../../stores/AppStore";
import { effect } from "@preact/signals-core";

interface ChatMessage {
  role: "user" | "assistant";
  message: string;
  timestamp: Date;
}

interface ChatDependencies {
  codeEditor: CodeEditorComponent;
  csvUploader: CsvUploader;
}

export class Chat {
  private buttonSpinner: ButtonSpinner;
  private promptInput: HTMLTextAreaElement;
  private chatMessages: HTMLElement;
  private button: HTMLButtonElement;
  private cleanupFns: Array<() => void> = [];

  constructor(dependencies: ChatDependencies) {
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
    await this.generateCodeWithRetry();
  }

  private handleGenerate = (e: MouseEvent): void => {
    e.preventDefault();
    if (!store.isGenerating.value) {
      this.generateCodeWithRetry();
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.handleGenerate(new MouseEvent("click"));
    }
  };

  private async generateCodeWithRetry(retries = 1): Promise<void> {
    const prompt = this.promptInput?.value.trim();
    if (!prompt || store.isGenerating.value) return;

    const data = store.getData();
    if (data) {
      chatContext.addUserMessage(this.getDataStructureDescription());
    }

    chatContext.addUserMessage(prompt);
    store.setGenerating(true);
    store.setError(null);

    try {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const messages = chatContext.getTruncatedHistory();
          const response = await designAssistantInstance.generateWebDesign(
            messages
          );
          const { html, css, javascript, description } = response;

          if (html || css || javascript) {
            chatContext.addAssistantMessage(
              JSON.stringify({ html, css, javascript }),
              description
            );

            store.setAllCode({ html, css, javascript });
            this.promptInput.value = "";
            store.showToast("Design generated successfully ✨");
            break;
          }
        } catch (error: any) {
          if (attempt === retries) throw error;
          const errorMessage = `Attempt ${attempt + 1} failed: ${
            error.message
          }. Retrying...`;
          chatContext.addAssistantMessage(errorMessage, "Error");
          store.showToast(`Retrying attempt ${attempt + 1} of ${retries} ⏳`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } catch (error: any) {
      store.setError(error.message);
      chatContext.addAssistantMessage(
        `Error generating design: ${error.message}`,
        "Error"
      );
      store.showToast("Error generating design ❌");
    } finally {
      store.setGenerating(false);
    }
  }

  private getDataStructureDescription(): string {
    const data = store.getData();
    if (!data?.length) return "";

    const sampleData = data[0];
    const structure = Object.entries(sampleData)
      .map(([key, value]) => `${key}: ${typeof value}`)
      .join(", ");

    return `\nAvailable data structure: { ${structure} }.\nData has ${data.length} records.`;
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
        const description = message.content?.[1]?.text;
        if (description) {
          this.appendMessageToDOM({
            role: message.role || "assistant",
            message: description,
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
