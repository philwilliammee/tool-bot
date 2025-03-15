// src/components/MainApplication/MainApplication.ts
import { Conversation } from "../components/Conversation/Conversation";
import { store } from "../stores/AppStore";
import { Toast } from "../components/Toast/Toast";
import { effect } from "@preact/signals-core";
import { ProjectManager } from "../components/ProjectManager/ProjectManager";
import { DataArea } from "../components/DataArea/DataArea";
import { WorkArea } from "../components/WorkArea/WorkArea";
import { InterruptButton } from "../components/InterruptButton/InterruptButton";

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
  private projectManager: ProjectManager;
  private interruptButton: InterruptButton;

  constructor() {
    console.log("Initializing MainApplication");
    this.initializeDOMElements();
    this.initializeComponents();
    this.initializeTabs();
    this.initializeUILayout();
    new Toast();
    this.projectManager = new ProjectManager();
    this.interruptButton = new InterruptButton();
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