// src/stores/SearchStore.ts
import { signal } from "@preact/signals-core";
import { MessageExtended } from "../app.types";
import { dbService } from "./Database/DatabaseService";
import { projectStore } from "./ProjectStore/ProjectStore";

/**
 * SearchStore - Manages search operations and results across projects
 * 
 * This store provides functionality to search messages across all projects
 * and maintains the search state using signals.
 */
export class SearchStore {
  private searchResultsSignal = signal<MessageExtended[]>([]);
  private searchQuerySignal = signal<string>("");
  private isSearchingSignal = signal<boolean>(false);
  private searchProjectsSignal = signal<Record<string, string>>({});
  private hasResultsSignal = signal<boolean>(false);
  
  constructor() {}
  
  // Getters for signals
  public get searchResults() {
    return this.searchResultsSignal;
  }
  
  public get searchQuery() {
    return this.searchQuerySignal;
  }
  
  public get isSearching() {
    return this.isSearchingSignal;
  }
  
  public get searchProjects() {
    return this.searchProjectsSignal;
  }
  
  public get hasResults() {
    return this.hasResultsSignal;
  }
  
  /**
   * Search for messages containing the query text across all projects
   */
  public async search(query: string): Promise<void> {
    if (!query || query.trim() === "") {
      this.clearSearch();
      return;
    }
    
    this.searchQuerySignal.value = query;
    this.isSearchingSignal.value = true;
    this.hasResultsSignal.value = false;
    
    try {
      console.log(`Searching for: "${query}"`);
      const startTime = performance.now();
      
      const { messages, projectIds } = await dbService.searchMessages(query);
      
      // Load project names for display
      const projectNames: Record<string, string> = {};
      
      for (const projectId of projectIds) {
        const project = await projectStore.getProject(projectId);
        if (project) {
          projectNames[projectId] = project.name;
        }
      }
      
      this.searchResultsSignal.value = messages;
      this.searchProjectsSignal.value = projectNames;
      this.hasResultsSignal.value = messages.length > 0;
      
      const elapsed = performance.now() - startTime;
      console.log(`Search completed in ${elapsed.toFixed(2)}ms. Found ${messages.length} results across ${projectIds.length} projects.`);
    } catch (error) {
      console.error('Search failed:', error);
      this.searchResultsSignal.value = [];
      this.hasResultsSignal.value = false;
    } finally {
      this.isSearchingSignal.value = false;
    }
  }
  
  /**
   * Clear search results
   */
  public clearSearch(): void {
    this.searchQuerySignal.value = "";
    this.searchResultsSignal.value = [];
    this.searchProjectsSignal.value = {};
    this.hasResultsSignal.value = false;
  }
  
  /**
   * Navigate to a specific message result
   */
  public navigateToResult(messageId: string, projectId: string): void {
    // Set the active project
    projectStore.setActiveProject(projectId);
    
    // Highlight the message (implementation depends on your UI)
    setTimeout(() => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('highlight-search-result');
        
        // Remove highlight after animation completes
        setTimeout(() => {
          messageElement.classList.remove('highlight-search-result');
        }, 2000);
      }
    }, 300); // Small delay to allow project loading
  }
}

export const searchStore = new SearchStore();