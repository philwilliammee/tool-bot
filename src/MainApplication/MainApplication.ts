// src/components/MainApplication/MainApplication.ts
import { Conversation } from "../components/Conversation/Conversation";
import { store } from "../stores/AppStore";
import { Toast } from "../components/Toast/Toast";
import { effect } from "@preact/signals-core";
import { ProjectManager } from "../components/ProjectManager/ProjectManager";
import { DataArea } from "../components/DataArea/DataArea";
import { WorkArea } from "../components/WorkArea/WorkArea";
import { InterruptButton } from "../components/InterruptButton/InterruptButton";
import { DebugLauncher } from "../components/Debug/DebugLauncher";
import { dbService } from "../stores/Database/DatabaseService";

type TabId = "preview" | "work-area" | "data";

/**
 * MainApplication manages the overall application layout and component lifecycle.
 * It handles:
 * 1. Panel layout transitions
 * 2. Tab management
 * 3. Component initialization and cleanup
 * 4. Scroll position persistence
 */
export class MainApplication {
  private conversation!: Conversation;
  private workAreaComponent!: WorkArea;
  public workArea!: HTMLElement;
  private tabButtons!: NodeListOf<HTMLButtonElement>;
  private tabContents!: NodeListOf<HTMLElement>;
  private cleanupFns: Array<() => void> = [];
  private workAreaScrollPosition: number = 0;
  private mainContent!: HTMLElement;
  private leftColumn!: HTMLElement;
  private rightColumn!: HTMLElement;
  private projectManager!: ProjectManager;
  private interruptButton!: InterruptButton;
  private debugLauncher!: DebugLauncher;
  private initPromise: Promise<void>;

  constructor() {
    console.log("Initializing MainApplication");
    // Start the initialization process but don't block the constructor
    this.initPromise = this.initialize().catch(error => {
      console.error("Critical error in MainApplication initialization:", error);
      throw error;
    });
  }

