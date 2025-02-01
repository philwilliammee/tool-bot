# Tool-Bot

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
- Data visualization with CSV support

## Quick Start

1. **Clone and setup environment**:
    ```bash
    git clone https://github.com/philwilliammee/tool-bot
    cd tool-bot
    cp example.env .env
    ```

2. **Configure your credentials in `.env`**:
    ```bash
    # For AWS Bedrock
    AWS_REGION=your-aws-region
    VITE_BEDROCK_MODEL_ID=your-model-id
    AWS_ACCESS_KEY=your-aws-access-key
    AWS_SECRET_KEY=your-aws-secret-key

    # For OpenAI
    AI_CLIENT=openai
    OPENAI_API_SESSION_KEY=your-openai-api-key
    OPENAI_API_BASE=https://api.openai.com
    ```

3. **Install and run**:
    ```bash
    npm install
    npm run dev
    ```

4. **Open** `http://localhost:5173` in your browser

## API Integration

This project supports multiple AI providers, including AWS Bedrock and OpenAI.

### Supported

- AWS Bedrock API
- OpenAI API

### Potential Future Integrations

- Ollama (local inference)

## Technical Architecture

- Built with TypeScript and Vite
- AWS Bedrock and OpenAI integration
- Component-based architecture
- Signal-based state management
- Clean and responsive UI
- Integrated tool system with type safety
- Enhanced data visualization capabilities

### Key Components

- **Chat Context (converseStore)**: Manages conversation state and tool execution
- **Chat Interface**: User interaction and message rendering
- **Work Area**: Admin interface for message management
- **Tool System**: Comprehensive tool integration framework
- **Data Store**: Manages uploaded CSV/JSON data for visualizations
- **Project Store**: Handles project configuration and state
- **Error Handling**: Robust error recovery system

## Current Tools Implementation

### 1. Code Executor
- Sandboxed JavaScript execution
- Support for popular libraries (Lodash, Moment, Chart.js, Math.js, D3.js)
- Timeout management
- Access to uploaded data via `window.availableData`

### 2. HTML Tool
- Advanced visualization rendering
- React, Vue, and vanilla JavaScript support
- Chart.js and D3.js integration
- Data-aware rendering with CSV/JSON support
- Interactive component support
- Error handling for data processing
- Example React usage:
  ```javascript
  {
    "libraries": [
      "https://unpkg.com/react@18/umd/react.production.min.js",
      "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"
    ],
    "html": "<div id='root'></div>",
    "javascript": `
      const App = () => {
        const [count, setCount] = React.useState(0);
        return React.createElement('button', {
          onClick: () => setCount(c => c + 1)
        }, 'Count: ' + count);
      };
      ReactDOM.render(
        React.createElement(App),
        document.getElementById('root')
      );
    `
  }
  ```

### 3. File System Tools
- **File Tree**: Directory structure visualization
- **Project Reader**: File content access with pattern matching
- **File Writer**: Content writing with validation

### 4. Data Processing
- CSV/JSON data upload support
- Data visualization capabilities
- Mathematical computations
- Statistical analysis

### 5. Integration Tools
- **LDAP Tool**: LDAP directory integration
- **Fetch Tool**: Proxied HTTP requests with domain validation
- Weather data access
- LDAP services integration

### 6. Math Tool
- Complex calculations
- Statistical functions
- Matrix operations
- Unit conversions

### 7. GitHub Integration (New)
- Execute GitHub API operations using Octokit
- Support for both REST API and GraphQL queries
- Authentication support via GitHub tokens
- Error handling and response management
- Example usage:
  ```javascript
  // Fetch repository information
  octokit({
    operation: "GET /repos/{owner}/{repo}",
    parameters: {
      owner: "octokit",
      repo: "octokit.js"
    }
  });
  ```

## Development Status

### Recent Updates ✅
- Enhanced data visualization system
- CSV/JSON data upload support
- Improved tool configuration system
- Added React support to HTML Tool
- Advanced HTML rendering capabilities
- Comprehensive tool documentation
- Type-safe tool implementations
- Project structure reorganization
- Error handling improvements
- Added GitHub API integration via Octokit

