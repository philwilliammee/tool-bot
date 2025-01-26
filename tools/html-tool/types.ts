export interface HtmlToolInput {
  html: string;
  context?: string;
}

export interface HtmlToolResponse {
  error?: boolean;
  message?: string;
  renderedElement?: HTMLElement;
}
