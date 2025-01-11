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
    let lastAssistantMessageIndex = -1;

    // Find the index of the last assistant message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        lastAssistantMessageIndex = i;
        break;
      }
    }

    messages.forEach((message, index) => {
      if (message.role === "user") {
        message.content?.forEach((content) => {
          this.appendMessageToDOM(
            {
              role: message.role || "user",
              message: content.text || "",
              timestamp: new Date(),
            },
            index === lastAssistantMessageIndex
          );
        });
      } else {
        const content = message.content?.[0]?.text;
        if (content) {
          this.appendMessageToDOM(
            {
              role: message.role || "assistant",
              message: content,
              timestamp: new Date(),
            },
            index === lastAssistantMessageIndex
          );
        }
      }
    });
  };

  private appendMessageToDOM(
    message: ChatMessage,
    isLatestAIMessage: boolean
  ): void {
    const messageElement = document.createElement("div");
    messageElement.className = `chat-message ${message.role}`;

    const contentWrapper = document.createElement("div");
    contentWrapper.className = "message-content-wrapper";

    const formattedContent = this.formatMessageContent(message.message);

    if (message.message.length > 300) {
      const previewContent = document.createElement("div");
      previewContent.className = "message-preview";
      previewContent.innerHTML = formattedContent.slice(0, 300) + "...";

      const fullContent = document.createElement("div");
      fullContent.className = "message-full-content";
      fullContent.innerHTML = formattedContent;

      const toggleButton = document.createElement("button");
      toggleButton.className = "read-more-btn";
      toggleButton.textContent = "Show less";
      toggleButton.onclick = () => {
        fullContent.classList.toggle("hidden");
        previewContent.classList.toggle("hidden");
        toggleButton.textContent = fullContent.classList.contains("hidden")
          ? "Read more"
          : "Show less";
      };

      // Set initial state based on whether this is the latest AI message
      if (!isLatestAIMessage) {
        fullContent.classList.add("hidden");
        previewContent.classList.remove("hidden");
        toggleButton.textContent = "Read more";
      } else {
        fullContent.classList.remove("hidden");
        previewContent.classList.add("hidden");
      }

      contentWrapper.appendChild(previewContent);
      contentWrapper.appendChild(fullContent);
      contentWrapper.appendChild(toggleButton);
    } else {
      contentWrapper.innerHTML = formattedContent;
    }

    messageElement.appendChild(contentWrapper);
    this.chatMessages.appendChild(messageElement);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  private formatMessageContent(content: string): string {
    return content
      .replace(/\n/g, "<br>")
      .replace(
        /```([\s\S]*?)```/g,
        (_, code) => `
      <pre class="code-block"><code>${code.trim()}</code></pre>
    `
      )
      .replace(/`([^`]+)`/g, "<code>$1</code>");
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
