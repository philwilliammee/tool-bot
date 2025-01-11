import * as monaco from "monaco-editor";
// Import the worker scripts
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import JsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";

interface MonacoEditorOptions {
  readOnly?: boolean;
}

export class MonacoEditor {
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private container: HTMLElement;
  private value: string;
  private onChange: (value: string) => void;
  private type: "html" | "css" | "javascript" | "json";
  private options: MonacoEditorOptions = {};

  constructor(
    container: HTMLElement,
    initialValue: string = "",
    onChange: (value: string) => void,
    type: "html" | "css" | "javascript" | "json",
    options: MonacoEditorOptions = {}
  ) {
    this.container = container;
    this.value = initialValue;
    this.onChange = onChange;
    this.type = type;
    this.options = options;

    this.initMonacoEnvironment();
    this.init();
  }

  private initMonacoEnvironment() {
    // Configure Monaco Environment to use the imported workers
    (self as any).MonacoEnvironment = {
      getWorker: function (_: any, label: string) {
        switch (label) {
          case "html":
            return new HtmlWorker();
          case "css":
            return new CssWorker();
          case "javascript":
          case "typescript":
            return new JsWorker();
          case "json":
            return new JsonWorker();
          default:
            return new EditorWorker();
        }
      },
    };
  }

  private init() {
    // Configure language-specific options
    if (this.type === "html") {
      monaco.languages.html.htmlDefaults.setOptions({
        format: {
          tabSize: 2,
          insertSpaces: true,
          wrapLineLength: 120,
          unformatted: "wbr",
          contentUnformatted: "pre,code,textarea",
          indentInnerHtml: true,
          preserveNewLines: true,
          maxPreserveNewLines: undefined,
          indentHandlebars: false,
          endWithNewline: false,
          extraLiners: "head, body, /html",
          wrapAttributes: "auto",
        },
        suggest: {
          html5: true,
        },
      });
    }

    if (this.type === "css") {
      monaco.languages.css.cssDefaults.setOptions({
        validate: true,
        lint: {
          compatibleVendorPrefixes: "warning",
        },
      });
    }

    if (this.type === "javascript") {
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: false,
      });
    }

    this.editor = monaco.editor.create(this.container, {
      value: this.value,
      language: this.type,
      theme: "vs-light",
      automaticLayout: true,
      minimap: {
        enabled: false,
      },
      readOnly: this.options.readOnly,
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: "on",
      renderLineHighlight: "all",
      padding: {
        top: 10,
        bottom: 10,
      },
      suggest: {
        showClasses: true,
        showFunctions: true,
        showVariables: true,
        showModules: true,
        showKeywords: true,
      },
    });

    let isSettingValue = false;
    this.editor.onDidChangeModelContent((e) => {
      if (!isSettingValue) {
        this.value = this.editor?.getValue() || "";
        this.onChange(this.value);
      }
    });

    // Add type-specific class to container for styling
    this.container.classList.add(`${this.type}-editor`);
  }

  public getValue(): string {
    return this.editor?.getValue() || this.value;
  }

  public setValue(value: string) {
    if (this.editor) {
      // Store current positions
      const position = this.editor.getPosition();
      const scrollTop = this.editor.getScrollTop();
      const scrollLeft = this.editor.getScrollLeft();

      // Only update if value is different
      if (this.getValue() !== value) {
        const model = this.editor.getModel();
        if (model) {
          model.pushEditOperations(
            [],
            [
              {
                range: model.getFullModelRange(),
                text: value,
              },
            ],
            () => null
          );
        }
      }

      // Restore positions
      if (position) {
        this.editor.setPosition(position);
        this.editor.setScrollPosition({ scrollTop, scrollLeft });
      }
    }
    this.value = value;
  }

  public show() {
    this.container.style.display = "block";
    this.editor?.layout();
  }

  hide(): void {
    this.container.style.display = "none";
  }

  public dispose() {
    if (this.editor) {
      this.editor.dispose();
      this.container.classList.remove(`${this.type}-editor`);
    }
  }

  public layout() {
    if (this.editor) {
      this.editor.layout();
    }
  }
}
