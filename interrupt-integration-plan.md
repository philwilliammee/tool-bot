# Tool Interrupt Integration Plan

## Current Status

The ToolHandler implementation has been successfully updated with a more efficient interrupt mechanism:

```typescript
// Updated ToolHandler implementation
export class ToolHandler {
  // Use a simple object map instead of signals for tracking
  private activeTools: Record<string, AbortController> = {};

  // ...other methods...

  // Interrupt a specific tool by ID
  interruptTool(toolUseId: string): boolean {
    const controller = this.activeTools[toolUseId];
    if (controller) {
      controller.abort();
      return true;
    }
    return false;
  }

  // Interrupt all running tools
  interruptAllTools(): boolean {
    const toolIds = Object.keys(this.activeTools);
    if (toolIds.length === 0) return false;
    
    toolIds.forEach(id => this.activeTools[id].abort());
    return true;
  }
}
```

However, the InterruptButton component still expects the old method signature:

```typescript
// Current InterruptButton implementation (outdated)
private handleInterrupt(): void {
  try {
    // First, try to interrupt any running tool
    const toolHandler = converseStore["toolHandler"];
    if (toolHandler && store.isToolRunning.value) {
      const toolInterrupted = toolHandler.interruptCurrentTool(); // This method no longer exists
      if (toolInterrupted) {
        store.showToast("Tool execution interrupted");
        return;
      }
    }
    
    // ...code for interrupting text generation...
  } catch (error) {
    console.error("Error during interrupt operation:", error);
    store.showToast("Error interrupting operation");
  }
}
```

## Integration Plan

### 1. Update ConverseStore to Expose Interrupt Methods

```typescript
// Add these methods to ConverseStore
public interruptCurrentTool(): boolean {
  const currentToolId = store.currentToolId.value;
  if (this.toolHandler && currentToolId) {
    return this.toolHandler.interruptTool(currentToolId);
  }
  return false;
}

public interruptAllTools(): boolean {
  if (this.toolHandler) {
    return this.toolHandler.interruptAllTools();
  }
  return false;
}
```

### 2. Update InterruptButton Component

```typescript
private handleInterrupt(): void {
  try {
    // First, try to interrupt the current tool
    if (store.isToolRunning.value) {
      const currentToolId = store.currentToolId.value;
      if (currentToolId) {
        // Use the specific tool ID if available
        const toolInterrupted = converseStore.interruptCurrentTool();
        if (toolInterrupted) {
          store.showToast("Tool execution interrupted");
          return;
        }
      } else {
        // Fall back to interrupting all tools if no specific ID
        const allToolsInterrupted = converseStore.interruptAllTools();
        if (allToolsInterrupted) {
          store.showToast("All tool executions interrupted");
          return;
        }
      }
    }
    
    // If no tool was running or interruption failed, try to interrupt text generation
    const llmHandler = converseStore["llmHandler"];
    if (llmHandler && store.isGenerating.value) {
      const interrupted = llmHandler.interruptStream();
      if (interrupted) {
        store.showToast("Text generation interrupted");
      } else {
        console.warn("Failed to interrupt text generation");
        store.showToast("Failed to interrupt operation");
      }
    }
  } catch (error) {
    console.error("Error during interrupt operation:", error);
    store.showToast("Error interrupting operation");
  }
}
```

### 3. Update Tool Client Implementations

Ensure all tool client implementations properly handle the AbortSignal:

```typescript
// Example tool implementation with abort handling
export const exampleTool: ClientTool = {
  name: "example_tool",
  execute: async (input: any): Promise<any> => {
    const { signal, ...toolInput } = input;
    
    // Check if already aborted
    if (signal?.aborted) {
      throw new DOMException("Tool execution was aborted", "AbortError");
    }
    
    try {
      // For long-running operations, check the signal periodically
      const result = await longRunningOperation(toolInput, signal);
      return result;
    } catch (error) {
      // Properly propagate abort errors
      if (error.name === "AbortError") {
        throw new DOMException("Tool execution was aborted", "AbortError");
      }
      throw error;
    }
  }
};

// Helper function for long-running operations
async function longRunningOperation(input: any, signal?: AbortSignal): Promise<any> {
  return new Promise((resolve, reject) => {
    // Set up abort handler
    if (signal) {
      signal.addEventListener('abort', () => {
        reject(new DOMException("Operation aborted", "AbortError"));
      });
      
      // If already aborted, reject immediately
      if (signal.aborted) {
        reject(new DOMException("Operation aborted", "AbortError"));
      }
    }
    
    // Your actual implementation here...
  });
}
```

### 4. Update HTML Tool

The HTML tool needs special handling to pass the abort signal to the iframe:

```typescript
export const htmlTool: ClientTool = {
  name: "html",
  execute: async (input: any): Promise<any> => {
    const { html, css, javascript, libraries, signal } = input;
    
    // Create a container for the iframe
    const container = document.createElement('div');
    
    // Create iframe
    const iframe = document.createElement('iframe');
    // ...iframe setup...
    
    // Pass the signal to the iframe content window
    if (signal) {
      const iframeWindow = iframe.contentWindow as any;
      if (iframeWindow) {
        iframeWindow.availableData = iframeWindow.availableData || {};
        iframeWindow.availableData.signal = signal;
        
        // Set up listener to remove iframe if aborted
        signal.addEventListener('abort', () => {
          container.remove();
          iframe.remove();
        });
      }
    }
    
    // ...rest of implementation...
  }
};
```

## Testing Plan

1. Create a test HTML page that demonstrates tool interruption
2. Test interrupting specific tools by ID
3. Test interrupting all tools at once
4. Verify proper cleanup of resources when tools are interrupted
5. Ensure UI state is correctly updated when tools are interrupted

## Implementation Schedule

1. Update ConverseStore with new interrupt methods
2. Update InterruptButton component to use the new methods
3. Update tool client implementations to handle abort signals
4. Test interrupt functionality with various tools
5. Update documentation to reflect the new interrupt mechanism