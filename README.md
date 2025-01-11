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
  <li>[x] Chat admin editor interface</li>
  <li>[hold for later] Improved error handling and validation</li>
  <li>[x] Message persistence</li>
  <li>[x] Enhanced conversation context management</li>
  <li>[ ] Additional tool support</li>
</ul>

tool ideas:

Calculator functions
Data analysis capabilities
URL processing
File handling
Integration with external APIs

<!-- Add after the existing sections -->
<h2>Tool Usage Examples</h2>

<h3>HTTP Fetch Tool</h3>
<p>The assistant can fetch and analyze web content from HTTPS URLs. Here are some example interactions:</p>

<h4>1. Repository Information</h4>
<pre><code>User: Could you fetch information about the React repository from GitHub's API?
Assistant: I'll fetch that information for you from GitHub's API.

{tool_use: fetch_url, url: "<https://api.github.com/repos/facebook/react"}>

Based on the repository data:

- Stars: 214,000+
- Description: A declarative, efficient, and flexible JavaScript library for building user interfaces
- Latest update: [date]
- Open issues: [count]
- Primary language: JavaScript
- License: MIT</code></pre>

<h4>2. Content Analysis</h4>
<pre><code>User: Could you fetch and analyze the package.json from this repository?
Assistant: I'll fetch the package.json file and analyze its dependencies.

{tool_use: fetch_url, url: "<https://raw.githubusercontent.com/philwilliammee/tool-bot/main/package.json"}>

Analysis of dependencies:

- AWS SDK: @aws-sdk/client-bedrock-runtime for AI capabilities
- Express: For server functionality
- Preact Signals: For state management
Additional devDependencies include:
- TypeScript
- Vite
- Testing utilities</code></pre>

<h4>3. Release Information</h4>
<pre><code>User: What's in the latest Node.js release?
Assistant: I'll check the latest release information.

{tool_use: fetch_url, url: "<https://api.github.com/repos/nodejs/node/releases/latest"}>

Latest Node.js Release:

- Version: [version number]
- Release date: [date]
- Key changes:
  • [major change 1]
  • [major change 2]
  • [major change 3]</code></pre>

<h4>4. Comparative Analysis</h4>
<pre><code>User: Compare Vue.js and React GitHub stats
Assistant: I'll fetch data for both repositories and compare them.

{tool_use: fetch_url, url: "<https://api.github.com/repos/vuejs/vue"}>
{tool_use: fetch_url, url: "<https://api.github.com/repos/facebook/react"}>

Comparison:
Vue.js vs React

- Stars: [Vue stars] vs [React stars]
- Forks: [Vue forks] vs [React forks]
- Open Issues: [Vue issues] vs [React issues]
- Latest Release: [Vue date] vs [React date]</code></pre>

<h4>Error Handling</h4>
<pre><code>User: Fetch from https://api.nonexistent.com/data
Assistant: I'll try to fetch from that URL, but it appears to be invalid.

{tool_use: fetch_url, url: "<https://api.nonexistent.com/data"}>

I apologize, but I encountered an error:

- Error: Failed to fetch from the URL
- Reason: DNS resolution failed
- Suggestion: Please verify the URL is correct and accessible</code></pre>

<h3>Tool Limitations</h3>
<ul>
  <li>HTTPS URLs only</li>
  <li>Supported content types: JSON, text, HTML, markdown</li>
  <li>Maximum content size: 1MB</li>
  <li>5-second timeout limit</li>
  <li>Maximum 3 redirects</li>
</ul>

<p><strong>Note:</strong> These examples demonstrate the tool's capabilities in fetching and analyzing web content. The assistant will explain its actions and provide formatted responses based on the fetched data.</p>
