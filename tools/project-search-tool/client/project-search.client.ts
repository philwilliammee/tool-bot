// tools/project-search-tool/client/project-search.client.ts
import { ClientTool } from "../../client/tool.interface";
import { ProjectSearchInput, ProjectSearchResponse } from "../types";
import { dbService } from "../../../src/stores/Database/DatabaseService";
import { projectStore } from "../../../src/stores/ProjectStore/ProjectStore";
import { Logger } from "../../../src/utils/Logger";

/**
 * Project Search Tool - Client-side implementation
 * 
 * This tool provides advanced search capabilities for messages across projects
 * using the IndexedDB database. It supports filtering by project, date range,
 * and message type, as well as sorting by date or relevance.
 */
export const projectSearchTool: ClientTool = {
  name: "project_search",
  
  execute: async (input: ProjectSearchInput): Promise<ProjectSearchResponse> => {
    const startTime = performance.now();
    
    try {
      Logger.info(`Executing project search for query: "${input.query}"`);
      
      // Apply default values
      const filters = input.filters || {};
      const limit = filters.limit || 50;
      const includeArchived = filters.includeArchived !== false;
      const sort = input.sort || { field: 'date', direction: 'desc' };
      
      // Wait for IndexedDB to be ready
      await dbService.init();
      
      // Get raw search results from database service
      Logger.debug('Fetching messages from IndexedDB');
      const { messages, projectIds } = await dbService.searchMessages(input.query);
      Logger.info(`Raw search returned ${messages.length} messages across ${projectIds.length} projects`);
      
      // Filter results based on input criteria
      let filteredMessages = messages;
      
      // Filter by project IDs if specified
      if (filters.projectIds && filters.projectIds.length > 0) {
        Logger.debug(`Filtering by project IDs: ${filters.projectIds.join(', ')}`);
        filteredMessages = filteredMessages.filter(msg => 
          filters.projectIds!.includes(msg.projectId || '')
        );
      }
      
      // Filter by date range if specified
      if (filters.dateRange) {
        if (filters.dateRange.from) {
          Logger.debug(`Filtering messages after ${new Date(filters.dateRange.from).toISOString()}`);
          filteredMessages = filteredMessages.filter(msg => 
            (msg.metadata?.createdAt || 0) >= (filters.dateRange?.from || 0)
          );
        }
        if (filters.dateRange.to) {
          Logger.debug(`Filtering messages before ${new Date(filters.dateRange.to).toISOString()}`);
          filteredMessages = filteredMessages.filter(msg => 
            (msg.metadata?.createdAt || 0) <= (filters.dateRange?.to || 0)
          );
        }
      }
      
      // Filter by message type if specified
      if (filters.messageType) {
        Logger.debug(`Filtering by message type: ${filters.messageType}`);
        filteredMessages = filteredMessages.filter(msg => 
          msg.role === filters.messageType
        );
      }
      
      Logger.debug(`After filtering: ${filteredMessages.length} messages remain`);
      
      // Sort results
      if (sort.field === 'date') {
        Logger.debug(`Sorting by date (${sort.direction})`);
        filteredMessages.sort((a, b) => {
          const aDate = a.metadata?.createdAt || 0;
          const bDate = b.metadata?.createdAt || 0;
          return sort.direction === 'asc' ? aDate - bDate : bDate - aDate;
        });
      } else {
        Logger.debug(`Sorting by relevance (${sort.direction})`);
        // For relevance sorting, we'll use a simple implementation based on number of matches
        const query = input.query.toLowerCase();
        
        // Try to use a safe regex pattern, escaping special characters
        const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        try {
          const regex = new RegExp(safeQuery, 'gi');
          
          // Calculate match scores for each message
          filteredMessages.forEach(msg => {
            const content = msg.content
              ?.filter(block => block.text)
              .map(block => block.text || '')
              .join(' ') || '';
              
            // Count matches in the content
            const matches = content.match(regex);
            const matchCount = matches ? matches.length : 0;
            
            // Store the match score in a temporary property
            (msg as any).tempMatchScore = matchCount;
          });
          
          // Sort by match score
          filteredMessages.sort((a, b) => {
            const aScore = (a as any).tempMatchScore || 0;
            const bScore = (b as any).tempMatchScore || 0;
            return sort.direction === 'asc' ? aScore - bScore : bScore - aScore;
          });
        } catch (regexError) {
          // If regex fails, fall back to simple string includes
          Logger.warn('Regex search failed, falling back to simple search', regexError);
          
          filteredMessages.sort((a, b) => {
            const aContent = a.content
              ?.filter(block => block.text)
              .map(block => block.text?.toLowerCase() || '')
              .join(' ') || '';
            
            const bContent = b.content
              ?.filter(block => block.text)
              .map(block => block.text?.toLowerCase() || '')
              .join(' ') || '';
              
            // Simple count of query occurrences
            const aMatches = aContent.split(query).length - 1;
            const bMatches = bContent.split(query).length - 1;
            
            return sort.direction === 'asc' ? aMatches - bMatches : bMatches - aMatches;
          });
        }
      }
      
      // Get project names for the filtered messages
      const uniqueProjectIds = [...new Set(filteredMessages.map(msg => msg.projectId))];
      const projectNames: Record<string, string> = {};
      
      Logger.debug(`Fetching project names for ${uniqueProjectIds.length} projects`);
      for (const projectId of uniqueProjectIds) {
        if (projectId) {
          const project = await projectStore.getProject(projectId);
          if (project) {
            projectNames[projectId] = project.name;
          } else {
            projectNames[projectId] = 'Unknown Project';
          }
        }
      }
      
      // Format results, limiting to requested number
      const results = filteredMessages
        .slice(0, limit)
        .map(msg => {
          // Extract content text
          const contentText = msg.content
            ?.filter(block => block.text)
            .map(block => block.text)
            .join(' ') || '';
            
          // Create result object
          return {
            id: msg.id,
            projectId: msg.projectId || '',
            projectName: projectNames[msg.projectId || ''] || 'Unknown Project',
            content: contentText.length > 200 
              ? contentText.substring(0, 200) + '...' 
              : contentText,
            date: msg.metadata?.createdAt || 0,
            role: msg.role,
            matchScore: (msg as any).tempMatchScore || 0
          };
        });
      
      const searchTime = performance.now() - startTime;
      
      Logger.info(`Project search completed in ${searchTime.toFixed(2)}ms. Found ${results.length} results out of ${filteredMessages.length} matches.`);
      
      return {
        results,
        totalResults: filteredMessages.length,
        searchTime
      };
      
    } catch (error: any) {
      Logger.error('Project search error:', error);
      
      return {
        results: [],
        totalResults: 0,
        searchTime: performance.now() - startTime,
        error: error.message || 'An error occurred during search'
      };
    }
  }
};