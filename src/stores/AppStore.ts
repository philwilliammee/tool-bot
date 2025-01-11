import { signal, computed } from "@preact/signals-core";

function createAppStore() {
  // Core signals
  const toastMessage = signal<string | null>(null);
  const isGenerating = signal(false);
  const error = signal<string | null>(null);
  const pendingErrorPrompt = signal<string | null>(null);

  return {
    // Expose signals
    isGenerating,
    error,
    toastMessage,
    pendingErrorPrompt,

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

    clear() {
      error.value = null;
      toastMessage.value = null;
      pendingErrorPrompt.value = null;
    },
  };
}

const store = createAppStore();
export { store };
