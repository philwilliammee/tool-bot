export interface HtmlToolInput {
  html: string;
  css?: string;
  javascript?: string;
  libraries?: string[];
  context?: string;
}

export interface HtmlToolResponse {
  error?: boolean;
  message?: string;
  renderedElement?: HTMLElement;
  logs?: string[];
}