  /**
   * Main initialization method that coordinates all initialization steps in sequence
   */
  private async initialize(): Promise<void> {
    try {
      // Step 1: Initialize DOM elements
      this.initializeDOMElements();

      // Step 2: Initialize the database first (and await it)
      await this.initializeDatabase();
      console.log("Database initialization completed, proceeding with component initialization");

      // Step 3: Explicitly initialize and wait for ProjectStore
      console.log("Initializing ProjectStore...");
      const projectStore = (await import("../stores/ProjectStore/ProjectStore")).projectStore;
      if (!projectStore.isInitialized.value) {
        console.log("Waiting for ProjectStore initialization...");
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.warn("ProjectStore initialization timed out, forcing initialization state");
            if (!projectStore.isInitialized.value) {
              console.log("Forcing ProjectStore initialization state to true");
              // Force the initialization state if needed
              projectStore.debugInitialize();
            }
            resolve();
          }, 5000);

          const unsubscribe = effect(() => {
            if (projectStore.isInitialized.value) {
              clearTimeout(timeout);
              unsubscribe();
              console.log("ProjectStore initialization completed");
              resolve();
            }
          });
        });
      } else {
        console.log("ProjectStore already initialized");
      }

      // Step 4: Initialize components in sequence once DB & ProjectStore are ready
      this.initializeComponents();
      this.initializeTabs();
      this.initializeUILayout();

      // Step 5: Initialize utility components
      new Toast();
      this.projectManager = new ProjectManager();
      this.interruptButton = new InterruptButton();

      // Step 6: Initialize debug launcher
      this.debugLauncher = new DebugLauncher(document.body);

      console.log("MainApplication initialization completed successfully");
    } catch (error) {
      console.error("MainApplication initialization failed:", error);
      throw error;
    }
  }

  /**
   * Returns a promise that resolves when initialization is complete
   * This can be used by external code to wait for the application to be ready
   */
  public async waitForInitialization(): Promise<void> {
    return this.initPromise;
  }

  /**
   * Initialize the IndexedDB database
   */
  private async initializeDatabase(): Promise<void> {
    try {
      console.log("Initializing IndexedDB database");
      await dbService.init();
      console.log("IndexedDB database initialized successfully");

      // Test the database connection
      console.log("Testing database connection...");
      const testResult = await dbService.testDatabaseConnection();

      if (testResult.success) {
        console.log("Database test successful:", testResult.message);
      } else {
        console.error("Database test failed:", testResult.message);
      }
    } catch (error) {
      console.error("Failed to initialize IndexedDB database:", error);
    }
  }

  /**
   * Initialize and validate required DOM elements
   * @throws Error if required elements are not found
   */
  private initializeDOMElements(): void {
    const elements = {
      workArea: document.querySelector("#work_area"),
      tabButtons: document.querySelectorAll(".tab-button"),
      tabContents: document.querySelectorAll(".tab-content"),
      mainContent: document.querySelector(".main-content"),
      leftColumn: document.querySelector(".left-column"),
      rightColumn: document.querySelector(".right-column"),
    };

    // Validate all required elements exist
    Object.entries(elements).forEach(([name, element]) => {
      if (!element || (element instanceof NodeList && !element.length)) {
        throw new Error(`Required element "${name}" not found`);
      }
    });

    // Assign validated elements
    this.workArea = elements.workArea as HTMLElement;
    this.tabButtons = elements.tabButtons as NodeListOf<HTMLButtonElement>;
    this.tabContents = elements.tabContents as NodeListOf<HTMLElement>;
    this.mainContent = elements.mainContent as HTMLElement;
    this.leftColumn = elements.leftColumn as HTMLElement;
    this.rightColumn = elements.rightColumn as HTMLElement;
  }

  private initializeComponents(): void {
    // Initialize the new Conversation component instead of Chat
    const chatContainer = document.querySelector("#chat") as HTMLElement;
    if (!chatContainer) {
      throw new Error("Chat container not found");
    }
    this.conversation = new Conversation(chatContainer);

    // Initialize WorkArea component
    if (this.workArea) {
      console.log("Initializing WorkArea component");
      this.workAreaComponent = new WorkArea(this.workArea);
    } else {
      console.error(
        "WorkArea element not found, cannot initialize WorkArea component"
      );
    }

    // Initialize DataArea
    new DataArea();
  }

  /**
   * Initialize UI layout and panel toggle buttons
   * Manages transitions between the following states:
   * - normal: Left panel at 30% width (reduced), right panel at 70%
   * - left-expanded: Left panel at 100% width, right panel collapsed
   * - right-expanded: Right panel at 100% width, left panel collapsed
   *
   * The toggle buttons in each panel control these state transitions:
   * - Left toggle button: Toggles between "normal" and "left-expanded"
   * - Right toggle button: Toggles between "normal" and "right-expanded"
   */
  private initializeUILayout(): void {
    const toggleButtons = {
      left: this.leftColumn.querySelector(".toggle-panel-btn"),
      right: this.rightColumn.querySelector(".toggle-panel-btn"),
    };

    if (!toggleButtons.left || !toggleButtons.right) {
      console.error("Toggle buttons not found:", {
        left: !!toggleButtons.left,
        right: !!toggleButtons.right,
      });
      throw new Error("Toggle buttons not found");
    }

    // Initialize stored state
    store.initializeUILayout();

    // Apply the initial state immediately
    this.applyUILayout(store.uiLayout.value);

    // Define the event handlers as named functions so they can be properly removed
    const handleLeftToggle = () => {
      console.log("Left toggle button clicked");
      store.toggleLeftPanel();
    };

    const handleRightToggle = () => {
      console.log("Right toggle button clicked");
      store.toggleRightPanel();
    };

    // Setup button click handlers
    // IMPORTANT: These handlers are defined and managed here in MainApplication
    // Other components should NOT add their own handlers to these buttons
    toggleButtons.left.addEventListener("click", handleLeftToggle);
    toggleButtons.right.addEventListener("click", handleRightToggle);

    // Cleanup handlers on destroy
    this.cleanupFns.push(() => {
      toggleButtons.left?.removeEventListener("click", handleLeftToggle);
      toggleButtons.right?.removeEventListener("click", handleRightToggle);
    });

    // Listen for layout changes and update UI
    this.cleanupFns.push(
      effect(() => {
        const layout = store.uiLayout.value;
        this.applyUILayout(layout);
      })
    );
  }

  /**
   * Apply UI layout changes based on current state
   * @param layout Current UI layout state:
   *   - "normal": Left panel reduced (30% width), right panel at 70%
   *   - "left-expanded": Left panel at 100%, right panel collapsed
   *   - "right-expanded": Right panel at 100%, left panel collapsed
   */
  private applyUILayout(
    layout: "normal" | "left-expanded" | "right-expanded"
  ): void {
    console.log("Applying UI Layout:", layout);

    // Reset all layout classes first
    this.leftColumn.classList.remove("reduced", "expanded", "collapsed");
    this.rightColumn.classList.remove("collapsed", "expanded");

    // Get toggle buttons for state updates
    const leftToggle = this.leftColumn.querySelector(".toggle-panel-btn");
    const rightToggle = this.rightColumn.querySelector(".toggle-panel-btn");

    // Apply new layout classes based on state
    switch (layout) {
      case "normal":
        // Normal state = left panel reduced (30% width)
        this.leftColumn.classList.add("reduced");
        break;
      case "left-expanded":
        // Left expanded = left panel full width, right collapsed
        this.leftColumn.classList.add("expanded");
        this.rightColumn.classList.add("collapsed");
        break;
      case "right-expanded":
        // Right expanded = left panel collapsed, right panel full width
        this.leftColumn.classList.add("collapsed");
        this.rightColumn.classList.add("expanded");
        break;
    }

    // Update toggle button visual states
    // The "active" class indicates when a panel is in its expanded state
    if (leftToggle) {
      leftToggle.classList.toggle("active", layout === "left-expanded");
    }
    if (rightToggle) {
      rightToggle.classList.toggle("active", layout === "right-expanded");
    }

    // Debug output to verify class application
    console.log("Left column classes after update:", this.leftColumn.className);
    console.log(
      "Right column classes after update:",
      this.rightColumn.className
    );
    console.log("Left toggle button classes:", leftToggle?.className);
  }

  /**
   * Initialize tab management and scroll position persistence
   */
  private initializeTabs(): void {
    const workAreaTab = document.getElementById("work-area-tab");
    this.restoreScrollPosition(workAreaTab);
    this.setupScrollPersistence(workAreaTab);
    this.setupTabHandlers();
    this.initializeTabState();
  }

  private restoreScrollPosition(workAreaTab: HTMLElement | null): void {
    const savedPosition = localStorage.getItem("workAreaScroll");
    if (savedPosition && workAreaTab) {
      this.workAreaScrollPosition = parseInt(savedPosition, 10);
      workAreaTab.scrollTop = this.workAreaScrollPosition;
    }
  }

  private setupScrollPersistence(workAreaTab: HTMLElement | null): void {
    workAreaTab?.addEventListener("scroll", () => {
      if (workAreaTab) {
        this.workAreaScrollPosition = workAreaTab.scrollTop;
        localStorage.setItem(
          "workAreaScroll",
          String(this.workAreaScrollPosition)
        );
      }
    });
  }

  private setupTabHandlers(): void {
    this.tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabId = button.dataset.tab as TabId;
        store.setActiveTab(tabId);
      });
    });

    this.cleanupFns.push(
      effect(() => {
        const activeTabId = store.activeTab.value;
        this.updateTabStates(activeTabId);
      })
    );
  }

  private updateTabStates(activeTabId: TabId): void {
    // Update button states
    this.tabButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === activeTabId);
    });

    // Update content visibility
    this.tabContents.forEach((content) => {
      const isActive = content.id === `${activeTabId}-tab`;
      content.classList.toggle("active", isActive);

      if (isActive && content.id === "work-area-tab") {
        requestAnimationFrame(() => {
          content.scrollTop = this.workAreaScrollPosition;
        });
      }
    });
  }

  private initializeTabState(): void {
    const storedTab = localStorage.getItem("activeTab");
    if (storedTab) {
      store.setActiveTab(storedTab as TabId);
      this.cleanupFns.push(
        effect(() => {
          localStorage.setItem("activeTab", store.activeTab.value);
        })
      );
    }
  }

  public destroy(): void {
    console.log("Destroying MainApplication");

    // Clean up child components
    this.conversation.destroy();
    this.workAreaComponent.destroy();
    this.interruptButton.destroy();
    this.debugLauncher.destroy();

    // Clean up event listeners
    this.cleanupFns.forEach((cleanup) => cleanup());

    // Clean up tab buttons
    this.tabButtons.forEach((button) => {
      button.replaceWith(button.cloneNode(true));
    });

    // Reset scroll position
    this.workAreaScrollPosition = 0;
    localStorage.removeItem("workAreaScroll");

    // We want to preserve the UI layout preference, so don't remove it
    // localStorage.removeItem("uiLayout");

    this.projectManager.destroy();
  }
}
