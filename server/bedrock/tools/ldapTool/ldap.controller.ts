// src/server/bedrock/tools/ldapTool/ldap.controller.ts
import { Router } from "express";
import { LDAP } from "./LDAP";
import { ldapConfig } from "./ldap.config";

const router = Router();
const ldap = new LDAP(ldapConfig);

router.post("/", async (req, res): Promise<any> => {
  try {
    const { searchTerm } = req.body;

    if (!searchTerm || typeof searchTerm !== "string") {
      return res.status(400).json({
        error: true,
        message: "Search term is required",
      });
    }

    const results = await ldap.searchUser(searchTerm);
    res.json({
      status: "success",
      data: results,
    });
  } catch (error: any) {
    console.error("LDAP search error:", error);
    res.status(500).json({
      error: true,
      message: error.message || "Failed to search LDAP",
    });
  }
});

export { router as ldapToolRouter };
