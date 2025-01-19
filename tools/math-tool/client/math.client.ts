import { ClientTool } from "../../client/tool.interface";
import * as math from "mathjs";

interface MathInput {
  expression: string;
}

interface MathResponse {
  result: number | string;
  expression: string;
}

export const mathTool: ClientTool = {
  name: "math",
  execute: async (input: MathInput): Promise<MathResponse> => {
    try {
      const result = math.evaluate(input.expression);
      return {
        result,
        expression: input.expression,
      };
    } catch (error: any) {
      throw new Error(`Math evaluation error: ${error.message}`);
    }
  },
};
