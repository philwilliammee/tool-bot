export interface FetchToolInput {
  url: string;
  method?: "GET";
  convertToMarkdown?: boolean;
  autoPreview?: boolean;
}

export interface FetchToolResponse {
  status: number;
  headers: Record<string, string>;
  data: string | Record<string, unknown>;
  error?: boolean;
  message?: string;
  contentType?: string;
  isMarkdown?: boolean;
}

export const FETCH_CONFIG = {
  MAX_CONTENT_SIZE: 1024 * 1024,
  TIMEOUT: 5000,
  MAX_REDIRECT_COUNT: 3,
  ALLOWED_CONTENT_TYPES: [
    "application/json",
    "text/plain",
    "text/html",
    "text/markdown",
  ],
  ALLOWED_DOMAINS: [
    "github.com",
    "raw.githubusercontent.com",
    "api.github.com",
  ],
};
