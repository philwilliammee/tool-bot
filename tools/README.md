# AI Tool Registry

A modular system for registering and managing tools that can be used by AI models. This guide explains how to create, register, and manage tools in the system.

## Quick Start

1. Create a new tool directory in `tools/` following the required structure
2. Implement the required interfaces
3. Register your tool in the registry
4. Test your tool with the AI model

## Tool Structure

```
tools/
├── [your-tool-name]/           # Your tool's main directory
│   ├── client/                 # Required: Client-side implementation
│   │   └── [tool].client.ts   # Client implementation
│   ├── server/                 # Optional: Server-side implementation
│   │   ├── [tool].service.ts  # Server implementation
│   │   └── [tool].types.ts    # Server types
│   ├── config.ts              # Required: Tool configuration
│   └── types.ts               # Shared types (if needed)
```

## Creating a New Tool

### 1. Tool Configuration

Your tool must have a configuration file (`config.ts`) that follows the Bedrock Tool Configuration schema:

```typescript
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const toolConfig: ToolConfiguration = {
    tools: [{
        toolSpec: {
            name: "your_tool_name",
            description: "Clear description of what your tool does",
            inputSchema: {
                json: {
                    type: "object",
                    properties: {
                        // Define your tool's input parameters here
                        parameterName: {
                            type: "string",
                            description: "Description of the parameter"
                        }
                    },
                    required: ["requiredParameters"]
                }
            }
        }
    }]
};
```

### 2. Client Implementation

Create a client implementation that implements the ClientTool interface:

```typescript
import { ClientTool } from '../../client/tool.interface';

export const yourTool: ClientTool = {
    name: "your_tool_name",
    execute: async (input: any): Promise<any> => {
        // Implement your tool's logic here
        // For server-side tools, make API calls
        // For client-only tools, implement browser-side logic
    }
};
```

### 3. Server Implementation (Optional)

If your tool requires server-side processing, implement the ServerTool interface:

```typescript
import { ServerTool } from '../../server/tool.interface';

export const yourTool: ServerTool = {
    name: "your_tool_name",
    route: "/your-endpoint",
    handler: async (req, res) => {
        // Implement server-side logic
    }
};
```

## Registering Your Tool

1. Client-side Registration:
   - Import your tool in `tools/registry.client.ts`
   - Add it to the `clientTools` array

```typescript
import { yourTool } from './your-tool-name/client/your-tool.client';

export const clientTools = [
    // ... other tools
    yourTool
];
```

2. Server-side Registration (if needed):
   - Import your tool in `tools/registry.server.ts`
   - Add it to the `serverTools` array

```typescript
import { yourTool } from './your-tool-name/server/your-tool.service';

export const serverTools = [
    // ... other tools
    yourTool
];
```

## Tool Categories

Tools can be either client-only or server-required:

### Client-Only Tools
- Tools that run entirely in the browser
- No server-side implementation needed
- Example: Math calculations, HTML rendering

### Server-Required Tools
- Tools that need server-side processing
- Require both client and server implementation
- Example: File operations, API integrations

## Best Practices

1. Tool Design
   - Keep tools focused and single-purpose
   - Use clear, descriptive names
   - Document input/output formats
   - Include helpful description for AI

2. Security
   - Validate all inputs
   - Implement proper error handling
   - Use appropriate access controls
   - Sanitize outputs

3. Testing
   - Verify configuration format
   - Test error scenarios
   - Check input validation
   - Monitor performance

## Troubleshooting

Common issues and solutions:

1. Tool not appearing in AI model:
   - Check registration in registry files
   - Verify config format matches schema
   - Ensure name matches between config and implementation

2. Server errors:
   - Check server logs
   - Verify endpoint matches route
   - Confirm proper error handling

3. Client errors:
   - Check browser console
   - Verify input format
   - Test error handling

## Need Help?

- Check existing tools for examples
- Review tool interfaces in `client/` and `server/`
- Consult the schema documentation
- Open an issue for support