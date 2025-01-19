import { clientRegistry } from "./../../../tools/client/registry";
import {
  Message,
  ToolResultBlock,
  ConverseResponse,
} from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended, ToolUse } from "../../types/tool.types";
import { postBedrock } from "../../apiClient";
import { store } from "../../stores/AppStore";
import {
  extendMessages,
  updateMessageRating,
  updateMessageTags,
} from "../../utils/messageUtils";

const STORAGE_KEY = "chat-messages";
const DEFAULT_THRESHOLD = 6;

export class ChatContext {
  private messages: MessageExtended[] = [];
  private messageChangeCallbacks: Array<(msgs: MessageExtended[]) => void> = [];
  private threshold: number = DEFAULT_THRESHOLD;

  private modelId: string =
    import.meta.env.VITE_BEDROCK_MODEL_ID || "my-model-id";
  private systemPrompt: string = "You are a helpful assistant with tools.";

  constructor(threshold?: number) {
    if (threshold) this.threshold = threshold;
    this.loadFromStorage();
  }

  public setThreshold(threshold: number): void {
    this.threshold = threshold;
    this.updateMessageMetadata();
  }

  private updateMessageMetadata(): void {
    this.messages = extendMessages(this.messages, this.threshold);
    this.notifyMessageChange();
  }

  public addMessage(newMessage: Message): void {
    const lastIndex = this.messages.length - 1;
    const lastMessage = this.messages[lastIndex];

    if (lastMessage && lastMessage.role === newMessage.role) {
      const updatedContent = [
        ...(lastMessage.content || []),
        ...(newMessage.content || []),
      ];
      this.messages[lastIndex] = {
        ...lastMessage,
        content: updatedContent,
        metadata: {
          ...lastMessage.metadata,
          ...(newMessage as MessageExtended).metadata,
        },
      };
    } else {
      const extendedMessage = extendMessages([newMessage], this.threshold)[0];
      this.messages.push(extendedMessage);
    }

    this.updateMessageMetadata();

    if (newMessage.role === "assistant") {
      const toolUseBlock = newMessage.content?.find((b) => b.toolUse)
        ?.toolUse as ToolUse;
      if (toolUseBlock) {
        this.handleToolUse(toolUseBlock).catch((err) => {
          console.error("Tool use failed:", err);
          this.addMessage({
            role: "user",
            content: [{ text: `Tool execution failed: ${err.message}` }],
          });
        });
      }
    }

    if (newMessage.role === "user" && !store.isGenerating.value) {
      this.callBedrockLLM().catch((err) => {
        console.error("Error calling Bedrock in chatContext:", err);
        store.setError(err.message);
      });
    }
  }

  private async callBedrockLLM(): Promise<void> {
    try {
      store.setGenerating(true);

      // Only send enabled messages to the API
      const activeMessages = this.messages.filter(
        (msg) => !msg.metadata?.isArchived
      );

      const response: ConverseResponse = await postBedrock(
        this.modelId,
        activeMessages,
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

  private async handleToolUse(toolUse: ToolUse): Promise<void> {
    const tool = clientRegistry.getTool(toolUse.name);
    if (!tool) {
      throw new Error(`Unknown tool requested: ${toolUse.name}`);
    }

    try {
      const result = await tool.execute(toolUse.input);

      const toolResultContent: ToolResultBlock = {
        toolUseId: toolUse.toolUseId,
        content: [{ text: JSON.stringify(result) }],
        status: "success",
      };

      this.addMessage({
        role: "user",
        content: [{ toolResult: toolResultContent }],
      });
    } catch (error: any) {
      console.error("Tool execution failed:", error);
      this.addMessage({
        role: "user",
        content: [{ text: `Tool execution failed: ${error.message}` }],
      });
    }
  }

  public updateMessage(
    index: number,
    update: string | Partial<MessageExtended>
  ): void {
    if (!this.messages[index]) return;

    if (typeof update === "string") {
      // Handle legacy string updates (plain text content)
      this.messages[index].content = [{ text: update }];
    } else {
      // Handle metadata updates while preserving existing message structure
      this.messages[index] = {
        ...this.messages[index],
        ...update,
        metadata: {
          ...this.messages[index].metadata,
          ...update.metadata,
        },
      };
    }

    this.notifyMessageChange();
  }

  public updateMessageRating(index: number, rating: number): void {
    const message = this.messages[index];
    if (!message) return;

    const updatedMessage = updateMessageRating(message, rating);
    this.messages[index] = updatedMessage;
    this.notifyMessageChange();
  }

  public updateMessageTags(index: number, tags: string[]): void {
    const message = this.messages[index];
    if (!message) return;

    const updatedMessage = updateMessageTags(message, tags);
    this.messages[index] = updatedMessage;
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

  public getMessages(): MessageExtended[] {
    return this.messages;
  }

  public onMessagesChange(
    callback: (msgs: MessageExtended[]) => void
  ): () => void {
    this.messageChangeCallbacks.push(callback);
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
        const parsedMessages = JSON.parse(stored);
        // Ensure messages have proper metadata structure
        this.messages = parsedMessages.map((msg: MessageExtended) => ({
          ...msg,
          metadata: {
            hasToolUse: false,
            hasToolResult: false,
            isArchived: false,
            tags: [],
            userRating: 0,
            ...msg.metadata,
          },
        }));
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
