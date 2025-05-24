# MCP Server Integration Plan
*Dynamic Tool Registration from Model Context Protocol Servers*

## Overview
This document outlines the implementation plan for integrating MCP (Model Context Protocol) servers as dynamic tool sources in the tool-bot application. This feature will allow the system to discover, register, and use tools from external MCP-compliant services.

## Current State Analysis

### Existing MCP Implementation
From `ingest-mcp.md`, we have a working MCP Calculator Service with:
- **Server**: Express-based MCP server with initialization and tool endpoints
- **Client**: TypeScript client for MCP communication
- **Protocol**: Standard MCP initialization and tool interaction patterns
- **Security**: Basic input sanitization and safe execution
- **Containerization**: Docker support for deployment

### Tool-bot Architecture
Current tool-bot system features:
- **Tool Registries**: Client and server-side tool registration systems
- **Built-in Tools**: fetch, markdown-preview, HTML, math, project-search, etc.
- **Dynamic UI**: Action buttons for tool replay/resend in message table
- **Tool Execution**: Sophisticated tool execution with streaming and error handling

## Implementation Plan

### Phase 1: MCP Client Infrastructure

#### 1.1 MCP Client Foundation
**Location**: `tools/mcp-client-tool/`

**Components**:
- `MCPClient.ts` - Core MCP protocol client
- `MCPRegistry.ts` - Registry for MCP server connections
- `MCPToolProxy.ts` - Proxy tools that delegate to MCP servers

**Key Features**:
```typescript
interface MCPServerConfig {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
  authentication?: {
    type: 'apiKey' | 'bearer' | 'none';
    credentials?: string;
  };
  healthCheckInterval?: number;
}

interface MCPTool {
  serverId: string;
  name: string;
  description: string;
  inputSchema: any;
  category?: string;
}
```

#### 1.2 MCP Server Management
**Location**: `src/stores/MCPStore/`

**Features**:
- Server connection management
- Health monitoring and reconnection
- Tool discovery and caching
- Connection state management

### Phase 2: Dynamic Tool Registration

#### 2.1 Tool Discovery Engine
**Process**:
1. Connect to MCP server via initialization endpoint
2. Query available tools and their schemas
3. Create proxy tools in tool-bot registry
4. Map MCP tool schemas to tool-bot tool configurations

#### 2.2 Proxy Tool Implementation
**Functionality**:
- Intercept tool calls intended for MCP tools
- Translate tool-bot tool calls to MCP protocol
- Handle MCP responses and convert back to tool-bot format
- Manage error states and fallbacks

### Phase 3: User Interface Integration

#### 3.1 MCP Server Management UI
**Location**: `src/components/MCPManager/`

**Features**:
- Add/remove MCP servers
- View available tools from each server
- Enable/disable individual tools
- Connection status indicators
- Server health monitoring

#### 3.2 Project Configuration Integration
**Updates to Project Settings**:
- MCP server configurations per project
- Tool filtering and organization
- Server-specific tool preferences

### Phase 4: Advanced Features

#### 4.1 Tool Categorization
- Group MCP tools by server/category
- Smart tool suggestions based on context
- Tool conflict resolution (multiple servers with same tool names)

#### 4.2 Performance Optimization
- Tool response caching
- Connection pooling
- Lazy tool loading
- Background health checks

## Technical Implementation Details

### MCP Protocol Integration

#### Initialization Flow
```typescript
class MCPServerConnection {
  async initialize(): Promise<MCPCapabilities> {
    const response = await fetch(`${this.baseUrl}/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const { clientId, capabilities } = await response.json();
    this.clientId = clientId;
    return capabilities;
  }
}
```

#### Tool Proxy Implementation
```typescript
class MCPToolProxy implements ClientTool {
  constructor(
    private server: MCPServerConnection,
    private toolSpec: MCPTool
  ) {}

