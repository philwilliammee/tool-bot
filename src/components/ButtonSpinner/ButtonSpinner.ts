export class ButtonSpinner {
  private button: HTMLButtonElement;
  private originalContent: string;
  private spinnerTemplate: HTMLTemplateElement;

  constructor() {
    const button = document.querySelector(".generate-btn") as HTMLButtonElement;
    if (!button) {
      throw new Error("Generate button not found in DOM");
    }

    const template = document.getElementById(
      "spinner-template"
    ) as HTMLTemplateElement;
    if (!template) {
      throw new Error("Spinner template not found");
    }

    this.button = button;
    this.originalContent = this.button.innerHTML;
    this.spinnerTemplate = template;
  }

  public show(): void {
    const spinner = this.spinnerTemplate.content.cloneNode(true);
    this.button.innerHTML = "";
    this.button.appendChild(spinner);
    this.button.disabled = true;
  }

  public hide(): void {
    this.button.innerHTML = this.originalContent;
    this.button.disabled = false;
  }

  public getElement(): HTMLButtonElement {
    return this.button;
  }

  public destroy(): void {
    this.hide();
  }
}
