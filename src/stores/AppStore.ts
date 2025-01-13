import { signal, computed } from "@preact/signals-core";

type TabId = "preview" | "work-area";

function createAppStore() {
  // Core signals
  const toastMessage = signal<string | null>(null);
  const isGenerating = signal(false);
  const error = signal<string | null>(null);
  const pendingErrorPrompt = signal<string | null>(null);
  const activeTab = signal<TabId>("preview");

  return {
    // Expose signals
    isGenerating,
    error,
    toastMessage,
    pendingErrorPrompt,
    activeTab,

    // Methods
    setError(errorMessage: string | null) {
      error.value = errorMessage;
    },

    setGenerating(generating: boolean) {
      isGenerating.value = generating;
    },

    showToast(message: string) {
      toastMessage.value = message;
    },

    sendToAssistant(errorPrompt: string) {
      pendingErrorPrompt.value = errorPrompt;
    },

    clearPendingErrorPrompt() {
      pendingErrorPrompt.value = null;
    },

    // New tab methods
    setActiveTab(tabId: TabId) {
      activeTab.value = tabId;
    },

    clear() {
      error.value = null;
      toastMessage.value = null;
      pendingErrorPrompt.value = null;
      activeTab.value = "preview";
    },
  };
}

const store = createAppStore();
export { store };
