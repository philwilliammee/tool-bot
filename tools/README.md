# AI Tool Registry

A modular system for creating and managing tools that can be used by AI models via Bedrock. This system provides both client-side and server-side implementations with standardized interfaces.

## Structure

```
tools/
├── client/              # Client-side registry and interfaces
├── server/             # Server-side registry and interfaces
└── [tool-name]/        # Individual tool folders
    ├── client/         # Client implementation
    │   └── [tool].client.ts
    ├── server/         # Server implementation (if needed)
    │   ├── [tool].service.ts
    │   └── [tool].types.ts
    ├── config.ts       # Bedrock tool configuration
    └── types.ts        # Shared types
```

## Creating a New Tool

### 1. Create the tool directory structure:

```bash
mkdir -p tools/[tool-name]/{client,server}
touch tools/[tool-name]/config.ts
touch tools/[tool-name]/types.ts
touch tools/[tool-name]/client/[tool].client.ts
touch tools/[tool-name]/server/[tool].service.ts
touch tools/[tool-name]/server/[tool].types.ts
```

### 2. Define shared types (types.ts):

```typescript
export interface ToolInput {
    // Define input parameters
}

export interface ToolResponse {
    // Define response structure
    error?: boolean;
    message?: string;
}
```

### 3. Create Bedrock configuration (config.ts):

```typescript
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const toolConfig: ToolConfiguration = {
    tools: [{
        toolSpec: {
            name: "your_tool_name",
            description: "Tool description for AI",
            inputSchema: {
                json: {
                    type: "object",
                    properties: {
                        // Define input schema
                    },
                    required: ["required_fields"]
                }
            }
        }
    }]
};
```

### 4. Implement client (client/[tool].client.ts):

```typescript
import { ClientTool } from '../../client/tool.interface';
import { ToolInput, ToolResponse } from '../types';

export const yourTool: ClientTool = {
    name: "your_tool_name",
    execute: async (input: ToolInput): Promise<ToolResponse> => {
        try {
            const response = await fetch("/api/tools/your-tool-endpoint", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            });

            if (!response.ok) {
                throw new Error(`Tool failed: ${await response.text()}`);
            }

            return await response.json();
        } catch (error: any) {
            return {
                error: true,
                message: error.message
            };
        }
    },
};
```

### 5. Implement server (server/[tool].service.ts):

```typescript
import { ServerTool } from '../../server/tool.interface';
import { Request, Response } from 'express';
import { ToolInput, ToolResponse } from '../types';

export const yourTool: ServerTool = {
    name: "your_tool_name",
    route: "/your-tool-endpoint",
    handler: async (req: Request, res: Response): Promise<void> => {
        try {
            const input: ToolInput = req.body;
            // Implement tool logic
            res.json(result);
        } catch (error: any) {
            res.status(500).json({
                error: true,
                message: error.message
            });
        }
    }
};
```

## Standard Interfaces

### ClientTool Interface

```typescript
interface ClientTool {
    name: string;
    execute: (input: any) => Promise<any>;
}
```

### ServerTool Interface

```typescript
interface ServerTool {
    name: string;
    route: string;
    handler: (req: Request, res: Response) => Promise<void>;
}
```

## Tool Types

- Client-Only Tools: Tools that run entirely in the browser (e.g., HTML rendering)
- Server Tools: Tools that require server-side processing (e.g., file system operations)
- Hybrid Tools: Tools that need both client and server components

## Example Tools

- File Tree Tool: Generate directory structure
- Project Reader: Read file contents
- HTML Tool: Render HTML content
- Math Tool: Perform calculations
- LDAP Tool: Directory searches
- Fetch Tool: Make HTTP requests
- File Writer Tool: Write content to files

## Best Practices

- Always implement error handling in both client and server
- Use TypeScript interfaces for type safety
- Keep tool configurations in separate files
- Implement proper input validation
- Follow security best practices
- Document tool capabilities and limitations
- Use consistent naming conventions