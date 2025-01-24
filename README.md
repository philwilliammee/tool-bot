# AI Chat Assistant

REQUIRED: Node 20.6.0 or higher

An AI-powered chat bot that can help with various tasks through natural language conversation. Engage in meaningful dialogue, get help with questions, and explore different topics through an intuitive chat interface.

> **Note**: This is a development tool and proof-of-concept. Not intended for production use.

## Features

- AI-powered conversational interface
- Real-time chat interactions
- Context-aware responses
- Automatic error recovery and retry mechanisms
- Support for various types of queries and tasks
- Comprehensive tool integration system
- Directory services integration
- Advanced visualization capabilities
- File system operations
- Mathematical computations

## Quick Start

1. Clone and setup environment:

```bash
git clone https://github.com/[your-username]/ai-chat-assistant
cd ai-chat-assistant
cp example.env .env
```

2. Configure AWS credentials in `.env`:

```bash
AWS_REGION=your-aws-region
VITE_BEDROCK_MODEL_ID=your-model-id
AWS_ACCESS_KEY=your-aws-access-key
AWS_SECRET_KEY=your-aws-secret-key
```

3. Install and run:

```bash
npm install
npm run dev
```

4. Open `http://localhost:5173` in your browser

## API Integration

Currently, this project uses AWS Bedrock as its AI provider, specifically designed to work with Amazon's Large Language Models through the Bedrock API. However, the project is structured to potentially support other AI providers.

### Supported

- AWS Bedrock API

### Potential Future Integrations

- OpenAI API
- Ollama (local inference)
- Google Vertex AI
- Anthropic Claude API
- Other Open Source Models

**Contributing Integrations:** Pull requests for additional AI provider integrations are welcome! The project's architecture is designed to be extensible. Ollama integration would be particularly valuable as it would allow users to run models locally without cloud API costs.

#### To add a new integration

1. Implement the core API service interface
2. Add appropriate environment configuration
3. Provide documentation for API setup
4. Include example prompts optimized for the new model

Check the `src/bedrock/bedrock.service.ts` file for an example of how API integration is currently implemented.

## Technical Architecture

- Built with TypeScript and Vite
- AWS Bedrock integration for AI capabilities
- Component-based architecture
- Signal-based state management
- Clean and responsive UI
- Integrated tool system with type safety

### Key Components

- **Chat Context (converseStore)**: Holds the entire conversation. Automatically handles AWS Bedrock calls whenever a new `user` message is added, and executes tools if an `assistant` message includes a `toolUse` block.
- **Chat Interface (Chat.ts)**: Primarily a UI layer. Listens to user input, adds new messages to the context, and renders updates whenever the context changes.
- **Work Area**: Provides an admin interface to view/edit messages and manage the conversation history.
- **Tool System**: Comprehensive tool integration with support for various operations including file system access, mathematical computations, and web services.
- **Error Handling**: A robust but still development-level approach that attempts to retry errors; not production-ready.

## Current Capabilities

### Implemented Tools

1. **HTTP Fetch (fetch_url)**
   - HTTPS URL content retrieval
   - Support for multiple content types
   - Integration with Cornell services
   - Weather data access

2. **Directory Services (ldap_search)**
   - Cornell LDAP directory integration
   - User information lookup
   - Comprehensive profile data access

3. **HTML Generation (html)**
   - Advanced visualization rendering
   - Interactive web components
   - Chart and graph generation
   - Responsive layouts

4. **Mathematical Processing (math)**
   - Complex calculations
   - Statistical analysis
   - Unit conversions
   - Matrix operations

5. **File System Operations**
   - File tree visualization (file_tree)
   - Content reading (project_reader)
   - File writing (file_writer)
   - Project structure analysis

6. **Code Execution (code_executor)**
   - JavaScript sandbox environment
   - Popular library integration
   - Dynamic content generation
   - Timeout management

## Development Status

### Completed Features ✅
- Chat admin editor interface
- Improved error handling and validation
- Message persistence
- Enhanced conversation context management
- Comprehensive tool support
- HTML Tool Development
  - Advanced HTML rendering in iframe
  - Tool integration with Bedrock
  - Visualization templates
  - Support for common chart types
  - Interactive component library
- UI Improvements
  - Tab-based interface
  - Signal-based state management
  - Improved tool output formatting
- Centralized tool registry system
  - Type-safe tool configurations
  - Streamlined registration process
  - Comprehensive tool documentation

### Current Focus 🚧
- Enhanced visualization capabilities
- Additional tool integrations
- Performance optimizations
- Documentation improvements

### Future Development Plans 🔮
- Additional AI model integrations
- Enhanced security features
- Advanced error recovery mechanisms
- Extended tool capabilities

## Limitations

- Development tool only, not production-ready
- Requires AWS Bedrock access
- Maximum token limitations apply
- Limited to text-based interactions
- Tool-specific constraints apply

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Tool Usage Examples

[Previous tool usage examples remain the same...]

## Interface Features

- **Preview/Work Area Tabs:** Toggle between HTML preview and chat administration
- **Improved Message Display:** Better formatting for tool usage and results
- **State Management:** Centralized signal-based state handling
- **Responsive Layout:** Adapts to different screen sizes
- **Tool Integration:** Seamless tool execution and result display
- **Directory Services:** Integrated user lookup and profile management
- **Visualization System:** Advanced chart and graph generation
- **File Operations:** Comprehensive file system interaction

---

## Example Prompts

search for something and display something interesting about it in html.

Make me an amazing chart! I will show it to my fiends, and display your skills and craftsmanship at fine web design.

Wait what happened, earlier you were making amazing charts. I told them how great they are. You can do better that that, really try to impress them.

This is stunning but I know you can do more. Elevate it and take it to the next level.
