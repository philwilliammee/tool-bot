<h1>AI Chat Assistant</h1>

<p>An AI-powered chat bot that can help with various tasks through natural language conversation. Engage in meaningful dialogue, get help with questions, and explore different topics through an intuitive chat interface.</p>

<blockquote>
  <p><strong>Note</strong>: This is a development tool and proof-of-concept. Not intended for production use.</p>
</blockquote>

<h2>Features</h2>

<ul>
  <li>AI-powered conversational interface</li>
  <li>Real-time chat interactions</li>
  <li>Context-aware responses</li>
  <li>Automatic error recovery and retry mechanisms</li>
  <li>Support for various types of queries and tasks</li>
</ul>

<h2>Quick Start</h2>

<ol>
  <li>Clone and setup environment:
    <pre><code>git clone https://github.com/[your-username]/ai-chat-assistant
cd ai-chat-assistant
cp example.env .env</code></pre>
  </li>

  <li>Configure AWS credentials in <code>.env</code>:
    <pre><code>VITE_AWS_REGION=your-aws-region
VITE_BEDROCK_MODEL_ID=your-model-id
VITE_AWS_ACCESS_KEY=your-aws-access-key
VITE_AWS_SECRET_KEY=your-aws-secret-key</code></pre>
  </li>

  <li>Install and run:
    <pre><code>npm install
npm run dev</code></pre>
  </li>

  <li>Open <code>http://localhost:5173</code> in your browser</li>
</ol>

<h2>API Integration</h2>

<p>Currently, this project uses AWS Bedrock as its AI provider, specifically designed to work with Amazon's Large Language Models through the Bedrock API. However, the project is structured to potentially support other AI providers.</p>

<h3>Supported:</h3>
<ul>
  <li>AWS Bedrock API</li>
</ul>

<h3>Potential Future Integrations:</h3>
<ul>
  <li>OpenAI API</li>
  <li>Ollama (local inference)</li>
  <li>Google Vertex AI</li>
  <li>Anthropic Claude API</li>
  <li>Other Open Source Models</li>
</ul>

<p><strong>Contributing Integrations:</strong> Pull requests for additional AI provider integrations are welcome! The project's architecture is designed to be extensible. Ollama integration would be particularly valuable as it would allow users to run models locally without cloud API costs.</p>

<h4>To add a new integration:</h4>
<ol>
  <li>Implement the core API service interface</li>
  <li>Add appropriate environment configuration</li>
  <li>Provide documentation for API setup</li>
  <li>Include example prompts optimized for the new model</li>
</ol>

<p>Check the <code>src/bedrock/bedrock.service.ts</code> file for an example of how API integration is currently implemented.</p>

<h2>Technical Architecture</h2>

<ul>
  <li>Built with TypeScript and Vite</li>
  <li>AWS Bedrock integration for AI capabilities</li>
  <li>Component-based architecture</li>
  <li>Signal-based state management</li>
  <li>Clean and responsive UI</li>
</ul>

<h3>Key Components</h3>

<ul>
  <li>Chat Interface: Handles user prompts and AI responses</li>
  <li>Message History: Maintains conversation context</li>
  <li>Error Handling: Automatic retry mechanism for API failures</li>
</ul>

<h2>Limitations</h2>

<ul>
  <li>Development tool only, not production-ready</li>
  <li>Requires AWS Bedrock access</li>
  <li>Maximum token limitations apply</li>
  <li>No persistent storage</li>
  <li>Limited to text-based interactions</li>
</ul>

<h2>Contributing</h2>

<ol>
  <li>Fork the repository</li>
  <li>Create a feature branch</li>
  <li>Commit your changes</li>
  <li>Push to the branch</li>
  <li>Create a Pull Request</li>
</ol>

<h2>Development Roadmap</h2>

<ul>
  <li>[ ] Improved error handling and validation</li>
  <li>[ ] Message persistence</li>
  <li>[ ] Enhanced conversation context management</li>
  <li>[ ] Additional tool support</li>
</ul>

Calculator functions
Data analysis capabilities
URL processing
File handling
Integration with external APIs
