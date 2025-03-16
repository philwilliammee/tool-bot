# Interrupt Feature

## Overview

The Interrupt feature provides users with the ability to cancel ongoing operations:
- Long-running tool executions (like HTML rendering, file operations)
- AI text generation in progress

This creates a consistent interruption mechanism across the application.

## Implementation

### AppStore Integration

The AppStore tracks interruption state:
```typescript
// Core signals
const isToolRunning = signal(false);
const currentToolId = signal<string | null>(null);
const isGenerating = signal(false);

// Computed values
const isInterruptible = computed(() => isGenerating.value || isToolRunning.value);
const interruptType = computed((): "tool" | "generation" | "none" => {
  if (isToolRunning.value) return "tool";
  if (isGenerating.value) return "generation";
  return "none";
});
```

### Interruption Handlers

**Tool Interruption**
```typescript
// In ToolHandler
public interruptCurrentTool(): boolean {
  const currentExecution = this.currentToolExecution.value;
  if (currentExecution) {
    currentExecution.controller.abort();
    this.currentToolExecution.value = null;
    store.setToolRunning(false);
    return true;
  }
  return false;
}
```

**Text Generation Interruption**
```typescript
// In LLMHandler
public interruptStream(): boolean {
  const controller = this.currentStreamController.value;
  if (controller) {
    controller.abort();
    this.currentStreamController.value = null;
    return true;
  }
  return false;
}
```

### InterruptButton Component

The button manages its state based on the AppStore:
```typescript
// In InterruptButton
private setupEffects(): void {
  // Create an effect that updates button state based on interruptible status
  const dispose = effect(() => {
    const isInterruptible = store.isInterruptible.value;
    
    // Enable/disable button based on whether anything can be interrupted
    this.button.disabled = !isInterruptible;
  });
  
  this.cleanupFns.push(dispose);
}
```

When clicked, it attempts to interrupt tools first, then text generation:
```typescript
private handleInterrupt(): void {
  try {
    // First, try to interrupt any running tool
    const toolHandler = converseStore["toolHandler"];
    if (toolHandler && store.isToolRunning.value) {
      const toolInterrupted = toolHandler.interruptCurrentTool();
      if (toolInterrupted) {
        store.showToast("Tool execution interrupted");
        return;
      }
    }
    
    // If no tool was running, try to interrupt text generation
    const llmHandler = converseStore["llmHandler"];
    if (llmHandler && store.isGenerating.value) {
      const interrupted = llmHandler.interruptStream();
      if (interrupted) {
        store.showToast("Text generation interrupted");
      }
    }
  } catch (error) {
    console.error("Error during interrupt operation:", error);
    store.showToast("Error interrupting operation");
  }
}
```

## Message Formats

### Interrupted Tool Message

```typescript
{
  role: "user",
  content: [
    {
      toolResult: {
        toolUseId: "[tool-id]",
        content: [{ 
          text: "Tool execution was interrupted by user" 
        }],
        status: ToolResultStatus.ERROR,
      },
    },
  ],
}
```

### Interrupted Text Generation

```typescript
{
  id: `interrupted_${Date.now()}`,
  role: "assistant",
  content: [...partialContent],
  metadata: {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    interrupted: true,
  },
}
```

## Visual Feedback

The button provides visual cues about interruptibility:

```css
/* Disabled state (nothing to interrupt) */
.interrupt-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Enabled state (can interrupt) */
.interrupt-btn:not(:disabled) {
  opacity: 1;
  cursor: pointer;
  animation: attention 2s infinite;
}

/* Animation for active interrupt button */
@keyframes attention {
  0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(220, 53, 69, 0); }
  100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
}
```