### Current Focus 🚧
- Data store implementation for visualization
- Tool integration refinements
- Performance optimization
- Documentation updates
- Testing coverage

### Planned Features 🔮
- Additional AI model integrations
- Enhanced security features
- Advanced error recovery
- Extended tool capabilities
- Local model support (Ollama)
- Database integration

## Tool System Architecture

The tool system follows a modular architecture:

```
tools/
├── client/              # Client-side registry and interfaces
├── server/             # Server-side registry and interfaces
└── [tool-name]/        # Individual tool folders
    ├── client/         # Client implementation
    ├── server/         # Server implementation (if needed)
    ├── config.ts       # Tool configuration
    └── types.ts        # Type definitions
```

## Adding Tool Dependencies

For simplicity, this project uses a **single** `package.json` at the root to manage *all* dependencies (including those for tools).
- **When adding a new tool**, place any required library dependencies in the **root** `package.json`.
- Then `npm install` (or `npm install <lib> --save`) from the project root to make the new dependency available.
- Each tool can import its dependencies directly from the root `node_modules`.

This keeps setup simpler by avoiding multiple package.json files spread across various tool folders.

## Build & Run

Below are the main scripts from `package.json`. You can run them from the root folder:

| Script         | Description                                                                  |
| -------------- | ---------------------------------------------------------------------------- |
| **`dev`**      | Starts both the client (Vite) and server (Nodemon) in development mode        |
| **`build`**    | Builds client (`vite build`) and then compiles server to `dist-server/`       |
| **`start:dev`**| Runs the compiled server from `dist-server/server.js` in development mode     |
| **`start:prod`**| Same as above but sets `NODE_ENV=production` and uses `.env` at runtime       |
| **`clean`**    | Deletes the `dist` and `dist-server` folders                                  |
| **`preview`**  | Serves the production-built client at `http://localhost:4173`                 |

Examples:

```bash
# Development (HMR Vite client + Nodemon server):
npm run dev

# Production build (static client + server):
npm run deploy
```

## Best Practices

1. **Tool Development**
   - Follow standard configuration format
   - Implement proper error handling
   - Use TypeScript for type safety
   - Document capabilities and limitations

2. **Security**
   - Sandbox code execution
   - Validate all inputs
   - Implement timeouts
   - Control server access
   - Sanitize outputs

3. **Data Handling**
   - Validate data types
   - Handle missing values
   - Process CSV strings appropriately
   - Implement error checking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Current Tasks

- [ ] Converse utils refactoring
- [ ] Local database implementation
- [x] sliding token limits
- [ ] background task chat summarization
- [x] fix admin colspan in messages table
- [ ] improved Message edit and monaco-editor
- [ ] available data should show in the user Converse messages[]

## Example Usage

### Data Visualization with React
```javascript
const data = window.availableData;

// React component example
{
  "libraries": [
    "https://unpkg.com/react@18/umd/react.production.min.js",
    "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
    "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"
  ],
  "html": "<div id='root'></div>",
  "javascript": `
    const App = () => {
      const [chartData] = React.useState(window.availableData);
      
      React.useEffect(() => {
        const ctx = document.createElement('canvas');
        document.getElementById('root').appendChild(ctx);
        
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: chartData.map(d => d.label),
            datasets: [{
              data: chartData.map(d => parseFloat(d.value) || 0)
            }]
          }
        });
      }, []);
      
      return null;
    };
    
    ReactDOM.render(
      React.createElement(App),
      document.getElementById('root')
    );
  `
}
```

### Tool Integration
```javascript
fetch_url({
  url: 'https://api.open-meteo.com/v1/forecast?latitude=42.3601&longitude=-71.0589'
});

ldap_search({
  searchTerm: 'John Doe'
});

math({
  expression: 'mean([1,2,3,4,5])'
});
```

---

For more information about specific tools and their capabilities, refer to the `tools/README.md` file.