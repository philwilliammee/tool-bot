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

### Available Tools
- **LDAP Tool**: Directory services integration and user search
- **Math Tool**: Mathematical computations and expressions
- **HTML Tool**: Advanced HTML rendering and visualization
- **Fetch Tool**: HTTP request handling
- **File Tools**: File system operations (read/write/tree)
- **Code Executor**: Secure code execution environment
- **Data Store**: Data persistence and management
- **GitHub Integration**: Repository management and API access

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

### Security Considerations
- Keep API keys secure and never commit them to version control
- LDAP connections should use appropriate authentication
- Code execution is sandboxed but should be used cautiously
- Review tool permissions before deployment

## Creating Custom Tools

Tools are modular and can be added to the `tools/` directory. Each tool should:
1. Implement the tool interface
2. Register with the tool registry
3. Provide both client and server components (if needed)
4. Include proper type definitions

Example tool structure:
```typescript
// tools/my-tool/config.ts
export const config = {
  name: "my-tool",
  description: "Tool description",
  parameters: {
    // parameter definitions
  }
};

// tools/my-tool/client/my-tool.client.ts
export class MyToolClient implements ToolClient {
  // implementation
}
```

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

## Development Status

### Recent Updates ✅
- Enhanced data visualization system
- Improved tool configuration system
- Advanced HTML rendering capabilities
- GitHub API integration
- Chat streaming implementation

### Current Focus 🚧
- Tool integration refinements
- Performance optimization
- Documentation improvements
- Testing coverage
- Security enhancements

## Roadmap: Development Journey

### Phase 1: Foundation (January 2025) 🏗️
- Initial project setup with TypeScript and Vite
- Basic chat interface implementation
- Core tool system architecture
- LDAP integration for directory services
- Basic file operations support

### Phase 2: Enhanced Tools & UI (Early February 2025) 🛠️
- ✅ Advanced HTML tool with React support
- ✅ MathJax integration for mathematical expressions
- ✅ Improved file system operations
- ✅ Enhanced UI with responsive design
- ✅ Panel state management and layout improvements

### Phase 3: Performance & Integration (Mid February 2025) 🚀
- ✅ Docker containerization support
- ✅ Token limit management and optimization
- ✅ Chat streaming capabilities
- ✅ Enhanced error handling
- ✅ OpenCV integration for image processing

### Phase 4: Data & Security (Current) 🔒
- Data persistence layer
- sql tool
- archive summarization
- workflows
- tool configuration simplification and configuration
- Project management features
- Enhanced security measures
- Comprehensive testing suite
- Documentation improvements

### Future Plans 🔮
- WebAssembly tool integration
- Multi-model AI support
- Real-time collaboration features
- Custom tool marketplace
- Advanced visualization capabilities

### bug fixes 🐞

scroll to bottom is missing

## Support

For issues and feature requests, please use the GitHub issue tracker.

## License

🄯 Copyleft 2025 Tool-Bot Open Source Project

