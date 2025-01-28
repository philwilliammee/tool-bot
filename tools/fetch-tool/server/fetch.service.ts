import { ServerTool } from "../../server/tool.interface.js";
import { Request, Response } from "express";
import { FETCH_CONFIG, FetchToolInput, FetchToolResponse } from "./fetch.types.js";

class FetchService {
  private isUrlAllowed(url: string): boolean {
    return true; // allow all domains
    // Commented out domain restriction as per original code
    // try {
    //   const urlObj = new URL(url);
    //   return FETCH_CONFIG.ALLOWED_DOMAINS.some((domain) =>
    //     urlObj.hostname.endsWith(domain)
    //   );
    // } catch {
    //   return false;
    // }
  }

  private isContentTypeAllowed(contentType: string): boolean {
    return true; // allow all content types
    // Commented out content type restriction as per original code
    // return FETCH_CONFIG.ALLOWED_CONTENT_TYPES.some((allowed) =>
    //   contentType.toLowerCase().includes(allowed.toLowerCase())
    // );
  }

  private async processResponse(
    response: globalThis.Response,
    contentType: string
  ): Promise<string | Record<string, unknown>> {
    if (contentType.includes("json")) {
      const jsonData = await response.json();
      return jsonData;
    }

    const textData = await response.text();

    if (textData.trim().startsWith("{") || textData.trim().startsWith("[")) {
      try {
        return JSON.parse(textData);
      } catch {
        return textData;
      }
    }

    return textData;
  }

  async execute(input: FetchToolInput): Promise<FetchToolResponse> {
    try {
      if (!input.url.startsWith("https://")) {
        throw new Error("Only HTTPS URLs are allowed");
      }

      if (!this.isUrlAllowed(input.url)) {
        throw new Error("Domain not in allowlist");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, FETCH_CONFIG.TIMEOUT);

      try {
        const response = await fetch(input.url, {
          method: input.method || "GET",
          headers: {
            "User-Agent": "ToolBot/1.0",
            Accept: FETCH_CONFIG.ALLOWED_CONTENT_TYPES.join(", "),
          },
          signal: controller.signal,
          redirect: "follow",
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentLength = response.headers.get("content-length");
        if (
          contentLength &&
          parseInt(contentLength) > FETCH_CONFIG.MAX_CONTENT_SIZE
        ) {
          throw new Error(
            `Response too large (max: ${FETCH_CONFIG.MAX_CONTENT_SIZE} bytes)`
          );
        }

        const contentType = response.headers.get("content-type") || "";
        if (!this.isContentTypeAllowed(contentType)) {
          throw new Error(`Unsupported content type: ${contentType}`);
        }

        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        const data = await this.processResponse(response, contentType);

        return {
          status: response.status,
          headers,
          data,
          contentType,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      console.error("Fetch tool error:", {
        url: input.url,
        error: error.message,
        stack: error.stack,
      });

      return {
        status: error.status || 500,
        headers: {},
        data: "",
        error: true,
        message: error.message || "Fetch failed",
        contentType: undefined,
      };
    }
  }
}

const fetchService = new FetchService();

export const fetchTool: ServerTool = {
  name: "fetch_url",
  route: "/fetch-url",
  handler: async (req: Request, res: Response): Promise<void> => {
    try {
      const input: FetchToolInput = req.body;

      if (!input.url) {
        res.status(400).json({
          error: true,
          message: "URL is required",
        });
        return;
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
  },
};
