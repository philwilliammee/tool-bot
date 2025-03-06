import { MessageExtended } from "../app.types";
import { Project } from "../stores/ProjectStore/ProjectStore.types";

// /agents/summaryAgent.ts
export const summaryAgentConfig = {
  systemPrompt: `You are a technical conversation summary agent. Compress archived messages while preserving context.

SUMMARY STRUCTURE:
1. Current Context: Active focus, ongoing tests, explorations
2. Progress: Recent completions, changes, updates
3. Status: Use ✅ (done), 🚧 (in progress), ⏳ (pending), ❌ (rejected)
4. Key Decisions: What, why, alternatives, outcomes
5. Challenges: Problems and solutions
6. Tool Usage: Examples of tools used, inputs/outputs, successful patterns

GUIDELINES:
- Be extremely concise (<500 words total)
- Use bullet points, not paragraphs
- Focus on facts over opinions
- Track important files, functions, variables, errors
- Note conversation timeline and focus shifts
- Structure for easy reference and future queries
- Document key technical knowledge, patterns, APIs
- Record successful tool usage patterns and examples
- Preserve sample inputs/outputs from effective tool usages
- ONLY include information present in the messages
- NEVER add new information or expand beyond what's provided

Prioritize technical accuracy while being as concise as possible. Focus on maintaining conversation continuity.`,

  temperature: 0.5, // Lower temperature for more consistent summaries
  maxTokens: 4000,

  formatSummaryRequest(
    project: Project,
    newMessages: MessageExtended[]
  ): string {
    // Format messages into a suitable request for the LLM
    return `Provide a concise summary of the following archived messages to maintain context.

Project Name: ${project.name}
Recent Messages: ${newMessages.length}

PREVIOUS SUMMARY:
${project.archiveSummary?.summary || "No previous summary available."}

NEW MESSAGES TO INCORPORATE:
${newMessages
  .map((msg) => {
    const rolePrefix = msg.role === "user" ? "USER" : "ASSISTANT";
    const contentText = msg.content
      ?.map((block) => block.text || JSON.stringify(block))
      .join("\n");
    return `--- ${rolePrefix} MESSAGE ---\n${contentText}\n`;
  })
  .join("\n")}

IMPORTANT: Create a single comprehensive summary that incorporates BOTH the previous summary AND the new messages. Do NOT add any new information beyond what is contained in these sources. Your task is purely to compress and organize the existing content from both the previous summary and new messages into one cohesive summary.`;
  },
};
