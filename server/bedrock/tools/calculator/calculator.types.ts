export interface CalculatorInput {
  operation: "add" | "subtract" | "multiply" | "divide" | "evaluate";
  expression?: string; // For evaluate operation
  values?: number[]; // For basic operations
}

export interface CalculatorResponse {
  result: number;
  error?: boolean;
  message?: string;
}
