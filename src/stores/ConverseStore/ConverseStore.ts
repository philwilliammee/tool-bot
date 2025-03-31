import { Message } from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended, ToolUse } from "../../app.types";
import { store } from "../AppStore";
import { dataStore } from "../DataStore/DataStore";
import { projectStore } from "../ProjectStore/ProjectStore";
import { dbService } from "../Database/DatabaseService";
import { LLMHandler } from "./handlers/LLMHandler";
import { MessageManager } from "./handlers/MessageManager";
import { SummaryHandler } from "./handlers/SummaryHandler";
import { ToolHandler } from "./handlers/ToolHandler";
import { determineActiveMessageRange } from "./utils/messageUtils";
import { Signal, computed, effect } from "@preact/signals-core";

/**
 * Utility function for debouncing operations
 */
function debounce(func: Function, wait: number) {
  let timeout: number | null = null;

  return function executedFunction(...args: any[]) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait) as unknown as number;
  };
}

/**
 * ConverseStore - Manages conversation state and interactions with the LLM
 *
 * This store handles message management, LLM interactions, and tool execution.
 * It uses IndexedDB for efficient persistent storage of messages.
 */
export class ConverseStore {
  private messageManager: MessageManager;
  private llmHandler: LLMHandler;
  private toolHandler: ToolHandler;
  summaryHandler: SummaryHandler;
  private messageChangeCallbacks: Array<(msgs: MessageExtended[]) => void> = [];
  private projectId: string | null = null;

  // Storage optimization
  private pendingStorageSave: boolean = false;
  private saveToStorageDebounced: Function;

  // Performance tracking
  private metrics = {
    messagesSaved: 0,
    storageOperations: 0,
    lastSaveTime: 0
  };

  constructor() {
    this.messageManager = new MessageManager();
    this.llmHandler = new LLMHandler();
    this.toolHandler = new ToolHandler();
    this.summaryHandler = new SummaryHandler(this.llmHandler);

    // Initialize debounced storage save
    this.saveToStorageDebounced = debounce(async () => {
      if (this.projectId && this.pendingStorageSave) {
        const startTime = performance.now();
        const messages = this.messageManager.getMessages();

        try {
          // Save messages directly to IndexedDB
          await dbService.saveMessages(
            messages.map(msg => ({ ...msg, projectId: this.projectId }))
          );

          // Update metrics
          this.metrics.messagesSaved += messages.length;
          this.metrics.storageOperations++;
          this.metrics.lastSaveTime = performance.now() - startTime;

          this.pendingStorageSave = false;

          // Log performance for significant operations
          if (messages.length > 10 || this.metrics.lastSaveTime > 100) {
            console.log(`Saved ${messages.length} messages in ${this.metrics.lastSaveTime.toFixed(2)}ms`);
          }
        } catch (error) {
          console.error("Failed to save messages:", error);
        }
      }
    }, 1000); // 1 second debounce

    // Set up effect to sync with the active project from projectStore
    effect(() => {
      const project = projectStore.activeProject.value;
      if (project) {
        // Don't trigger setProject from inside the effect if the project hasn't changed
        if (this.projectId !== project.id) {
          this.setProject(project.id);
        }
      } else if (this.projectId !== null) {
        // Only clear if we actually have a project set
        this.setProject(null);
      }
    });
  }

  // Signal-based accessor methods
  public getMessagesSignal(): Signal<MessageExtended[]> {
    return this.messageManager.getMessagesSignal();
  }

  public getMessagesUpdatedSignal(): Signal<number> {
    return this.messageManager.getMessagesUpdatedSignal();
  }

  // In ConverseStore
  public getIsSummarizing(): Signal<boolean> {
    return this.summaryHandler.getIsSummarizing();
  }

  public getArchiveSummary(): Signal<string | null> {
    return computed(() =>
      this.projectId
        ? this.summaryHandler.getSummary(this.projectId).value
        : null
    );
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): typeof this.metrics & { averageSaveTime: number } {
    return {
      ...this.metrics,
      averageSaveTime: this.metrics.storageOperations > 0
        ? this.metrics.lastSaveTime / this.metrics.storageOperations
        : 0
    };
  }

