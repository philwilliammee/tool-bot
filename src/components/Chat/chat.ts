import {
  ConverseResponse,
  Message,
  ToolResultBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { chatContext } from "../../chat-context";
import { ButtonSpinner } from "../ButtonSpinner/ButtonSpinner";
import { store } from "../../stores/AppStore";
import { effect } from "@preact/signals-core";
import { WorkArea } from "../WorkArea/WorkArea";
import { postBedrock } from "../../apiClient";
import { ToolUse } from "../../types/tool.types";

/**
 * Optional: You might configure these in your .env or somewhere else.
 * For example, if you have VITE_BEDROCK_MODEL_ID / systemPrompt somewhere:
 */
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

  // You can inject or hardcode these. Shown here as properties:
  private modelId: string = DEFAULT_MODEL_ID;
  private systemPrompt: string = DEFAULT_SYSTEM_PROMPT;

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

    // Listen for message changes in the context
    chatContext.onMessagesChange(this.updateChatUI);

    // Loading state effect
    this.cleanupFns.push(
      effect(() => {
        const isGenerating = store.isGenerating.value;
        this.promptInput.disabled = isGenerating;
        isGenerating ? this.buttonSpinner.show() : this.buttonSpinner.hide();
      })
    );

    // Error prompt handling
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

    // If we’re already generating, skip
    if (store.isGenerating.value) return;

    // 1) Get the typed text
    const prompt = this.promptInput.value.trim();
    if (!prompt) {
      // Optionally show a toast or just return
      store.showToast("Please type something before sending");
      return;
    }

    // 2) Add user message to chatContext
    chatContext.addMessage({
      role: "user",
      content: [{ text: prompt }],
    });

    // Clear the textbox now or after the LLM response
    this.promptInput.value = "";

    // 3) Call generateResponse
    this.generateResponse().catch((err) => {
      console.error("Error generating response:", err);
    });
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.handleGenerate(new MouseEvent("click"));
    }
  };

  /**
   * Main method to generate a response from the bedrock model.
   * If the response requires a tool, we use `executeToolRequest()`
   * and store the result in chatContext, then recurse.
   */
  public async generateResponse(): Promise<string> {
    try {
      store.setGenerating(true);

      // 1) Pull messages from chatContext
      const messages = chatContext.getMessages();

      // 2) Call Bedrock
      const response: ConverseResponse = await postBedrock(
        this.modelId,
        messages,
        this.systemPrompt
      );

      // 3) Check for tool use
      if (response.stopReason === "tool_use") {
        const message = response.output?.message;
        const toolUse = message?.content?.find((c) => c.toolUse)?.toolUse;

        if (message && toolUse) {
          chatContext.addMessage(message);
          try {
            const toolResult: ToolResultBlock = await this.executeToolRequest(
              toolUse as ToolUse
            );

            // Build toolResult block
            const toolResultContent: ToolResultBlock = {
              toolUseId: toolUse.toolUseId,
              content: [{ text: JSON.stringify(toolResult) }],
              status: "success",
            };

            // Add new user message with toolResult
            chatContext.addMessage({
              role: "user",
              content: [{ toolResult: toolResultContent }],
            });

            // Recurse
            return this.generateResponse();
          } catch (error: any) {
            chatContext.addMessage({
              role: "user",
              content: [{ text: `Tool execution failed: ${error.message}` }],
            });
            throw error;
          }
        }
      }

      // 4) If no tool usage, just parse text
      const messageContent = response.output?.message?.content;
      if (!messageContent || messageContent.length === 0) {
        throw new Error("No content in response");
      }

      const textContent = messageContent.find((block) => block.text)?.text;
      if (!textContent) {
        throw new Error("No text content found in response");
      }

      // 5) Add the assistant’s message to chat context so the UI sees it
      chatContext.addMessage({
        role: "assistant",
        content: messageContent, // the entire array of content blocks
      });

      return textContent;
    } catch (error) {
      console.error("Response generation failed:", error);
      throw error;
    } finally {
      store.setGenerating(false);
    }
  }

  /**
   * Example method that looks up the correct tool
   * and calls it. You may have a "clientTools" array
   * or a router. Here, we just show a placeholder:
   */
  private async executeToolRequest(toolUse: ToolUse): Promise<ToolResultBlock> {
    // For example, you might have:
    // const tool = clientTools.find((t) => t.name === toolUse.name);
    // if (!tool) throw new Error("Tool not found");
    // const result = await tool.execute(toolUse.input);

    // Here is a dummy response just as an example
    return {
      toolUseId: toolUse.toolUseId,
      content: [
        {
          text: `Dummy result from tool [${
            toolUse.name
          }] with input: ${JSON.stringify(toolUse.input)}`,
        },
      ],
      status: "success",
    };
  }

  /**
   * Renders the chat messages to the UI whenever chatContext updates.
   */
  private updateChatUI = (messages: Message[]): void => {
    this.chatMessages.innerHTML = "";
    let lastAssistantMessageIndex = -1;

    // Find the last assistant message index
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        lastAssistantMessageIndex = i;
        break;
      }
    }

    // Render each message
    messages.forEach((message, index) => {
      // Each message can have multiple content blocks
      // We'll render each piece of text separately
      message.content?.forEach((block) => {
        // If block.text exists, treat it as regular text
        if (block.text) {
          const role = message.role || "assistant";
          const chatMsg: ChatMessage = {
            role,
            message: block.text,
            timestamp: new Date(),
          };
          const isLatestAIMessage = index === lastAssistantMessageIndex;
          this.appendMessageToDOM(chatMsg, isLatestAIMessage);
        } else if (block.toolResult) {
          // If there's a toolResult block, you can display it differently if desired
          // We'll just show JSON for now:
          const role = message.role || "assistant";
          const toolResultString = JSON.stringify(block.toolResult, null, 2);
          const chatMsg: ChatMessage = {
            role,
            message: `Tool Result:\n${toolResultString}`,
            timestamp: new Date(),
          };
          this.appendMessageToDOM(chatMsg, false);
        }
        // If there's a .toolUse or other property, handle it similarly
      });
    });

    // Ensure we scroll to the bottom
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
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

    // If content > 300 chars, we do "read more"
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

      // If not the latest AI message, default to preview
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
      // If short content, just display
      contentWrapper.innerHTML = formattedContent;
    }

    messageElement.appendChild(contentWrapper);
    this.chatMessages.appendChild(messageElement);
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
    // Clean up all effects
    this.cleanupFns.forEach((cleanup) => cleanup());

    // Remove event listeners
    this.button.onclick = null;
    this.promptInput.onkeydown = null;

    // Clean up components
    this.buttonSpinner.destroy();
  }
}
