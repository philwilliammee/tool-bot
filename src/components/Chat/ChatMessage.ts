import { marked } from "marked";
import { MessageExtended } from "../../app.types";
import { ReExecuteButton } from "../ReExecuteButton/ReExecuteButton";

export class ChatMessage {
  private element: HTMLElement | null = null;
  private content: HTMLElement | null = null;
  private cleanupFns: Array<() => void> = [];

  /**
   * Tracks how many characters we've displayed so far during streaming.
   * Each new chunk might repeat old text, so we only append the "new" portion.
   */
  private partialSoFar = "";

  constructor(
    private message: MessageExtended,
    private isLastAssistant: boolean
  ) {}

  /**
   * Creates the main DOM element for this message by cloning a template.
   */
  public async render(): Promise<HTMLElement | null> {
    if (this.message.metadata.hasToolResult) {
    }
    const templateId = this.message.metadata.hasToolResult
      ? "tool-message-template"
      : `${this.message.role}-message-template`;
    const template = document.getElementById(templateId) as HTMLTemplateElement;
    if (!template) return null;

    // Clone the template into this.element
    this.element = template.content.cloneNode(true) as HTMLElement;
    this.content = this.element.querySelector(".message-content-wrapper");
    if (!this.content) return null;

    this.content.setAttribute("data-message-id", this.message.id);
    this.content.setAttribute(
      "data-timestamp",
      this.message.metadata.createdAt.toString()
    );
    this.content.classList.add("markdown-body");

    // Render or update content
    await this.update(this.message);

    return this.element;
  }

  /**
   * Called whenever this message is updated in the store
   * (e.g., partial streaming text changes or final data).
   */
  public async update(newMessage: MessageExtended): Promise<void> {
    this.message = newMessage;
    await this.updateContent();
  }

  /**
   * Renders the content differently depending on whether we're still streaming
   * or if the message is complete.
   */
  private async updateContent(): Promise<void> {
    if (!this.content) return;

    if (this.message.metadata.isStreaming) {
      // --- PARTIAL STREAMING MODE ---

      // 1) Gather the full partial text so far
      const fullPartialText = (this.message.content || [])
        .map((block) => block.text || "")
        .join("");

      // 2) Extract only the newly added portion
      const oldLength = this.partialSoFar.length;
      const newSlice = fullPartialText.slice(oldLength);

      if (newSlice) {
        // Convert the new text portion to HTML
        const newHtml = await marked(newSlice);
        // Append it to the existing DOM instead of replacing
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = newHtml;
        while (tempDiv.firstChild) {
          this.content.appendChild(tempDiv.firstChild);
        }
      }

      // 3) Update partialSoFar
      this.partialSoFar = fullPartialText;
    } else {
      // --- STREAMING COMPLETED ---

      // Reset partial text
      this.partialSoFar = "";
      // Render the final, fully assembled message
      await this.renderCompleteMessage();
    }
  }

  /**
   * Renders the final message: all text plus any tool blocks, etc.
   */
  private async renderCompleteMessage(): Promise<void> {
    if (!this.content) return;

    // Clear out any old partial text
    this.content.innerHTML = "";

    let textContent = "";
    const toolBlocks: HTMLElement[] = [];

    // Separate text blocks from tool blocks
    for (const block of this.message.content || []) {
      if (block.text) {
        textContent += block.text;
      } else if (block.toolUse || block.toolResult) {
        // Create <details> elements for tool usage/results
        const details = await this.createToolElement(block);
        toolBlocks.push(...details);
      }
    }

    // Render all text (markdown)
    if (textContent) {
      const textDiv = document.createElement("div");
      textDiv.className = "message-text";
      textDiv.innerHTML = await marked(textContent);
      this.content.appendChild(textDiv);
    }

    // Render any tool blocks
    toolBlocks.forEach((block) => this.content!.appendChild(block));

    // (Optional) syntax highlighting if you have hljs
    // this.content.querySelectorAll("pre code").forEach((block) => {
    //   if (window.hljs) {
    //     window.hljs.highlightElement(block as HTMLElement);
    //   }
    // });
  }

  /**
   * Creates a <details> element for either a "Tool Use" or "Tool Result" block.
   */
  private async createToolElement(block: any): Promise<HTMLElement[]> {
    const elements: HTMLElement[] = [];

    const details = document.createElement("details");
    details.className = "tool-disclosure";
    details.open = this.isLastAssistant; // open by default if it's the last assistant msg?

    const summary = document.createElement("summary");
    summary.className = "tool-header";
    summary.textContent = block.toolUse ? "Tool Use" : "Tool Result";

    // Show the block's JSON
    const content = document.createElement("div");
    content.className = "tool-content markdown-body";
    content.innerHTML = await marked(
      `\`\`\`json\n${JSON.stringify(
        block.toolUse || block.toolResult,
        null,
        2
      )}\n\`\`\``
    );

    details.appendChild(summary);
    details.appendChild(content);
    elements.push(details);

    // If the block includes a toolUse, possibly show a re-execute button
    if (block.toolUse && ReExecuteButton.hasHtmlTool(this.message)) {
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "message-actions";
      const reExecuteButton = new ReExecuteButton(this.message);
      actionsDiv.appendChild(reExecuteButton.getElement());
      elements.push(actionsDiv);

      // Cleanup for the re-execute button
      this.cleanupFns.push(() => reExecuteButton.destroy());
    }

    return elements;
  }

  /**
   * Destroys this ChatMessage component and cleans up event listeners.
   */
  public destroy(): void {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
    this.element = null;
    this.content = null;
  }
}
