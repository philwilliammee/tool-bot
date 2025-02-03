# AI Tool Registry

A modular system for creating and managing tools that can be used by AI models. This system provides both client-side and server-side implementations with standardized interfaces.

## Structure

```
tools/
├── client/              # Client-side registry and interfaces
├── server/             # Server-side registry and interfaces
└── [tool-name]/        # Individual tool folders
    ├── client/         # Client implementation (required)
    │   └── [tool].client.ts
    ├── server/         # Server implementation (optional)
    │   ├── [tool].service.ts
    │   └── [tool].types.ts
    ├── config.ts       # Bedrock tool configuration
    └── types.ts        # Shared types (if needed)
```

## Tool Categories

### Client-Only Tools

- HTML Tool: Renders HTML content directly in browser with support for React, Vue, and vanilla JavaScript
- Math Tool: Performs calculations using mathjs library
- Code Executor: Executes JavaScript in sandboxed environment

### Server-Required Tools

- LDAP Tool: Directory searches requiring server access
- File Writer: File system operations
- Project Reader: File content access
- File Tree: Directory structure generation
- Fetch Tool: Proxied HTTP requests

## Tool Configuration Examples

### Basic Tool Configuration Template

```typescript
import { ToolConfiguration } from "@aws-sdk/client-bedrock-runtime";

export const toolConfig: ToolConfiguration = {
    tools: [{
        toolSpec: {
            name: "tool_name",
            description: "Tool description for AI",
            inputSchema: {
                json: {
                    type: "object",
                    properties: {
                        // Tool-specific properties
                    },
                    required: ["required_fields"]
                }
            }
        }
    }]
};
```

### Actual Implementation Examples

#### HTML Tool Configuration with React Support

```typescript
export const htmlToolConfig: ToolConfiguration = {
    tools: [{
        toolSpec: {
            name: "html",
            description: "Render HTML content in an isolated iframe environment. Supports React, Vue, and vanilla JavaScript.",
            inputSchema: {
                json: {
                    type: "object",
                    properties: {
                        html: {
                            type: "string",
                            description: "Raw HTML markup"
                        },
                        css: {
                            type: "string",
                            description: "CSS styles"
                        },
                        javascript: {
                            type: "string",
                            description: "JavaScript code to execute; use console.log for output"
                        },
                        libraries: {
                            type: "array",
                            description: "List of CDN libraries to include in the iframe",
                            items: {
                                type: "string",
                                enum: [
                                    "https://unpkg.com/react@18/umd/react.production.min.js",
                                    "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
                                    "https://cdn.jsdelivr.net/npm/vue@3.2.37/dist/vue.global.prod.js",
                                    "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
                                    "https://cdn.jsdelivr.net/npm/d3@7.8.5/dist/d3.min.js",
                                    "https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.min.js",
                                    "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.7/MathJax.js?config=TeX-MML-AM_CHTML"


                                ]
                            },
                            default: []
                        }
                    },
                    required: ["html"]
                }
            }
        }
    }]
};
```

#### Code Executor Configuration

```typescript
export const codeExecutorConfig: ToolConfiguration = {
    tools: [{
        toolSpec: {
            name: "code_executor",
            description: "Execute JavaScript code in a sandboxed environment with access to common libraries.",
            inputSchema: {
                json: {
                    type: "object",
                    properties: {
                        code: {
                            type: "string",
                            description: "JavaScript code to execute. Can use console.log for output."
                        },
                        timeout: {
                            type: "number",
                            description: "Maximum execution time in milliseconds",
                            default: 5000,
                            maximum: 10000
                        },
                        libraries: {
                            type: "array",
                            description: "List of CDN libraries to include",
                            items: {
                                type: "string",
                                enum: [
                                    "https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js",
                                    "https://cdn.jsdelivr.net/npm/moment@2.29.4/moment.min.js",
                                    "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
                                    "https://cdn.jsdelivr.net/npm/mathjs@12.2.1/lib/browser/math.min.js"
                                ]
                            },
                            default: []
                        }
                    },
                    required: ["code"]
                }
            }
        }
    }]
};
```

#### Math Tool Configuration

```typescript
export const mathToolConfig: ToolConfiguration = {
    tools: [{
        toolSpec: {
            name: "math",
            description: "A mathematical evaluation tool using mathjs library. Always use direct mathematical expressions, not natural language.",
            inputSchema: {
                json: {
                    type: "object",
                    properties: {
                        expression: {
                            type: "string",
                            description: "Mathematical expression to evaluate",
                            examples: [
                                "2 + 3 * 4",
                                "sqrt(16)",
                                "(15/100) * 80",
                                "mean([1,2,3,4])",
                                "std([2,4,6])",
                                "sin(45 * pi / 180)",
                                "cos(60 * pi / 180)",
                                "12.7 * 2.54",
                                "100 / 1.60934",
                                "[1,2,3] * 2",
                                "det([-1, 2; 3, 1])"
                            ]
                        }
                    },
                    required: ["expression"]
                }
            }
        }
    }]
};
```

## Implementation Guidelines

### Client Tool Implementation

```typescript
import { ClientTool } from '../../client/tool.interface';

export const yourTool: ClientTool = {
    name: "tool_name",
    execute: async (input: any): Promise<any> => {
        try {
            // For server-required tools:
            const response = await fetch("/api/tools/endpoint", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input)
            });

            // For client-only tools:
            // Implement direct browser-side logic

            return result;
        } catch (error: any) {
            return {
                error: true,
                message: error.message
            };
        }
    }
};
```

### Server Tool Implementation (if needed)

```typescript
import { ServerTool } from '../../server/tool.interface';
import { Request, Response } from 'express';

export const yourTool: ServerTool = {
    name: "tool_name",
    route: "/endpoint",
    handler: async (req: Request, res: Response): Promise<void> => {
        try {
            const input = req.body;
            // Implement server-side logic
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

## Using React in HTML Tool

To use React in the HTML tool, you need to:

1. Include the React libraries in your request:

```javascript
{
    "libraries": [
        "https://unpkg.com/react@18/umd/react.production.min.js",
        "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"
    ]
}
```

2. Write your React components in the JavaScript section:

```javascript
{
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

## Best Practices

1. Configuration Requirements
   - Always follow the exact ToolConfiguration format
   - Include comprehensive description and examples
   - Properly specify required fields
   - Use appropriate JSON Schema types and validation

2. Implementation Guidelines
   - Implement proper error handling in both client and server components
   - Use TypeScript interfaces for type safety
   - Keep configurations in separate files
   - Follow security best practices, especially for server-side tools
   - Document tool capabilities and limitations

3. Security Considerations
   - Sandbox any code execution (like in code-executor)
   - Validate all inputs server-side
   - Implement proper timeout mechanisms
   - Use appropriate access controls for server endpoints
   - Sanitize all outputs before returning to client

4. Testing Requirements
   - Verify tool configuration against Bedrock runtime requirements
   - Test both success and error scenarios
   - Validate input/output formats
   - Check timeout and resource limit handling
