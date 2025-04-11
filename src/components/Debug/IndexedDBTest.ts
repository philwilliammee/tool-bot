// src/components/Debug/IndexedDBTest.ts
import { dbService } from "../../stores/Database/DatabaseService";
import { projectStore } from "../../stores/ProjectStore/ProjectStore";
import { converseStore } from "../../stores/ConverseStore/ConverseStore";
import { MessageExtended } from "../../app.types";

/**
 * IndexedDBTest - A component for testing IndexedDB functionality
 *
 * This component provides a UI for testing and debugging IndexedDB operations.
 */
export class IndexedDBTest {
  private element: HTMLElement | null = null;
  private resultsElement: HTMLElement | null = null;
  private cleanupFunctions: (() => void)[] = [];

  constructor(private container: HTMLElement) {
    this.render();
    this.setupListeners();
  }

  private render(): void {
    this.element = document.createElement("div");
    this.element.className = "indexeddb-test-panel";

    this.element.innerHTML = `
      <h2>IndexedDB Test Panel</h2>
      <div class="test-controls">
        <div class="control-group">
          <h3>Database Operations</h3>
          <button id="test-init-db" class="btn primary">Initialize Database</button>
          <button id="test-get-all-projects" class="btn">Get All Projects</button>
          <button id="test-get-project" class="btn">Get Current Project</button>
          <button id="test-get-messages" class="btn">Get Current Project Messages</button>
        </div>

        <div class="control-group">
          <h3>Performance Tests</h3>
          <button id="test-create-project" class="btn">Create Test Project</button>
          <button id="test-add-messages" class="btn">Add 100 Test Messages</button>
          <button id="test-search" class="btn">Test Search</button>
          <button id="test-metrics" class="btn">Show Metrics</button>
        </div>
      </div>

      <div class="test-results">
        <h3>Results</h3>
        <pre id="test-output">Run a test to see results...</pre>
      </div>
    `;

    this.container.appendChild(this.element);

    // Cache elements
    this.resultsElement = this.element.querySelector("#test-output");
  }

