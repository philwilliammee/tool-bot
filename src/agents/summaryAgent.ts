import { MessageExtended } from "../app.types";
import { Project } from "../stores/ProjectStore/ProjectStore.types";

// /agents/summaryAgent.ts
export const summaryAgentConfig = {
  systemPrompt: `You are a specialized context compression agent. Your task is to create detailed, information-dense summaries of conversations while maintaining crucial context for future reference.

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
- Indicate when certain details are simplified or omitted for brevity`,

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
