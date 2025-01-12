import { ConverseResponse, Message } from "@aws-sdk/client-bedrock-runtime";
import { ButtonSpinner } from "../ButtonSpinner/ButtonSpinner";
import { store } from "../../stores/AppStore";
import { effect } from "@preact/signals-core";
import { WorkArea } from "../WorkArea/WorkArea";
import { postBedrock } from "../../apiClient";
import { chatContext } from "./chat-context";

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant with tools.`;
const DEFAULT_MODEL_ID = import.meta.env.VITE_BEDROCK_MODEL_ID || "my-model-id";

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

  // Model & system prompt
  private modelId: string = DEFAULT_MODEL_ID;
  private systemPrompt: string = DEFAULT_SYSTEM_PROMPT;

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

    // 3) Spinner & generate button
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

    //   b) If there's a pending error prompt
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
    // await this.generateResponse();
  }

  private handleGenerate = (e: MouseEvent): void => {
    e.preventDefault();
    if (store.isGenerating.value) return; // skip if generating

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

    // 3) Clear input and call generate
    this.promptInput.value = "";
    // this.generateResponse().catch((err) => {
    //   console.error("Error generating response:", err);
    // });
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.handleGenerate(new MouseEvent("click"));
    }
  };

  /**
   * Because `chatContext` also calls the LLM automatically
   * when a user message is added (in the updated chatContext),
   * we might not even need generateResponse() if you want
   * fully automated flow. However, here it remains in case you
   * still want a manual call.
   */
  // public async generateResponse(): Promise<string> {
  //   try {
  //     store.setGenerating(true);

  //     // 1) Pull messages from chatContext
  //     const messages = chatContext.getMessages();

  //     // 2) Call bedrock
  //     const response: ConverseResponse = await postBedrock(
  //       this.modelId,
  //       messages,
  //       this.systemPrompt
  //     );

  //     // 3) Check content
  //     const messageContent = response.output?.message?.content;
  //     if (!messageContent || messageContent.length === 0) {
  //       throw new Error("No content in response");
  //     }

  //     const textContent = messageContent.find((b) => b.text)?.text;
  //     if (!textContent) {
  //       throw new Error("No text content found in response");
  //     }

  //     // 4) Add the assistant’s message so the UI sees it
  //     // If .toolUse is present, chatContext will handle it
  //     chatContext.addMessage({
  //       role: "assistant",
  //       content: messageContent,
  //     });

  //     return textContent;
  //   } catch (error) {
  //     console.error("Response generation failed:", error);
  //     throw error;
  //   } finally {
  //     store.setGenerating(false);
  //   }
  // }

  /**
   * Whenever chatContext changes, re-render the chat window.
   */
  private updateChatUI = (messages: Message[]): void => {
    this.chatMessages.innerHTML = "";

    let lastAssistantIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        lastAssistantIdx = i;
        break;
      }
    }

    // Render each block
    messages.forEach((message, index) => {
      message.content?.forEach((block) => {
        if (block.text) {
          // Normal text
          const chatMsg: ChatMessage = {
            role: message.role || "assistant",
            message: block.text,
            timestamp: new Date(),
          };
          this.appendMessageToDOM(chatMsg, index === lastAssistantIdx);
        } else if (block.toolResult) {
          // If there's a toolResult
          const toolResultJson = JSON.stringify(block.toolResult, null, 2);
          const chatMsg: ChatMessage = {
            role: message.role || "assistant",
            message: `Tool Result:\n${toolResultJson}`,
            timestamp: new Date(),
          };
          this.appendMessageToDOM(chatMsg, false);
        }
        // If there's a toolUse or something else, handle similarly
      });
    });

    // Scroll to the bottom
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
      // short content
      contentWrapper.innerHTML = formatted;
    }

    msgElem.appendChild(contentWrapper);
    this.chatMessages.appendChild(msgElem);
  }

  private formatMessageContent(content: string): string {
    // Simple formatting
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
