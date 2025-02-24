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

  private lastSummarization: number = 0;
  private summarizationCooldown: number = 5000; // 5 seconds
  private archiveSummary: string | null = null;
  private isSummarizing: boolean = false;
  private lastSummarizedMessageIds: Set<string> = new Set();

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

  private loadSummaryState(): void {
    if (!this.projectId) return;

    const project = projectStore.getProject(this.projectId);
    if (project?.metadata?.archiveSummary) {
      const { summary, lastSummarizedMessageIds, lastSummarization } =
        project.metadata.archiveSummary;

      console.log(`Loading summary state for project ${this.projectId}`, {
        summary,
        lastSummarizedMessageIds,
        lastSummarization,
      });

      this.archiveSummary = summary;
      this.lastSummarization = lastSummarization;
      this.lastSummarizedMessageIds = new Set(lastSummarizedMessageIds); // Ensure it's reset for this project
    } else {
      console.log(
        `No summary state found for project ${this.projectId}, resetting.`
      );
      this.archiveSummary = null;
      this.lastSummarization = 0;
      this.lastSummarizedMessageIds.clear();
    }
  }

  private saveSummaryState(): void {
    if (!this.projectId) return;

    const project = projectStore.getProject(this.projectId);
    if (project) {
      projectStore.saveProjectMessages(this.projectId, project.messages, {
        ...project.metadata,
        archiveSummary: {
          summary: this.archiveSummary,
          lastSummarizedMessageIds: Array.from(this.lastSummarizedMessageIds),
          lastSummarization: this.lastSummarization,
        },
      });
    }
  }

  // Add new methods for summarization
  private shouldTriggerSummarization(
    archivedMessages: MessageExtended[]
  ): boolean {
    // Remove the project filtering here since we've already done it
    console.log("Checking if should summarize:", {
      projectId: this.projectId,
      isSummarizing: this.isSummarizing,
      timeSinceLastSummary: Date.now() - this.lastSummarization,
      cooldown: this.summarizationCooldown,
      archivedCount: archivedMessages.length,
      hasSummary: !!this.archiveSummary,
      lastSummarizedIds: Array.from(this.lastSummarizedMessageIds),
    });

    if (this.isSummarizing) return false;
    if (Date.now() - this.lastSummarization < this.summarizationCooldown)
      return false;

    // Only summarize if we have archived messages
    if (archivedMessages.length === 0) return false;

    // If we don't have a summary yet and have archived messages
    if (!this.archiveSummary && archivedMessages.length > 0) {
      return true;
    }

    // Check for any archived messages not in lastSummarizedMessageIds
    const hasUnsummarizedMessages = archivedMessages.some(
      (msg) => !this.lastSummarizedMessageIds.has(msg.id)
    );

    return hasUnsummarizedMessages;
  }

  private async summarizeArchivedMessages(): Promise<void> {
    if (this.isSummarizing) return;

    const allMessages = this.messageManager.getMessages();
    const { archivedMessages } = determineActiveMessageRange(
      allMessages,
      this.messageManager.threshold
    );

    // Add debug logging
    console.log("Archive summary debug:", {
      totalMessages: allMessages.length,
      totalArchived: archivedMessages.length,
      currentProjectId: this.projectId,
      archivedMessageDetails: archivedMessages.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        isArchived: m.metadata.isArchived,
      })),
    });

    // Find new archived messages that haven't been summarized yet
    const projectArchivedMessages = archivedMessages.filter(
      (msg) =>
        msg.metadata.isArchived &&
        (!msg.projectId || msg.projectId === this.projectId) // Check both conditions
    );

    console.log("Project-specific archived messages:", {
      count: projectArchivedMessages.length,
      messages: projectArchivedMessages.map((m) => m.id),
    });

    const newArchivedMessages = projectArchivedMessages.filter(
      (msg) => !this.lastSummarizedMessageIds.has(msg.id)
    );

    console.log("New messages to summarize:", {
      count: newArchivedMessages.length,
      messages: newArchivedMessages.map((m) => m.id),
    });

    // Check if we should summarize BEFORE setting isSummarizing
    if (!this.shouldTriggerSummarization(newArchivedMessages)) {
      console.log(`Summarization not triggered for project ${this.projectId}`);
      return;
    }

    try {
      this.isSummarizing = true;

      // Prepare messages for summarization
      const summaryRequest: Message = {
        role: "user",
        content: [
          {
            text: `There are ${
              newArchivedMessages.length
            } new messages to compress into the context.
  
  Current Context Summary: ${this.archiveSummary || "None"}
  
  New Information to Integrate:
  ${newArchivedMessages
    .map(
      (m) =>
        `[${m.role}]: ${m.content?.map((c) => c.text).join(" ")}`
    )
    .join("\n\n")}
  
  Please provide an updated context summary that:
  1. Maintains all crucial information from the previous summary
  2. Integrates new relevant details and decisions
  3. Preserves technical specifics and tool interactions
  4. Ensures context continuity for future reference`,
          },
        ],
      };

      // Call LLM using invoke (non-streaming)
      const response = await this.llmHandler.invoke(
        [summaryRequest],
        `You are a specialized context compression agent. Your task is to create detailed, information-dense summaries of conversations while maintaining crucial context for future reference.
  
  Key responsibilities:
  1. Preserve important technical details, decisions, and action items
  2. Maintain contextual connections between topics
  3. Track the evolution of ideas and solutions
  4. Highlight critical user requirements or constraints
  5. Include relevant code snippets, API responses, or tool outputs that might be needed for context
  6. Ensure any resolved issues or established patterns are documented
  
  When summarizing:
  - Previous summary represents compressed historical context - integrate new information while maintaining its key points
  - Focus on preserving information that future parts of the conversation might reference
  - Use concise but specific language to maximize information density
  - Structure the summary to make it easy to reference specific points
  - Indicate when certain details are simplified or omitted for brevity
  
  Your summary will be used as context for future interactions, so ensure it contains enough detail for the conversation to continue coherently.`
      );

      // Update summary state
      this.archiveSummary = response.content?.[0]?.text || null;
      this.lastSummarization = Date.now();

      // Record newly summarized messages
      newArchivedMessages.forEach((msg) => {
        this.lastSummarizedMessageIds.add(msg.id);
      });

      this.saveSummaryState();
      this.notifyMessageChange();
    } catch (error) {
      console.error("Summarization failed:", error);
    } finally {
      this.isSummarizing = false;
    }
  }

  // Public methods to access summary state
  public getArchiveSummary(): string | null {
    return this.archiveSummary;
  }

  public getIsSummarizing(): boolean {
    return this.isSummarizing;
  }

  public setProject(id: string | null): void {
    console.log("Setting project:", id);
    this.projectId = id;

    if (id) {
      const project = projectStore.getProject(id);
      console.log("Loaded project data:", project);

      this.loadSummaryState();

      if (project?.messages) {
        const messages = Array.isArray(project.messages)
          ? project.messages
          : [];
        const maxSequence =
          messages.length > 0
            ? Math.max(
                ...messages.map((m) => parseInt(m.id.split("_")[1] || "0")),
                0
              )
            : 0;

        console.log("Initializing message manager with sequence:", maxSequence);

        this.messageManager.setState({
          messages: messages,
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
      this.archiveSummary = null;
      this.lastSummarization = 0;
      this.lastSummarizedMessageIds.clear();
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

  public async forceSummarize(): Promise<void> {
    this.lastSummarization = 0; // Reset cooldown
    return this.summarizeArchivedMessages();
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

    // Handle LLM call for user messages. There is an issue if it is a fast toolcall and its generating.
    // if (newMessage.role === "user" && !store.isGenerating.value) {
    // should this be and if is not streaming?
    if (newMessage.role === "user") {
      this.callLLM();
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

  private async callLLM(): Promise<void> {
    try {
      store.setGenerating(true);
      const allMessages = this.messageManager.getMessages();
      const { activeMessages, archivedMessages } = determineActiveMessageRange(
        allMessages,
        this.messageManager.threshold
      );

      const messagesForLLM = [...activeMessages];

      // Add archive summary context if available
      if (this.archiveSummary && archivedMessages.length > 0) {
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
                text: `Previous conversation summary (${archivedMessages.length} archived messages): ${this.archiveSummary}`,
              },
              ...(messagesForLLM[userIndex].content || []),
            ],
          };
        }
      }

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

      console.log("callBedrockLLM -> Sending to LLM:", messagesForLLM);

      let currentToolUse: Partial<ToolUse> | null = null;
      let accumulatedToolInput = "";
      let accumulatedText = "";

      // Create a temporary streaming assistant message
      const tempMessage = this.messageManager.addMessage({
        role: "assistant",
        content: [{ text: "" }],
      });
      console.log("callBedrockLLM -> tempMessage created:", tempMessage.id);

      await this.llmHandler.callLLMStream(messagesForLLM, {
        onChunk: async (chunk) => {
          console.log("callBedrockLLM -> onChunk, chunk =", chunk);

          // 1) If there's a contentBlockDelta with text, accumulate that
          if (chunk.contentBlockDelta?.delta?.text) {
            const newText = chunk.contentBlockDelta.delta.text;
            // console.log("callBedrockLLM -> text chunk:", newText);
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
            // console.log("callBedrockLLM -> tool use started:", {
            //   name,
            //   toolUseId,
            // });

            currentToolUse = {
              name,
              toolUseId,
              input: {},
            };
          }

          // 3) If there's a contentBlockDelta with toolUse, that’s partial JSON input
          //    for the tool. We accumulate it until the model signals stop (tool_use).
          else if (chunk.contentBlockDelta?.delta?.toolUse) {
            if (currentToolUse) {
              const partialInput =
                chunk.contentBlockDelta.delta.toolUse.input ?? "";
              // console.log(
              //   "callBedrockLLM -> partial toolUse input:",
              //   partialInput
              // );
              accumulatedToolInput += partialInput;
            }
          }

          // 4) If the model signals a 'tool_use' stop, we parse the JSON input and actually execute the tool.
          else if (
            chunk.messageStop?.stopReason === "tool_use" &&
            currentToolUse &&
            accumulatedToolInput
          ) {
            // console.log(
            //   "callBedrockLLM -> tool_use stop, final tool input:",
            //   accumulatedToolInput
            // );

            try {
              const parsedInput = JSON.parse(accumulatedToolInput);
              const toolUse = {
                name: currentToolUse.name!,
                toolUseId: currentToolUse.toolUseId!,
                input: parsedInput,
              };

              // console.log("callBedrockLLM -> About to execute tool:", toolUse);

              // Update the assistant message to include both text and the final toolUse block
              this.messageManager.updateMessage(tempMessage.id, {
                content: [{ text: accumulatedText }, { toolUse }],
                metadata: { ...tempMessage.metadata, hasToolUse: true },
              });
              this.notifyMessageChange();

              // Execute the tool, then add the result as a new message
              const result = await this.toolHandler.executeTool(toolUse);
              // console.log("callBedrockLLM -> Tool execution result:", result);
              this.addMessage(result);

              // Reset the tool state, so we’re ready for future tool calls
              currentToolUse = null;
              accumulatedToolInput = "";
            } catch (error) {
              console.error(
                "callBedrockLLM -> Failed to parse/execute tool:",
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
            "callBedrockLLM -> onComplete with finalMessage:",
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
          this.summarizeArchivedMessages().catch((error) => {
            console.error("Failed to generate archive summary:", error);
          });
        },

        onError: (error) => {
          console.error("callBedrockLLM -> onError:", error);
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
      });
    } catch (error) {
      console.error("callBedrockLLM -> LLM call failed:", error);
      store.setGenerating(false); // Added here for uncaught errors
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
      const project = projectStore.getProject(this.projectId);
      projectStore.saveProjectMessages(this.projectId, messages, {
        ...project?.metadata,
        archiveSummary: {
          summary: this.archiveSummary,
          lastSummarizedMessageIds: Array.from(this.lastSummarizedMessageIds),
          lastSummarization: this.lastSummarization,
        },
      });
    } else {
      console.warn("Attempted to save messages with no active project");
    }
  }

  public destroy(): void {
    console.log("Destroying ConverseStore");
    this.saveToStorage();
    this.messageChangeCallbacks = [];
    this.messageManager.clear();
    this.archiveSummary = null;
    this.lastSummarization = 0;
    this.lastSummarizedMessageIds.clear(); // Add this line
    this.isSummarizing = false;
  }
}

export const converseStore = new ConverseStore();
