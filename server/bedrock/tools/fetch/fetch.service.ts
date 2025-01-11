import { FETCH_CONFIG, FetchToolInput, FetchToolResponse } from "./fetch.types";

export class FetchToolService {
  constructor() {}

  async execute(input: FetchToolInput): Promise<FetchToolResponse> {
    try {
      // Validate URL
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

        // Handle response status
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Check content length
        const contentLength = response.headers.get("content-length");
        if (
          contentLength &&
          parseInt(contentLength) > FETCH_CONFIG.MAX_CONTENT_SIZE
        ) {
          throw new Error(
            `Response too large (max: ${FETCH_CONFIG.MAX_CONTENT_SIZE} bytes)`
          );
        }

        // Check content type
        const contentType = response.headers.get("content-type") || "";
        if (!this.isContentTypeAllowed(contentType)) {
          throw new Error(`Unsupported content type: ${contentType}`);
        }

        // Convert headers to plain object
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

  private isUrlAllowed(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return FETCH_CONFIG.ALLOWED_DOMAINS.some((domain) =>
        urlObj.hostname.endsWith(domain)
      );
    } catch {
      return false;
    }
  }

  private isContentTypeAllowed(contentType: string): boolean {
    return FETCH_CONFIG.ALLOWED_CONTENT_TYPES.some((allowed) =>
      contentType.toLowerCase().includes(allowed.toLowerCase())
    );
  }

  private async processResponse(
    response: Response,
    contentType: string
  ): Promise<string | Record<string, unknown>> {
    if (contentType.includes("json")) {
      const jsonData = await response.json();
      return jsonData;
    }

    const textData = await response.text();

    // Try to parse as JSON if it looks like JSON
    if (textData.trim().startsWith("{") || textData.trim().startsWith("[")) {
      try {
        return JSON.parse(textData);
      } catch {
        return textData;
      }
    }

    return textData;
  }
}
