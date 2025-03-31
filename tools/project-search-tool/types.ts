// tools/project-search-tool/types.ts

export interface ProjectSearchInput {
  // Search query string
  query: string;
  
  // Optional filters
  filters?: {
    projectIds?: string[];         // Limit to specific projects
    dateRange?: {                  // Date range filter
      from?: number;               // Timestamp
      to?: number;                 // Timestamp
    };
    messageType?: 'user' | 'assistant' | 'tool_result';  // Filter by message type
    limit?: number;                // Max number of results (default: 50)
    includeArchived?: boolean;     // Include archived messages (default: true)
  };
  
  // Sorting options
  sort?: {
    field: 'date' | 'relevance';   // Sort by date or relevance
    direction: 'asc' | 'desc';     // Sort direction
  };
}

export interface ProjectSearchResult {
  id: string;                      // Message ID
  projectId: string;               // Project ID
  projectName: string;             // Project name
  content: string;                 // Message content snippet
  date: number;                    // Message timestamp
  role: string;                    // Message role (user/assistant/etc)
  matchScore?: number;             // Relevance score (optional)
  context?: {                      // Optional context
    previousMessage?: string;      // Previous message snippet
    nextMessage?: string;          // Next message snippet
  };
}

export interface ProjectSearchResponse {
  results: ProjectSearchResult[];
  totalResults: number;            // Total number of matching results
  searchTime: number;              // Search execution time in ms
  error?: string;                  // Error message if search failed
}