class CalculatorClient {
  private baseUrl: string;
  private clientId: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async initialize() {
    try {
      const response = await fetch(`${this.baseUrl}/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Initialization failed');
      }

      const data = await response.json();
      this.clientId = data.clientId;
      return data;
    } catch (error) {
      console.error('Initialization error:', error);
      throw error;
    }
  }

  async calculate(expression: string) {
    try {
      const response = await fetch(`${this.baseUrl}/tools/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expression })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Calculation failed');
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Calculation error:', error);
      throw error;
    }
  }
}

// Example usage
async function runCalculator() {
  const client = new CalculatorClient();
  
  try {
    await client.initialize();
    
    const result = await client.calculate('2 + 3 * 4');
    console.log('Calculation result:', result);
    
    // More calculations
    console.log('10 * 5:', await client.calculate('10 * 5'));
    console.log('(20 + 10) / 3:', await client.calculate('(20 + 10) / 3'));
  } catch (error) {
    console.error('Error:', error);
  }
}

// For Node.js environment
if (typeof window === 'undefined') {
  // Use node-fetch in Node.js
  const fetch = require('node-fetch');
  global.fetch = fetch;
  runCalculator();
}

// For browser environment, this will work directly
if (typeof window !== 'undefined') {
  runCalculator();
}