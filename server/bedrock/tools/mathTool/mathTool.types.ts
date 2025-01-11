export interface MathInput {
  expression: string;
}

export interface MathResponse {
  result: number | string; // string for unit conversions
  error?: boolean;
  message?: string;
}
