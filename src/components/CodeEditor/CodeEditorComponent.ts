import { MonacoEditor } from "./MonacoEditor";
import { store } from "../../stores/AppStore";
import { effect } from "@preact/signals-core";

type EditorType = "html" | "css" | "javascript" | "combined" | "data";
type EditorMap = Record<EditorType, MonacoEditor>;

export class CodeEditorComponent {
  private container: HTMLElement;
  private editors!: EditorMap;
  private editorTabs: NodeListOf<HTMLButtonElement>;
  private editorsContainer: HTMLElement;
  private cleanupFns: Array<() => void> = [];

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with ID ${containerId} not found`);
    }
    this.container = container;

    // Get existing tabs and containers
    this.editorTabs = document
      .querySelector("#codeEditor .editor-tabs")
      ?.querySelectorAll(".editor-tab") as NodeListOf<HTMLButtonElement>;
    this.editorsContainer = document.querySelector(
      "#codeEditor .editor-containers"
    ) as HTMLElement;

    if (!this.editorTabs?.length || !this.editorsContainer) {
      throw new Error("Required editor elements not found in DOM");
    }

    this.setupEditors();
    this.setupTabListeners();
    this.setupStoreSubscriptions();
  }

  private createEditorContainer(id: string, type: EditorType): HTMLElement {
    const container = document.createElement("div");
    container.id = id;
    container.className = `editor-container ${type}-editor`;
    container.style.height = "100%";
    container.style.display = "none";
    this.editorsContainer.appendChild(container);
    return container;
  }

  private setupEditors() {
    const handleEditorChange = (type: EditorType, value: string) => {
      if (type === "html" || type === "css" || type === "javascript") {
        store.updateCode(type, value);
      }
    };

    this.editors = {
      html: new MonacoEditor(
        this.createEditorContainer("htmlEditor", "html"),
        store.htmlContent.value,
        (value) => handleEditorChange("html", value),
        "html"
      ),
      css: new MonacoEditor(
        this.createEditorContainer("cssEditor", "css"),
        store.cssContent.value,
        (value) => handleEditorChange("css", value),
        "css"
      ),
      javascript: new MonacoEditor(
        this.createEditorContainer("javascriptEditor", "javascript"),
        store.javascriptContent.value,
        (value) => handleEditorChange("javascript", value),
        "javascript"
      ),
      combined: new MonacoEditor(
        this.createEditorContainer("combinedEditor", "combined"),
        "",
        () => {}, // No onChange handler needed for read-only editor
        "html",
        { readOnly: true } // Make combined editor read-only
      ),
      data: new MonacoEditor(
        this.createEditorContainer("dataEditor", "data"),
        "",
        () => {},
        "json"
      ),
    };

    // Show initial editor
    this.switchTab(store.activeEditor.value);
  }

  private setupStoreSubscriptions() {
    // Subscribe to code changes and update combined view
    this.cleanupFns.push(
      effect(() => {
        const content = store.getCodeContent();
        this.updateEditorsFromStore(content);

        // Generate and update combined code whenever individual editors change
        const combinedCode = this.generateCombinedCode(
          content.html,
          content.css,
          content.javascript
        );
        this.editors.combined.setValue(combinedCode);
        store.updateCombinedCode(combinedCode);
      })
    );

    // Subscribe to data changes
    this.cleanupFns.push(
      effect(() => {
        const data = store.getData();
        if (data) {
          this.editors.data.setValue(JSON.stringify(data, null, 2));
        }
      })
    );

    // Subscribe to active editor changes
    this.cleanupFns.push(
      effect(() => {
        const activeEditor = store.activeEditor.value;
        this.switchTab(activeEditor);
      })
    );
  }

  private generateCombinedCode(
    html: string,
    css: string,
    javascript: string
  ): string {
    const data = store.getData();
    return /* html */ `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- D3.js -->
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- Plotly.js -->
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <!-- Three.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <style>
      ${css}
    </style>
  </head>
  <body>
    ${html}
    <script>
      (function() {
        try {
          // Set data globally so it's accessible in the visualization code
          window.data = ${JSON.stringify(data || [])};
          // Your visualization code
          ${javascript}
        } catch (error) {
          console.error('Error in visualization:', error);
          document.body.innerHTML += '<div style="color: red; padding: 1rem;">Error: ' + error.message + '</div>';
        }
      })();
    </script>
  </body>
  </html>`;
  }

  private setupTabListeners() {
    this.editorTabs.forEach((tab) => {
      const editorType = tab.dataset.editor as EditorType;
      if (editorType) {
        tab.addEventListener("click", () => {
          store.setActiveEditor(editorType);
        });
      }
    });
  }

  private updateEditorsFromStore(
    content: ReturnType<typeof store.getCodeContent>
  ) {
    this.editors.html.setValue(content.html);
    this.editors.css.setValue(content.css);
    this.editors.javascript.setValue(content.javascript);
    this.editors.combined.setValue(content.combinedCode);
  }

  private switchTab(tabName: EditorType) {
    // Hide all editors
    Object.values(this.editors).forEach((editor) => editor.hide());

    // Show selected editor
    this.editors[tabName].show();

    // Update tab styling
    this.editorTabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.editor === tabName);
    });

    // Trigger layout update for the visible editor
    this.editors[tabName].layout();
  }

  public getCode() {
    return store.getCodeContent();
  }

  public layoutEditors(): void {
    Object.values(this.editors).forEach((editor) => editor.layout());
  }

  public destroy() {
    // Clean up store subscriptions
    this.cleanupFns.forEach((cleanup) => cleanup());

    // Clean up editors
    Object.values(this.editors).forEach((editor) => editor.dispose());

    // Clean up DOM
    this.container.remove();
  }
}
