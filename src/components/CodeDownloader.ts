// src/components/CodeDownloader.ts
import { store } from "../stores/AppStore";

export class CodeDownloader {
  private button: HTMLButtonElement;

  constructor() {
    const button = document.querySelector(
      ".file-button.download"
    ) as HTMLButtonElement;
    if (!button) {
      throw new Error("Download button not found in DOM");
    }

    this.button = button;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.button.addEventListener("click", this.handleDownload);
  }

  private handleDownload = () => {
    // Use getCodeContent() instead of accessing codeContent signal directly
    const code = store.getCodeContent().combinedCode;
    if (!code) {
      console.error("No code to download");
      return;
    }

    this.downloadCode(code);
  };

  private downloadCode(code: string) {
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated-code.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public destroy() {
    this.button.removeEventListener("click", this.handleDownload);
  }
}
