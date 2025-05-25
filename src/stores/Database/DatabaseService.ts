// src/stores/Database/DatabaseService.ts
import { MessageExtended } from "../../app.types";
import { Project } from "../ProjectStore/ProjectStore.types";
import { Logger } from "../../utils/Logger";

/**
 * DatabaseService - Provides IndexedDB storage for projects and messages
 *
 * This service manages persistent storage for the application using IndexedDB,
 * which provides much larger storage capacity than localStorage and supports
 * more efficient querying patterns.
 */
export class DatabaseService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'tool-bot-db';
  private readonly DB_VERSION = 1;

  // Schema version history
  private readonly SCHEMA_VERSIONS = {
    INITIAL: 1,    // Initial schema with projects and messages
    // Add future versions here as the schema evolves
    // SEARCH_INDEXES: 2,  // Future: Add full-text search indexes
    // ATTACHMENTS: 3,     // Future: Support for attachments

    // Always set CURRENT to the latest version
    CURRENT: 1
  };

  private initPromise: Promise<void> | null = null;

  // Performance metrics
  private metrics = {
    operations: 0,
    totalTime: 0,
    lastOperationTime: 0
  };

  // Singleton pattern
  private static instance: DatabaseService;

  private constructor() { }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the database connection
   * Creates object stores and indexes if needed
   */
  public async init(): Promise<void> {
    if (this.db) return;

    if (!this.initPromise) {
      Logger.info('Initializing IndexedDB database');
      const startTime = performance.now();

      this.initPromise = new Promise<void>((resolve, reject) => {
        // Add a timeout to prevent permanent hanging
        const timeoutId = setTimeout(() => {
          Logger.error('IndexedDB initialization timed out after 10 seconds');
          reject(new Error('IndexedDB initialization timed out'));
        }, 10000);

        try {
          // Open database with current schema version
          const request = indexedDB.open(this.DB_NAME, this.SCHEMA_VERSIONS.CURRENT);

          request.onerror = (event) => {
            clearTimeout(timeoutId);
            const error = (event.target as IDBOpenDBRequest).error;
            Logger.error('Failed to open IndexedDB:', error?.message || event);
            reject(new Error(`Failed to open IndexedDB: ${error?.message || 'Unknown error'}`));
          };

          request.onblocked = (event) => {
            clearTimeout(timeoutId);
            Logger.warn('IndexedDB connection blocked. Close other tabs with this app open.');
            // We still resolve, but with a warning
            resolve();
          };

          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const oldVersion = event.oldVersion;

            // Use our migration framework to handle upgrades
            this.handleUpgradeNeeded(db, oldVersion);
          };

          request.onsuccess = (event) => {
            clearTimeout(timeoutId);
            this.db = (event.target as IDBOpenDBRequest).result;
            const elapsed = performance.now() - startTime;
            Logger.info(`IndexedDB initialized in ${elapsed.toFixed(2)}ms`);

            // Set up error handler for the database
            this.db.onerror = (event) => {
              Logger.error('IndexedDB error:', event);
            };

            // Check if we have the expected object stores
            if (this.db.objectStoreNames.contains('projects') &&
              this.db.objectStoreNames.contains('messages')) {
              Logger.info('Required object stores verified');
              resolve();
            } else {
              const error = new Error('Database initialized but required stores are missing');
              Logger.error(error.message);
              reject(error);
            }
          };
        } catch (error) {
          clearTimeout(timeoutId);
          Logger.error('Uncaught error during IndexedDB initialization:', error);
          reject(error);
        }
      }).catch(error => {
        Logger.error('IndexedDB initialization promise rejected:', error);
        // Clear the promise so we can try again
        this.initPromise = null;
        throw error;
      });
    }

    try {
      return await this.initPromise;
    } catch (error) {
      this.initPromise = null; // Reset on error
      throw error;
    }
  }

  /**
   * Track performance of database operations
   */
  private trackOperation(operation: string, startTime: number): void {
    const elapsed = performance.now() - startTime;
    this.metrics.operations++;
    this.metrics.totalTime += elapsed;
    this.metrics.lastOperationTime = elapsed;

    // Log operations taking longer than 100ms
    if (elapsed > 100) {
      console.warn(`Slow DB operation: ${operation} took ${elapsed.toFixed(2)}ms`);
    }
  }

  /**
   * Get performance metrics for the database
   */
  public getMetrics(): typeof this.metrics & { averageTime: number } {
    return {
      ...this.metrics,
      averageTime: this.metrics.operations > 0
        ? this.metrics.totalTime / this.metrics.operations
        : 0
    };
  }

  /**
   * Reset performance metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      operations: 0,
      totalTime: 0,
      lastOperationTime: 0
    };
  }

  // Project operations

  /**
   * Get a project by ID
   */
  public async getProject(id: string): Promise<Project | null> {
    await this.init();
    const startTime = performance.now();

    try {
      return await new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        const request = store.get(id);

        request.onerror = () => {
          const error = new Error(`Failed to get project ${id}`);
          console.error(error);
          reject(error);
        };

        request.onsuccess = () => {
          resolve(request.result || null);
        };
      });
    } finally {
      this.trackOperation(`getProject(${id})`, startTime);
    }
  }

  /**
   * Get all projects
   */
  public async getAllProjects(): Promise<Project[]> {
    await this.init();
    const startTime = performance.now();

    try {
      return await new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        const index = store.index('by_updated');
        const request = index.getAll();

        request.onerror = () => {
          const error = new Error('Failed to get all projects');
          console.error(error);
          reject(error);
        };

        request.onsuccess = () => {
          // Sort by updatedAt in descending order (newest first)
          const projects = request.result || [];
          projects.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(projects);
        };
      });
    } finally {
      this.trackOperation('getAllProjects()', startTime);
    }
  }

  /**
   * Save a project (create or update)
   */
  public async saveProject(project: Project): Promise<void> {
    await this.init();
    const startTime = performance.now();

    if (!this.db) {
      console.error("Database not initialized in saveProject");
      throw new Error("IndexedDB not initialized. Please try again.");
    }

    try {
      // Create a project metadata object without messages
      // We store messages separately for better performance
      const { messages, ...projectMetadata } = project;

      console.log(`saveProject: Saving project ${project.id}`, {
        name: project.name,
        dbReady: !!this.db,
        objectStores: this.db?.objectStoreNames.length || 0
      });

      await new Promise<void>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(['projects'], 'readwrite');

          transaction.onerror = (event) => {
            console.error(`Transaction error in saveProject for ${project.id}:`, event);
            reject(new Error(`Transaction failed: ${(event.target as IDBTransaction).error?.message || 'Unknown error'}`));
          };

          const store = transaction.objectStore('projects');

          if (!store) {
            console.error("Projects store not found", {
              storeNames: Array.from(this.db!.objectStoreNames)
            });
            reject(new Error("Projects store not found"));
            return;
          }

          const request = store.put(projectMetadata);

          request.onerror = (event) => {
            const error = (event.target as IDBRequest).error;
            console.error(`Failed to save project ${project.id}:`, error);
            reject(new Error(`Failed to save project: ${error?.message || 'Unknown error'}`));
          };

          request.onsuccess = () => {
            console.log(`Project ${project.id} saved successfully`);
            resolve();
          };
        } catch (error) {
          console.error(`Unexpected error in saveProject transaction for ${project.id}:`, error);
          reject(error);
        }
      });
    } catch (error) {
      console.error(`Error in saveProject for ${project.id}:`, error);
      throw error;
    } finally {
      this.trackOperation(`saveProject(${project.id})`, startTime);
    }
  }

  /**
   * Delete a project and all its messages
   */
  public async deleteProject(id: string): Promise<void> {
    await this.init();
    const startTime = performance.now();

    try {
      // First delete all messages for this project
      await this.deleteMessagesForProject(id);

      // Then delete the project
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction(['projects'], 'readwrite');
        const store = transaction.objectStore('projects');
        const request = store.delete(id);

        request.onerror = () => {
          const error = new Error(`Failed to delete project ${id}`);
          console.error(error);
          reject(error);
        };

        request.onsuccess = () => resolve();
      });
    } finally {
      this.trackOperation(`deleteProject(${id})`, startTime);
    }
  }

  // Message operations

  /**
   * Get all messages for a project
   */
  public async getMessagesForProject(projectId: string): Promise<MessageExtended[]> {
    await this.init();
    const startTime = performance.now();

    try {
      return await new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['messages'], 'readonly');
        const store = transaction.objectStore('messages');
        const index = store.index('by_project');
        const request = index.getAll(projectId);

        request.onerror = () => {
          const error = new Error(`Failed to get messages for project ${projectId}`);
          console.error(error);
          reject(error);
        };

        request.onsuccess = () => {
          // Sort by sequence number
          const messages = request.result || [];
          messages.sort((a, b) =>
            (a.metadata?.sequenceNumber || 0) - (b.metadata?.sequenceNumber || 0)
          );
          resolve(messages);
        };
      });
    } finally {
      this.trackOperation(`getMessagesForProject(${projectId})`, startTime);
    }
  }

  /**
   * Save a single message
   */
  public async saveMessage(message: MessageExtended): Promise<void> {
    await this.init();
    const startTime = performance.now();

    try {
      if (!message.projectId) {
        throw new Error('Message must have a projectId');
      }

      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction(['messages'], 'readwrite');
        const store = transaction.objectStore('messages');
        const request = store.put(message);

        request.onerror = () => {
          const error = new Error(`Failed to save message ${message.id}`);
          console.error(error);
          reject(error);
        };

        request.onsuccess = () => resolve();
      });
    } finally {
      this.trackOperation(`saveMessage(${message.id})`, startTime);
    }
  }

  /**
   * Save multiple messages in a batch
   */
  public async saveMessages(messages: MessageExtended[]): Promise<void> {
    await this.init();
    const startTime = performance.now();

    try {
      // Ensure all messages have projectId
      const validMessages = messages.filter(msg => !!msg.projectId);

      if (validMessages.length !== messages.length) {
        console.warn(`${messages.length - validMessages.length} messages skipped due to missing projectId`);
      }

      if (validMessages.length === 0) return;

      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction(['messages'], 'readwrite');
        const store = transaction.objectStore('messages');
        let completed = 0;
        let errors = 0;

        transaction.oncomplete = () => {
          if (errors === 0) {
            resolve();
          } else {
            reject(new Error(`Failed to save ${errors} messages`));
          }
        };

        transaction.onerror = () => {
          reject(new Error(`Transaction failed while saving messages`));
        };

        validMessages.forEach(message => {
          const request = store.put(message);

          request.onerror = () => {
            errors++;
            console.error(`Failed to save message ${message.id}:`, request.error);
          };
        });
      });
    } finally {
      this.trackOperation(`saveMessages(${messages.length})`, startTime);
    }
  }

  /**
   * Delete all messages for a project
   */
  public async deleteMessagesForProject(projectId: string): Promise<void> {
    await this.init();
    const startTime = performance.now();

    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction(['messages'], 'readwrite');
        const store = transaction.objectStore('messages');
        const index = store.index('by_project');
        const range = IDBKeyRange.only(projectId);
        const request = index.openCursor(range);

        request.onerror = () => {
          const error = new Error(`Failed to delete messages for project ${projectId}`);
          console.error(error);
          reject(error);
        };

        // Use cursor to iterate through messages and delete them
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          } else {
            resolve();
          }
        };
      });
    } finally {
      this.trackOperation(`deleteMessagesForProject(${projectId})`, startTime);
    }
  }

  /**
   * Get message count for a project
   */
  public async getMessageCountForProject(projectId: string): Promise<number> {
    await this.init();
    const startTime = performance.now();

    try {
      return await new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['messages'], 'readonly');
        const store = transaction.objectStore('messages');
        const index = store.index('by_project');
        const countRequest = index.count(projectId);

        countRequest.onerror = () => {
          const error = new Error(`Failed to count messages for project ${projectId}`);
          console.error(error);
          reject(error);
        };

        countRequest.onsuccess = () => {
          resolve(countRequest.result);
        };
      });
    } finally {
      this.trackOperation(`getMessageCountForProject(${projectId})`, startTime);
    }
  }

  // Search operations

  /**
   * Search for messages containing the query text
   */
  public async searchMessages(query: string): Promise<{
    messages: MessageExtended[],
    projectIds: string[]
  }> {
    await this.init();
    const startTime = performance.now();

    try {
      // For simplicity, we'll get all messages and filter in memory
      // A more advanced approach would use a full-text search library
      const allMessages = await this.getAllMessages();

      // Convert query to lowercase for case-insensitive search
      const lowercaseQuery = query.toLowerCase();

      // Filter messages that contain the query in their text content
      const matchingMessages = allMessages.filter(message => {
        // Extract text content from message blocks
        const textContent = message.content
          ?.filter(block => block.text)
          .map(block => block.text)
          .join(' ')
          .toLowerCase();

        return textContent?.includes(lowercaseQuery);
      });

      // Extract unique project IDs
      const projectIds = [...new Set(matchingMessages.map(msg => msg.projectId!))];

      return {
        messages: matchingMessages,
        projectIds
      };
    } finally {
      this.trackOperation(`searchMessages("${query}")`, startTime);
    }
  }

  /**
   * Helper method to get all messages (used for search)
   */
  private async getAllMessages(): Promise<MessageExtended[]> {
    await this.init();
    const startTime = performance.now();

    try {
      return await new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['messages'], 'readonly');
        const store = transaction.objectStore('messages');
        const request = store.getAll();

        request.onerror = () => {
          const error = new Error('Failed to get all messages');
          console.error(error);
          reject(error);
        };

        request.onsuccess = () => {
          resolve(request.result || []);
        };
      });
    } finally {
      this.trackOperation('getAllMessages()', startTime);
    }
  }

  /**
   * Export a project and all its messages
   */
  public async exportProject(projectId: string): Promise<{
    project: Project,
    messages: MessageExtended[]
  }> {
    await this.init();
    const startTime = performance.now();

    try {
      // Get project data
      const project = await this.getProject(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Get project messages
      const messages = await this.getMessagesForProject(projectId);

      return {
        project,
        messages
      };
    } finally {
      this.trackOperation(`exportProject(${projectId})`, startTime);
    }
  }

  /**
   * Import a project and its messages
   */
  public async importProject(data: {
    project: Project,
    messages: MessageExtended[]
  }): Promise<string> {
    await this.init();
    const startTime = performance.now();

    try {
      // Generate a new ID for the imported project
      const newId = crypto.randomUUID();
      const now = Date.now();

      // Create a new project based on the imported data
      const newProject: Project = {
        ...data.project,
        id: newId,
        name: data.project.name.endsWith(" (Imported)")
          ? data.project.name
          : `${data.project.name} (Imported)`,
        createdAt: now,
        updatedAt: now,
        messages: [] // Ensure messages array is empty in project object
      };

      // Save the new project
      await this.saveProject(newProject);

      // Process messages if they exist
      if (data.messages && data.messages.length > 0) {
        console.log(`Processing ${data.messages.length} messages for imported project`);

        // Update message IDs and projectId
        const newMessages = data.messages.map(message => ({
          ...message,
          projectId: newId // Ensure projectId is updated to match new project
        }));

        // Save the messages
        await this.saveMessages(newMessages);
        console.log(`Saved ${newMessages.length} messages for imported project`);
      } else {
        console.log('No messages to import for the project');
      }

      return newId;
    } finally {
      this.trackOperation(`importProject()`, startTime);
    }
  }

  /**
   * Test database connection by attempting to create, read, and delete a test object
   * This method can be used to diagnose database connection issues
   */
  public async testDatabaseConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Initialize database
      await this.init();

      if (!this.db) {
        return {
          success: false,
          message: "Database failed to initialize"
        };
      }

      console.log("Database initialized successfully for test");

      // 2. Test accessing stores
      const storeNames = Array.from(this.db.objectStoreNames);
      console.log("Available stores:", storeNames);

      if (!storeNames.includes('projects')) {
        return {
          success: false,
          message: "Projects store not found in database"
        };
      }

      // 3. Create a test project
      const testProject: Project = {
        id: `test-${Date.now()}`,
        name: "Test Project",
        description: "Test project for database connection",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "active",
        version: 1,
        messages: [],
        archiveSummary: {
          summary: null,
          lastSummarizedMessageIds: [],
          lastSummarization: 0,
        },
        config: {
          model: "default",
          systemPrompt: "",
          persistentUserMessage: "",
          enabledTools: []
        }
      };

      console.log("Attempting to save test project:", testProject.id);

      // 4. Try to save the test project
      try {
        await this.saveProject(testProject);
        console.log("Test project saved successfully");
      } catch (saveError) {
        return {
          success: false,
          message: `Failed to save test project: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`
        };
      }

      // 5. Try to retrieve the test project
      try {
        const retrievedProject = await this.getProject(testProject.id);

        if (!retrievedProject) {
          return {
            success: false,
            message: "Failed to retrieve test project after saving"
          };
        }

        console.log("Test project retrieved successfully");
      } catch (getError) {
        return {
          success: false,
          message: `Failed to retrieve test project: ${getError instanceof Error ? getError.message : 'Unknown error'}`
        };
      }

      // 6. Clean up - delete the test project
      try {
        await this.deleteProject(testProject.id);
        console.log("Test project deleted successfully");
      } catch (deleteError) {
        console.warn("Failed to delete test project:", deleteError);
        // Don't fail the test if deletion fails
      }

      return {
        success: true,
        message: "Database connection test completed successfully"
      };

    } catch (error) {
      console.error("Database connection test failed:", error);
      return {
        success: false,
        message: `Database connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Force database initialization by resetting the connection and trying again
   * This is a more aggressive approach when normal initialization fails
   */
  public async forceInit(): Promise<void> {
    console.log("Forcing database initialization");

    // Reset everything
    this.db = null;
    this.initPromise = null;

    try {
      // Try to close any existing connection
      const existingDBs = await window.indexedDB.databases();
      for (const dbInfo of existingDBs) {
        if (dbInfo.name === this.DB_NAME) {
          console.log("Closing existing database connection");
          const tempRequest = indexedDB.open(this.DB_NAME);
          tempRequest.onsuccess = () => {
            const tempDB = tempRequest.result;
            tempDB.close();
          };
        }
      }
    } catch (error) {
      console.warn("Error closing existing database:", error);
      // Continue anyway
    }

    // Use a shorter timeout for the forced initialization
    const startTime = performance.now();

    console.log("Attempting to recreate database connection");

    return new Promise<void>((resolve, reject) => {
      try {
        // Open with higher version to force upgrade
        const request = indexedDB.open(this.DB_NAME, this.DB_VERSION + 1);

        request.onerror = (event) => {
          console.error("Force init error:", event);
          reject(new Error("Force database initialization failed"));
        };

        request.onupgradeneeded = (event) => {
          console.log("Force upgrading database schema");
          const db = (event.target as IDBOpenDBRequest).result;

          // Create or recreate project store
          if (db.objectStoreNames.contains('projects')) {
            db.deleteObjectStore('projects');
          }

          const projectsStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectsStore.createIndex('by_updated', 'updatedAt', { unique: false });

          // Create or recreate messages store
          if (db.objectStoreNames.contains('messages')) {
            db.deleteObjectStore('messages');
          }

          const messagesStore = db.createObjectStore('messages', {
            keyPath: ['projectId', 'id']
          });
          messagesStore.createIndex('by_project', 'projectId', { unique: false });
          messagesStore.createIndex('by_sequence', ['projectId', 'metadata.sequenceNumber'], {
            unique: false
          });

          console.log("Force recreated database schema");
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          // Don't try to modify the readonly DB_VERSION
          const newVersion = this.db.version;
          console.log(`Force initialized IndexedDB with version ${newVersion} in ${(performance.now() - startTime).toFixed(2)}ms`);
          resolve();
        };
      } catch (error) {
        console.error("Critical error during force initialization:", error);
        reject(error);
      }
    });
  }

  /**
   * Handles database schema upgrades based on version number
   * This is called automatically during DB initialization when the version changes
   */
  private handleUpgradeNeeded(db: IDBDatabase, oldVersion: number): void {
    Logger.info(`Upgrading database schema from version ${oldVersion} to ${this.SCHEMA_VERSIONS.CURRENT}`);

    // Initial schema creation (only if database is new)
    if (oldVersion < this.SCHEMA_VERSIONS.INITIAL) {
      this.createInitialSchema(db);
    }

    // Add future migrations here as the schema evolves
    // Example:
    // if (oldVersion < this.SCHEMA_VERSIONS.SEARCH_INDEXES) {
    //   this.upgradeToSearchIndexes(db);
    // }
    //
    // if (oldVersion < this.SCHEMA_VERSIONS.ATTACHMENTS) {
    //   this.upgradeToAttachments(db);
    // }
  }

  /**
   * Creates the initial database schema (v1)
   */
  private createInitialSchema(db: IDBDatabase): void {
    Logger.info('Creating initial database schema');

    // Create projects store
    if (!db.objectStoreNames.contains('projects')) {
      const projectsStore = db.createObjectStore('projects', { keyPath: 'id' });
      projectsStore.createIndex('by_updated', 'updatedAt', { unique: false });
      Logger.debug('Created projects store with by_updated index');
    }

    // Create messages store with composite key
    if (!db.objectStoreNames.contains('messages')) {
      const messagesStore = db.createObjectStore('messages', {
        keyPath: ['projectId', 'id']
      });
      messagesStore.createIndex('by_project', 'projectId', { unique: false });
      messagesStore.createIndex('by_sequence', ['projectId', 'metadata.sequenceNumber'], {
        unique: false
      });
      Logger.debug('Created messages store with indexes');
    }
  }

  /**
   * Delete a single message
   */
  public async deleteMessage(projectId: string, messageId: string): Promise<void> {
    await this.init();
    const startTime = performance.now();

    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction(['messages'], 'readwrite');
        const store = transaction.objectStore('messages');

        // Use composite key [projectId, messageId] as defined in schema
        const request = store.delete([projectId, messageId]);

        request.onerror = () => {
          const error = new Error(`Failed to delete message ${messageId} from project ${projectId}`);
          console.error(error);
          reject(error);
        };

        request.onsuccess = () => {
          console.log(`Message ${messageId} deleted from IndexedDB`);
          resolve();
        };
      });
    } finally {
      this.trackOperation(`deleteMessage(${projectId}:${messageId})`, startTime);
    }
  }

  public destroy(): void {
    // Implementation of destroy method
  }
}

export const dbService = DatabaseService.getInstance();
