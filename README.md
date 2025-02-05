# Tool-Bot

REQUIRED: Node 20.6.0 or higher

An AI-powered chat bot that can help with various tasks through natural language conversation. Engage in meaningful dialogue, get help with questions, and explore different topics through an intuitive chat interface.

> **Note**: This is a development tool and proof-of-concept. Not intended for production use.

## Features

- AI-powered conversational interface
- Real-time chat interactions
- Context-aware responses
- Comprehensive tool integration system
- Directory services integration
- Advanced visualization capabilities
- File system operations
- Mathematical computations
- Data visualization with CSV support

## Quick Start

1. **Clone and setup environment**:
    ```bash
    git clone https://github.com/philwilliammee/tool-bot
    cd tool-bot
    cp example.env .env
    ```

2. **Install and run**:
    ```bash
    npm install
    npm run dev
    ```

3. **Open** `http://localhost:5173` in your browser

## Development Environment

### Build & Run Scripts

| Script         | Description                                                                  |
| -------------- | ---------------------------------------------------------------------------- |
| **`dev`**      | Starts both the client (Vite) and server (Nodemon) in development mode        |
| **`build`**    | Builds client (`vite build`) and then compiles server to `dist-server/`       |
| **`start:dev`**| Runs the compiled server from `dist-server/server.js` in development mode     |
| **`start:prod`**| Same as above but sets `NODE_ENV=production` and uses `.env` at runtime       |
| **`clean`**    | Deletes the `dist` and `dist-server` folders                                  |
| **`preview`**  | Serves the production-built client at `http://localhost:4173`                 |

### Docker Setup

1. **Build the Docker image**:
```bash
docker build -t tool-bot .
```

2. **Run in development mode**:
```bash
docker run -p 3000:3000 \
  -v $(pwd):/usr/src/app \
  -v /usr/src/app/node_modules \
  --env-file .env \
  tool-bot
```

3. **Run in production mode**:
```bash
docker run -p 3000:3000 --env-file .env tool-bot
```

## Technical Architecture

- Built with TypeScript and Vite
- AWS Bedrock and OpenAI integration
- Signal-based state management
- Integrated tool system with type safety
- Enhanced data visualization capabilities

### Key Components

- **Chat Context**: Manages conversation state and tool execution
- **Chat Interface**: User interaction and message rendering
- **Tool System**: Comprehensive tool integration framework
- **Data Store**: Manages uploaded CSV/JSON data for visualizations
- **Error Handling**: Robust error recovery system

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Development Status

### Recent Updates ✅
- Enhanced data visualization system
- Improved tool configuration system
- Advanced HTML rendering capabilities
- Type-safe tool implementations
- Added GitHub API integration

### Current Focus 🚧
- Data store implementation
- Tool integration refinements
- Performance optimization
- Documentation updates
- Testing coverage
- Chat streaming

For more detailed information about specific tools and their capabilities, refer to the `tools/README.md` file.
