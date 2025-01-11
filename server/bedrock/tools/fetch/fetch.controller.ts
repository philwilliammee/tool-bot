// server/tools/fetch/fetch.controller.ts
import { Router, Request, Response } from "express";
import { FetchToolService } from "./fetch.service";
import { FetchToolInput } from "./fetch.types";

const router = Router();
const fetchService = new FetchToolService();

router.post("/", async (req: any, res: any) => {
  try {
    const input: FetchToolInput = req.body;

    if (!input.url) {
      return res.status(400).json({
        error: true,
        message: "URL is required",
      });
    }

    const result = await fetchService.execute(input);
    res.json(result);
  } catch (error: any) {
    console.error("Fetch tool error:", error);
    res.status(error.status || 500).json({
      error: true,
      message: error.message || "Internal Server Error",
    });
  }
});

export { router as fetchToolRouter };
