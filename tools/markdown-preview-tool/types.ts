export interface MarkdownPreviewInput {
  markdown: string;
  title?: string;
  autoShow?: boolean;
}

export interface MarkdownPreviewResponse {
  success: boolean;
  message?: string;
  error?: boolean;
  title?: string;
}
