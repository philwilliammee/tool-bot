// server/tools/calculator/calculator.controller.ts
import { Router } from "express";
import { CalculatorService } from "./calculator.service";
import { CalculatorInput } from "./calculator.types";

const router = Router();
const calculatorService = new CalculatorService();

router.post("/", async (req: any, res: any) => {
  try {
    const input: CalculatorInput = req.body;

    if (!input.operation) {
      return res.status(400).json({
        error: true,
        message: "Operation is required",
      });
    }

    const result = await calculatorService.execute(input);
    res.json(result);
  } catch (error: any) {
    console.error("Calculator tool error:", error);
    res.status(500).json({
      error: true,
      message: error.message || "Internal Server Error",
    });
  }
});

export { router as calculatorToolRouter };
