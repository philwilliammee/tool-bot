# Fetch Tool

## Overview
The Fetch Tool retrieves content from any public website or API and converts HTML to clean markdown for better memory efficiency and readability.

## Key Features
- **Universal Research**: Access any public HTTPS website or API
- **HTML-to-Markdown Conversion**: Automatically converts HTML content to clean, readable markdown
- **Automatic Preview**: Markdown content is instantly displayed in the preview tab for easy reading
- **Memory Efficient**: Significantly reduces memory usage compared to raw HTML
- **Content Focused**: Removes scripts, styles, navigation, and other non-content elements
- **Research Optimized**: Perfect for gathering current information and fact-checking

## Use Cases

### Research & Information Gathering
- Current events and news with instant preview
- Documentation and tutorials displayed in readable format
- Market analysis and competitor research with clean content view
- Fact verification with immediate visual confirmation
- Technical documentation lookup with professional formatting

### API Integration
- Weather data: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}`
- Web search: `https://duckduckgo.com/?q={search_terms}&kp=-1&kl=us-en`
- Public APIs and data sources

## Configuration Options

```typescript
interface FetchToolInput {
  url: string;                    // HTTPS URL to fetch
  method?: "GET";                 // HTTP method (GET only)
  convertToMarkdown?: boolean;    // Convert HTML to markdown (default: true)
  autoPreview?: boolean;          // Auto-show in preview tab (default: true)
}
```

## Example Usage

### Research with Auto-Preview
```json
{
  "url": "https://example.com/article",
  "convertToMarkdown": true,
  "autoPreview": true
}
```
*Result: Content is fetched, converted to markdown, and automatically displayed in the preview tab*

### API Data Fetch (No Preview)
```json
{
  "url": "https://api.github.com/repos/owner/repo",
  "convertToMarkdown": false,
  "autoPreview": false
}
```

## Preview Integration

When `convertToMarkdown` is enabled (default), the tool automatically:

1. **Converts HTML to Markdown**: Clean, readable text format
2. **Triggers Preview Tool**: Automatically calls `markdown_preview` tool
3. **Switches to Preview Tab**: Shows content immediately for analysis
4. **Provides Visual Context**: Includes source URL and conversion info

### Preview Features
- **GitHub-Style Rendering**: Professional markdown display
- **Clean Source Info**: Shows domain and timestamp, not verbose headers
- **Auto-Navigation**: Switches to preview tab automatically
- **Minimal Metadata**: Essential information without technical clutter

## HTML-to-Markdown Features

### Content Optimization
- Removes `<script>`, `<style>`, and `<noscript>` tags
- Strips navigation elements and menus
- Cleans excessive whitespace
- Preserves article content and structure

### Markdown Formatting
- ATX-style headings (`# ## ###`)
- Fenced code blocks with syntax highlighting
- Inline links and emphasis
- Clean table formatting

## Response Format

```typescript
interface FetchToolResponse {
  status: number;                           // HTTP status code
  headers: Record<string, string>;          // Response headers
  data: string | Record<string, unknown>;   // Content (markdown or JSON)
  contentType?: string;                     // Original content type
  isMarkdown?: boolean;                     // Whether content was converted
  error?: boolean;                          // Error flag
  message?: string;                         // Error message
}
```

## Memory Benefits

### Before (Raw HTML)
- Full HTML document with all tags
- CSS styles and JavaScript code
- Navigation and footer content
- Typical size: 50-200KB per page

### After (Markdown)
- Clean, structured content only
- No styling or scripts
- Focused on readable text
- Typical size: 5-20KB per page
- **~80-90% size reduction**

## Error Handling
- Network timeouts (5 seconds)
- Content size limits (1MB)
- Invalid URLs
- HTTPS-only enforcement
- Graceful fallback to original content if conversion fails

## Integration
The tool is automatically registered in the client and server registries and available to AI models for research and information gathering tasks.
