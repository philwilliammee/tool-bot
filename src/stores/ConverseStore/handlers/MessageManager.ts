// src/stores/handlers/MessageManager.ts
import { Message } from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended } from "../../../app.types";

export class MessageManager {
  private messages: Map<string, MessageExtended> = new Map();
  private messageOrder: string[] = [];
  private sequence: number = 0;

  constructor(public threshold: number) {
    console.log("Initializing MessageManager with threshold:", threshold);
  }

  public getNextId(): string {
    this.sequence += 1;
    return `msg_${this.sequence}`;
  }

  private createMessage(message: Partial<Message>): MessageExtended {
    const id = this.getNextId();
    console.log("Creating new message with ID:", id);

    const hasToolUse = message.content?.some((block) => block.toolUse) || false;
    const hasToolResult =
      message.content?.some((block) => block.toolResult) || false;

    return {
      id,
      role: message.role || "user",
      content: message.content || [],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isArchived: false,
        hasToolUse,
        hasToolResult,
        tags: [],
        userRating: 0,
        sequenceNumber: this.sequence,
      },
    } as MessageExtended;
  }

  public addMessage(message: Partial<Message>): MessageExtended {
    console.log("Adding message:", message);
    const newMessage = this.createMessage(message);
    this.messages.set(newMessage.id, newMessage);
    this.messageOrder.push(newMessage.id);
    this.updateArchiveStatus();
    return newMessage;
  }

  public getMessage(id: string): MessageExtended | undefined {
    const message = this.messages.get(id);
    if (!message) {
      console.warn(`Message with id ${id} not found`);
    }
    return message;
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
    console.log(`Updating message ${id}:`, update);
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
    console.log("Upserting message:", idOrMessage);

    if (typeof idOrMessage === "string") {
      const existingMessage = this.messages.get(idOrMessage);
      if (existingMessage) {
        console.log("Found existing message:", existingMessage);
        return existingMessage;
      }
      console.log("Creating new message for ID:", idOrMessage);
      return this.addMessage({ role: "user", content: [] });
    }

    const messageToUpsert = idOrMessage as Partial<MessageExtended>;
    const existingMessage = messageToUpsert.id
      ? this.messages.get(messageToUpsert.id)
      : null;

    if (existingMessage) {
      console.log("Updating existing message:", existingMessage.id);
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
      console.log("Creating new message from upsert data");
      return this.addMessage(messageToUpsert);
    }
  }

  public deleteMessage(id: string): void {
    console.log("Deleting message:", id);
    this.messages.delete(id);
    this.messageOrder = this.messageOrder.filter((msgId) => msgId !== id);
    this.updateArchiveStatus();
  }

  public clear(): void {
    console.log("Clearing all messages");
    this.messages.clear();
    this.messageOrder = [];
    this.sequence = 0;
  }

  public setThreshold(threshold: number): void {
    console.log("Setting new threshold:", threshold);
    this.threshold = threshold;
    this.updateArchiveStatus();
  }

  private updateArchiveStatus(): void {
    const activeIds = this.messageOrder.slice(-this.threshold);
    console.log(
      `Updating archive status. Active messages: ${activeIds.length}`
    );

    this.messages.forEach((message, id) => {
      const wasArchived = message.metadata.isArchived;
      const isNowArchived = !activeIds.includes(id);

      if (wasArchived !== isNowArchived) {
        console.log(
          `Message ${id} archived status changed: ${wasArchived} -> ${isNowArchived}`
        );
        message.metadata.isArchived = isNowArchived;
      }
    });
  }

  public getState() {
    const state = {
      sequence: this.sequence,
      messages: this.getMessages(),
    };
    console.log("Getting state:", state);
    return state;
  }

  public setState(state: { sequence: number; messages: MessageExtended[] }) {
    console.log("Setting state:", state);

    if (!state || !Array.isArray(state.messages)) {
      console.error("Invalid state provided:", state);
      return;
    }

    this.sequence = state.sequence || 0;
    this.messages.clear();
    this.messageOrder = [];

    state.messages.forEach((msg) => {
      if (msg?.id) {
        const message: MessageExtended = {
          ...msg,
          metadata: {
            isArchived: false,
            hasToolUse: false,
            hasToolResult: false,
            tags: [],
            userRating: 0,
            sequenceNumber: parseInt(msg.id.split("_")[1] || "0"),
            ...msg.metadata,
          },
        };
        this.messages.set(msg.id, message);
        this.messageOrder.push(msg.id);
      }
    });

    console.log(`Restored ${this.messageOrder.length} messages`);
    this.updateArchiveStatus();
  }

  // Debug method
  public debug(): void {
    console.group("MessageManager Debug");
    console.log("Sequence:", this.sequence);
    console.log("Message Count:", this.messages.size);
    console.log("Message Order:", this.messageOrder);
    console.log("Messages:", Object.fromEntries(this.messages));
    console.log("Threshold:", this.threshold);
    console.groupEnd();
  }
}
