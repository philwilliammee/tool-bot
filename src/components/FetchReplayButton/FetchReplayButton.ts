import { ContentBlock } from "@aws-sdk/client-bedrock-runtime";
import { fetchTool } from "../../../tools/fetch-tool/client/fetch.client";
import { MessageExtended } from "../../app.types";
import { store } from "../../stores/AppStore";

export class FetchReplayButton {
  private button: HTMLButtonElement;
  private cleanupFns: Array<() => void> = [];

  constructor(message: MessageExtended) {
    const template = document.getElementById(
      "fetch-replay-button-template"
    ) as HTMLTemplateElement;

    if (!template) {
      throw new Error("Fetch replay button template not found");
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
        const fetchToolUse = message.content?.find(
          (block) => block.toolUse?.name === "fetch_url"
        );

        if (fetchToolUse?.toolUse) {
          try {
            console.log("Re-executing fetch tool use:", fetchToolUse.toolUse);

            // Execute the fetch tool with the original parameters
            // The fetch tool will automatically trigger markdown preview if configured
            const originalInput = fetchToolUse.toolUse.input as any;
            await fetchTool.execute({
              ...originalInput,
              autoSwitchTab: false, // We'll handle tab switching through the store
            });

            // Switch to preview tab and normalize layout, just like HTML tool
            store.setHtmlContentView();

            store.showToast("Fetch replayed and preview updated");
          } catch (error) {
            console.error("Failed to replay fetch:", error);
            store.showToast("Failed to replay fetch");
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

  // Static helper to check if a message has fetch tool use
  public static hasFetchTool(message: MessageExtended): boolean {
    return (
      message.content?.some(
        (block: ContentBlock) => block.toolUse?.name === "fetch_url"
      ) || false
    );
  }
}
