// src/components/Debug/DebugLauncher.ts
import { IndexedDBTest } from './IndexedDBTest';
import { SearchPanel } from '../Search/SearchPanel';

/**
 * DebugLauncher - A component for launching debug and test panels
 *
 * This component provides a simple UI for accessing debug tools.
 */
export class DebugLauncher {
  private element: HTMLElement | null = null;
  private cleanupFunctions: (() => void)[] = [];
  private isExpanded = false;
  private activePanel: { destroy: () => void } | null = null;
  private panelContainer: HTMLElement | null = null;

  constructor(private container: HTMLElement) {
    this.render();
    this.setupListeners();
  }

  private render(): void {
    this.element = document.createElement("div");
    this.element.className = "debug-launcher";

    this.element.innerHTML = `
      <div class="debug-button" title="Debug Tools">🛠️</div>
      <div class="debug-menu" style="display: none;">
        <div class="debug-menu-header">
          <h3>Debug Tools</h3>
          <button class="debug-close-btn">×</button>
        </div>
        <div class="debug-menu-items">
          <button class="debug-menu-item" data-panel="indexeddb">IndexedDB Test</button>
          <button class="debug-menu-item" data-panel="search">Search Panel</button>
        </div>
      </div>
      <div class="debug-panel-container" style="display: none;"></div>
    `;

    this.container.appendChild(this.element);

    // Cache elements
    this.panelContainer = this.element.querySelector(".debug-panel-container");
  }

  private setupListeners(): void {
    if (!this.element) return;

    // Debug button click
    const debugButton = this.element.querySelector(".debug-button");
    if (debugButton) {
      const handleToggle = () => {
        const menu = this.element?.querySelector(".debug-menu");
        if (menu) {
          this.isExpanded = !this.isExpanded;
          (menu as HTMLElement).style.display = this.isExpanded ? "block" : "none";
        }
      };

      debugButton.addEventListener("click", handleToggle);
      this.cleanupFunctions.push(() =>
        debugButton.removeEventListener("click", handleToggle)
      );
    }

    // Close button click
    const closeButton = this.element.querySelector(".debug-close-btn");
    if (closeButton) {
      const handleClose = () => {
        const menu = this.element?.querySelector(".debug-menu");
        if (menu) {
          this.isExpanded = false;
          (menu as HTMLElement).style.display = "none";
        }
      };

      closeButton.addEventListener("click", handleClose);
      this.cleanupFunctions.push(() =>
        closeButton.removeEventListener("click", handleClose)
      );
    }

    // Menu item clicks
    const menuItems = this.element.querySelectorAll(".debug-menu-item");
    menuItems.forEach(item => {
      const handleMenuItemClick = () => {
        const panelType = item.getAttribute("data-panel");
        this.showPanel(panelType);

        // Hide the menu
        const menu = this.element?.querySelector(".debug-menu");
        if (menu) {
          (menu as HTMLElement).style.display = "none";
          this.isExpanded = false;
        }
      };

      item.addEventListener("click", handleMenuItemClick);
      this.cleanupFunctions.push(() =>
        item.removeEventListener("click", handleMenuItemClick)
      );
    });
  }

  private showPanel(panelType: string | null): void {
    if (!this.panelContainer) return;

    // Clean up any existing panel
    if (this.activePanel) {
      this.activePanel.destroy();
      this.activePanel = null;
    }

    // Show the panel container
    this.panelContainer.style.display = "block";
    this.panelContainer.innerHTML = ""; // Clear any previous content

    // Create the requested panel
    switch(panelType) {
      case "indexeddb":
        this.activePanel = new IndexedDBTest(this.panelContainer);
        break;
      case "search":
        this.activePanel = new SearchPanel(this.panelContainer);
        break;
      default:
        this.panelContainer.style.display = "none";
        return;
    }

    // Add a close button to the panel
    const closeBtn = document.createElement("button");
    closeBtn.className = "panel-close-btn";
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", () => {
      if (this.activePanel) {
        this.activePanel.destroy();
        this.activePanel = null;
      }
      if (this.panelContainer) {
        this.panelContainer.style.display = "none";
      }
    });

    this.panelContainer.appendChild(closeBtn);
  }

  public destroy(): void {
    // Clean up all event listeners
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];

    // Clean up active panel if any
    if (this.activePanel) {
      this.activePanel.destroy();
      this.activePanel = null;
    }

    // Remove element from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.panelContainer = null;
  }
}
