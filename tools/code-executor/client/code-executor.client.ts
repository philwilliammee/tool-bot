// tools/code-executor-tool/client/code-executor.client.ts
import { ClientTool } from "../../client/tool.interface";
import { CodeExecutorInput, CodeExecutorOutput } from "../types";

export const codeExecutorTool: ClientTool = {
  name: "code_executor",
  execute: async (input: CodeExecutorInput): Promise<CodeExecutorOutput> => {
    try {
      const iframe = document.querySelector(
        "#html-tool-frame"
      ) as HTMLIFrameElement;
      if (!iframe) {
        throw new Error("Execution iframe not found");
      }

      // Create execution environment
      const executionWrapper = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    ${
                      input.libraries
                        ?.map((lib) => `<script src="${lib}"></script>`)
                        .join("\n") || ""
                    }
                </head>
                <body>
                    <div id="output"></div>
                    <script>
                        // Capture console.log output
                        const logs = [];
                        const originalConsole = console.log;
                        console.log = (...args) => {
                            logs.push(args.map(arg =>
                                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                            ).join(' '));
                            originalConsole.apply(console, args);
                        };

                        // Execute the code with timeout
                        try {
                            const startTime = performance.now();
                            const result = (function() {
                                ${input.code}
                            })();
                            const executionTime = performance.now() - startTime;

                            // Send results back to parent
                            window.parent.postMessage({
                                type: 'code-execution-result',
                                result,
                                logs,
                                executionTime
                            }, '*');
                        } catch (error) {
                            window.parent.postMessage({
                                type: 'code-execution-error',
                                error: error.message,
                                logs
                            }, '*');
                        }
                    </script>
                </body>
                </html>
            `;

      // Create promise to handle response
      const executePromise = new Promise<CodeExecutorOutput>(
        (resolve, reject) => {
          const timeout = setTimeout(() => {
            cleanup();
            reject(
              new Error(`Execution timeout after ${input.timeout || 5000}ms`)
            );
          }, input.timeout || 5000);

          const handleMessage = (event: MessageEvent) => {
            if (
              event.data.type === "code-execution-result" ||
              event.data.type === "code-execution-error"
            ) {
              cleanup();
              if (event.data.type === "code-execution-error") {
                resolve({
                  result: undefined,
                  logs: event.data.logs,
                  error: event.data.error,
                });
              } else {
                resolve({
                  result: event.data.result,
                  logs: event.data.logs,
                  executionTime: event.data.executionTime,
                });
              }
            }
          };

          const cleanup = () => {
            clearTimeout(timeout);
            window.removeEventListener("message", handleMessage);
          };

          window.addEventListener("message", handleMessage);
        }
      );

      // Set iframe content and wait for execution
      iframe.srcdoc = executionWrapper;
      return await executePromise;
    } catch (error: any) {
      return {
        result: undefined,
        logs: [],
        error: error.message,
      };
    }
  },
};
