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
  private buttonSpinner: ButtonSpinner;
  private promptInput: HTMLTextAreaElement;
  private chatMessages: HTMLElement;
  private button: HTMLButtonElement;
  private workArea: HTMLElement;
  private cleanupFns: Array<() => void> = [];

  constructor(dependencies: ChatDependencies) {
    // 1) WorkArea for the message table & modals
    this.workArea = dependencies.workArea;
    new WorkArea(this.workArea);

    // 2) Get DOM elements
    this.promptInput = document.querySelector(
      ".prompt-input"
    ) as HTMLTextAreaElement;
    this.chatMessages = document.querySelector(".chat-messages") as HTMLElement;

    if (!this.promptInput || !this.chatMessages) {
      throw new Error("Required DOM elements not found");
    }

    // 3) Spinner & send button
    this.buttonSpinner = new ButtonSpinner();
    this.button = this.buttonSpinner.getElement();
    this.button.onclick = this.handleGenerate;
    this.promptInput.onkeydown = this.handleKeyDown;

    // 4) Listen for message changes & re-render
    chatContext.onMessagesChange(this.updateChatUI);

    // 5) Signals-based effects
    //   a) Show spinner if generating
    this.cleanupFns.push(
      effect(() => {
        const isGenerating = store.isGenerating.value;
        this.promptInput.disabled = isGenerating;
        isGenerating ? this.buttonSpinner.show() : this.buttonSpinner.hide();
      })
    );

    //   b) If there's a pending error prompt, fill the input
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

  /**
   * Whenever chatContext changes, re-render the chat window.
   */
  private updateChatUI = (messages: Message[]): void => {
    this.chatMessages.innerHTML = "";

    // Find the last assistant message index for the "read more" logic
    let lastAssistantIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        lastAssistantIdx = i;
        break;
      }
    }

    // Render each message block
    messages.forEach((message, index) => {
      message.content?.forEach((block) => {
        if (block.text) {
          // Normal text
          const chatMsg: ChatMessage = {
            role: message.role || "assistant",
            message: block.text,
            timestamp: new Date(),
          };
          const isLatestAIMessage = index === lastAssistantIdx;
          this.appendMessageToDOM(chatMsg, isLatestAIMessage);
        } else if (block.toolResult) {
          // Tool result (JSON)
          const toolResultJson = JSON.stringify(block.toolResult, null, 2);
          const chatMsg: ChatMessage = {
            role: message.role || "assistant",
            message: `Tool Result:\n${toolResultJson}`,
            timestamp: new Date(),
          };
          this.appendMessageToDOM(chatMsg, false);
        }
        // If there's .toolUse or other block types, handle similarly
      });
    });

    // Scroll to bottom
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  };

  private appendMessageToDOM(message: ChatMessage, isLatestAI: boolean): void {
    const msgElem = document.createElement("div");
    msgElem.className = `chat-message ${message.role}`;

    const contentWrapper = document.createElement("div");
    contentWrapper.className = "message-content-wrapper";

    const formatted = this.formatMessageContent(message.message);

    if (message.message.length > 300) {
      // "Read more" approach
      const preview = document.createElement("div");
      preview.className = "message-preview";
      preview.innerHTML = formatted.slice(0, 300) + "...";

      const full = document.createElement("div");
      full.className = "message-full-content";
      full.innerHTML = formatted;

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
      contentWrapper.innerHTML = formatted;
    }

    msgElem.appendChild(contentWrapper);
    this.chatMessages.appendChild(msgElem);
  }

  private formatMessageContent(content: string): string {
    // Basic formatting + code block highlighting
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
    // Cleanup
    this.cleanupFns.forEach((fn) => fn());
    this.button.onclick = null;
    this.promptInput.onkeydown = null;
    this.buttonSpinner.destroy();
  }
}
