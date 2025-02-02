// src/stores/AppStore.ts
import { signal, computed, batch } from "@preact/signals-core";

type TabId = "preview" | "work-area" | "data";

/**
 * UI State Transition Diagram:
 *
 *  ┌────────────┐     TOGGLE_LEFT      ┌────────────────┐
 *  │            │─────────────────────▶│                │
 *  │   NORMAL   │                      │ LEFT-EXPANDED  │
 *  │            │◀─────────────────────│                │
 *  └────────────┘     TOGGLE_LEFT      └────────────────┘
 *        │
 *        │ TOGGLE_RIGHT
 *        ▼
 *  ┌────────────┐
 *  │   RIGHT    │
 *  │ EXPANDED   │
 *  └────────────┘
 */
// Explicit UI Layout States
type UILayout = "normal" | "left-expanded" | "right-expanded";

// Explicit Action Types
type UIAction = "TOGGLE_LEFT_PANEL" | "TOGGLE_RIGHT_PANEL";

function createAppStore() {
  // Core signals
  const toastMessage = signal<string | null>(null);
  const isGenerating = signal(false);
  const error = signal<string | null>(null);
  const pendingErrorPrompt = signal<string | null>(null);
  const activeTab = signal<TabId>(
    (localStorage.getItem("activeTab") as TabId) || "preview"
  );

  // UI Layout State
  const uiLayout = signal<UILayout>("normal");

  // State transition reducer
  function reduceUILayout(currentLayout: UILayout, action: UIAction): UILayout {
    console.log("UI State Transition:", {
      from: currentLayout,
      action: action,
    });

    switch (currentLayout) {
      case "normal":
        switch (action) {
          case "TOGGLE_LEFT_PANEL":
            return "left-expanded";
          case "TOGGLE_RIGHT_PANEL":
            return "right-expanded";
          default:
            return currentLayout;
        }
      case "left-expanded":
        return action === "TOGGLE_LEFT_PANEL" ? "normal" : currentLayout;
      case "right-expanded":
        return action === "TOGGLE_RIGHT_PANEL" ? "normal" : currentLayout;
      default:
        console.warn("Unknown layout state:", currentLayout);
        return "normal";
    }
  }

  // Computed values
  const isError = computed(() => error.value !== null);
  const hasToast = computed(() => toastMessage.value !== null);
  const canGenerate = computed(() => !isGenerating.value && !isError.value);
  const hasPendingError = computed(() => pendingErrorPrompt.value !== null);
  const isPreviewTab = computed(() => activeTab.value === "preview");
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
    uiLayout,

    // Expose computed values
    isError,
    hasToast,
    canGenerate,
    hasPendingError,
    isPreviewTab,
    isLoading,
    shouldDisableInput,
    statusMessage,

    // UI Layout Actions
    toggleLeftPanel() {
      const newLayout = reduceUILayout(uiLayout.value, "TOGGLE_LEFT_PANEL");
      uiLayout.value = newLayout;
      localStorage.setItem("uiLayout", newLayout);
    },

    toggleRightPanel() {
      const newLayout = reduceUILayout(uiLayout.value, "TOGGLE_RIGHT_PANEL");
      uiLayout.value = newLayout;
      localStorage.setItem("uiLayout", newLayout);
    },

    // Initialize UI Layout
    initializeUILayout() {
      const savedLayout = localStorage.getItem("uiLayout") as UILayout;
      if (
        savedLayout &&
        ["normal", "left-expanded", "right-expanded"].includes(savedLayout)
      ) {
        uiLayout.value = savedLayout;
        console.log("UI Layout Restored:", savedLayout);
      } else {
        console.log("Using default UI Layout: normal");
      }
    },

    // Error handling
    setError(errorMessage: string | null) {
      error.value = errorMessage;
    },

    resetError() {
      batch(() => {
        error.value = null;
        pendingErrorPrompt.value = null;
      });
    },

    // Toast handling
    showToast(message: string) {
      toastMessage.value = message;
    },

    // Tab management
    setActiveTab(tabId: TabId) {
      activeTab.value = tabId;
      localStorage.setItem("activeTab", tabId);
    },

    // Other methods
    setGenerating(generating: boolean) {
      isGenerating.value = generating;
    },

    sendToAssistant(errorPrompt: string) {
      pendingErrorPrompt.value = errorPrompt;
    },

    clearPendingErrorPrompt() {
      pendingErrorPrompt.value = null;
    },

    clear() {
      batch(() => {
        error.value = null;
        toastMessage.value = null;
        pendingErrorPrompt.value = null;
        isGenerating.value = false;
      });
    },
  };
}

const store = createAppStore();
export { store };
