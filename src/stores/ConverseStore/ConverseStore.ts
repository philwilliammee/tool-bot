// src/stores/ConverseStore.ts
import { Message } from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended, ToolUse } from "../../app.types";
import { store } from "../AppStore";
// Maybe the handlers should be in utils?
import { LLMHandler } from "./handlers/LLMHandler";
import { MessageManager } from "./handlers/MessageManager";
import { StorageHandler } from "./handlers/StorageHandler";
import { ToolHandler } from "./handlers/ToolHandler";
import { determineActiveMessageRange } from "./utils/messageUtils";
import { projectStore } from "../ProjectStore/ProjectStore";

const STORAGE_KEY = "chat-messages";
const DEFAULT_THRESHOLD = 8; // @todo make this sliding scaled based on token length.

export class ConverseStore {
  private messageManager: MessageManager;
  private llmHandler: LLMHandler;
  private toolHandler: ToolHandler;
  private storageHandler: StorageHandler<{
    sequence: number;
    messages: MessageExtended[];
  }>;
  private messageChangeCallbacks: Array<(msgs: MessageExtended[]) => void> = [];
  private projectId: string | null = null;

  constructor(threshold: number = DEFAULT_THRESHOLD) {
    this.messageManager = new MessageManager(threshold);
    // The modelIDcurrently isn't implemented properly. I'm not sure if this should be here or just the backend.
    this.llmHandler = new LLMHandler(
      import.meta.env.VITE_BEDROCK_MODEL_ID || "my-model-id",
      "You are a helpful assistant with tools."
    );
    this.toolHandler = new ToolHandler();
    this.storageHandler = new StorageHandler(STORAGE_KEY);
    this.loadFromStorage();
  }

  public setProject(id: string | null): void {
    this.projectId = id;
    if (id) {
      const project = projectStore.getProject(id);
      if (project) {
        this.messageManager.setState({
          messages: project.messages || [], // Add null check here
          sequence: project.messages
            ? Math.max(
                ...project.messages.map((m) =>
                  parseInt(m.id.split("_")[1] || "0")
                ),
                0
              )
            : 0, // Add fallback to 0
        });
      } else {
        // Initialize empty state for new project
        this.messageManager.setState({
          messages: [],
          sequence: 0,
        });
      }
    } else {
      // Handle case when no project is selected
      this.messageManager.clear();
    }
    this.notifyMessageChange();
  }
  public get hasMessages(): boolean {
    return this.messageManager.getMessages().length > 0;
  }

  public get isInitialized(): boolean {
    return !!this.messageManager;
  }

  public setThreshold(threshold: number): void {
    this.messageManager.setThreshold(threshold);
    this.notifyMessageChange();
  }

  public addMessage(message: Message): void {
    const newMessage = this.messageManager.addMessage(message);

    // Handle tool use
    if (newMessage.role === "assistant") {
      const toolUseBlock = newMessage.content?.find((b: any) => b.toolUse)
        ?.toolUse as ToolUse;
      if (toolUseBlock) {
        this.handleToolUse(toolUseBlock);
      }
    }

    // Handle LLM call for user messages
    if (newMessage.role === "user" && !store.isGenerating.value) {
      this.callBedrockLLM();
    }

    this.notifyMessageChange();
  }

  private async handleToolUse(toolUse: ToolUse): Promise<void> {
    try {
      const result = await this.toolHandler.executeTool(toolUse);
      this.addMessage(result);
    } catch (error: any) {
      this.addMessage({
        role: "user",
        content: [{ text: `Tool execution failed: ${error.message}` }],
      });
    }
  }

  private async callBedrockLLM(): Promise<void> {
    try {
      store.setGenerating(true);
      const allMessages = this.messageManager.getMessages();
      const { activeMessages } = determineActiveMessageRange(
        allMessages,
        this.messageManager.threshold
      );

      const result = await this.llmHandler.callLLM(activeMessages);
      this.addMessage(result);
    } catch (error: any) {
      console.error("LLM call failed:", error);
      throw error;
    } finally {
      store.setGenerating(false);
    }
  }

  public updateMessage(id: string, update: Partial<MessageExtended>): void {
    this.messageManager.updateMessage(id, update);
    this.notifyMessageChange();
  }

  public upsertMessage(idOrMessage: string | Partial<MessageExtended>): void {
    const message = this.messageManager.upsertMessage(idOrMessage);

    // Handle tool use and LLM calls for new messages
    if (message.role === "assistant") {
      const toolUseBlock = message.content?.find((b: any) => b.toolUse)
        ?.toolUse as ToolUse;
      if (toolUseBlock) {
        this.handleToolUse(toolUseBlock);
      }
    }

    if (message.role === "user" && !store.isGenerating.value) {
      this.callBedrockLLM();
    }

    this.notifyMessageChange();
  }

  public updateMessageRating(id: string, rating: number): void {
    this.upsertMessage({
      id,
      metadata: {
        userRating: rating,
        updatedAt: Date.now(),
        createdAt: Date.now(),
      },
    });
  }

  public deleteMessage(id: string): void {
    this.messageManager.deleteMessage(id);
    this.notifyMessageChange();
  }

  public deleteAllMessages(): void {
    this.messageManager.clear();
    this.storageHandler.clear();
    this.notifyMessageChange();
  }

  public getMessage(id: string): MessageExtended | undefined {
    return this.messageManager.getMessage(id);
  }

  public getMessages(): MessageExtended[] {
    return this.messageManager.getMessages();
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
    const messages = this.getMessages();
    this.messageChangeCallbacks.forEach((cb) => cb(messages));
    this.saveToStorage();
  }

  private loadFromStorage(): void {
    const data = this.storageHandler.load();
    if (data) {
      this.messageManager.setState(data);
      this.notifyMessageChange();
    }
  }

  // private saveToStorage(): void {
  //   this.storageHandler.save(this.messageManager.getState());
  // }

  private saveToStorage(): void {
    if (this.projectId) {
      projectStore.saveProjectMessages(
        this.projectId,
        this.messageManager.getMessages()
      );
    }
  }

  public destroy(): void {
    this.saveToStorage();
    this.messageChangeCallbacks = [];
    this.messageManager.clear();
  }
}

export const converseStore = new ConverseStore();
