import { Chat } from "../Chat/chat";
import { CsvUploader } from "../CsvUploader";
import { CodeDownloader } from "../CodeDownloader";
import { CodeEditorComponent } from "../CodeEditor/CodeEditorComponent";
import { store } from "../../stores/AppStore";
import { Toast } from "../Toast/Toast";

export class MainApplication {
  // Components
  private codeEditor!: CodeEditorComponent;
  private chat!: Chat;
  private csvUploader!: CsvUploader;
  private codeDownloader!: CodeDownloader;

  // DOM Elements
  private tabs!: NodeListOf<HTMLButtonElement>;
  private tabContents!: NodeListOf<HTMLElement>;
  private codeEditorContainer!: HTMLElement;
  private iframeContainer!: HTMLElement;
  private executeButton!: HTMLButtonElement;

  constructor() {
    console.log("Initializing MainApplication");
    this.initializeDOMElements();
    this.initializeComponents();
    this.setupEventListeners();
    new Toast();
  }

  private initializeDOMElements(): void {
    this.tabs = document.querySelectorAll(".tab-header button");
    this.tabContents = document.querySelectorAll(".tab-content > div");
    this.codeEditorContainer = document.getElementById(
      "codeEditor"
    ) as HTMLElement;
    this.iframeContainer = document.getElementById(
      "iframeContainer"
    ) as HTMLElement; // Add this back
    this.executeButton = document.querySelector(
      ".execute-btn"
    ) as HTMLButtonElement;

    if (
      !this.tabs.length ||
      !this.tabContents.length ||
      !this.codeEditorContainer ||
      !this.iframeContainer ||
      !this.executeButton
    ) {
      throw new Error("Required DOM elements not found");
    }
  }

  private initializeComponents(): void {
    // Initialize CodeEditor
    this.codeEditor = new CodeEditorComponent("code-editor");
    // Remove this line since the element is already in the DOM:
    // this.codeEditorContainer.appendChild(this.codeEditor.getElement());

    // Set default content
    // Initialize with default content using store
    store.setAllCode({
      html: "<h1>Hello, World!</h1>",
      css: "h1 { color: red; }",
      javascript: 'console.log("Hello, World!");',
    });

    // Initialize utility components
    this.csvUploader = new CsvUploader();
    this.codeDownloader = new CodeDownloader();

    // Initialize Chat
    this.chat = new Chat({
      codeEditor: this.codeEditor,
      csvUploader: this.csvUploader,
    });
  }

  private setupEventListeners(): void {
    this.tabs.forEach((tab) => {
      tab.addEventListener("click", () => this.switchTab(tab));
    });

    this.executeButton.addEventListener("click", () => this.executeCode());
  }

  private switchTab(clickedTab: HTMLButtonElement): void {
    const targetId = clickedTab.dataset.tab;
    if (!targetId) return;

    // Update tab buttons
    this.tabs.forEach((tab) => {
      tab.classList.toggle("active", tab === clickedTab);
    });

    // Update content sections
    this.tabContents.forEach((content) => {
      content.classList.toggle("active", content.id === targetId);
    });

    // If switching to code editor, refresh layout
    if (targetId === "codeEditor") {
      this.codeEditor.layoutEditors();
    }
  }

  private async executeCode(): Promise<void> {
    try {
      const code = this.codeEditor.getCode();
      const iframe = this.resetIframe();

      // @todo feedback assistant if iframe has write error.

      const iframeDocument = iframe.contentWindow?.document;
      if (!iframeDocument) {
        throw new Error("Unable to access the iframe's document");
      }

      iframeDocument.open();
      iframeDocument.write(code.combinedCode);
      iframeDocument.close();

      // Switch to preview tab
      const previewTab = document.querySelector('[data-tab="iframeContainer"]');
      if (previewTab instanceof HTMLButtonElement) {
        this.switchTab(previewTab);
      }
    } catch (error: any) {
      console.error("Error executing code:", error);
      store.setError(error.message);
    }
  }

  private resetIframe(): HTMLIFrameElement {
    const oldIframe = document.getElementById(
      "outputIframe"
    ) as HTMLIFrameElement;
    const newIframe = document.createElement("iframe");
    newIframe.id = "outputIframe";
    newIframe.sandbox.value = "allow-scripts allow-same-origin allow-modals";
    // newIframe.style.width = this.iframeContainer.style.width;
    // newIframe.style.height = this.iframeContainer.style.height;

    oldIframe.parentElement?.replaceChild(newIframe, oldIframe);
    return newIframe;
  }

  public destroy(): void {
    this.chat?.destroy();
    this.codeEditor?.destroy();
    this.csvUploader?.destroy?.();
    this.codeDownloader?.destroy?.();
  }
}
