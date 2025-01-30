import { Message } from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended } from "../../../app.types";

// @todo add chat summary a llm tool or agent that summarizes the older pieces of the chat context.
/**
 * Configuration for managing conversation context windows based on token limits.
 * maxTokens sets the absolute limit, targetTokens is used to calculate the optimal
 * number of messages to include, and overlapTokens determines how many previous
 * messages to retain when shifting the window for context continuity.
 */
interface TokenConfig {
  maxTokens: number; // e.g., 4000 for GPT-3.5
  targetTokens: number; // e.g., 3000 to leave room for responses
  overlapTokens: number; // e.g., 500 to maintain context between windows
}
export class MessageManager {
  private messages: Map<string, MessageExtended> = new Map();
  private messageOrder: string[] = [];
  private sequence: number = 0;
  private tokenConfig: TokenConfig;
  threshold: number = 10; // Initial threshold, will be adjusted by token counts

  constructor(
    tokenConfig: TokenConfig = {
      maxTokens: 6000,
      targetTokens: 4000,
      overlapTokens: 500,
    }
  ) {
    this.tokenConfig = tokenConfig;
  }

  public getNextId(): string {
    this.sequence += 1;
    return `msg_${this.sequence}`;
  }

  private calculateMessageTokens(message: MessageExtended): number {
    // Simple estimation - can be replaced with actual tokenizer
    return (
      message.content?.reduce((total, block) => {
        if (block.text) {
          return total + block.text.split(/\s+/).length;
        } else if (block.toolUse || block.toolResult) {
          return total + JSON.stringify(block).split(/\s+/).length;
        }
        return total;
      }, 0) ?? 0
    );
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

  private updateThresholdBasedOnTokens(): void {
    const messages = this.getMessages();
    let totalTokens = 0;
    let newThreshold = messages.length;

    console.log(`Updating threshold based on ${messages.length} messages`);

    // Start from most recent messages
    for (let i = messages.length - 1; i >= 0; i--) {
      const messageTokens = this.calculateMessageTokens(messages[i]);

      if (totalTokens + messageTokens > this.tokenConfig.maxTokens) {
        newThreshold = messages.length - i - 1;
        break;
      }

      totalTokens += messageTokens;

      // If we've reached our target token count, set threshold here
      if (totalTokens >= this.tokenConfig.targetTokens) {
        newThreshold = messages.length - i;
        break;
      }
    }

    // Ensure we include overlap
    const overlappingMessages = messages
      .slice(
        Math.max(0, messages.length - newThreshold - 5),
        messages.length - newThreshold
      )
      .reduce((tokens, msg) => tokens + this.calculateMessageTokens(msg), 0);

    // Adjust threshold if we can include more context
    if (totalTokens + overlappingMessages <= this.tokenConfig.maxTokens) {
      newThreshold += Math.floor(
        overlappingMessages / this.tokenConfig.overlapTokens
      );
    }

    console.log(
      `Total tokens: ${totalTokens}, Overlap tokens: ${overlappingMessages} -> New threshold: ${newThreshold}`
    );

    if (this.threshold !== newThreshold) {
      console.log(
        `Adjusting threshold from ${this.threshold} to ${newThreshold} based on token count`
      );
      this.threshold = newThreshold;
      this.updateArchiveStatus();
    }
  }

  public addMessage(message: Partial<Message>): MessageExtended {
    console.log("Adding message:", message);
    const newMessage = this.createMessage(message);
    this.messages.set(newMessage.id, newMessage);
    this.messageOrder.push(newMessage.id);
    this.updateThresholdBasedOnTokens();
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
    this.updateThresholdBasedOnTokens();
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
      this.updateThresholdBasedOnTokens();
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
    this.updateThresholdBasedOnTokens();
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
        // console.log(
        //   `Message ${id} archived status changed: ${wasArchived} -> ${isNowArchived}`
        // );
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
    this.updateThresholdBasedOnTokens();
  }
}
