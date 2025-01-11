import { Message } from "@aws-sdk/client-bedrock-runtime";

interface ContentBlock {
  text: string;
}

const STORAGE_KEY = "chat-messages";

export class ChatContext {
  private messages: Message[] = [];
  private messageChangeCallbacks: ((messages: Message[]) => void)[] = [];

  constructor() {
    this.loadFromStorage();
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

  onMessagesChange(callback: (messages: Message[]) => void) {
    this.messageChangeCallbacks.push(callback);
  }

  private notifyMessageChange() {
    this.messageChangeCallbacks.forEach((cb) => cb(this.messages));
    this.saveToStorage();
  }

  addUserMessage(prompt: string) {
    if (
      this.messages.length > 0 &&
      this.messages[this.messages.length - 1].role === "user"
    ) {
      const lastMessage = this.messages[this.messages.length - 1];
      const newContent: ContentBlock[] = [{ text: prompt }];
      const lastMessageContent = lastMessage.content || [];
      lastMessage.content = [...lastMessageContent, ...newContent];
    } else {
      this.messages.push({
        role: "user",
        content: [{ text: prompt }],
      });
    }
    this.notifyMessageChange();
  }

  addAssistantMessage(response: string) {
    if (
      this.messages.length > 0 &&
      this.messages[this.messages.length - 1].role === "assistant"
    ) {
      const lastMessage = this.messages[this.messages.length - 1];
      const newContent: ContentBlock[] = [{ text: response }];
      const lastMessageContent = lastMessage.content || [];
      lastMessage.content = [...lastMessageContent, ...newContent];
    } else {
      this.messages.push({
        role: "assistant",
        content: [{ text: response }],
      });
    }
    this.notifyMessageChange();
  }

  addMessage(role: "user" | "assistant", content: string): void {
    this.messages.push({
      role,
      content: [{ text: content }],
    });
    this.notifyMessageChange();
  }

  updateMessage(index: number, newContent: string): void {
    if (this.messages[index]) {
      this.messages[index].content = [{ text: newContent }];
      this.notifyMessageChange();
    }
  }

  deleteMessage(index: number): void {
    this.messages.splice(index, 1);
    this.notifyMessageChange();
  }

  deleteAllMessages(): void {
    this.messages = [];
    this.notifyMessageChange();
    localStorage.removeItem(STORAGE_KEY);
  }

  reorderMessages(fromIndex: number, toIndex: number): void {
    const messages = [...this.messages];
    const [removed] = messages.splice(fromIndex, 1);
    messages.splice(toIndex, 0, removed);
    this.messages = messages;
    this.notifyMessageChange();
  }

  getMessages(): Message[] {
    return this.messages;
  }

  getTruncatedHistory(count: number = 3): Message[] {
    return this.messages.slice(-count);
  }
}

export const chatContext = new ChatContext();
