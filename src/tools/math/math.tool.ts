import { ClientTool } from "../tools";
import * as math from "mathjs";

export const mathTool: ClientTool = {
  name: "math",
  execute: async (input: { expression: string }) => {
    const result = math.evaluate(input.expression);
    return { result, expression: input.expression };
  },
};
