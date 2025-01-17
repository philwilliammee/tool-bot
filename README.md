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
    <pre><code>AWS_REGION=your-aws-region
BEDROCK_MODEL_ID=your-model-id
AWS_ACCESS_KEY=your-aws-access-key
AWS_SECRET_KEY=your-aws-secret-key</code></pre>
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
  <li><strong>Chat Context (chatContext)</strong>: Holds the entire conversation. Automatically handles AWS Bedrock calls whenever a new <code>user</code> message is added, and executes tools if an <code>assistant</code> message includes a <code>toolUse</code> block.</li>
  <li><strong>Chat Interface (Chat.ts)</strong>: Primarily a UI layer. Listens to user input, adds new messages to the context, and renders updates whenever the context changes.</li>
  <li><strong>Work Area</strong>: Provides an admin interface to view/edit messages and manage the conversation history.</li>
  <li><strong>Error Handling</strong>: A robust but still development-level approach that attempts to retry errors; not production-ready.</li>
</ul>

<h2>Limitations</h2>
<ul>
  <li>Development tool only, not production-ready</li>
  <li>Requires AWS Bedrock access</li>
  <li>Maximum token limitations apply</li>
  <li>No persistent storage outside of local storage</li>
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
  <li>✅ Chat admin editor interface</li>
  <li>⏸️ Improved error handling and validation (on hold)</li>
  <li>✅ Message persistence</li>
  <li>✅ Enhanced conversation context management</li>
  <li>✅ Basic tool support (fetch, math)</li>
  <li>🚧 HTML Tool Development
    <ul>
      <li>✅ Basic HTML rendering in iframe</li>
      <li>✅ Tool integration with Bedrock</li>
      <li>⏳ Add visualization templates</li>
      <li>⏳ Support for common chart types</li>
      <li>⏳ Interactive component library</li>
    </ul>
  </li>
  <li>✅ UI Improvements
    <ul>
      <li>✅ Tab-based interface for Preview/Work Area</li>
      <li>✅ Signal-based state management for UI</li>
      <li>✅ Improved tool output formatting</li>
    </ul>
  </li>
  <li>⏳ Centralize tool registry system
    <ul>
      <li>Single source of truth for tool configurations</li>
      <li>Simplified tool registration process</li>
      <li>Better type safety for tools</li>
    </ul>
  </li>
</ul>

<p>We now support an <strong>automated chat flow</strong> where the context automatically calls the LLM on new user messages, and if an <code>assistant</code> message contains a <code>toolUse</code> request, the appropriate tool is invoked automatically.</p>

<hr />

<h2>General great prompts</h2>
generate a 9th grade graphing algebra problem. Generate the output in html use latext if possible and do graphing of the equation.

<h2>Tool Usage Examples</h2>
<p>Below are usage examples illustrating our supported tools.</p>

<h3>HTML Generation Tool</h3>
<p>Examples of queries the assistant can handle:</p>
<ul>
  <li>"Create a simple todo list interface"</li>
  <li>"Generate a bar chart visualization"</li>
  <li>"Make an interactive color picker"</li>
  <li>"Create a responsive grid layout"</li>
</ul>

<h4>Example Interaction:</h4>
<pre><code>User: Create a simple color picker with preview
Assistant: I'll create an interactive color picker with a preview area.

{tool_use: html, input: {
  "html": "
    <div class='widget'>
      <style>
        .color-preview {
          width: 100px;
          height: 100px;
          border: 1px solid #ccc;
        }
      </style>
      <input type='color' id='picker'>
      <div id='preview' class='color-preview'></div>
      <script>
        picker.oninput = e => preview.style.backgroundColor = e.target.value;
      </script>
    </div>
  "
}}

I've created a color picker that shows a live preview of the selected color.</code></pre>

<h3>HTTP Fetch Tool</h3>
<p>Examples of queries the assistant can handle:</p>
<ul>
  <li>"Could you fetch information about the React repository from GitHub's API?"</li>
  <li>"Fetch and analyze the package.json from this repository"</li>
  <li>"What's in the latest Node.js release?"</li>
  <li>"Compare Vue.js and React GitHub stats"</li>
</ul>

<h4>Example Interaction:</h4>
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

<h3>Calculator Tool</h3>
<p>Examples of calculations the assistant can perform:</p>
<ul>
  <li>"Calculate the standard deviation of [23, 45, 67, 89, 12, 34]"</li>
  <li>"What's the mean and median of [125, 475, 275, 550, 325, 225]?"</li>
  <li>"Convert 145 km/h to mph and round to 2 decimal places"</li>
  <li>"What's the compound interest on $1000 at 5% APR for 3 years? Use (1000 * (1 + 0.05)^3)"</li>
  <li>"Find the area of a circle with radius 7.5 using pi * r^2"</li>
  <li>"Calculate sin(45°) * sqrt(256) + cos(30°)"</li>
  <li>"Find the determinant of matrix [-2, 3, 1; 4, -5, 2; 1, -3, 2]"</li>
  <li>"What's a 23% increase from 450, then decreased by 15%?"</li>
</ul>

<h4>Example Interaction:</h4>
<pre><code>User: Calculate the sum of 10, 20, 30, and 40
Assistant: I'll help you add those numbers.

{tool_use: calculator, operation: "add", values: [10, 20, 30, 40]}

The sum is 100.</code></pre>

<h3>Tool Limitations</h3>
<ul>
  <li>HTML Tool:
    <ul>
      <li>Renders in sandboxed iframe environment</li>
      <li>Supports standard HTML, CSS, and JavaScript</li>
      <li>Limited to client-side functionality</li>
      <li>Scripts run in isolated context</li>
    </ul>
  </li>
  <li>Fetch Tool:
    <ul>
      <li>HTTPS URLs only</li>
      <li>Supported content types: JSON, text, HTML, markdown</li>
      <li>Maximum content size: 1MB</li>
      <li>5-second timeout limit</li>
    </ul>
  </li>
  <li>Calculator Tool:
    <ul>
      <li>Basic operations: add, subtract, multiply, divide</li>
      <li>Expression evaluation with standard operators</li>
      <li>Numbers must be within safe JavaScript number range</li>
    </ul>
  </li>
</ul>

<h3>Interface Features</h3>
<ul>
  <li><strong>Preview/Work Area Tabs:</strong> Toggle between HTML preview and chat administration</li>
  <li><strong>Improved Message Display:</strong> Better formatting for tool usage and results</li>
  <li><strong>State Management:</strong> Centralized signal-based state handling</li>
  <li><strong>Responsive Layout:</strong> Adapts to different screen sizes</li>
</ul>

IF preview is visible work area doesn't load.

search for something and display something interesting about it in html.

Make me an amazing chart! I will show it to my fiends, and display your skills and craftsmanship at fine web design.

Wait what happened, earlier you were making amazing charts. I told them how great they are. You can do better that that, really try to impress them.

This is stunning but I know you can do more. Elevate it and take it to the next level.