  private async updateSummary(): Promise<void> {
    if (!this.projectId) return;

    const allMessages = this.messageManager.getMessages();
    const { archivedMessages } = determineActiveMessageRange(
      allMessages,
      this.messageManager.threshold
    );

    await this.summaryHandler.summarizeArchivedMessages(
      this.projectId,
      archivedMessages
    );
  }

  public async setProject(id: string | null): Promise<void> {
    console.log("Setting project:", id);

    // If the project hasn't changed, do nothing
    if (this.projectId === id) {
      console.log("Project ID unchanged, skipping update");
      return;
    }

    // Save any pending changes for the current project before switching
    if (this.projectId && this.pendingStorageSave) {
      // Force immediate save instead of debounced
      const messages = this.messageManager.getMessages();
      try {
        await dbService.saveMessages(
          messages.map(msg => ({ ...msg, projectId: this.projectId }))
        );
        this.pendingStorageSave = false;
      } catch (error) {
        console.error("Failed to save messages before project switch:", error);
      }
    }

    this.projectId = id;

    if (id) {
      console.log(`Loading project ${id} messages`);

      // Initialize with empty messages first for faster UI response
      this.messageManager.setState({
        messages: [],
        sequence: 0,
      });

      try {
        // Load messages from IndexedDB
        const startTime = performance.now();
        const messages = await dbService.getMessagesForProject(id);
        const loadTime = performance.now() - startTime;

        console.log(`Loaded ${messages.length} messages in ${loadTime.toFixed(2)}ms`);

        const maxSequence = messages.length > 0
          ? Math.max(...messages.map((m) => parseInt(m.id.split("_")[1] || "0")), 0)
          : 0;

        console.log("Initializing message manager with sequence:", maxSequence);

        this.messageManager.setState({
          messages: messages,
          sequence: maxSequence,
        });

        // Load project's summary state after messages are set
        this.summaryHandler.loadProjectSummary(id);
      } catch (error) {
        console.error("Error loading project messages:", error);
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

  public addMessage(message: Message): void {
    if (!this.projectId) {
      console.warn("Attempted to add message with no active project");
      return;
    }

    console.log("Adding message:", message);
    const newMessage = this.messageManager.addMessage({
      ...message,
      projectId: this.projectId, // Add project ID to message
    });

    // Handle LLM call for user messages
    if (newMessage.role === "user") {
      this.callLLM();
    }

    this.notifyMessageChange();
  }

  private async handleToolUse(toolUse: ToolUse): Promise<void> {
    try {
      store.setToolRunning(true, toolUse.toolUseId);
      const result = await this.toolHandler.executeTool(toolUse);
      store.setToolRunning(false);
      this.addMessage(result);
    } catch (error: any) {
      store.setToolRunning(false);
      this.addMessage({
        role: "user",
        content: [{ text: `Tool execution failed: ${error.message}` }],
      });
    }
  }

  private async callLLM(): Promise<void> {
    try {
      store.setGenerating(true);
      const allMessages = this.messageManager.getMessages();
      const { activeMessages, archivedMessages } = determineActiveMessageRange(
        allMessages,
        this.messageManager.threshold
      );

      const messagesForLLM = [...activeMessages];

      // Get the current project's configuration
      let enabledTools: string[] | undefined;
      let persistentUserMessage: string | undefined;
      let modelId: string | undefined;

      if (this.projectId) {
        // Use projectStore.getProjectConfig for a more direct approach
        const config = projectStore.getProjectConfig(this.projectId);
        enabledTools = config?.enabledTools;
        persistentUserMessage = config?.persistentUserMessage;
        modelId = config?.model;
      }

      // Add archive summary context if available and we have a project
      if (this.projectId) {
        const archiveSummary = this.summaryHandler.getSummary(this.projectId);

        if (archiveSummary && archivedMessages.length > 0) {
          // Find first user message that isn't a tool result
          const userIndex = messagesForLLM.findIndex(
            (m) =>
              m.role === "user" &&
              !m.content?.some((block) => block.toolUse || block.toolResult)
          );

          if (userIndex !== -1) {
            // Insert archive summary before the data context
            messagesForLLM[userIndex] = {
              ...messagesForLLM[userIndex],
              content: [
                {
                  text: `Previous conversation summary (${archivedMessages.length} archived messages): ${archiveSummary}`,
                },
                ...(messagesForLLM[userIndex].content || []),
              ],
            };
          }
        }
      }

      // Add data context if available
      const dataContext = dataStore.getDataContextText();
      if (dataContext) {
        // Insert dataContext into the first user message
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

      // Add persistent user message if available
      if (persistentUserMessage && persistentUserMessage.trim() !== "") {
        // Find first user message that isn't a tool result
        const userIndex = messagesForLLM.findIndex(
          (m) =>
            m.role === "user" &&
            !m.content?.some((block) => block.toolUse || block.toolResult)
        );

        if (userIndex !== -1) {
          // Insert persistent message at the beginning of the user message
          messagesForLLM[userIndex] = {
            ...messagesForLLM[userIndex],
            content: [
              { text: `${persistentUserMessage}\n\n` },
              ...(messagesForLLM[userIndex].content || []),
            ],
          };
        }
      }

      // Use logger debug if we want to kkepp this.
      // console.log("callLLM -> Sending to LLM:", messagesForLLM);
      // console.log("callLLM -> Enabled tools:", enabledTools);
      // console.log(
      //   "callLLM -> Persistent message:",
      //   persistentUserMessage
      // );

      let currentToolUse: Partial<ToolUse> | null = null;
      let accumulatedToolInput = "";
      let accumulatedText = "";

      // Create a temporary streaming assistant message
      const tempMessage = this.messageManager.addMessage({
        role: "assistant",
        content: [{ text: "" }],
        projectId: this.projectId,
      });
      console.log("callLLM -> tempMessage created:", tempMessage.id);

      await this.llmHandler.callLLMStream(
        messagesForLLM,
        {
          onChunk: async (chunk) => {
            // 1) If there's a contentBlockDelta with text, accumulate that
            if (chunk.contentBlockDelta?.delta?.text) {
              const newText = chunk.contentBlockDelta.delta.text;
              accumulatedText += newText;

              // Update the temporary assistant message with the new text so the UI sees it
              this.messageManager.updateMessage(tempMessage.id, {
                content: [{ text: accumulatedText }],
              });
              this.notifyMessageChange();
            }

            // 2) If there's a contentBlockStart with toolUse, that means the model is
            //    starting a tool call. This is where we set up currentToolUse.
            else if (chunk.contentBlockStart?.start?.toolUse) {
              const { name, toolUseId } = chunk.contentBlockStart.start.toolUse;

              currentToolUse = {
                name,
                toolUseId,
                input: {},
              };
            }

            // 3) If there's a contentBlockDelta with toolUse, that's partial JSON input
            //    for the tool. We accumulate it until the model signals stop (tool_use).
            else if (chunk.contentBlockDelta?.delta?.toolUse) {
              if (currentToolUse) {
                const partialInput =
                  chunk.contentBlockDelta.delta.toolUse.input ?? "";
                accumulatedToolInput += partialInput;
              }
            }

            // 4) If the model signals a 'tool_use' stop, we parse the JSON input and actually execute the tool.
            else if (
              chunk.messageStop?.stopReason === "tool_use" &&
              currentToolUse &&
              accumulatedToolInput
            ) {
              try {
                const parsedInput = JSON.parse(accumulatedToolInput);
                const toolUse = {
                  name: currentToolUse.name!,
                  toolUseId: currentToolUse.toolUseId!,
                  input: parsedInput,
                };

                // Update the assistant message to include both text and the final toolUse block
                this.messageManager.updateMessage(tempMessage.id, {
                  content: [{ text: accumulatedText }, { toolUse }],
                  metadata: { ...tempMessage.metadata, hasToolUse: true },
                });
                this.notifyMessageChange();

                // Execute the tool, then add the result as a new message
                const result = await this.toolHandler.executeTool(toolUse);
                this.addMessage(result);

                // Reset the tool state, so we're ready for future tool calls
                currentToolUse = null;
                accumulatedToolInput = "";
              } catch (error) {
                console.error(
                  "callLLM -> Failed to parse/execute tool:",
                  error
                );
                this.addMessage({
                  role: "user",
                  content: [{ text: `Tool execution failed: ${error}` }],
                });
              }
            }
          },
          onComplete: (finalMessage) => {
            console.log(
              "callLLM -> onComplete with finalMessage:",
              finalMessage
            );
            const current = this.messageManager.getMessage(tempMessage.id);
            if (current) {
              this.messageManager.updateMessage(tempMessage.id, {
                content: current.content,
                metadata: { ...current.metadata, isStreaming: false },
              });
              this.notifyMessageChange();
            }
            store.setGenerating(false);

            // Add this to trigger summarization after completion
            this.updateSummary().catch((error) => {
              console.error("Failed to update summary:", error);
            });
          },

          onError: (error) => {
            console.error("callLLM -> onError:", error);
            this.messageManager.updateMessage(tempMessage.id, {
              content: [{ text: "Error: Failed to generate response" }],
              metadata: {
                ...tempMessage.metadata,
                isStreaming: false,
                error: true,
              },
            });
            this.notifyMessageChange();
            store.setGenerating(false);
          },
        },
        enabledTools,
        modelId
      );
    } catch (error) {
      console.error("callLLM -> LLM call failed:", error);
      store.setGenerating(false);
      throw error;
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

    // There is an issue with the tool result not calling the llm.
    if (message.role === "user" && !store.isGenerating.value) {
      this.callLLM();
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

    const messageExists = this.messageManager.getMessage(id);
    if (!messageExists) {
      console.warn(`Message ${id} not found, cannot delete`);
      return;
    }

    this.messageManager.deleteMessage(id);
    this.notifyMessageChange();

    // Keep a minimal safety check to ensure DOM updates
    setTimeout(() => {
      // Check for any elements with this message ID
      const elements = document.querySelectorAll(`[data-message-id="${id}"]`);
      if (elements.length > 0) {
        console.warn(
          `Message ${id} still in DOM after deletion, forcing removal`
        );
        elements.forEach((element) => element.remove());
      }

      // Double check for message containers too
      const containers = document.querySelectorAll(
        `.message-container[data-message-id="${id}"]`
      );
      if (containers.length > 0) {
        containers.forEach((container) => container.remove());
      }
    }, 200);
  }

  public async deleteAllMessages(): Promise<void> {
    if (!this.projectId) {
      console.warn("Attempted to delete all messages with no active project");
      return;
    }

    try {
      // Delete all messages from IndexedDB
      await dbService.deleteMessagesForProject(this.projectId);

      // Clear local message state
      this.messageManager.clear();
      this.notifyMessageChange();

      console.log(`All messages deleted for project ${this.projectId}`);
    } catch (error) {
      console.error("Error deleting all messages:", error);
    }
  }

  public getMessage(id: string): MessageExtended | undefined {
    return this.messageManager.getMessage(id);
  }

  public getMessages(): MessageExtended[] {
    return this.messageManager.getMessages();
  }

  // Keep the callback-based API for backward compatibility
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

    // Explicitly force signal update in messageManager to ensure reactivity
    this.messageManager.updateSignalsExplicitly();

    this.messageChangeCallbacks.forEach((cb) => cb(messages));

    // Mark that we have pending changes and schedule a debounced save
    this.pendingStorageSave = true;
    this.saveToStorageDebounced();
  }

  public destroy(): void {
    console.log("Destroying ConverseStore");

    // Save any pending changes immediately
    if (this.projectId && this.pendingStorageSave) {
      const messages = this.messageManager.getMessages();
      dbService.saveMessages(
        messages.map(msg => ({ ...msg, projectId: this.projectId }))
      ).catch(error => {
        console.error("Failed to save messages during destroy:", error);
      });
    }

    this.messageChangeCallbacks = [];
    this.messageManager.clear();
    // No need to clean up summary state as it's handled by SummaryHandler
  }
}

export const converseStore = new ConverseStore();