  async execute(input: any): Promise<any> {
    return this.server.callTool(this.toolSpec.name, input);
  }
}
```

### Registry Integration

#### Dynamic Tool Registration
```typescript
class MCPRegistry {
  async discoverAndRegisterTools(serverId: string): Promise<void> {
    const server = this.getServer(serverId);
    const tools = await server.getAvailableTools();

    for (const tool of tools) {
      const proxyTool = new MCPToolProxy(server, tool);
      clientRegistry.registerTool(`mcp_${serverId}_${tool.name}`, proxyTool);
    }
  }
}
```

## Configuration Schema

### Server Configuration
```typescript
interface MCPServerConfiguration {
  servers: {
    [serverId: string]: {
      name: string;
      url: string;
      enabled: boolean;
      tools: {
        [toolName: string]: {
          enabled: boolean;
          alias?: string;
          category?: string;
        };
      };
    };
  };
}
```

### Project-Level Settings
```typescript
interface ProjectMCPSettings {
  enabledServers: string[];
  toolPreferences: {
    [toolName: string]: {
      preferredServer?: string;
      fallbackServers?: string[];
    };
  };
}
```

## Security Considerations

### Connection Security
- HTTPS enforcement for MCP server connections
- API key management and secure storage
- Request/response validation
- Rate limiting and timeout handling

### Tool Execution Safety
- Input sanitization for MCP tool calls
- Response validation and type checking
- Error boundary implementation
- Sandboxed execution where possible

## Error Handling Strategy

### Connection Failures
- Graceful degradation when MCP servers are unavailable
- Automatic retry logic with exponential backoff
- User notifications for server connection issues
- Fallback to local tools when possible

### Tool Execution Errors
- Consistent error formatting across MCP and local tools
- Error recovery and user guidance
- Logging and debugging support

## Development Phases

### Phase 1: Foundation (Week 1-2)
- [ ] MCP client infrastructure
- [ ] Basic server connection management
- [ ] Simple tool discovery

### Phase 2: Core Integration (Week 3-4)
- [ ] Dynamic tool registration
- [ ] Proxy tool implementation
- [ ] Basic UI for server management

### Phase 3: Polish & Features (Week 5-6)
- [ ] Advanced UI components
- [ ] Project-level configuration
- [ ] Performance optimizations

### Phase 4: Testing & Documentation (Week 7-8)
- [ ] Comprehensive testing
- [ ] Documentation and examples
- [ ] Integration with existing MCP calculator service

## Success Metrics

### Functionality
- [ ] Successfully connect to MCP calculator service
- [ ] Dynamic tool registration working
- [ ] Tool execution through MCP proxy working
- [ ] UI for managing MCP servers functional

### Performance
- [ ] Tool response times < 2x local tool response times
- [ ] Memory usage increase < 50MB per MCP server
- [ ] No blocking of main thread during MCP operations

### User Experience
- [ ] Seamless integration - users can't tell difference between local and MCP tools
- [ ] Clear error messages for connection/tool issues
- [ ] Intuitive MCP server management interface

## Future Enhancements

### Advanced Protocol Support
- WebSocket connections for real-time tools
- Streaming tool responses
- Bidirectional tool communication

### Smart Tool Management
- AI-powered tool recommendations
- Auto-discovery of MCP servers
- Tool usage analytics and optimization

### Enterprise Features
- Multi-tenant MCP server sharing
- Advanced authentication and authorization
- Audit logging and compliance features

## Dependencies

### New Dependencies
- `ws` - WebSocket client for real-time MCP connections
- `ajv` - JSON schema validation for MCP tool schemas
- `retry` - Robust retry logic for MCP connections

### Internal Dependencies
- Existing tool registry system
- Project configuration store
- UI component library
- Error handling infrastructure

## Risk Assessment

### High Risk
- **Performance Impact**: MCP tool calls add network latency
- **Reliability**: Dependency on external MCP servers
- **Security**: Potential attack vectors through MCP servers

### Mitigation Strategies
- Implement comprehensive caching and timeout strategies
- Provide fallback mechanisms and clear user feedback
- Strict input/output validation and security headers

## Conclusion

This MCP integration will significantly expand tool-bot's capabilities by allowing dynamic integration with external services. The phased approach ensures we can deliver value incrementally while building a robust, secure, and performant system.

The foundation provided by the existing MCP calculator service gives us a proven starting point for this integration.
