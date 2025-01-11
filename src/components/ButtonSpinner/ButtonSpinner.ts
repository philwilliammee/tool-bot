// src/components/ButtonSpinner/ButtonSpinner.ts
export class ButtonSpinner {
  private button: HTMLButtonElement;
  private originalContent: string;

  constructor() {
    const button = document.querySelector(".generate-btn") as HTMLButtonElement;
    if (!button) {
      throw new Error("Generate button not found in DOM");
    }

    this.button = button;
    this.originalContent = this.button.innerHTML;
  }

  public show(): void {
    this.button.innerHTML = `
      <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
      </svg>
    `;
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
