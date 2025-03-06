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

### UI Layout System
The application features a responsive layout system with three main states:
- **Normal**: Default state with left panel at 30% width
- **Left-expanded**: Left panel expanded to full width, right panel collapsed
- **Right-expanded**: Right panel expanded to full width, left panel collapsed

Toggle buttons in each panel allow users to switch between these states.

### Security Considerations
- Keep API keys secure and never commit them to version control
- LDAP connections should use appropriate authentication
- Code execution is sandboxed but should be used cautiously
- Review tool permissions before deployment
- Validate all inputs in server-side tools

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
- Signal-based reactive state management implementation
- Improved event handler management for proper cleanup
- Fixed UI toggle functionality
- Enhanced WorkArea component with better message display
- X Tool integration for social media interaction
- Enhanced GitHub integration via Octokit

### Current Focus 🚧
- SQL tool implementation
- Archive summarization capabilities
- Workflow system development
- Tool configuration UI
- Testing coverage expansion

### Known Issues 🐞
1. Tool response formatting inconsistencies
2. Error handling refinements needed

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
