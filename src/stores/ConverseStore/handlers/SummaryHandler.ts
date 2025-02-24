// src/stores/ConverseStore/handlers/SummaryHandler.ts
import { computed, signal, Signal } from "@preact/signals-core";
import { Message } from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended } from "../../../app.types";
import { LLMHandler } from "./LLMHandler";
import { Project } from "../../ProjectStore/ProjectStore.types";
import { projectStore } from "../../ProjectStore/ProjectStore";
import { summaryAgentConfig } from "../../../agents/summaryAgent";

export class SummaryHandler {
  private isSummarizing = signal<boolean>(false);
  private summaryState = signal<
    Record<
      string,
      {
        summary: string | null;
        lastUpdate: number;
      }
    >
  >({});
  private summarizationCooldown: number = 5000;

  constructor(private llmHandler: LLMHandler) {
    // Initialize with existing projects
    this.loadExistingProjects();
  }

  private loadExistingProjects(): void {
    const projects = projectStore.getAllProjects();
    const initialState: Record<
      string,
      { summary: string | null; lastUpdate: number }
    > = {};

    projects.forEach((project) => {
      initialState[project.id] = {
        summary: project.archiveSummary?.summary || null,
        lastUpdate: project.archiveSummary?.lastSummarization || 0,
      };
    });

    this.summaryState.value = initialState;
  }

  // Add method to load a specific project's summary
  public loadProjectSummary(projectId: string | null): void {
    if (!projectId) {
      // Clear the summary state for the current project
      this.summaryState.value = {};
      return;
    }

    const project = projectStore.getProject(projectId);
    if (!project) return;

    this.summaryState.value = {
      ...this.summaryState.value,
      [projectId]: {
        summary: project.archiveSummary?.summary || null,
        lastUpdate: project.archiveSummary?.lastSummarization || 0,
      },
    };

    console.log("Loaded summary state for project:", {
      projectId,
      summary: project.archiveSummary?.summary,
      lastUpdate: project.archiveSummary?.lastSummarization,
    });
  }

  public getSummary(projectId: string): Signal<string | null> {
    // Make sure the project is loaded in our state
    if (!this.summaryState.value[projectId]) {
      this.loadProjectSummary(projectId);
    }
    return computed(() => this.summaryState.value[projectId]?.summary ?? null);
  }
  public getIsSummarizing(): Signal<boolean> {
    return this.isSummarizing;
  }

  public getLastUpdate(projectId: string): number {
    return this.summaryState.value[projectId]?.lastUpdate ?? 0;
  }

  private setSummary(projectId: string, summary: string | null): void {
    this.summaryState.value = {
      ...this.summaryState.value,
      [projectId]: {
        summary,
        lastUpdate: Date.now(),
      },
    };
  }

  private saveSummaryState(
    projectId: string,
    summary: Project["archiveSummary"]
  ): void {
    projectStore.updateProject(projectId, {
      archiveSummary: summary,
    });
  }

  public async summarizeArchivedMessages(
    projectId: string,
    archivedMessages: MessageExtended[]
  ): Promise<void> {
    if (this.isSummarizing.value) return; // Access signal value

    const project = projectStore.getProject(projectId);
    if (!project) return;

    const newArchivedMessages = archivedMessages.filter(
      (msg) =>
        !project.archiveSummary?.lastSummarizedMessageIds.includes(msg.id)
    );

    if (!this.shouldTriggerSummarization(project, newArchivedMessages)) {
      console.log(`Summarization not triggered for project ${projectId}`);
      return;
    }

    try {
      this.isSummarizing.value = true; // Set signal value
      const newSummary = await this.generateSummary(
        project,
        newArchivedMessages
      );
      this.saveSummaryState(projectId, newSummary);
    } catch (error) {
      console.error("Summarization failed:", error);
    } finally {
      this.isSummarizing.value = false; // Set signal value
    }
  }

  private shouldTriggerSummarization(
    project: Project,
    newMessages: MessageExtended[]
  ): boolean {
    if (this.isSummarizing.value) return false; // Access signal value

    const lastSummarization = project.archiveSummary?.lastSummarization || 0;
    if (Date.now() - lastSummarization < this.summarizationCooldown)
      return false;

    return newMessages.length > 0;
  }

  private async generateSummary(
    project: Project,
    newMessages: MessageExtended[]
  ): Promise<Project["archiveSummary"]> {
    const summaryRequest: Message = {
      role: "user",
      content: [
        {
          text: summaryAgentConfig.formatSummaryRequest(project, newMessages),
        },
      ],
    };

    const response = await this.llmHandler.invoke(
      [summaryRequest],
      summaryAgentConfig.systemPrompt
    );

    return {
      summary: response.content?.[0]?.text || null,
      lastSummarizedMessageIds: [
        ...(project.archiveSummary?.lastSummarizedMessageIds || []),
        ...newMessages.map((m) => m.id),
      ],
      lastSummarization: Date.now(),
    };
  }
}
