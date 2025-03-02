import { MessageExtended } from "../app.types";
import { Project } from "../stores/ProjectStore/ProjectStore.types";

// /agents/summaryAgent.ts
export const summaryAgentConfig = {
  systemPrompt: `You are a summary agent designed to compress and retain relevant information from conversation history.
Your task is to analyze the provided conversation context and generate a concise summary that captures:
1. Key points and main topics discussed
2. Important decisions or conclusions
3. Critical facts or information shared
4. Any pending actions or questions

Keep the summary structured, factual, and free of unnecessary details. Focus on clarity and brevity while preserving the essence of the conversation.
`,

  temperature: 0.5, // Lower temperature for more consistent summaries
  maxTokens: 4000,
  // modelId: "text-davinci-003",
  formatSummaryRequest(
    project: Project,
    newMessages: MessageExtended[]
  ): string {
    return `There are ${
      newMessages.length
    } new messages to compress into the context.

Current Context Summary: ${project.archiveSummary?.summary || "None"}

New Information to Integrate:
${newMessages
  .map((m) => `[${m.role}]: ${m.content?.map((c) => c.text).join(" ")}`)
  .join("\n\n")}

Please provide an updated context summary that:
1. Maintains all crucial information from the previous summary
2. Integrates new relevant details and decisions
3. Preserves technical specifics and tool interactions
4. Ensures context continuity for future reference`;
  },
};
