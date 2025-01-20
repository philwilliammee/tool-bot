// src/stores/handlers/MessageManager.ts
import { Message } from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended } from "../../types/tool.types";

export class MessageManager {
  private messages: Map<string, MessageExtended> = new Map();
  private messageOrder: string[] = [];
  private sequence: number = 0;

  constructor(public threshold: number) {}

  public getNextId(): string {
    this.sequence += 1;
    return `msg_${this.sequence}`;
  }

  private createMessage(message: Partial<Message>): MessageExtended {
    const id = this.getNextId();
    return {
      id,
      role: message.role || "user",
      content: message.content || [],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isArchived: false,
        hasToolUse: message.content?.some((block) => block.toolUse) || false,
        hasToolResult:
          message.content?.some((block) => block.toolResult) || false,
        tags: [],
        userRating: 0,
      },
    } as MessageExtended;
  }

  public addMessage(message: Partial<Message>): MessageExtended {
    const newMessage = this.createMessage(message);
    this.messages.set(newMessage.id, newMessage);
    this.messageOrder.push(newMessage.id);
    this.updateArchiveStatus();
    return newMessage;
  }

  public getMessage(id: string): MessageExtended | undefined {
    return this.messages.get(id);
  }

  public getMessages(): MessageExtended[] {
    return this.messageOrder
      .map((id) => this.messages.get(id))
      .filter((msg): msg is MessageExtended => msg !== undefined);
  }

  public updateMessage(
    id: string,
    update: Partial<MessageExtended>
  ): MessageExtended {
    const message = this.messages.get(id);
    if (!message) {
      throw new Error(`Message with id ${id} not found`);
    }

    const updatedMessage: MessageExtended = {
      ...message,
      ...update,
      metadata: {
        ...message.metadata,
        ...(update.metadata || {}),
        updatedAt: Date.now(),
      },
    };

    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }

  public upsertMessage(
    idOrMessage: string | Partial<MessageExtended>
  ): MessageExtended {
    if (typeof idOrMessage === "string") {
      // If ID provided, return existing or create new
      const existingMessage = this.messages.get(idOrMessage);
      if (existingMessage) {
        return existingMessage;
      }
      // Create new with generated ID - ignore the provided ID
      return this.addMessage({ role: "user", content: [] });
    }

    // Handle partial message
    const messageToUpsert = idOrMessage as Partial<MessageExtended>;
    const existingMessage = messageToUpsert.id
      ? this.messages.get(messageToUpsert.id)
      : null;

    if (existingMessage) {
      // Update existing
      const updatedMessage: MessageExtended = {
        ...existingMessage,
        ...messageToUpsert,
        metadata: {
          ...existingMessage.metadata,
          ...(messageToUpsert.metadata || {}),
          updatedAt: Date.now(),
        },
      };
      this.messages.set(existingMessage.id, updatedMessage);
      return updatedMessage;
    } else {
      // Create new
      return this.addMessage(messageToUpsert);
    }
  }

  public deleteMessage(id: string): void {
    this.messages.delete(id);
    this.messageOrder = this.messageOrder.filter((msgId) => msgId !== id);
    this.updateArchiveStatus();
  }

  public clear(): void {
    this.messages.clear();
    this.messageOrder = [];
    this.sequence = 0;
  }

  public setThreshold(threshold: number): void {
    this.threshold = threshold;
    this.updateArchiveStatus();
  }

  private updateArchiveStatus(): void {
    const activeIds = this.messageOrder.slice(-this.threshold);

    this.messages.forEach((message, id) => {
      if (message.metadata) {
        message.metadata.isArchived = !activeIds.includes(id);
      }
    });
  }

  public getState() {
    return {
      sequence: this.sequence,
      messages: this.getMessages(),
    };
  }

  public setState(state: { sequence: number; messages: MessageExtended[] }) {
    this.sequence = state.sequence;
    this.messages.clear();
    this.messageOrder = [];

    state?.messages?.forEach((msg) => {
      if (msg.id) {
        this.messages.set(msg.id, {
          ...msg,
          metadata: {
            isArchived: false,
            hasToolUse: false,
            hasToolResult: false,
            tags: [],
            userRating: 0,
            ...msg.metadata,
          },
        });
        this.messageOrder.push(msg.id);
      }
    });

    this.updateArchiveStatus();
  }
}
