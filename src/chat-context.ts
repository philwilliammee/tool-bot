import { Message } from "@aws-sdk/client-bedrock-runtime";

const STORAGE_KEY = "chat-messages";

export class ChatContext {
  private messages: Message[] = [];
  private messageChangeCallbacks: Array<(msgs: Message[]) => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  // Single method: addMessage
  public addMessage(newMessage: Message): void {
    const lastIndex = this.messages.length - 1;
    const lastMessage = this.messages[lastIndex];

    // If last message is the same role, just merge contents
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
  }

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
  public onMessagesChange(callback: (msgs: Message[]) => void) {
    this.messageChangeCallbacks.push(callback);
  }

  // Utilities
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