  private setupListeners(): void {
    if (!this.element) return;

    // Initialize Database
    const initDbButton = this.element.querySelector("#test-init-db");
    if (initDbButton) {
      const handleInitDb = async () => {
        this.logOutput("Initializing database...");
        const startTime = performance.now();

        try {
          await dbService.init();
          const elapsed = performance.now() - startTime;
          this.logOutput(`Database initialized in ${elapsed.toFixed(2)}ms`);
        } catch (error) {
          this.logOutput(`Error: ${error}`);
        }
      };

      initDbButton.addEventListener("click", handleInitDb);
      this.cleanupFunctions.push(() =>
        initDbButton.removeEventListener("click", handleInitDb)
      );
    }

    // Get All Projects
    const getAllProjectsButton = this.element.querySelector("#test-get-all-projects");
    if (getAllProjectsButton) {
      const handleGetAllProjects = async () => {
        this.logOutput("Getting all projects...");
        const startTime = performance.now();

        try {
          const projects = await dbService.getAllProjects();
          const elapsed = performance.now() - startTime;
          this.logOutput(`Found ${projects.length} projects in ${elapsed.toFixed(2)}ms`);
          this.logOutput(JSON.stringify(projects.map(p => ({ id: p.id, name: p.name })), null, 2));
        } catch (error) {
          this.logOutput(`Error: ${error}`);
        }
      };

      getAllProjectsButton.addEventListener("click", handleGetAllProjects);
      this.cleanupFunctions.push(() =>
        getAllProjectsButton.removeEventListener("click", handleGetAllProjects)
      );
    }

    // Get Current Project
    const getProjectButton = this.element.querySelector("#test-get-project");
    if (getProjectButton) {
      const handleGetProject = async () => {
        const activeProjectId = projectStore.getActiveProject();
        if (!activeProjectId) {
          this.logOutput("No active project");
          return;
        }

        this.logOutput(`Getting project ${activeProjectId}...`);
        const startTime = performance.now();

        try {
          const project = await dbService.getProject(activeProjectId);
          const elapsed = performance.now() - startTime;
          if (project) {
            this.logOutput(`Project loaded in ${elapsed.toFixed(2)}ms`);
            this.logOutput(JSON.stringify({
              id: project.id,
              name: project.name,
              description: project.description,
              createdAt: new Date(project.createdAt).toISOString(),
              updatedAt: new Date(project.updatedAt).toISOString()
            }, null, 2));
          } else {
            this.logOutput(`Project not found (${elapsed.toFixed(2)}ms)`);
          }
        } catch (error) {
          this.logOutput(`Error: ${error}`);
        }
      };

      getProjectButton.addEventListener("click", handleGetProject);
      this.cleanupFunctions.push(() =>
        getProjectButton.removeEventListener("click", handleGetProject)
      );
    }

    // Get Messages
    const getMessagesButton = this.element.querySelector("#test-get-messages");
    if (getMessagesButton) {
      const handleGetMessages = async () => {
        const activeProjectId = projectStore.getActiveProject();
        if (!activeProjectId) {
          this.logOutput("No active project");
          return;
        }

        this.logOutput(`Getting messages for project ${activeProjectId}...`);
        const startTime = performance.now();

        try {
          const messages = await dbService.getMessagesForProject(activeProjectId);
          const elapsed = performance.now() - startTime;
          this.logOutput(`Found ${messages.length} messages in ${elapsed.toFixed(2)}ms`);

          if (messages.length > 0) {
            this.logOutput(`First message: ${JSON.stringify({
              id: messages[0].id,
              role: messages[0].role,
              content: messages[0].content?.[0]?.text?.substring(0, 50) + "...",
              createdAt: new Date(messages[0].metadata.createdAt).toISOString()
            }, null, 2)}`);

            this.logOutput(`Last message: ${JSON.stringify({
              id: messages[messages.length - 1].id,
              role: messages[messages.length - 1].role,
              content: messages[messages.length - 1].content?.[0]?.text?.substring(0, 50) + "...",
              createdAt: new Date(messages[messages.length - 1].metadata.createdAt).toISOString()
            }, null, 2)}`);
          }
        } catch (error) {
          this.logOutput(`Error: ${error}`);
        }
      };

      getMessagesButton.addEventListener("click", handleGetMessages);
      this.cleanupFunctions.push(() =>
        getMessagesButton.removeEventListener("click", handleGetMessages)
      );
    }

    // Create Test Project
    const createProjectButton = this.element.querySelector("#test-create-project");
    if (createProjectButton) {
      const handleCreateProject = async () => {
        this.logOutput("Creating test project...");
        const startTime = performance.now();

        try {
          const projectId = await projectStore.createProject(
            `Test Project ${new Date().toISOString()}`,
            "Created for performance testing"
          );
          const elapsed = performance.now() - startTime;

          this.logOutput(`Project created in ${elapsed.toFixed(2)}ms with ID: ${projectId}`);
          projectStore.setActiveProject(projectId);
        } catch (error) {
          this.logOutput(`Error: ${error}`);
        }
      };

      createProjectButton.addEventListener("click", handleCreateProject);
      this.cleanupFunctions.push(() =>
        createProjectButton.removeEventListener("click", handleCreateProject)
      );
    }

    // Add Test Messages
    const addMessagesButton = this.element.querySelector("#test-add-messages");
    if (addMessagesButton) {
      const handleAddMessages = async () => {
        const activeProjectId = projectStore.getActiveProject();
        if (!activeProjectId) {
          this.logOutput("No active project");
          return;
        }

        const messageCount = 100;
        this.logOutput(`Adding ${messageCount} test messages to project ${activeProjectId}...`);
        const startTime = performance.now();

        try {
          const messages: MessageExtended[] = [];

          for (let i = 0; i < messageCount; i++) {
            const isUser = i % 2 === 0;
            const messageId = `test_msg_${Date.now()}_${i}`;

            messages.push({
              id: messageId,
              projectId: activeProjectId,
              role: isUser ? "user" : "assistant",
              content: [{
                text: isUser
                  ? `This is test user message ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.`
                  : `This is test assistant message ${i}: Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`
              }],
              metadata: {
                createdAt: Date.now() + i,
                updatedAt: Date.now() + i,
                sequenceNumber: i,
              }
            });
          }

          await dbService.saveMessages(messages);

          const elapsed = performance.now() - startTime;
          this.logOutput(`Added ${messageCount} messages in ${elapsed.toFixed(2)}ms`);
          this.logOutput(`Average time per message: ${(elapsed / messageCount).toFixed(2)}ms`);

          // Force the ConverseStore to reload messages
          await converseStore.setProject(null);
          await converseStore.setProject(activeProjectId);

        } catch (error) {
          this.logOutput(`Error: ${error}`);
        }
      };

      addMessagesButton.addEventListener("click", handleAddMessages);
      this.cleanupFunctions.push(() =>
        addMessagesButton.removeEventListener("click", handleAddMessages)
      );
    }

    // Test Search
    const searchButton = this.element.querySelector("#test-search");
    if (searchButton) {
      const handleSearch = async () => {
        const searchTerm = "Lorem ipsum";
        this.logOutput(`Searching for "${searchTerm}"...`);
        const startTime = performance.now();

        try {
          const { messages, projectIds } = await dbService.searchMessages(searchTerm);
          const elapsed = performance.now() - startTime;

          this.logOutput(`Found ${messages.length} results across ${projectIds.length} projects in ${elapsed.toFixed(2)}ms`);

          if (messages.length > 0) {
            const sampledMessages = messages.slice(0, 3);
            this.logOutput(`Sample results: ${JSON.stringify(sampledMessages.map(m => ({
              id: m.id,
              projectId: m.projectId,
              content: m.content?.[0]?.text?.substring(0, 30) + "..."
            })), null, 2)}`);
          }
        } catch (error) {
          this.logOutput(`Error: ${error}`);
        }
      };

      searchButton.addEventListener("click", handleSearch);
      this.cleanupFunctions.push(() =>
        searchButton.removeEventListener("click", handleSearch)
      );
    }

    // Show Metrics
    const metricsButton = this.element.querySelector("#test-metrics");
    if (metricsButton) {
      const handleMetrics = () => {
        this.logOutput("Gathering performance metrics...");

        const dbMetrics = dbService.getMetrics();
        const converseMetrics = converseStore.getMetrics();

        this.logOutput("Database Metrics:");
        this.logOutput(JSON.stringify(dbMetrics, null, 2));

        this.logOutput("ConverseStore Metrics:");
        this.logOutput(JSON.stringify(converseMetrics, null, 2));
      };

      metricsButton.addEventListener("click", handleMetrics);
      this.cleanupFunctions.push(() =>
        metricsButton.removeEventListener("click", handleMetrics)
      );
    }
  }

  private logOutput(message: string): void {
    if (this.resultsElement) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      this.resultsElement.textContent += `\n[${timestamp}] ${message}`;
      this.resultsElement.scrollTop = this.resultsElement.scrollHeight;
    }
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
  }
}
