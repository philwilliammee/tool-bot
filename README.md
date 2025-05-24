# Tool-Bot

An AI-powered chat bot that can help with various tasks through natural language conversation. Engage in meaningful dialogue, get help with questions, and explore different topics through an intuitive chat interface.

> **Note**: This is a development tool and proof-of-concept. Not intended for production use.

## Requirements

- Node.js 20.6.0 or higher
- OpenAI API key and/or AWS Bedrock credentials
- LDAP server (optional, for directory services)

## Features

### Core Features
- AI-powered conversational interface with streaming support
- Real-time chat interactions with context awareness
- Project management system
- File system operations and management
- Comprehensive tool integration system
- Responsive UI with collapsible panels
- Robust interrupt system for tools and text generation

### Available Tools
- **LDAP Tool**: Directory services integration and user search
- **Math Tool**: Mathematical computations and expressions
- **HTML Tool**: Advanced HTML rendering and visualization
- **Fetch Tool**: HTTP request handling
- **File Tools**: File system operations (read/write/tree)
- **Code Executor**: Secure code execution environment
- **Data Store**: Data persistence and management
- **Octokit Tool**: GitHub API integration and repository management
- **Bash Tool**: Secure shell command execution
- **X Tool**: X (Twitter) integration for posts and feeds
- **Project Search Tool**: Search across projects and messages
- **MCP Tools**: External tools via Model Context Protocol (e.g., `mcp_calculate` for mathematical calculations)

**Note**: MCP tools are dynamically discovered from external servers and will appear in the Project Manager when available.

## Quick Start

1. **Clone and setup environment**:
    ```bash
    git clone https://github.com/philwilliammee/tool-bot
    cd tool-bot
    cp example.env .env
    ```

2. **Configure environment variables**:
    ```env
    # Required
    OPENAI_API_KEY=your_openai_key
    # Optional
    AWS_ACCESS_KEY_ID=your_aws_key
    AWS_SECRET_ACCESS_KEY=your_aws_secret
    LDAP_URL=your_ldap_url
    LDAP_BASE_DN=your_base_dn
    GITHUB_TOKEN=your_github_token
    X_API_KEY=your_x_api_key
    ```

3. **Install and run**:
    ```bash
    npm install
    npm run dev
    ```

4. **Open** `http://localhost:5173` in your browser

## Development Environment

### Build & Run Scripts

| Script          | Description                                                   |
|----------------|---------------------------------------------------------------|
| **`dev`**      | Starts both client (Vite) and server (Nodemon) in dev mode   |
| **`build`**    | Builds client and compiles server to `dist-server/`          |
| **`start:dev`**| Runs compiled server in development mode                      |
| **`start:prod`**| Runs server in production mode with .env                     |
| **`clean`**    | Deletes dist folders                                         |
| **`preview`**  | Serves production build at http://localhost:4173             |

### Docker Setup

1. **Build**:
    ```bash
    docker build -t tool-bot .
    ```

2. **Development mode**:
    ```bash
    docker run -p 3000:3000 \
      -v $(pwd):/usr/src/app \
      -v /usr/src/app/node_modules \
      --env-file .env \
      tool-bot
    ```

3. **Production mode**:
    ```bash
    docker run -p 3000:3000 --env-file .env tool-bot
    ```

## MCP (Model Context Protocol) Development

Tool-Bot includes support for external MCP servers that can provide additional tools and capabilities. The MCP integration allows you to connect external services and tools that follow the Model Context Protocol specification.

### MCP Architecture

The MCP integration consists of:
- **MCP Client**: Discovers and communicates with external MCP servers
- **MCP Tool Registry**: Manages registration of external tools
- **MCP Proxy**: Routes tool calls between the AI and external MCP servers
- **UI Integration**: MCP tools appear in the Project Manager alongside built-in tools

### Running MCP Tools in Development

#### 1. Start the MCP Calculator Server

For development and testing, we include a simple MCP calculator server:

```bash
# Start the MCP calculator server (runs on port 3000)
node simple-mcp-server.cjs
```

The MCP server provides:
- `POST /initialize` - Client registration
- `GET /tools/initialize` - Tool discovery
- `POST /tools/calculate` - Mathematical calculations
- `GET /health` - Health check

#### 2. Start Tool-Bot Development Server

```bash
# Start the main development server (client on 5173/5174, server on 3001)
npm run dev
```

#### 3. Verify MCP Integration

1. **Check Server Logs**: Look for MCP discovery messages:
   ```
   🚀 Initializing 1 MCP servers...
   ✅ MCP client initialized: http://localhost:3000
   🔌 Registered MCP tool: mcp_calculate
   ✅ Discovered 1 MCP tools total
   ```

2. **Test Tool Discovery**: Visit the test page:
   ```
   http://localhost:5173/test-mcp-client.html
   ```

3. **Check Project Manager**: In the main app, create a new project and verify `mcp_calculate` appears in the enabled tools list.

