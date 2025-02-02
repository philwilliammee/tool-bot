// src/components/MainApplication/MainApplication.ts
import { Chat } from "../components/Chat/chat";
import { store } from "../stores/AppStore";
import { Toast } from "../components/Toast/Toast";
import { effect } from "@preact/signals-core";
import { ProjectManager } from "../components/ProjectManager/ProjectManager";
import { DataArea } from "../components/DataArea/DataArea";

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
  private chat!: Chat;
  public workArea!: HTMLElement;
  private tabButtons!: NodeListOf<HTMLButtonElement>;
  private tabContents!: NodeListOf<HTMLElement>;
  private cleanupFns: Array<() => void> = [];
  private workAreaScrollPosition: number = 0;
  private mainContent!: HTMLElement;
  private leftColumn!: HTMLElement;
  private projectManager: ProjectManager;

  constructor() {
    console.log("Initializing MainApplication");
    this.initializeDOMElements();
    this.initializeComponents();
    this.initializeTabs();
    this.initializeUILayout();
    new Toast();
    this.projectManager = new ProjectManager();
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
  }

  private initializeComponents(): void {
    this.chat = new Chat({ workArea: this.workArea });
    new DataArea();
  }

  /**
   * Initialize UI layout and panel toggle buttons
   * Manages transitions between normal, left-expanded, and right-expanded states
   */
  private initializeUILayout(): void {
    const toggleButtons = {
      left: this.leftColumn.querySelector(".toggle-panel-btn"),
      right: document.querySelector(".right-column .toggle-panel-btn"),
    };

    if (!toggleButtons.left || !toggleButtons.right) {
      throw new Error("Toggle buttons not found");
    }

    // Initialize stored state
    store.initializeUILayout();

    // Setup button click handlers
    toggleButtons.left.addEventListener("click", () => store.toggleLeftPanel());
    toggleButtons.right.addEventListener("click", () =>
      store.toggleRightPanel()
    );

    // Cleanup handlers on destroy
    this.cleanupFns.push(() => {
      toggleButtons.left?.removeEventListener("click", store.toggleLeftPanel);
      toggleButtons.right?.removeEventListener("click", store.toggleRightPanel);
    });

    // Listen for layout changes and update UI
    this.cleanupFns.push(
      effect(() => {
        const layout = store.uiLayout.value;
        this.applyUILayout(layout, toggleButtons);
      })
    );
  }

  /**
   * Apply UI layout changes based on current state
   * @param layout Current UI layout state
   * @param toggleButtons Reference to toggle buttons for state updates
   */
  private applyUILayout(
    layout: "normal" | "left-expanded" | "right-expanded",
    toggleButtons: { left: Element | null; right: Element | null }
  ): void {
    console.log("Applying UI Layout:", layout);

    // Reset all layout classes
    this.leftColumn.classList.remove("reduced", "expanded", "collapsed");
    this.mainContent
      .querySelector(".right-column")
      ?.classList.remove("collapsed", "expanded");

    // Apply new layout classes
    switch (layout) {
      case "normal":
        this.leftColumn.classList.add("reduced");
        break;
      case "left-expanded":
        this.leftColumn.classList.add("expanded");
        this.mainContent
          .querySelector(".right-column")
          ?.classList.add("collapsed");
        break;
      case "right-expanded":
        this.leftColumn.classList.add("collapsed");
        break;
    }

    // Update button states
    toggleButtons.left?.classList.toggle("active", layout === "left-expanded");
    toggleButtons.right?.classList.toggle(
      "active",
      layout === "right-expanded"
    );
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
    this.chat?.destroy();
    this.cleanupFns.forEach((cleanup) => cleanup());

    // Clean up tab buttons
    this.tabButtons.forEach((button) => {
      button.replaceWith(button.cloneNode(true));
    });

    // Reset scroll position
    this.workAreaScrollPosition = 0;
    localStorage.removeItem("workAreaScroll");

    // Clean up UI layout state
    localStorage.removeItem("uiLayout");
    this.projectManager.destroy();
  }
}
