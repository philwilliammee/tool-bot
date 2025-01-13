// src/tools/htmlTool/htmlTool.types.ts
export interface HtmlToolInput {
  html: string;
  context?: string;
}

export interface HtmlToolResponse {
  html: string;
  error?: boolean;
  message?: string;
  renderedElement?: HTMLElement;
}
