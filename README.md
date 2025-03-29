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

## Technical Architecture

### Key Components
- **Chat Context**: Manages conversation state and tool execution
- **Project System**: Handles project data and settings
- **Tool Registry**: Manages tool registration and execution
- **Data Store**: Persistent storage for projects and data
- **Error Handling**: Robust error recovery system
- **UI State Management**: Signal-based reactive state management
- **Interrupt System**: Manages interruption of tools and text generation

### UI Layout System
The application features a responsive layout system with three main states:
- **Normal**: Default state with left panel at 30% width
- **Left-expanded**: Left panel expanded to full width, right panel collapsed
- **Right-expanded**: Right panel expanded to full width, left panel collapsed

Toggle buttons in each panel allow users to switch between these states.

The application also includes intelligent tab management:
- **HTML Content Auto-switching**: When HTML content is generated in a response, the application automatically switches to the Preview tab and sets the layout to normal mode for optimal viewing
- **Re-execute Button**: HTML content includes a re-execute button that refreshes the HTML and switches to the Preview tab

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

The interrupt system is implemented with:
- AbortController for clean cancellation
- Proper resource cleanup
- UI state synchronization
- Consistent user feedback messages

The interrupt button intelligently handles different scenarios:
1. If a specific tool is running: Interrupts that tool
2. If multiple tools are running: Interrupts all tools
3. If text is being generated: Interrupts the generation
4. Provides clear feedback through toast messages

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

### Current Focus 🚧
- Code and test coverage optimization
- SQL tool implementation
- Workflow system development
- Tool configuration UI
- Performance optimizations for large projects

### Known Issues 🐞
1. Tool response formatting inconsistencies
2. Minor UI rendering glitches in some browsers
3. Performance degrades with very large chat histories
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

### Future Plans 🔮
- WebAssembly tool integration
- Multi-model AI support
- Real-time collaboration
- Custom tool marketplace
- Advanced visualization capabilities
- AI-powered workflow automation

## Support

For issues and feature requests, please use the GitHub issue tracker.

## License

🄯 Copyleft 2025 Tool-Bot Open Source Project

## Project Management

Tool-Bot includes a robust project management system that allows you to:

- Create multiple projects with different configurations
- Switch between projects easily
- Configure project-specific AI models and system prompts
- Enable or disable specific tools for each project
- Clone existing projects to use as templates or backups
- Manage project metadata and settings

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
   - For streaming responses, mock at the method level rather than trying to recreate the full stream

2. **Test Edge Cases**:
   - Include tests for escaped characters in JSON responses
   - Test handling of split chunks (e.g., path strings split across multiple chunks)
   - Verify error recovery mechanisms work correctly

3. **Test Structure**:
   - Use clear describe/it blocks to organize tests
   - Set up mocks in beforeEach blocks
   - Clear mocks in afterEach blocks
   - Use meaningful test names that describe the behavior being tested

4. **Test Config**:
   - Exclude temporary directories (e.g., .local) using vitest.config.ts
   - Configure appropriate timeouts for async tests

Example of mocking a streaming response:
```typescript
// Instead of trying to mock the entire stream reader protocol:
(llmHandler as any).callLLMStream = vi.fn().mockImplementation(async (messages, callbacks) => {
  // Call the onStart callback
  callbacks.onStart?.();

  // Simulate processing chunks with problematic patterns
  const testChunks = [
    { contentBlockDelta: { contentBlockIndex: 1, delta: { toolUse: { input: "first-part" } } } },
    { contentBlockDelta: { contentBlockIndex: 1, delta: { toolUse: { input: "second-part" } } } }
  ];

  // Process each chunk
  for (const chunk of testChunks) {
    callbacks.onChunk?.(chunk);
  }

  // Call the completion callback with the final message
  callbacks.onComplete?.({
    role: "assistant",
    content: [{ toolUse: { input: "first-partsecond-part" } }]
  });

  return finalMessage;
});
```

# Bugs

## Fixed Issues ✅

### JSON Parsing Issues with Streaming Tool Calls

We identified and fixed issues with the JSON parsing of streaming tool calls in scenarios involving:

1. **Escaped Quotes**: When tool calls contained escaped backslashes (e.g., "\\\\"), the JSON parser would sometimes fail, causing the streaming to hang.

2. **Split Path Strings**: When path strings were split across multiple chunks (e.g., "mnt/audit-re" + "view-ag"), they weren't being properly concatenated.

3. **Unbalanced JSON**: Some stream chunks had unbalanced JSON braces that caused parsing errors.

4. **Incremental Tool Use Inputs**: When tool use inputs are streamed as multiple small chunks (e.g., `"{\"`, `"path\": \"/mn"`, `"t/audit"`), they now properly accumulate into a complete tool use input.

5. **Malformed Tool Use JSON**: When the final accumulated JSON for a tool use is invalid (e.g., missing closing quotes or braces), we now attempt to fix it before execution.

6. **Unterminated JSON Strings**: When tool execution stops with JSON content containing unterminated strings (especially in file operations), we can now reconstruct valid JSON from the partial data.

The fixes include:

- Implemented oboe.js for robust streaming JSON parsing
- Simplified handling of streaming JSON with proper line-by-line processing
- Enhanced error recovery for JSON parsing issues
- Added state tracking to follow tool use context across multiple chunks
- Implemented proper message state management for better chunk processing
- Added JSON validation and automatic repair for tool use inputs
- Created a streamlined JSON fixer for common issues like unclosed quotes and missing braces
- Added heuristic-based JSON reconstruction for common file operation patterns
- Added comprehensive tests for all these scenarios

