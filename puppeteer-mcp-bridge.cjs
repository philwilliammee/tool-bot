#!/usr/bin/env node

const express = require('express');
const { spawn } = require('child_process');
const app = express();
const port = 3002; // Different port from calculator server

app.use(express.json());

// Add CORS headers for browser requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// MCP Puppeteer process management
let mcpProcess = null;
let mcpReady = false;
let messageId = 1;

function startMCPProcess() {
  if (mcpProcess) {
    mcpProcess.kill();
  }

  console.log('🤖 Starting MCP Puppeteer server...');

  mcpProcess = spawn('node', [
    '/home/ds123/.nvm/versions/node/v20.15.0/lib/node_modules/@modelcontextprotocol/server-puppeteer/dist/index.js'
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PUPPETEER_EXECUTABLE_PATH: '/usr/bin/google-chrome',
      PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'true'
    }
  });

  mcpProcess.stdout.on('data', (data) => {
    const response = data.toString();
    console.log('📄 MCP Response:', response);
  });

  mcpProcess.stderr.on('data', (data) => {
    console.error('❌ MCP Error:', data.toString());
  });

  mcpProcess.on('close', (code) => {
    console.log(`🔴 MCP process exited with code ${code}`);
    mcpReady = false;
  });

  // Initialize MCP server
  setTimeout(() => {
    initializeMCP();
  }, 1000);
}

function initializeMCP() {
  if (!mcpProcess) return;

  const initMessage = {
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "tool-bot-bridge",
        version: "1.0.0"
      }
    },
    id: messageId++
  };

  mcpProcess.stdin.write(JSON.stringify(initMessage) + '\n');
  mcpReady = true;
  console.log('✅ MCP Puppeteer server initialized');
}

// Start MCP process
startMCPProcess();

// MCP initialize endpoint - client registration
app.post('/initialize', (req, res) => {
  const clientId = `puppeteer-client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.json({
    clientId: clientId,
    serverName: 'Puppeteer MCP Bridge',
    version: '1.0.0'
  });
});

// MCP initialize endpoint - returns available Puppeteer tools
app.get('/tools/initialize', (req, res) => {
  res.json({
    tools: [
      {
        name: 'puppeteer_navigate',
        description: 'Navigate to a URL in the browser',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL to navigate to'
            }
          },
          required: ['url']
        }
      },
      {
        name: 'puppeteer_screenshot',
        description: 'Take a screenshot of the current page',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the screenshot'
            },
            width: {
              type: 'number',
              description: 'Width in pixels (default: 800)'
            },
            height: {
              type: 'number',
              description: 'Height in pixels (default: 600)'
            }
          },
          required: ['name']
        }
      },
      {
        name: 'puppeteer_click',
        description: 'Click an element on the page',
        inputSchema: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'CSS selector for element to click'
            }
          },
          required: ['selector']
        }
      },
      {
        name: 'puppeteer_fill',
        description: 'Fill out an input field',
        inputSchema: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'CSS selector for input field'
            },
            value: {
              type: 'string',
              description: 'Value to fill'
            }
          },
          required: ['selector', 'value']
        }
      },
      {
        name: 'puppeteer_evaluate',
        description: 'Execute JavaScript in the browser',
        inputSchema: {
          type: 'object',
          properties: {
            script: {
              type: 'string',
              description: 'JavaScript code to execute'
            }
          },
          required: ['script']
        }
      }
    ]
  });
});

// Generic tool execution endpoint
async function executePuppeteerTool(toolName, params) {
  return new Promise((resolve, reject) => {
    if (!mcpReady || !mcpProcess) {
      reject(new Error('MCP Puppeteer server not ready'));
      return;
    }

    const toolMessage = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: toolName,
        arguments: params
      },
      id: messageId++
    };

    // Set up response handler
    const responseHandler = (data) => {
      try {
        const lines = data.toString().split('\n').filter(line => line.trim());

        for (const line of lines) {
          const response = JSON.parse(line);

          if (response.id === toolMessage.id) {
            mcpProcess.stdout.removeListener('data', responseHandler);

            if (response.error) {
              reject(new Error(response.error.message || 'Tool execution failed'));
            } else {
              resolve(response.result);
            }
            return;
          }
        }
      } catch (error) {
        mcpProcess.stdout.removeListener('data', responseHandler);
        reject(error);
      }
    };

    mcpProcess.stdout.on('data', responseHandler);

    // Send tool call
    mcpProcess.stdin.write(JSON.stringify(toolMessage) + '\n');

    // Timeout after 30 seconds
    setTimeout(() => {
      mcpProcess.stdout.removeListener('data', responseHandler);
      reject(new Error('Tool execution timeout'));
    }, 30000);
  });
}

// Tool endpoints
app.post('/tools/puppeteer_navigate', async (req, res) => {
  try {
    const result = await executePuppeteerTool('puppeteer_navigate', req.body);
    res.json(result);
  } catch (error) {
    console.error('Navigate error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/tools/puppeteer_screenshot', async (req, res) => {
  try {
    const result = await executePuppeteerTool('puppeteer_screenshot', req.body);
    res.json(result);
  } catch (error) {
    console.error('Screenshot error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/tools/puppeteer_click', async (req, res) => {
  try {
    const result = await executePuppeteerTool('puppeteer_click', req.body);
    res.json(result);
  } catch (error) {
    console.error('Click error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/tools/puppeteer_fill', async (req, res) => {
  try {
    const result = await executePuppeteerTool('puppeteer_fill', req.body);
    res.json(result);
  } catch (error) {
    console.error('Fill error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/tools/puppeteer_evaluate', async (req, res) => {
  try {
    const result = await executePuppeteerTool('puppeteer_evaluate', req.body);
    res.json(result);
  } catch (error) {
    console.error('Evaluate error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: mcpReady ? 'ok' : 'initializing',
    timestamp: new Date().toISOString(),
    mcpProcess: !!mcpProcess
  });
});

app.listen(port, () => {
  console.log(`🌐 Puppeteer MCP Bridge running on http://localhost:${port}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /tools/initialize        - Get available tools`);
  console.log(`   POST /tools/puppeteer_navigate - Navigate to URL`);
  console.log(`   POST /tools/puppeteer_screenshot - Take screenshot`);
  console.log(`   POST /tools/puppeteer_click   - Click element`);
  console.log(`   POST /tools/puppeteer_fill    - Fill input field`);
  console.log(`   POST /tools/puppeteer_evaluate - Execute JavaScript`);
  console.log(`   GET  /health                  - Health check`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down Puppeteer MCP Bridge...');
  if (mcpProcess) {
    mcpProcess.kill();
  }
  process.exit(0);
});
