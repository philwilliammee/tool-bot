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

  constructor() {
    console.log("Initializing MainApplication");
    this.initializeDOMElements();
    this.initializeComponents();
    this.initializeTabs();
    new Toast();
  }

  private initializeDOMElements(): void {
    this.workArea = document.querySelector("#work_area") as HTMLElement;
    this.tabButtons = document.querySelectorAll(".tab-button");
    this.tabContents = document.querySelectorAll(".tab-content");

    if (!this.workArea || !this.tabButtons.length || !this.tabContents.length) {
      throw new Error("Required DOM elements not found");
    }
  }

  private initializeComponents(): void {
    this.chat = new Chat({
      workArea: this.workArea,
    });
  }

  private initializeTabs(): void {
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

        // Update content visibility
        this.tabContents.forEach((content) => {
          content.classList.toggle(
            "active",
            content.id === `${activeTabId}-tab`
          );
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
  }
}
