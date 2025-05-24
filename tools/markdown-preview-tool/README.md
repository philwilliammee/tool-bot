# Markdown Preview Tool

## Overview
The Markdown Preview Tool renders markdown content in the preview tab, providing a clean, readable view of converted web content. It automatically integrates with the fetch tool to display HTML-to-markdown conversions.

## Key Features
- **Automatic Integration**: Triggered automatically when fetch_url returns markdown content
- **GitHub-Style Rendering**: Clean, professional markdown styling similar to GitHub
- **Preview Tab Display**: Uses the existing iframe preview area for seamless integration
- **Auto-Navigation**: Automatically switches to the preview tab when content is rendered
- **Memory Efficient**: Lightweight rendering without heavy JavaScript frameworks

## Integration with Fetch Tool

When the `fetch_url` tool converts HTML to markdown (default behavior), the markdown preview tool is automatically invoked to display the content in the preview tab. This provides:

1. **Immediate Visualization**: See the fetched content in a readable format
2. **Content Analysis**: Easily read and analyze web articles, documentation, and research
3. **Memory Efficiency**: Clean markdown display without raw HTML overhead

## Usage

### Manual Usage
```json
{
  "markdown": "# Your markdown content here\n\nWith **formatting** and [links](https://example.com)",
  "title": "Custom Title",
  "autoShow": true
}
```

### Automatic Usage (via fetch_url)
```json
{
  "url": "https://example.com/article",
  "convertToMarkdown": true,
  "autoPreview": true
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `markdown` | string | *required* | Markdown content to render |
| `title` | string | "Markdown Preview" | Title shown in the preview header |
| `autoShow` | boolean | `true` | Automatically switch to preview tab |

## Styling Features

### GitHub-Inspired Design
- Clean typography with system fonts
- Proper heading hierarchy with underlines
- Syntax-highlighted code blocks
- Professional table styling
- Responsive design for mobile

### Visual Indicators
- **Clean Source Info**: Shows source domain and conversion timestamp
- **Minimal Metadata**: Essential information without verbose technical details
- **Professional Layout**: Max-width container with proper spacing

### Code and Content
- Inline code with subtle background highlighting
- Fenced code blocks with proper spacing
- Blockquotes with left border styling
- Properly formatted lists and tables

## Example Workflow

1. **Research Request**: "Look up the latest React documentation"
2. **AI uses fetch_url**: `{"url": "https://react.dev/learn", "convertToMarkdown": true}`
3. **HTML Conversion**: Raw HTML automatically converted to clean markdown
4. **Auto-Preview**: Markdown immediately displayed in preview tab
5. **Easy Reading**: Clean, formatted documentation ready for analysis

## Technical Implementation

### Client-Side Processing
- Uses the `marked` library for markdown-to-HTML conversion
- Renders in the existing `#html-tool-frame` iframe
- Automatically manages tab switching

### Styling Approach
- Self-contained CSS within the generated HTML
- GitHub-style markdown rendering
- Responsive design with mobile optimization
- Professional color scheme and typography

### Integration Points
- Registered in client tool registry
- Automatically triggered by fetch tool
- Uses existing preview tab infrastructure

## Benefits

### For Users
- **Better Readability**: Clean formatting vs. raw HTML
- **Faster Analysis**: Immediate preview of fetched content
- **Memory Efficiency**: Lighter than full HTML rendering
- **Professional Appearance**: GitHub-style markdown display

### For AI Research
- **Content Focus**: Emphasis on actual content vs. markup
- **Easy Analysis**: Structured, readable format for AI processing
- **Quick Reference**: Visual preview for fact-checking and research
- **Seamless Integration**: Works automatically with web fetching

This tool transforms web research from raw HTML viewing to professional document analysis, making it much easier to consume and analyze fetched web content.
