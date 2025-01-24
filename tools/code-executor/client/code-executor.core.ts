export async function executeCode(
  code: string,
  libraries: string[] = [],
  timeout: number = 5000
): Promise<ToolCallResult> {
  try {
    // Get the existing iframe
    const iframe = document.querySelector(
      "#html-tool-frame"
    ) as HTMLIFrameElement;
    if (!iframe) {
      throw new Error("HTML tool frame not found");
    }

    // Create a promise that will resolve with the result or reject on timeout
    const executionPromise = new Promise<ToolCallResult>((resolve, reject) => {
      // Create message handler
      const messageHandler = (event: MessageEvent) => {
        if (event.source === iframe.contentWindow) {
          const result = event.data;
          if (result.type === "code-execution-result") {
            window.removeEventListener("message", messageHandler);
            resolve({
              output: result.output || [],
              error: result.error || null,
            });
          }
        }
      };

      // Add message listener
      window.addEventListener("message", messageHandler);

      // Create the execution environment
      const executionSetup = `
                <!DOCTYPE html>
                <html>
                <head>
                    ${libraries
                      .map((lib) => `<script src="${lib}"></script>`)
                      .join("\n")}
                </head>
                <body>
                    <script>
                        // Capture console.log output
                        const output = [];
                        const originalConsoleLog = console.log;
                        console.log = (...args) => {
                            output.push(args.map(arg =>
                                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                            ).join(' '));
                            originalConsoleLog.apply(console, args);
                        };

                        try {
                            // Execute the code
                            ${code}

                            // Send results back to parent
                            window.parent.postMessage({
                                type: 'code-execution-result',
                                output: output,
                                error: null
                            }, '*');
                        } catch (error) {
                            // Send error back to parent
                            window.parent.postMessage({
                                type: 'code-execution-result',
                                output: output,
                                error: error.message
                            }, '*');
                        }
                    </script>
                </body>
                </html>
            `;

      // Set the iframe content
      iframe.srcdoc = executionSetup;
    });

    // Create a timeout promise
    const timeoutPromise = new Promise<ToolCallResult>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Execution timed out after ${timeout}ms`));
      }, timeout);
    });

    // Race between execution and timeout
    const result = await Promise.race([executionPromise, timeoutPromise]);
    return result;
  } catch (error) {
    return {
      output: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
