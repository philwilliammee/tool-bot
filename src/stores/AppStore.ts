// src/stores/AppStore.ts
import { signal, computed, batch } from "@preact/signals-core";

type TabId = "preview" | "work-area" | "data";

function createAppStore() {
  // Get initial tab state from localStorage or default to "preview"
  const initialTab = (localStorage.getItem("activeTab") as TabId) || "preview";

  // Core signals
  const toastMessage = signal<string | null>(null);
  const isGenerating = signal(false);
  const error = signal<string | null>(null);
  const pendingErrorPrompt = signal<string | null>(null);
  const activeTab = signal<TabId>(initialTab);

  // Computed values
  const isError = computed(() => error.value !== null);
  const hasToast = computed(() => toastMessage.value !== null);
  const canGenerate = computed(() => !isGenerating.value && !isError.value);
  const hasPendingError = computed(() => pendingErrorPrompt.value !== null);
  const isPreviewTab = computed(() => activeTab.value === "preview");

  const isPanelExpanded = signal<boolean>(false);

  // UI State combinations
  const isLoading = computed(
    () => isGenerating.value || pendingErrorPrompt.value !== null
  );

  const shouldDisableInput = computed(
    () => isGenerating.value || isError.value
  );

  const statusMessage = computed(() => {
    if (isError.value) return error.value;
    if (isGenerating.value) return "Generating...";
    if (pendingErrorPrompt.value) return "Retrying...";
    return null;
  });

  return {
    // Expose signals
    isGenerating,
    error,
    toastMessage,
    pendingErrorPrompt,
    activeTab,
    isPanelExpanded,

    // Expose computed values
    isError,
    hasToast,
    canGenerate,
    hasPendingError,
    isPreviewTab,
    isLoading,
    shouldDisableInput,
    statusMessage,

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

    setActiveTab(tabId: TabId) {
      activeTab.value = tabId;
      localStorage.setItem("activeTab", tabId);
    },

    clear() {
      batch(() => {
        error.value = null;
        toastMessage.value = null;
        pendingErrorPrompt.value = null;
        isGenerating.value = false;
      });
    },

    // Helper method to reset error state
    resetError() {
      batch(() => {
        error.value = null;
        pendingErrorPrompt.value = null;
      });
    },

    setPanelExpanded: (expanded: boolean) => {
      isPanelExpanded.value = expanded;
    },
  };
}

const store = createAppStore();
export { store };