#### 4. Test End-to-End Functionality

1. Create a new project with `mcp_calculate` enabled
2. Start a conversation and ask: "What is 15 * 8 + 12?"
3. The AI should automatically use the MCP calculator tool

### MCP Configuration

MCP servers are configured in `tools/mcp-tool/client/mcp.client.ts`:

```typescript
// Add additional MCP servers
this.addMCPServer({
  url: 'http://localhost:3000',
  name: 'Calculator MCP Server'
});

// Add your custom MCP server
this.addMCPServer({
  url: 'http://localhost:4000',
  name: 'Custom MCP Server'
});
```

### Creating Custom MCP Servers

To create your own MCP server, implement these endpoints:

1. **POST /initialize**: Return client registration
   ```json
   {
     "clientId": "unique-client-id",
     "serverName": "Your MCP Server"
   }
   ```

2. **GET /tools/initialize**: Return available tools
   ```json
   {
     "tools": [
       {
         "name": "your_tool",
         "description": "Tool description",
         "inputSchema": {
           "type": "object",
           "properties": { ... },
           "required": [...]
         }
       }
     ]
   }
   ```

3. **POST /tools/{toolName}**: Handle tool execution
   ```json
   {
     "result": "tool result",
     "message": "Success message"
   }
   ```

### MCP Development Tips

- **CORS**: Ensure your MCP server includes proper CORS headers for browser requests
- **Error Handling**: Implement robust error responses with meaningful messages
- **Input Validation**: Validate and sanitize all inputs to your MCP tools
- **Logging**: Add comprehensive logging to debug tool execution
- **Testing**: Use the test page to verify tool discovery and execution

### Troubleshooting MCP Integration

**MCP tools not appearing in UI**:
1. Check that the MCP server is running on the expected port
2. Verify CORS headers are properly configured
3. Check browser console for initialization errors
4. Ensure the POST /initialize endpoint returns a valid response

**Tool execution failures**:
1. Check MCP server logs for errors
2. Verify the tool input schema matches expected format
3. Test the MCP endpoints directly with curl
4. Check network connectivity between tool-bot and MCP server

**Connection issues**:
1. Verify the MCP server URL in the client configuration
2. Check firewall settings
3. Ensure both servers are running
4. Check for port conflicts

For a working MCP server example, see the `simple-mcp-server.cjs` file included in the project root.

## Technical Architecture

### Key Components
- **Chat Context**: Manages conversation state and tool execution
- **Project System**: Handles project data and settings
- **Tool Registry**: Manages tool registration and execution
- **Data Store**: Persistent storage for projects and data
- **Error Handling**: Robust error recovery system
- **UI State Management**: Signal-based reactive state management
- **Interrupt System**: Manages interruption of tools and text generation
- **Logger Utility**: Structured, level-based logging system

### UI Layout System
The application features a responsive layout system with three main states:
- **Normal**: Default state with left panel at 30% width
- **Left-expanded**: Left panel expanded to full width, right panel collapsed
- **Right-expanded**: Right panel expanded to full width, left panel collapsed

Toggle buttons in each panel allow users to switch between these states.

The application also includes intelligent tab management:
- **HTML Content Auto-switching**: When HTML content is generated in a response, the application automatically switches to the Preview tab and sets the layout to normal mode for optimal viewing
- **Re-execute Button**: HTML content includes a re-execute button that refreshes the HTML and switches to the Preview tab

### Database Implementation

Tool-Bot uses IndexedDB for efficient data storage with these features:
- Separate storage for projects and messages
- Optimized queries with indexes
- Performance monitoring and metrics
- Batch operations for improved efficiency
- Support for large datasets
- Project search capabilities

For detailed implementation, see the Database directory in the source code.

### Security Considerations
- Keep API keys secure and never commit them to version control
- LDAP connections should use appropriate authentication
- Code execution is sandboxed but should be used cautiously
- Review tool permissions before deployment
- Validate all inputs in server-side tools

### Interrupt System
The application features a comprehensive interrupt system that allows users to:
- Interrupt specific running tools by their ID
- Interrupt all running tools at once
- Interrupt text generation
- Get immediate feedback on interrupt status

The interrupt button intelligently handles different scenarios:
1. If a specific tool is running: Interrupts that tool
2. If multiple tools are running: Interrupts all tools
3. If text is being generated: Interrupts the generation
4. Provides clear feedback through toast messages

### Logger Utility
The application includes a structured logging system with different severity levels:

- **ERROR**: Critical application errors (always displayed)
- **WARN**: Potential issues that don't stop the application
- **INFO**: General information about application operations
- **DEBUG**: Detailed debugging information (disabled in production)

The Logger automatically adjusts verbosity based on the environment (development vs. production) and can be further configured at runtime.

## Creating Custom Tools

For detailed instructions on creating custom tools, please refer to the [tools/README.md](tools/README.md) file.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

