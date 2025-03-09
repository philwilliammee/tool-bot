# Source Directory Architecture

## Overview
The source directory contains a "frameworkless" TypeScript application that intentionally avoids framework dependencies in favor of native browser capabilities. The application uses a class-based component system with signal-based state management.

## Key Architectural Patterns

### 1. HTML-First Approach
All components are pre-defined in the index.html file:
- No dynamic element creation (except for messages and content)
- Components enhance existing DOM elements
- Heavy use of HTML templates for dynamic content
- Clean separation of structure and behavior

Example:
```html
<div id="chat" class="chat-container">
  <div class="chat-messages"></div>
  <div class="prompt-container">
    <!-- Input elements -->
  </div>
</div>
```

### 2. Class-Based Components
Components are implemented as TypeScript classes:
- Clear lifecycle management (init/destroy)
- Private state encapsulation
- Type-safe DOM references
- Clean event handling

Example:
```typescript
export class ButtonSpinner {
  private generateButton: HTMLButtonElement;
  private originalContent: string;

  constructor() {
    this.generateButton = document.querySelector(".generate-btn");
    this.originalContent = this.generateButton.innerHTML;
  }

  public destroy(): void {
    this.hide();
  }
}
```

### 3. Signal-Based State Management
Uses @preact/signals-core for reactive state:
- No framework dependency
- Clean reactivity system
- Computed values
- Effect system for side effects

Example:
```typescript
// Store
const messages = signal<Message[]>([]);
const isGenerating = signal(false);

// Component
effect(() => {
  const messages = converseStore.getMessagesSignal().value;
  this.render();
});
```

### 4. CSS Architecture
Modular CSS system:
```css
/* index.css */
@import 'variables.css';
@import 'reset.css';
@import 'layout.css';
@import 'components/*.css';
```

- Component-specific styles
- Utility classes
- CSS variables for theming
- Clean cascade and specificity

## Core Components

### MainApplication
- Application entry point
- Component lifecycle management
- Layout state management
- Event coordination

### Conversation
- Chat interface management
- Message rendering
- Input handling
- Scroll management

### WorkArea
- Message history display
- Content editing
- Modal management
- Filtering and search

### ProjectManager
- Project configuration
- Settings management
- Tool enablement
- Project metadata

## State Management

### Three Main Stores:
1. **AppStore**
   - UI state
   - Layout management
   - Error handling
   - Toast notifications
   - Tab management & auto-switching

2. **ConverseStore**
   - Message management
   - Chat state
   - Tool execution
   - HTML content detection

3. **ProjectStore**
   - Project settings
   - Tool configuration
   - Model settings

## Best Practices

### 1. Component Implementation
- Query elements once in constructor
- Store element references
- Clean up all event listeners
- Implement destroy method

### 2. Event Handling
```typescript
private cleanupFns: Array<() => void> = [];

private setupEvents(): void {
  const handler = this.handleClick.bind(this);
  element.addEventListener("click", handler);
  this.cleanupFns.push(() =>
    element.removeEventListener("click", handler)
  );
}
```

### 3. State Updates
- Use signals for reactive state
- Batch related updates
- Use computed values for derivations
- Clean up effects

### 4. Performance
- Template cloning for dynamic content
- Debounced renders where needed
- Efficient DOM updates
- Proper cleanup

## Development Guidelines

1. **Start with HTML**
   - Add component structure to index.html
   - Use semantic markup
   - Include required data attributes
   - Add template if needed

2. **Implement Component**
   - Create TypeScript class
   - Query and store DOM references
   - Set up event handlers
   - Implement lifecycle methods

3. **Add Styles**
   - Use existing utility classes
   - Add component-specific styles
   - Follow naming conventions
   - Use CSS variables

4. **State Management**
   - Identify state ownership
   - Create appropriate signals
   - Set up computed values
   - Implement effects

## Getting Started

1. Review index.html for component structure
2. Understand the signal-based state system
3. Follow existing component patterns
4. Use TypeScript for type safety
5. Implement proper cleanup
6. Test thoroughly

## Future Improvements

1. CSS Architecture
   - Move towards utility-first approach
   - Simplify component styles
   - Better use of CSS variables
   - Reduce specificity

2. Component System
   - More consistent lifecycle handling
   - Better event delegation
   - Enhanced type safety
   - Improved error handling

3. State Management
   - More granular signals
   - Better effect cleanup
   - Enhanced computed value usage
   - Improved state persistence
