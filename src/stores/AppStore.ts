// stores/AppStore.ts
import { signal, computed } from "@preact/signals-core";

export type EditorType = "html" | "css" | "javascript" | "combined" | "data";

function createAppStore() {
  // Core data signals
  const csvData = signal<any[] | null>(null);
  const hasData = computed(
    () => csvData.value !== null && csvData.value.length > 0
  );
  const toastMessage = signal<string | null>(null);
  const pendingErrorPrompt = signal<string | null>(null);

  // Editor state
  const activeEditor = signal<EditorType>("combined");
  const htmlContent = signal("");
  const cssContent = signal("");
  const javascriptContent = signal("");
  const combinedContent = signal("");
  const isGenerating = signal(false);
  const error = signal<string | null>(null);

  return {
    // Expose signals
    csvData,
    hasData,
    activeEditor,
    htmlContent,
    cssContent,
    javascriptContent,
    combinedContent,
    isGenerating,
    error,
    toastMessage,
    pendingErrorPrompt,

    // Keep existing methods
    setData(data: any[] | null) {
      csvData.value = data;
    },

    getData(): any[] | null {
      return csvData.value;
    },

    updateCode(type: "html" | "css" | "javascript", content: string) {
      switch (type) {
        case "html":
          htmlContent.value = content;
          break;
        case "css":
          cssContent.value = content;
          break;
        case "javascript":
          javascriptContent.value = content;
          break;
      }
    },

    updateCombinedCode(code: string) {
      combinedContent.value = code;
    },

    getCodeContent() {
      return {
        html: htmlContent.value,
        css: cssContent.value,
        javascript: javascriptContent.value,
        combinedCode: combinedContent.value,
      };
    },

    setAllCode(content: { html: string; css: string; javascript: string }) {
      htmlContent.value = content.html;
      cssContent.value = content.css;
      javascriptContent.value = content.javascript;
    },

    setActiveEditor(editor: EditorType) {
      activeEditor.value = editor;
    },

    setError(errorMessage: string | null) {
      error.value = errorMessage; // use errorMessage instead of error
    },

    setGenerating(generating: boolean) {
      isGenerating.value = generating;
    },

    showToast(message: string) {
      toastMessage.value = message;
    },

    clear() {
      csvData.value = null;
      error.value = null;
      htmlContent.value = "";
      cssContent.value = "";
      javascriptContent.value = "";
      combinedContent.value = "";
    },

    clearData() {
      csvData.value = null;
    },

    sendToAssistant(errorPrompt: string) {
      this.pendingErrorPrompt.value = errorPrompt;
    },

    clearPendingErrorPrompt() {
      this.pendingErrorPrompt.value = null;
    },
  };
}

const store = createAppStore();
export { store };
