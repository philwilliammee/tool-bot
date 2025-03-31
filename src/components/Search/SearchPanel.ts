// src/components/Search/SearchPanel.ts
import { searchStore } from "../../stores/SearchStore";
import { effect } from "@preact/signals-core";

/**
 * SearchPanel - A component for searching messages across projects
 *
 * This component provides a UI for searching messages and displaying results.
 */
export class SearchPanel {
  private element: HTMLElement | null = null;
  private resultsElement: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private cleanupFunctions: (() => void)[] = [];

  constructor(private container: HTMLElement) {
    this.render();
    this.setupListeners();
  }

  private render(): void {
    this.element = document.createElement("div");
    this.element.className = "search-panel";

    this.element.innerHTML = `
      <div class="search-header">
        <h2>Search Messages</h2>
        <div class="search-form">
          <input type="text" id="search-input" placeholder="Search across all conversations...">
          <button id="search-button" class="btn primary">Search</button>
          <button id="clear-search" class="btn secondary">Clear</button>
        </div>
      </div>
      <div class="search-status"></div>
      <div class="search-results"></div>
    `;

    this.container.appendChild(this.element);

    // Cache elements
    this.searchInput = this.element.querySelector("#search-input");
    this.resultsElement = this.element.querySelector(".search-results");
  }

  private setupListeners(): void {
    if (!this.element || !this.searchInput) return;

    // Search button click
    const searchButton = this.element.querySelector("#search-button");
    if (searchButton) {
      const handleSearch = () => {
        const query = this.searchInput?.value.trim();
        if (query) {
          searchStore.search(query);
        }
      };

      searchButton.addEventListener("click", handleSearch);
      this.cleanupFunctions.push(() =>
        searchButton.removeEventListener("click", handleSearch)
      );
    }

    // Clear button click
    const clearButton = this.element.querySelector("#clear-search");
    if (clearButton) {
      const handleClear = () => {
        if (this.searchInput) {
          this.searchInput.value = "";
        }
        searchStore.clearSearch();
      };

      clearButton.addEventListener("click", handleClear);
      this.cleanupFunctions.push(() =>
        clearButton.removeEventListener("click", handleClear)
      );
    }

    // Enter key in search input
    if (this.searchInput) {
      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          const query = this.searchInput?.value.trim();
          if (query) {
            searchStore.search(query);
          }
        }
      };

      this.searchInput.addEventListener("keyup", handleKeyUp);
      this.cleanupFunctions.push(() =>
        this.searchInput?.removeEventListener("keyup", handleKeyUp)
      );
    }

    // Update results when search results change
    const updateStatusEffect = effect(() => {
      const isSearching = searchStore.isSearching.value;
      const hasResults = searchStore.hasResults.value;
      const query = searchStore.searchQuery.value;
      const results = searchStore.searchResults.value;

      const statusElement = this.element?.querySelector(".search-status");
      if (statusElement) {
        if (isSearching) {
          statusElement.innerHTML = `<div class="loading-spinner"></div><span>Searching...</span>`;
        } else if (query && results.length > 0) {
          statusElement.textContent = `Found ${results.length} results for "${query}"`;
        } else if (query) {
          statusElement.textContent = `No results found for "${query}"`;
        } else {
          statusElement.textContent = "";
        }
      }
    });

    // Update results display
    const updateResultsEffect = effect(() => {
      const results = searchStore.searchResults.value;
      const projectNames = searchStore.searchProjects.value;

      if (this.resultsElement) {
        if (results.length === 0) {
          this.resultsElement.innerHTML = "";
          return;
        }

        const resultHtml = results.map(message => {
          const projectName = projectNames[message.projectId || ""] || "Unknown Project";
          const messageContent = message.content
            ?.filter(block => block.text)
            .map(block => block.text)
            .join(" ")
            .substring(0, 200) + (message.content?.[0]?.text?.length > 200 ? "..." : "");

          const date = new Date(message.metadata.createdAt).toLocaleString();

          return `
            <div class="search-result-item" data-message-id="${message.id}" data-project-id="${message.projectId}">
              <div class="result-header">
                <span class="result-project">${projectName}</span>
                <span class="result-date">${date}</span>
              </div>
              <div class="result-content">${messageContent}</div>
            </div>
          `;
        }).join("");

        this.resultsElement.innerHTML = resultHtml;

        // Add click handlers to results
        const resultItems = this.resultsElement.querySelectorAll(".search-result-item");
        resultItems.forEach(item => {
          const messageId = item.getAttribute("data-message-id");
          const projectId = item.getAttribute("data-project-id");

          if (messageId && projectId) {
            item.addEventListener("click", () => {
              searchStore.navigateToResult(messageId, projectId);
            });
          }
        });
      }
    });

    this.cleanupFunctions.push(() => {
      // The @preact/signals-core effect() function returns a cleanup function
      // that should be called to dispose of the effect
      if (updateStatusEffect) updateStatusEffect();
      if (updateResultsEffect) updateResultsEffect();
    });
  }

  public destroy(): void {
    // Clean up all event listeners
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];

    // Remove element from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.resultsElement = null;
    this.searchInput = null;
  }
}
