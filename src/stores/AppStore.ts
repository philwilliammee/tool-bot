// src/stores/AppStore.ts
import { signal, computed, batch, effect as signalEffect } from "@preact/signals-core";

type TabId = "preview" | "work-area" | "data";

/**
 * UI Layout State Management
 *
 * The application has three layout states that control panel visibility:
 *
 * 1. "normal": Default state
 *    - Left panel at 30% width (reduced)
 *    - Right panel at 70% width
 *
 * 2. "left-expanded": Left panel expanded
 *    - Left panel at 100% width
 *    - Right panel collapsed (hidden)
 *
 * 3. "right-expanded": Right panel expanded
 *    - Right panel at 100% width
 *    - Left panel collapsed (hidden)
 *
 * State Transition Diagram:
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

// Interrupt operation types
type InterruptType = "tool" | "generation" | "none";

function createAppStore() {
  // Core signals
  const toastMessage = signal<string | null>(null);
  const isGenerating = signal(false);
  const error = signal<string | null>(null);
  const pendingErrorPrompt = signal<string | null>(null);
  const activeTab = signal<TabId>(
    (localStorage.getItem("activeTab") as TabId) || "preview"
  );

  // UI Layout State - Default to left-expanded
  const uiLayout = signal<UILayout>("left-expanded");

  // Interrupt-related signals
  const isToolRunning = signal(false);
  const currentToolId = signal<string | null>(null);

  /**
   * Handles UI layout state transitions based on the current state and action
   *
   * State transitions follow these rules:
   * - From "normal":
   *   - TOGGLE_LEFT_PANEL → "left-expanded"
   *   - TOGGLE_RIGHT_PANEL → "right-expanded"
   * - From "left-expanded":
   *   - TOGGLE_LEFT_PANEL → "normal"
   *   - TOGGLE_RIGHT_PANEL → no change (stay in "left-expanded")
   * - From "right-expanded":
   *   - TOGGLE_LEFT_PANEL → no change (stay in "right-expanded")
   *   - TOGGLE_RIGHT_PANEL → "normal"
   *
   * @param currentLayout The current UI layout state
   * @param action The action being performed
   * @returns The new UI layout state
   */
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
    () => isGenerating.value || pendingErrorPrompt.value !== null || isToolRunning.value
  );
  const shouldDisableInput = computed(
    () => isGenerating.value || isError.value || isToolRunning.value
  );
  const isProcessing = computed(
    () => isGenerating.value || isToolRunning.value || pendingErrorPrompt.value !== null
  );
  const statusMessage = computed(() => {
    if (isError.value) return error.value;
    if (isGenerating.value) return "Generating...";
    if (isToolRunning.value) return "Running tool...";
    if (pendingErrorPrompt.value) return "Retrying...";
    return null;
  });

  // Interrupt-related computed values
  const isInterruptible = computed(
    () => isGenerating.value || isToolRunning.value
  );
  const interruptType = computed((): InterruptType => {
    if (isToolRunning.value) return "tool";
    if (isGenerating.value) return "generation";
    return "none";
  });

  // Tool-related methods
  const setCurrentToolId = (id: string | null) => {
    currentToolId.value = id;
    isToolRunning.value = id !== null;
  };

  return {
    // Expose signals
    isGenerating,
    error,
    toastMessage,
    pendingErrorPrompt,
    activeTab,
    uiLayout,
    isToolRunning,
    currentToolId,

    // Expose computed values
    isError,
    hasToast,
    canGenerate,
    hasPendingError,
    isPreviewTab,
    isLoading,
    shouldDisableInput,
    isProcessing,
    statusMessage,
    isInterruptible,
    interruptType,

    /**
     * Toggles the left panel between normal and expanded states
     * - If currently in "normal" state: transitions to "left-expanded"
     * - If currently in "left-expanded" state: transitions to "normal"
     * - If currently in "right-expanded" state: no change (stays in "right-expanded")
     */
    toggleLeftPanel() {
      const newLayout = reduceUILayout(uiLayout.value, "TOGGLE_LEFT_PANEL");
      console.log(
        "Toggle Left Panel: Changing layout from",
        uiLayout.value,
        "to",
        newLayout
      );
      uiLayout.value = newLayout;
      localStorage.setItem("uiLayout", newLayout);
    },

    /**
     * Toggles the right panel between normal and expanded states
     * - If currently in "normal" state: transitions to "right-expanded"
     * - If currently in "right-expanded" state: transitions to "normal"
     * - If currently in "left-expanded" state: no change (stays in "left-expanded")
     */
    toggleRightPanel() {
      const newLayout = reduceUILayout(uiLayout.value, "TOGGLE_RIGHT_PANEL");
      console.log(
        "Toggle Right Panel: Changing layout from",
        uiLayout.value,
        "to",
        newLayout
      );
      uiLayout.value = newLayout;
      localStorage.setItem("uiLayout", newLayout);
    },

    /**
     * Initializes the UI layout state from localStorage or defaults to "left-expanded"
     * This should be called during application initialization
     */
    initializeUILayout() {
      const savedLayout = localStorage.getItem("uiLayout") as UILayout;

      if (
        savedLayout &&
        ["normal", "left-expanded", "right-expanded"].includes(savedLayout)
      ) {
        // Use saved layout if valid
        uiLayout.value = savedLayout;
        // console.log("UI Layout Restored:", savedLayout);
      } else {
        // Set default layout to "left-expanded" and persist it
        const defaultLayout: UILayout = "left-expanded";
        console.log(`Setting default UI Layout: ${defaultLayout}`);

        // Clear any invalid layout value
        localStorage.removeItem("uiLayout");

        // Set and persist the default layout
        uiLayout.value = defaultLayout;
        localStorage.setItem("uiLayout", defaultLayout);
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

      // Auto-clear toast after 3 seconds
      setTimeout(() => {
        if (toastMessage.value === message) {
          toastMessage.value = null;
        }
      }, 3000);
    },

    // Tab management
    setActiveTab(tabId: TabId) {
      activeTab.value = tabId;
      localStorage.setItem("activeTab", tabId);
    },

    /**
     * Switches to the preview tab and sets the UI layout to normal.
     * This is specifically used when HTML content is detected to ensure
     * users can see the HTML render immediately.
     */
    setHtmlContentView() {
      batch(() => {
        // Switch to preview tab
        activeTab.value = "preview";
        localStorage.setItem("activeTab", "preview");

        // Ensure UI layout is normal (not expanded on either side)
        if (uiLayout.value !== "normal") {
          uiLayout.value = "normal";
          localStorage.setItem("uiLayout", "normal");
          console.log(
            "HTML content detected: Set layout to normal and switched to preview tab"
          );
        }
      });
    },

    // Tool execution status
    setToolRunning(running: boolean, toolId: string | null = null) {
      // console.log(`WORKFLOW-DEBUG: Setting isToolRunning to ${running}${toolId ? ` for tool ${toolId}` : ''}`);
      // console.log(`WORKFLOW-DEBUG: Current state before change - isToolRunning: ${isToolRunning.value}, isGenerating: ${isGenerating.value}`);

      batch(() => {
        isToolRunning.value = running;
        currentToolId.value = running ? toolId : null;
      });

      console.log(`WORKFLOW-DEBUG: State after change - isToolRunning: ${isToolRunning.value}, isGenerating: ${isGenerating.value}`);
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
        isToolRunning.value = false;
        currentToolId.value = null;
      });
    },

    // Tool-related methods
    setCurrentToolId,

    // Effect helper
    effect: (fn: () => void) => {
      return signalEffect(fn);
    },
  };
}

const store = createAppStore();
export { store };
