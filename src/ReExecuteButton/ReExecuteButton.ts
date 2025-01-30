// src/components/ReExecuteButton/ReExecuteButton.ts
import { ContentBlock } from "@aws-sdk/client-bedrock-runtime";
import { htmlTool } from "../../tools/html-tool/client/html.client";
import { MessageExtended } from "../app.types";
import { store } from "../stores/AppStore";

export class ReExecuteButton {
  private button: HTMLButtonElement;
  private cleanupFns: Array<() => void> = [];

  constructor(message: MessageExtended) {
    const template = document.getElementById(
      "re-execute-button-template"
    ) as HTMLTemplateElement;

    if (!template) {
      throw new Error("Re-execute button template not found");
    }

    this.button = this.createButton(template);
    this.setupEventListeners(message);
  }

  private createButton(template: HTMLTemplateElement): HTMLButtonElement {
    const element = template.content.cloneNode(true) as HTMLElement;
    const button = element.querySelector("button");
    if (!button) {
      throw new Error("Button element not found in template");
    }
    return button as HTMLButtonElement;
  }

  private setupEventListeners(message: MessageExtended): void {
    const handler = async () => {
      if (!store.isGenerating.value) {
        const htmlToolUse = message.content?.find(
          (block) => block.toolUse?.name === "html"
        );

        if (htmlToolUse?.toolUse) {
          try {
            console.log("Re-executing HTML tool use:", htmlToolUse.toolUse);
            await htmlTool.execute(htmlToolUse.toolUse.input);
            store.setActiveTab("preview");
            store.setPanelExpanded(false); // Collapse panel when executing HTML
          } catch (error) {
            console.error("Failed to re-execute HTML:", error);
            store.showToast("Failed to re-execute HTML");
          }
        }
      }
    };

    this.button.addEventListener("click", handler);
    this.cleanupFns.push(() =>
      this.button.removeEventListener("click", handler)
    );
  }

  public getElement(): HTMLButtonElement {
    return this.button;
  }

  public destroy(): void {
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];
  }

  // Static helper to check if a message has HTML tool use
  public static hasHtmlTool(message: MessageExtended): boolean {
    return (
      message.content?.some(
        (block: ContentBlock) => block.toolUse?.name === "html"
      ) || false
    );
  }
}
