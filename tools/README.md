<h1>AI Tool Registry</h1>

<p>A modular system for creating and managing tools that can be used by AI models via Bedrock. This system provides both client-side and server-side implementations with standardized interfaces.</p>

<h2>Structure</h2>

<pre>
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
</pre>

<h2>Creating a New Tool</h2>

<h3>1. Create the tool directory structure:</h3>
<pre>
mkdir -p tools/[tool-name]/{client,server}
touch tools/[tool-name]/config.ts
touch tools/[tool-name]/types.ts
touch tools/[tool-name]/client/[tool].client.ts
touch tools/[tool-name]/server/[tool].service.ts
touch tools/[tool-name]/server/[tool].types.ts
</pre>

<h3>2. Define shared types (types.ts):</h3>
<pre>
export interface ToolInput {
    // Define input parameters
}

export interface ToolResponse {
    // Define response structure
    error?: boolean;
    message?: string;
}
</pre>

<h3>3. Create Bedrock configuration (config.ts):</h3>
<pre>
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
</pre>

<h3>4. Implement client (client/[tool].client.ts):</h3>
<pre>
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
</pre>

<h3>5. Implement server (server/[tool].service.ts):</h3>
<pre>
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
</pre>

<h2>Standard Interfaces</h2>

<h3>ClientTool Interface</h3>
<pre>
interface ClientTool {
    name: string;
    execute: (input: any) => Promise<any>;
}
</pre>

<h3>ServerTool Interface</h3>
<pre>
interface ServerTool {
    name: string;
    route: string;
    handler: (req: Request, res: Response) => Promise<void>;
}
</pre>

<h2>Tool Types</h2>
<ul>
<li>Client-Only Tools: Tools that run entirely in the browser (e.g., HTML rendering)</li>
<li>Server Tools: Tools that require server-side processing (e.g., file system operations)</li>
<li>Hybrid Tools: Tools that need both client and server components</li>
</ul>

<h2>Example Tools</h2>
<ul>
<li>File Tree Tool: Generate directory structure</li>
<li>Project Reader: Read file contents</li>
<li>HTML Tool: Render HTML content</li>
<li>Math Tool: Perform calculations</li>
<li>LDAP Tool: Directory searches</li>
<li>Fetch Tool: Make HTTP requests</li>
</ul>

<h2>Best Practices</h2>
<ul>
<li>Always implement error handling in both client and server</li>
<li>Use TypeScript interfaces for type safety</li>
<li>Keep tool configurations in separate files</li>
<li>Implement proper input validation</li>
<li>Follow security best practices</li>
<li>Document tool capabilities and limitations</li>
<li>Use consistent naming conventions</li>
</ul>