### Code Style
- Use TypeScript for type safety
- Follow existing patterns for tool implementation
- Include tests for new features
- Update documentation as needed
- Store event handlers as class properties for proper cleanup

## Development Status

### Recent Updates ✅
- Implemented IndexedDB for improved storage capacity and performance
- Added project search tool with filtering and relevance sorting
- Fixed incremental tool use input processing for highly fragmented chunks
- Fixed JSON parsing for streaming responses with escaped quotes and split chunks
- Improved error handling for unbalanced JSON in stream chunks
- Added comprehensive tests for LLMHandler and ConverseStore
- Signal-based reactive state management implementation
- Improved event handler management for proper cleanup
- Fixed UI toggle functionality
- Enhanced WorkArea component with better message display
- X Tool integration for social media interaction
- Enhanced GitHub integration via Octokit
- Auto-switching to preview tab for HTML content
- Added robust tool and text generation interrupt system
- **MCP (Model Context Protocol) integration for external tool discovery and execution**

### Current Focus 🚧
- Code and test coverage optimization
- SQL tool implementation
- Workflow system development
- Tool configuration UI

### Known Issues 🐞
1. Tool response formatting inconsistencies
2. Minor UI rendering glitches in some browsers
3. ~~Performance degrades with very large chat histories~~ (Fixed with IndexedDB ✅)
4. ~~Streaming JSON parsing failures~~ (Fixed ✅)

## Roadmap

### Phase 1: Core Features ✅
- Initial project setup and architecture
- Basic tool system implementation
- Chat interface with streaming
- File system operations
- Directory services integration

### Phase 2: Enhanced Features ✅
- Advanced HTML rendering
- Mathematical computation support
- Data persistence layer
- GitHub integration
- Social media integration
- Responsive UI layout system

### Phase 3: Current Development 🚀
- SQL integration
- ✅ Archive management
- Workflow automation
- ✅ Tool configuration UI
- Enhanced security features
- ✅ Efficient data storage with IndexedDB

### Future Plans 🔮
- WebAssembly tool integration
- Multi-model AI support
- Real-time collaboration
- Custom tool marketplace
- Advanced visualization capabilities
- AI-powered workflow automation
- Standardize Import/Export Format

## Support

For issues and feature requests, please use the GitHub issue tracker.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Project Management

Tool-Bot includes a robust project management system that allows you to:

- Create multiple projects with different configurations
- Switch between projects easily
- Configure project-specific AI models and system prompts
- Enable or disable specific tools for each project
- Clone existing projects to use as templates or backups
- Manage project metadata and settings
- Import/export projects for backup or sharing
- Persistent storage using IndexedDB for larger data capacity

### Project Search

The application includes a powerful search tool that allows you to:
- Search across all projects and messages
- Filter by project, date range, or message type
- Sort results by date or relevance
- Navigate directly to search results

To configure tools for a project:
1. Click "Manage Projects" in the project dropdown
2. Find the project you want to configure
3. In the Project Configuration section, check or uncheck tools in the "Enabled Tools" list
4. Click "Save Configuration" to apply your changes

This allows you to create specialized projects with only the tools needed for specific tasks.

To clone a project:
1. Click "Manage Projects" in the project dropdown
2. Find the project you want to clone
3. Click the "Clone" button
4. Enter a name for the new project (or accept the default "Copy of [Original]")
5. The cloned project will appear in your project list with all the same settings

## Best Practices for Component Development

When developing components for Tool-Bot, follow these best practices:

1. **Event Handler Management**:
   - Store event handler functions as class properties
   - Use these stored references when both adding and removing event listeners
   - This ensures proper cleanup and prevents memory leaks

2. **State Management**:
   - Use signals for reactive state
   - Prefer computed signals for derived state
   - Set up effects to respond to state changes

3. **Component Lifecycle**:
   - Initialize all resources in a consistent way
   - Clean up all resources in the destroy method
   - Store cleanup functions in an array for easy management

4. **UI Layout Interactions**:
   - Respect the established layout system (normal, left-expanded, right-expanded)
   - Avoid duplicate event handlers for layout controls
   - Use the signals from AppStore for layout state

## Testing Best Practices

When writing tests for Tool-Bot, follow these guidelines:

1. **Mock External Dependencies**:
   - Use Vitest's mocking capabilities to isolate the component being tested
   - Mock complex handlers like LLMHandler, ToolHandler, and MessageManager

2. **Test Edge Cases**:
   - Include tests for escaped characters in JSON responses
   - Test handling of split chunks
   - Verify error recovery mechanisms work correctly

3. **Test Structure**:
   - Use clear describe/it blocks to organize tests
   - Set up mocks in beforeEach blocks
   - Clear mocks in afterEach blocks
   - Use meaningful test names that describe the behavior being tested

4. **Test Config**:
   - Exclude temporary directories (e.g., .local) using vitest.config.ts
   - Configure appropriate timeouts for async tests

