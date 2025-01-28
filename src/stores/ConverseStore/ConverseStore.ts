// src/stores/ConverseStore.ts
import { Message } from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended, ToolUse } from "../../app.types";
import { store } from "../AppStore";
import { LLMHandler } from "./handlers/LLMHandler";
import { MessageManager } from "./handlers/MessageManager";
import { ToolHandler } from "./handlers/ToolHandler";
import { determineActiveMessageRange } from "./utils/messageUtils";
import { projectStore } from "../ProjectStore/ProjectStore";

const DEFAULT_THRESHOLD = 10; // @todo make this sliding scaled based on token length.

export class ConverseStore {
  private messageManager: MessageManager;
  private llmHandler: LLMHandler;
  private toolHandler: ToolHandler;
  private messageChangeCallbacks: Array<(msgs: MessageExtended[]) => void> = [];
  private projectId: string | null = null;

  constructor(threshold: number = DEFAULT_THRESHOLD) {
    console.log("Initializing ConverseStore with threshold:", threshold);
    this.messageManager = new MessageManager(threshold);
    this.llmHandler = new LLMHandler();
    this.toolHandler = new ToolHandler();

    // Initialize with active project if exists
    const activeProjectId = projectStore.getActiveProject();
    if (activeProjectId) {
      this.setProject(activeProjectId);
    }
  }

  public setProject(id: string | null): void {
    console.log("Setting project:", id);
    this.projectId = id;

    if (id) {
      const project = projectStore.getProject(id);
      console.log("Loaded project data:", project);

      if (project?.messages) {
        const maxSequence =
          project.messages.length > 0
            ? Math.max(
                ...project.messages.map((m) =>
                  parseInt(m.id.split("_")[1] || "0")
                ),
                0
              )
            : 0;

        console.log("Initializing message manager with sequence:", maxSequence);

        this.messageManager.setState({
          messages: project.messages,
          sequence: maxSequence,
        });
      } else {
        console.log("Initializing empty project state");
        this.messageManager.setState({
          messages: [],
          sequence: 0,
        });
      }
    } else {
      console.log("Clearing message manager - no project selected");
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
    if (!this.projectId) {
      console.warn("Attempted to add message with no active project");
      return;
    }

    console.log("Adding message:", message);
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
    if (!this.projectId) {
      console.warn("Attempted to update message with no active project");
      return;
    }

    this.messageManager.updateMessage(id, update);
    this.notifyMessageChange();
  }

  public upsertMessage(idOrMessage: string | Partial<MessageExtended>): void {
    if (!this.projectId) {
      console.warn("Attempted to upsert message with no active project");
      return;
    }

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
    if (!this.projectId) {
      console.warn("Attempted to update message rating with no active project");
      return;
    }

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
    if (!this.projectId) {
      console.warn("Attempted to delete message with no active project");
      return;
    }

    this.messageManager.deleteMessage(id);
    this.notifyMessageChange();
  }

  public deleteAllMessages(): void {
    if (!this.projectId) {
      console.warn("Attempted to delete all messages with no active project");
      return;
    }

    this.messageManager.clear();
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
    console.log(
      `Notifying ${this.messageChangeCallbacks.length} listeners of message change. Messages:`,
      messages.length
    );
    this.messageChangeCallbacks.forEach((cb) => cb(messages));
    this.saveToStorage();
  }

  private saveToStorage(): void {
    if (this.projectId) {
      const messages = this.messageManager.getMessages();
      console.log(
        `Saving ${messages.length} messages to project:`,
        this.projectId
      );
      projectStore.saveProjectMessages(this.projectId, messages);
    } else {
      console.warn("Attempted to save messages with no active project");
    }
  }

  public destroy(): void {
    console.log("Destroying ConverseStore");
    this.saveToStorage();
    this.messageChangeCallbacks = [];
    this.messageManager.clear();
  }
}

export const converseStore = new ConverseStore();