Examples of problematic patterns that are now handled correctly:

```json
}{
    "contentBlockDelta": {
        "contentBlockIndex": 1,
        "delta": {
            "toolUse": {
                "input": ">\\"
            }
        }
    }
}
```

```json
}{
    "contentBlockDelta": {
        "contentBlockIndex": 1,
        "delta": {
            "toolUse": {
                "input": "mnt/audit-re"
            }
        }
    }
}{
    "contentBlockDelta": {
        "contentBlockIndex": 1,
        "delta": {
            "toolUse": {
                "input": "view-ag"
            }
        }
    }
}
```

```json
{"messageStart":{"role":"assistant"}}
{"contentBlockDelta":{"contentBlockIndex":1,"delta":{"toolUse":{"name":"file_writer","toolUseId":"tooluse_123"}}}}
{"contentBlockDelta":{"contentBlockIndex":1,"delta":{"toolUse":{"input":"{\""}}}}
{"contentBlockDelta":{"contentBlockIndex":1,"delta":{"toolUse":{"input":"path\": \"/mn"}}}}
{"contentBlockDelta":{"contentBlockIndex":1,"delta":{"toolUse":{"input":"t/audit"}}}}
{"contentBlockDelta":{"contentBlockIndex":1,"delta":{"toolUse":{"input":"-review"}}}}
{"contentBlockStop":{"contentBlockIndex":1}}
{"messageStop":{"stopReason":"end_turn"}}
```

```json
{"messageStart":{"role":"assistant"}}
{"contentBlockDelta":{"contentBlockIndex":0,"delta":{"text":"Let me"}}}
{"contentBlockDelta":{"contentBlockIndex":0,"delta":{"text":" try reading"}}}
{"contentBlockDelta":{"contentBlockIndex":0,"delta":{"text":" a file:"}}}
{"contentBlockStart":{"contentBlockIndex":1,"start":{"toolUse":{"name":"project_reader","toolUseId":"tooluse_lU3dsc1DQf6nkai4BGO8WQ"}}}}
{"contentBlockDelta":{"contentBlockIndex":1,"delta":{"toolUse":{"input":"{\"mod"}}}}
{"contentBlockDelta":{"contentBlockIndex":1,"delta":{"toolUse":{"input":"e\": "}}}}
{"contentBlockDelta":{"contentBlockIndex":1,"delta":{"toolUse":{"input":"\"single\""}}}}
{"contentBlockDelta":{"contentBlockIndex":1,"delta":{"toolUse":{"input":", \"path"}}}}
{"contentBlockDelta":{"contentBlockIndex":1,"delta":{"toolUse":{"input":"\": \"/mnt/au"}}}}
{"contentBlockDelta":{"contentBlockIndex":1,"delta":{"toolUse":{"input":"dit-review-a"}}}}
{"contentBlockDelta":{"contentBlockIndex":1,"delta":{"toolUse":{"input":"gent/R"}}}}
{"contentBlockDelta":{"contentBlockIndex":1,"delta":{"toolUse":{"input":"EADME.md\"}"}}}}
{"contentBlockStop":{"contentBlockIndex":1}}
{"messageStop":{"stopReason":"tool_use"}}
```

```json
{"messageStart":{"role":"assistant"}}
{"contentBlockDelta":{"contentBlockIndex":0,"delta":{"text":"I'll create"}}}
{"contentBlockDelta":{"contentBlockIndex":0,"delta":{"text":" a file for"}}}
{"contentBlockDelta":{"contentBlockIndex":0,"delta":{"text":" you:"}}}
{"contentBlockStart":{"contentBlockIndex":1,"start":{"toolUse":{"name":"file_writer","toolUseId":"tooluse_123"}}}}
{"contentBlockDelta":{"contentBlockIndex":1,"delta":{"toolUse":{"input":"{\"path\":\"/tmp/example.txt\",\"content\":\"This is an example with an unterminated string"}}}}
{"contentBlockStop":{"contentBlockIndex":1}}
{"messageStop":{"stopReason":"tool_use"}}
```

## Current Known Issues 🐞
1. Tool response formatting inconsistencies
2. Minor UI rendering glitches in some browsers
3. Performance degrades with very large chat histories
4. ~~Streaming JSON parsing failures~~ (Fixed ✅)

## Recent Improvements 🚀

### Streaming JSON Parsing Refactoring

We've significantly improved the tool's handling of streaming JSON responses by:

1. **Adopting oboe.js**: Integrated a dedicated streaming JSON parsing library that's specifically designed to handle partial and incomplete JSON data.

2. **Simplifying the Implementation**: Replaced our complex custom parsing logic with a more streamlined approach that:
   - Processes JSON data line-by-line
   - Intelligently accumulates tool use input chunks
   - Tracks state more effectively across streaming chunks

3. **Maintaining Robustness**: Our new implementation still handles all the edge cases from before:
   - Escaped quotes and backslashes
   - Split path strings across chunks
   - Incremental tool use inputs
   - Unterminated JSON strings

4. **Comprehensive Testing**: Updated our test suite to verify all parsing scenarios work correctly with the new implementation.

The result is a more maintainable codebase with fewer custom workarounds and better resilience to the various types of JSON parsing issues that can occur in streaming contexts.

## Fixed Issues ✅
