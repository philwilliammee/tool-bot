import { ClientTool } from "./../../client/tool.interface";
import { CodeExecutor } from "./code-executor.client";

export class CodeExecutorTool implements ClientTool {
  private executor: CodeExecutor;
  name = "code_executor";

  constructor() {
    this.executor = new CodeExecutor();
  }

  async execute(params: {
    code: string;
    timeout?: number;
    libraries?: string[];
  }) {
    const result = await this.executor.execute(params);

    // Format the output for display
    const formattedResult = {
      console: result.output,
      result: result.result,
      error: result.error,
    };

    // Return both the execution result and HTML visualization
    return {
      result: formattedResult,
      html: `
        <div class="code-execution-result">
          ${
            result.error
              ? `
            <div class="error-output">
              <h3>Error:</h3>
              <pre class="error">${result.error}</pre>
            </div>
          `
              : ""
          }

          ${
            result.output.length > 0
              ? `
            <div class="console-output">
              <h3>Console Output:</h3>
              <pre class="output">${result.output.join("\n")}</pre>
            </div>
          `
              : ""
          }

          ${
            result.result !== undefined
              ? `
            <div class="execution-result">
              <h3>Return Value:</h3>
              <pre class="result">${
                typeof result.result === "object"
                  ? JSON.stringify(result.result, null, 2)
                  : String(result.result)
              }</pre>
            </div>
          `
              : ""
          }
        </div>
        <style>
          .code-execution-result {
            font-family: monospace;
            padding: 1rem;
            background: #f5f5f5;
            border-radius: 4px;
          }
          .code-execution-result h3 {
            margin: 0.5rem 0;
            color: #333;
          }
          .code-execution-result pre {
            margin: 0;
            padding: 0.5rem;
            background: #fff;
            border-radius: 2px;
          }
          .code-execution-result .error {
            color: #dc3545;
            background: #ffebee;
          }
          .code-execution-result .output {
            color: #0d47a1;
            background: #e3f2fd;
          }
          .code-execution-result .result {
            color: #2e7d32;
            background: #e8f5e9;
          }
        </style>
      `,
    };
  }

  destroy() {
    this.executor.destroy();
  }
}
