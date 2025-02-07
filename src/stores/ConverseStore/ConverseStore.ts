// src/stores/ConverseStore.ts
import { Message } from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended, ToolUse } from "../../app.types";
import { store } from "../AppStore";
import { LLMHandler } from "./handlers/LLMHandler";
import { MessageManager } from "./handlers/MessageManager";
import { ToolHandler } from "./handlers/ToolHandler";
import { determineActiveMessageRange } from "./utils/messageUtils";
import { projectStore } from "../ProjectStore/ProjectStore";
import { dataStore } from "../DataStore/DataStore";

export class ConverseStore {
  private messageManager: MessageManager;
  private llmHandler: LLMHandler;
  private toolHandler: ToolHandler;
  private messageChangeCallbacks: Array<(msgs: MessageExtended[]) => void> = [];
  private projectId: string | null = null;

  constructor() {
    console.log("Initializing ConverseStore with threshold:");
    this.messageManager = new MessageManager();
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

      // Add data context if available
      const messagesForLLM = [...activeMessages];
      const dataContext = dataStore.getDataContextText();
      if (dataContext) {
        // Find first non-tool user message
        const userIndex = messagesForLLM.findIndex(
          (m) =>
            m.role === "user" &&
            !m.content?.some((block) => block.toolUse || block.toolResult)
        );

        if (userIndex !== -1) {
          messagesForLLM[userIndex] = {
            ...messagesForLLM[userIndex],
            content: [
              { text: dataContext },
              ...(messagesForLLM[userIndex].content || []),
            ],
          };
        }
      }

      console.log("Sending to LLM:", {
        totalMessages: messagesForLLM.length,
        dataContextAdded: !!dataContext,
        messages: messagesForLLM,
      });
      let currentToolUse: Partial<ToolUse> | null = null;
      let accumulatedToolInput = "";
      let accumulatedText = "";

      const tempMessage = this.messageManager.addMessage({
        role: "assistant",
        content: [{ text: "" }],
      });

      await this.llmHandler.callLLMStream(messagesForLLM, {
        onChunk: async (chunk) => {
          // Handle text chunks
          if (chunk.contentBlockDelta?.delta?.text) {
            accumulatedText += chunk.contentBlockDelta.delta.text;
            this.messageManager.updateMessage(tempMessage.id, {
              content: [{ text: accumulatedText }],
            });
            this.notifyMessageChange();
          }
          // Handle tool use start
          else if (chunk.contentBlockStart?.start?.toolUse) {
            console.log(
              "Tool use started:",
              chunk.contentBlockStart.start.toolUse
            );
            currentToolUse = {
              name: chunk.contentBlockStart.start.toolUse.name,
              toolUseId: chunk.contentBlockStart.start.toolUse.toolUseId,
              input: {},
            };
          }
          // Handle tool use input chunks
          else if (chunk.contentBlockDelta?.delta?.toolUse) {
            if (currentToolUse) {
              accumulatedToolInput +=
                chunk.contentBlockDelta.delta.toolUse.input || "";
            }
          }
          // Handle message stop with tool use
          else if (
            chunk.messageStop?.stopReason === "tool_use" &&
            currentToolUse &&
            accumulatedToolInput
          ) {
            try {
              const parsedInput = JSON.parse(accumulatedToolInput);
              const toolUse: ToolUse = {
                name: currentToolUse.name!,
                toolUseId: currentToolUse.toolUseId!,
                input: parsedInput,
              };

              console.log("Executing tool:", toolUse);

              // Update assistant message with both text and tool use
              this.messageManager.updateMessage(tempMessage.id, {
                content: [{ text: accumulatedText }, { toolUse }],
                metadata: {
                  ...tempMessage.metadata,
                  hasToolUse: true,
                },
              });
              this.notifyMessageChange();

              // Execute tool and add response
              const result = await this.toolHandler.executeTool(toolUse);
              console.log("Tool execution result:", result);
              this.addMessage(result);

              // Reset tool state
              currentToolUse = null;
              accumulatedToolInput = "";
            } catch (error) {
              console.error("Failed to process tool use:", error);
              this.addMessage({
                role: "user",
                content: [{ text: `Tool execution failed: ${error}` }],
              });
            }
          }
        },
        onComplete: (finalMessage) => {
          const currentMessage = this.messageManager.getMessage(tempMessage.id);
          if (currentMessage) {
            this.messageManager.updateMessage(tempMessage.id, {
              content: currentMessage.content,
              metadata: {
                ...currentMessage.metadata,
                isStreaming: false,
              },
            });
            this.notifyMessageChange();
          }
        },
        onError: (error) => {
          console.error("Stream error:", error);
          this.messageManager.updateMessage(tempMessage.id, {
            content: [{ text: "Error: Failed to generate response" }],
            metadata: {
              ...tempMessage.metadata,
              isStreaming: false,
              error: true,
            },
          });
          this.notifyMessageChange();
        },
      });
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
        `ConverseStore Saving ${messages.length} messages to project:`,
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
