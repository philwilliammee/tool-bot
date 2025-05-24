import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import NodeCache from 'node-cache';

class MCPServer {
  private app: express.Application;
  private cache: NodeCache;

  constructor() {
    this.app = express();
    this.cache = new NodeCache();

    this.app.use(express.json());
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });

    this.setupRoutes();
  }

  private setupRoutes() {
    // Initialize endpoint
    this.app.post('/initialize', (req, res) => {
      const clientId = uuidv4();
      this.cache.set(`client:${clientId}`, { createdAt: Date.now() });

      res.status(201).json({
        clientId,
        capabilities: {
          tools: ['calculator']
        }
      });
    });

    // Calculator tool
    this.app.post('/tools/calculate', (req, res) => {
      const { expression } = req.body;

      try {
        // Basic security: only allow safe mathematical expressions
        const safeExpression = expression.replace(/[^0-9+\-*/().]/g, '');
        
        // Use Function constructor for safe evaluation
        const result = new Function(`return (${safeExpression})`)();

        res.json({
          result,
          expression: safeExpression
        });
      } catch (error) {
        res.status(400).json({ 
          error: 'Invalid calculation', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'healthy',
        uptime: process.uptime()
      });
    });
  }

  public start(port: number = 3000) {
    this.app.listen(port, () => {
      console.log(`Calculator MCP Server running on port ${port}`);
    });
  }
}

const mcpServer = new MCPServer();
mcpServer.start(process.env.PORT ? parseInt(process.env.PORT) : 3000);