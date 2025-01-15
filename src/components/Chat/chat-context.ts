// chatContext.ts
import {
  Message,
  ToolResultBlock,
  ConverseResponse,
} from "@aws-sdk/client-bedrock-runtime";
import { mathTool } from "../../tools/math/math.tool";
import { ToolUse } from "../../types/tool.types";
import { fetchTool } from "../../tools/fetch/fetch.tool";
import { postBedrock } from "../../apiClient"; // so we can call bedrock here
import { store } from "../../stores/AppStore"; // for isGenerating and error handling?
import { htmlTool } from "../../tools/htmlTool/htmlTool";

const STORAGE_KEY = "chat-messages";

export class ChatContext {
  private messages: Message[] = [];
  private messageChangeCallbacks: Array<(msgs: Message[]) => void> = [];

  // (Optional) A system prompt or model ID, if needed:
  private modelId: string =
    import.meta.env.VITE_BEDROCK_MODEL_ID || "my-model-id";
  private systemPrompt: string = "You are a helpful assistant with tools.";

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Single method: addMessage
   * - Merges content if same role as the last message
   * - Checks if new message is an assistant toolUse request
   * - Checks if new message is from user => call LLM automatically
   */
  public addMessage(newMessage: Message): void {
    // 1) Merge if same role
    const lastIndex = this.messages.length - 1;
    const lastMessage = this.messages[lastIndex];
    if (lastMessage && lastMessage.role === newMessage.role) {
      const updatedContent = [
        ...(lastMessage.content || []),
        ...(newMessage.content || []),
      ];
      this.messages[lastIndex] = { ...lastMessage, content: updatedContent };
    } else {
      this.messages.push(newMessage);
    }

    this.notifyMessageChange();

    // 2) If it's an assistant message, check for toolUse
    if (newMessage.role === "assistant") {
      const toolUseBlock = newMessage.content?.find((b) => b.toolUse)
        ?.toolUse as ToolUse;
      if (toolUseBlock) {
        // We found an immediate request to use a tool.
        this.handleToolUse(toolUseBlock).catch((err) => {
          console.error("Tool use failed:", err);
          // Insert an error message for the user
          this.addMessage({
            role: "user",
            content: [{ text: `Tool execution failed: ${err.message}` }],
          });
        });
      }
    }

    // 3) If it's a user message, call LLM automatically
    if (newMessage.role === "user") {
      // If we’re already generating, or if there's no text, skip
      if (!store.isGenerating.value) {
        this.callBedrockLLM().catch((err) => {
          console.error("Error calling Bedrock in chatContext:", err);
          store.setError(err.message);
        });
      }
    }
  }

  /**
   * This calls the Bedrock LLM with the current messages.
   * On success, we add the assistant's message to chatContext.
   */
  private async callBedrockLLM(): Promise<void> {
    try {
      store.setGenerating(true);

      const response: ConverseResponse = await postBedrock(
        this.modelId,
        this.messages,
        this.systemPrompt
      );

      const messageContent = response.output?.message?.content;
      if (!messageContent || messageContent.length === 0) {
        throw new Error("No content in LLM response");
      }
      this.addMessage({
        role: "assistant",
        content: messageContent,
      });
    } catch (error: any) {
      console.error("callBedrockLLM error:", error);
      throw error;
    } finally {
      store.setGenerating(false);
    }
  }

  /**
   * Finds and executes the requested tool, then appends the toolResult
   * as a new "user" message.
   */
  // @TODO: use tool registry instead of switch.
  private async handleToolUse(toolUse: ToolUse): Promise<void> {
    let result: any;
    switch (toolUse.name) {
      case "fetch_url":
        result = await fetchTool.execute(toolUse.input);
        break;
      case "math":
        result = await mathTool.execute(toolUse.input);
        break;
      case "html":
        result = await htmlTool.execute(toolUse.input);
        break;
      default:
        throw new Error(`Unknown tool requested: ${toolUse.name}`);
    }

    const toolResultContent: ToolResultBlock = {
      toolUseId: toolUse.toolUseId,
      content: [{ text: JSON.stringify(result) }],
      status: "success",
    };

    // Insert as a new "user" message
    this.addMessage({
      role: "user",
      content: [{ toolResult: toolResultContent }],
    });
  }

  // Editing, Deleting, Reordering, etc.
  public updateMessage(index: number, newContent: string): void {
    if (!this.messages[index]) return;
    this.messages[index].content = [{ text: newContent }];
    this.notifyMessageChange();
  }

  public deleteMessage(index: number): void {
    this.messages.splice(index, 1);
    this.notifyMessageChange();
  }

  public deleteAllMessages(): void {
    this.messages = [];
    this.notifyMessageChange();
    localStorage.removeItem(STORAGE_KEY);
  }

  public reorderMessages(fromIndex: number, toIndex: number): void {
    const temp = [...this.messages];
    const [removed] = temp.splice(fromIndex, 1);
    temp.splice(toIndex, 0, removed);
    this.messages = temp;
    this.notifyMessageChange();
  }

  public getMessages(): Message[] {
    return this.messages;
  }

  // Subscribe for UI updates
  public onMessagesChange(callback: (msgs: Message[]) => void): () => void {
    this.messageChangeCallbacks.push(callback);
    // Return cleanup function
    return () => {
      this.messageChangeCallbacks = this.messageChangeCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  private notifyMessageChange(): void {
    this.messageChangeCallbacks.forEach((cb) => cb(this.messages));
    this.saveToStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.messages = JSON.parse(stored);
        this.notifyMessageChange();
      }
    } catch (error) {
      console.error("Error loading messages from storage:", error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.messages));
    } catch (error) {
      console.error("Error saving messages to storage:", error);
    }
  }
}

export const chatContext = new ChatContext();
