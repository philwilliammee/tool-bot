// src/components/WorkArea/Modals/ViewModal.ts
import { MessageExtended } from "../../../app.types";
import { BaseModal } from "./BaseModal";

export class ViewModal extends BaseModal {
  constructor() {
    super("view-modal");
  }

  public show(message: MessageExtended): void {
    const roleElement = this.dialog.querySelector(".role-value");
    const contentElement = this.dialog.querySelector(".content-value");
    const tagsElement = this.dialog.querySelector(".tags-value");
    // const ratingElement = this.dialog.querySelector(".rating-value");
    const timestampElement = this.dialog.querySelector(".timestamp-value");

    if (roleElement) roleElement.textContent = message.role || "unknown";
    if (contentElement)
      contentElement.textContent = this.formatMessageContent(message);

    if (tagsElement) {
      this.renderTags(tagsElement, message.metadata?.tags);
    }

    // if (ratingElement) {
    //   ratingElement.textContent = message.metadata?.userRating ? "❤️" : "🤍";
    // }

    if (timestampElement) {
      timestampElement.textContent = new Date(
        message.metadata.createdAt
      ).toLocaleString();
    }

    this.dialog.showModal();
  }

  private renderTags(container: Element, tags?: string[]): void {
    container.innerHTML = "";
    if (tags?.length) {
      tags.forEach((tag) => {
        const tagSpan = document.createElement("span");
        tagSpan.className = "message-tag";
        tagSpan.textContent = tag;
        container.appendChild(tagSpan);
      });
    } else {
      container.textContent = "No tags";
    }
  }

  private formatMessageContent(message: MessageExtended): string {
    let content = "";
    message.content?.forEach((block, index) => {
      if (block.text) {
        content += block.text;
      } else if (block.toolResult) {
        content += `TOOL RESULT:\n${JSON.stringify(block.toolResult, null, 2)}`;
      } else if (block.toolUse) {
        content += `TOOL USAGE:\n${JSON.stringify(block.toolUse, null, 2)}`;
      } else {
        content += "[Unknown block type]";
      }

      if (index < (message.content?.length || 0) - 1) {
        content += "\n---\n";
      }
    });
    return content;
  }
}
