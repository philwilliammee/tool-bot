# Model Context Protocol (MCP) Calculator Service

## Overview
This project implements a basic Calculator Service using the Model Context Protocol (MCP), demonstrating a simple tool-based MCP server with client interaction capabilities.

## Model Context Protocol (MCP) Requirements

### Core Principles
- **Standardized Communication**: Provide a consistent interface for tool and service interactions
- **Client-Server Model**: Clear separation between client and server responsibilities
- **Stateless Design**: Minimal persistent state between requests
- **Secure Interaction**: Implement basic security measures

### Protocol Specifications
1. **Initialization**
   - Each client must initialize a session
   - Receive a unique `clientId`
   - Negotiate protocol version and capabilities

2. **Tool Interaction**
   - Tools should have:
     * A unique name
     * Input schema
     * Clear error handling
   - Support for safe, constrained execution

3. **Error Handling**
   - Consistent error response structure
   - Informative error messages
   - Proper HTTP status codes

## Project Structure
```
mcp/calculator/
├── src/
│   ├── server.ts       # MCP Server implementation
│   └── client.ts       # Client for interacting with the server
├── Dockerfile          # Docker containerization
├── docker-compose.yml  # Docker Compose configuration
├── package.json        # Project dependencies
└── tsconfig.json       # TypeScript configuration
```

## Prerequisites
- Node.js 18+
- npm (Node Package Manager)
- Docker (optional, for containerized development)

## Local Development Setup

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd mcp/calculator
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Development Commands
```bash
# Build the project
npm run build

# Start the server in development mode
npm start

# Run tests (placeholder - add your test script)
npm test
```

## Docker Development

### Build and Run with Docker
```bash
# Build the Docker image
docker build -t mcp-calculator .

# Run the container
docker run -p 3000:3000 mcp-calculator

# Alternatively, use Docker Compose
docker-compose up --build
```

## API Endpoints

### 1. Initialize Client
- **Endpoint**: `POST /initialize`
- **Description**: Create a new client session
- **Response**: 
  ```json
  {
    "clientId": "unique-client-id",
    "capabilities": {
      "tools": ["calculator"]
    }
  }
  ```

### 2. Calculate
- **Endpoint**: `POST /tools/calculate`
- **Description**: Perform mathematical calculations
- **Request Body**:
  ```json
  {
    "expression": "2 + 3 * 4"
  }
  ```
- **Response**:
  ```json
  {
    "result": 14,
    "expression": "2 + 3 * 4"
  }
  ```

## Security Considerations
- Input sanitization for calculator expressions
- Basic expression validation
- Restricted execution environment

## Extending the Service
1. Add more complex mathematical functions
2. Implement advanced error handling
3. Add logging and monitoring
4. Create more sophisticated tool interfaces

## Troubleshooting
- Ensure all dependencies are installed
- Check Node.js and npm versions
- Verify Docker installation if using containerization

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
[Specify your license, e.g., MIT]

## Contact
[Your contact information or project maintainer details]

## Disclaimer
This is a reference implementation of the Model Context Protocol. It is intended for educational and demonstration purposes.