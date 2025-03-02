import { MessageExtended } from "../app.types";
import { Project } from "../stores/ProjectStore/ProjectStore.types";

// /agents/summaryAgent.ts
export const summaryAgentConfig = {
  systemPrompt: `You are a summary agent that compresses conversation history while preserving key information.
Your summaries should be concise, factual, and structured to capture:
- Main topics and key points
- Important decisions and conclusions
- Critical facts and technical details
- Pending actions or questions

Focus on clarity and continuity for future reference.`,

  temperature: 0.5, // Lower temperature for more consistent summaries
  maxTokens: 4000,
  // modelId: "text-davinci-003",
  formatSummaryRequest(
    project: Project,
    newMessages: MessageExtended[]
  ): string {
    return `TASK: Integrate ${
      newMessages.length
    } new messages into the existing conversation summary.

CURRENT SUMMARY: ${project.archiveSummary?.summary || "No existing summary."}

NEW MESSAGES:
${newMessages
  .map((m) => `[${m.role}]: ${m.content?.map((c) => c.text).join(" ")}`)
  .join("\n\n")}

INSTRUCTIONS:
1. Create a cohesive summary that combines the existing summary with new information
2. Prioritize technical details, tool interactions, and specific decisions
3. Maintain chronological flow where relevant
4. Format the summary in clear paragraphs organized by topic
5. Keep the summary concise but comprehensive`;
  },
};
