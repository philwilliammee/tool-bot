// src/components/MainApplication/MainApplication.ts
import { Chat } from "../Chat/chat";
import { store } from "../../stores/AppStore";
import { Toast } from "../Toast/Toast";
import { effect } from "@preact/signals-core";

export class MainApplication {
  private chat!: Chat;
  private workArea!: HTMLElement;
  private tabButtons!: NodeListOf<HTMLButtonElement>;
  private tabContents!: NodeListOf<HTMLElement>;
  private cleanupFns: Array<() => void> = [];
  private workAreaScrollPosition: number = 0;
  private mainContent!: HTMLElement;
  private leftColumn!: HTMLElement;
  private toggleButton!: HTMLButtonElement;

  constructor() {
    console.log("Initializing MainApplication");
    this.initializeDOMElements();
    this.initializeComponents();
    this.initializeTabs();
    this.initializePanelToggle();
    new Toast();
  }

  private initializeDOMElements(): void {
    this.workArea = document.querySelector("#work_area") as HTMLElement;
    this.tabButtons = document.querySelectorAll(".tab-button");
    this.tabContents = document.querySelectorAll(".tab-content");
    this.mainContent = document.querySelector(".main-content") as HTMLElement;
    this.leftColumn = document.querySelector(".left-column") as HTMLElement;
    this.toggleButton = document.querySelector(
      ".toggle-panel-btn"
    ) as HTMLButtonElement;

    if (
      !this.workArea ||
      !this.tabButtons.length ||
      !this.tabContents.length ||
      !this.mainContent ||
      !this.leftColumn ||
      !this.toggleButton
    ) {
      throw new Error("Required DOM elements not found");
    }
  }

  private initializeComponents(): void {
    this.chat = new Chat({
      workArea: this.workArea,
    });
  }

  private initializePanelToggle(): void {
    // Restore panel state from localStorage
    const isPanelExpanded =
      localStorage.getItem("chatPanelExpanded") === "true";
    if (isPanelExpanded) {
      this.leftColumn.classList.add("expanded");
      this.mainContent
        .querySelector(".right-column")
        ?.classList.add("collapsed");
      store.setPanelExpanded(true);
    }
    // Handle toggle button clicks
    const handleToggle = () => {
      this.leftColumn.classList.toggle("expanded");
      this.mainContent
        .querySelector(".right-column")
        ?.classList.toggle("collapsed");
      const isExpanded = this.leftColumn.classList.contains("expanded");

      // Store state
      localStorage.setItem("chatPanelExpanded", isExpanded.toString());
      store.setPanelExpanded(isExpanded);
    };

    this.toggleButton.addEventListener("click", handleToggle);

    // Add to cleanup
    this.cleanupFns.push(() => {
      this.toggleButton.removeEventListener("click", handleToggle);
    });

    this.toggleButton.addEventListener("click", handleToggle);

    // Add to cleanup
    this.cleanupFns.push(() => {
      this.toggleButton.removeEventListener("click", handleToggle);
    });
  }

  private initializeTabs(): void {
    const workAreaTab = document.getElementById("work-area-tab");

    // Restore saved scroll position on load
    const savedScrollPosition = localStorage.getItem("workAreaScroll");
    if (savedScrollPosition && workAreaTab) {
      workAreaTab.scrollTop = parseInt(savedScrollPosition, 10);
      this.workAreaScrollPosition = parseInt(savedScrollPosition, 10);
    }

    // Store work area scroll position
    workAreaTab?.addEventListener("scroll", () => {
      this.workAreaScrollPosition = workAreaTab.scrollTop;
      localStorage.setItem("workAreaScroll", workAreaTab.scrollTop.toString());
    });

    // Add click handlers to update store
    this.tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabId = button.dataset.tab as "preview" | "work-area";
        store.setActiveTab(tabId);
      });
    });

    // Subscribe to store changes
    this.cleanupFns.push(
      effect(() => {
        const activeTabId = store.activeTab.value;

        // Update button states
        this.tabButtons.forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.tab === activeTabId);
        });

        // Update content visibility and restore scroll position
        this.tabContents.forEach((content) => {
          const isActive = content.id === `${activeTabId}-tab`;
          content.classList.toggle("active", isActive);

          // Restore work area scroll position when switching back
          if (isActive && content.id === "work-area-tab") {
            requestAnimationFrame(() => {
              content.scrollTop = this.workAreaScrollPosition;
            });
          }
        });
      })
    );

    // Initialize from stored state
    const storedTab = localStorage.getItem("activeTab");
    if (storedTab) {
      store.setActiveTab(storedTab as "preview" | "work-area");
    }

    // Persist tab changes
    this.cleanupFns.push(
      effect(() => {
        localStorage.setItem("activeTab", store.activeTab.value);
      })
    );
  }

  public destroy(): void {
    this.chat?.destroy();

    // Clean up all effects
    this.cleanupFns.forEach((cleanup) => cleanup());

    // Remove click handlers
    this.tabButtons.forEach((button) => {
      button.replaceWith(button.cloneNode(true));
    });

    // Reset scroll position
    this.workAreaScrollPosition = 0;
    localStorage.removeItem("workAreaScroll");

    // Clean up panel state
    localStorage.removeItem("chatPanelCollapsed");
  }
}
