import { ClientTool } from "../tools";
import * as math from "mathjs";

export const mathTool: ClientTool = {
  name: "math",
  execute: async (input: { expression: string }) => {
    const result = math.evaluate(input.expression);
    return { result, expression: input.expression };
  },
  systemPrompt: `You can perform mathematical calculations using the math tool(that under the hood uses mathjs.evaluate(YOU_EXPRESSION)). Always use direct mathematical expressions, never natural language.

IMPORTANT:
- Do NOT use equals signs (=)
- Do NOT use words like "solve", "simplify", or "evaluate"
- Do NOT write equations to solve
- ALWAYS write the actual calculation you want to perform

INCORRECT (Don't use these):
❌ "solve(x + 3 = 8)"
❌ "simplify('x^2 + x^2')"
❌ "15% of 80"
❌ "evaluate 2 plus 3"

CORRECT (Use these):
✓ "2 + 3"                  // 5
✓ "(15/100) * 80"         // 12 (for 15% of 80)
✓ "sqrt(16)"              // 4
✓ "sin(45 * pi / 180)"    // 0.7071

Common Calculations:
Numbers and Arithmetic:
- "2 + 3 * 4"             // 14
- "12 / (2.3 + 0.7)"     // 4
- "2^3"                   // 8 (power)
- "sqrt(16)"             // 4 (square root)

Percentages:
- "(15/100) * 80"        // 12 (15% of 80)
- "80 * 1.15"            // 92 (increase by 15%)
- "120 * 0.85"          // 102 (decrease by 15%)

Trigonometry:
- "sin(45 * pi / 180)"   // 0.7071
- "cos(60 * pi / 180)"   // 0.5

Statistics:
- "mean([1,2,3,4])"      // 2.5
- "std([2,4,6])"         // 2

Unit Conversions:
- "12.7 * 2.54"          // converting 12.7 inches to cm
- "100 / 1.60934"        // converting 100 km to miles

Remember: Always write the actual mathematical expression you want to evaluate.`,
};
