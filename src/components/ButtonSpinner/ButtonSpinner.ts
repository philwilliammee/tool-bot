export class ButtonSpinner {
  private generateButton: HTMLButtonElement;
  private originalContent: string;
  private spinnerTemplate: HTMLTemplateElement;

  constructor() {
    const generateButton = document.querySelector(
      ".generate-btn"
    ) as HTMLButtonElement;
    if (!generateButton) {
      throw new Error("Generate button not found in DOM");
    }

    const template = document.getElementById(
      "spinner-template"
    ) as HTMLTemplateElement;
    if (!template) {
      throw new Error("Spinner template not found");
    }

    this.generateButton = generateButton;
    this.originalContent = this.generateButton.innerHTML;
    this.spinnerTemplate = template;
  }

  public show(): void {
    const spinner = this.spinnerTemplate.content.cloneNode(true);
    this.generateButton.innerHTML = "";
    this.generateButton.appendChild(spinner);
    this.generateButton.disabled = true;
  }

  public hide(): void {
    this.generateButton.innerHTML = this.originalContent;
    this.generateButton.disabled = false;
  }

  public getElement(): HTMLButtonElement {
    return this.generateButton;
  }

  public destroy(): void {
    this.hide();
  }
}
