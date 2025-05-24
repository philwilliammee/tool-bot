const express = require('express');
const app = express();
const port = 3000;

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

// MCP initialize endpoint - client registration
app.post('/initialize', (req, res) => {
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.json({
    clientId: clientId,
    serverName: 'Calculator MCP Server',
    version: '1.0.0'
  });
});

// MCP initialize endpoint - returns available tools
app.get('/tools/initialize', (req, res) => {
  res.json({
    tools: [
      {
        name: 'calculate',
        description: 'Perform mathematical calculations using MCP calculator service',
        inputSchema: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: 'Mathematical expression to evaluate'
            }
          },
          required: ['expression']
        }
      }
    ]
  });
});

// MCP calculate endpoint - performs calculations
app.post('/tools/calculate', (req, res) => {
  try {
    const { expression } = req.body;

    if (!expression) {
      return res.status(400).json({ error: 'Expression is required' });
    }

    // Simple evaluation (be careful in production - this can be dangerous)
    // For demo purposes only
    const result = eval(expression.replace(/[^0-9+\-*/.() ]/g, ''));

    res.json({
      result: result,
      expression: expression,
      message: `Calculated ${expression} = ${result}`
    });
  } catch (error) {
    console.error('Calculation error:', error);
    res.status(400).json({
      error: 'Invalid mathematical expression',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🧮 MCP Calculator Server running on http://localhost:${port}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /tools/initialize - Get available tools`);
  console.log(`   POST /tools/calculate  - Perform calculations`);
  console.log(`   GET  /health          - Health check`);
});
