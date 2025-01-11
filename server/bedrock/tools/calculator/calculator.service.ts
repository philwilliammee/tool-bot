// server/tools/calculator/calculator.service.ts
import { CalculatorInput, CalculatorResponse } from "./calculator.types";
import * as math from "mathjs";

export class CalculatorService {
  async execute(input: CalculatorInput): Promise<CalculatorResponse> {
    try {
      switch (input.operation) {
        case "add":
          return this.validateAndExecute(input, (values) =>
            values.reduce((sum, num) => sum + num, 0)
          );

        case "subtract":
          return this.validateAndExecute(input, (values) =>
            values.reduce((diff, num, i) => (i === 0 ? num : diff - num))
          );

        case "multiply":
          return this.validateAndExecute(input, (values) =>
            values.reduce((product, num) => product * num, 1)
          );

        case "divide":
          return this.validateAndExecute(input, (values) => {
            if (values.includes(0)) {
              throw new Error("Division by zero");
            }
            return values.reduce((quotient, num, i) =>
              i === 0 ? num : quotient / num
            );
          });

        case "evaluate":
          if (!input.expression) {
            throw new Error("Expression is required for evaluate operation");
          }
          return {
            result: math.evaluate(input.expression),
            error: false,
          };

        default:
          throw new Error(`Unsupported operation: ${input.operation}`);
      }
    } catch (error: any) {
      return {
        result: 0,
        error: true,
        message: error.message || "Calculation failed",
      };
    }
  }

  private validateAndExecute(
    input: CalculatorInput,
    operation: (values: number[]) => number
  ): CalculatorResponse {
    if (!input.values || input.values.length === 0) {
      throw new Error("Values array is required and must not be empty");
    }
    return {
      result: operation(input.values),
      error: false,
    };
  }
}
