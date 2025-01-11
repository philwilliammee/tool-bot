// server/tools/fetch.tool.ts
export interface FetchToolInput {
  url: string;
  method?: "GET";
}

export interface FetchToolResponse {
  status: number;
  headers: Record<string, string>;
  data: string | Record<string, unknown>;
  error?: boolean;
  message?: string;
  contentType?: string;
}

// Basic URL allowlist - could be moved to configuration
const ALLOWED_DOMAINS = [
  "github.com",
  "raw.githubusercontent.com",
  "api.github.com",
  // Add more trusted domains
];

const CONFIG = {
  MAX_CONTENT_SIZE: 1024 * 1024, // 1MB
  TIMEOUT: 5000, // 5 seconds
  MAX_REDIRECT_COUNT: 3,
  ALLOWED_CONTENT_TYPES: [
    "application/json",
    "application/vnd.api+json", // Added this content type
    "text/plain",
    "text/html",
    "text/markdown",
    "text/css",
    "application/javascript",
    "text/javascript",
  ],
};

function isUrlAllowed(url: string): boolean {
  return true;
  try {
    const urlObj = new URL(url);
    return ALLOWED_DOMAINS.some((domain) => urlObj.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

function isContentTypeAllowed(contentType: string): boolean {
  return CONFIG.ALLOWED_CONTENT_TYPES.some((allowed) =>
    contentType.toLowerCase().includes(allowed.toLowerCase())
  );
}

async function processResponse(
  response: Response,
  contentType: string
): Promise<string | Record<string, unknown>> {
  if (contentType.includes("json")) {
    // Changed to check for any JSON content type
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

export async function fetchTool({
  url,
  method = "GET",
}: FetchToolInput): Promise<FetchToolResponse> {
  try {
    // Validate URL
    if (!url.startsWith("https://")) {
      throw new Error("Only HTTPS URLs are allowed");
    }

    if (!isUrlAllowed(url)) {
      throw new Error("Domain not in allowlist");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, CONFIG.TIMEOUT);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "User-Agent": "DesignAssistantBot/1.0",
          Accept: CONFIG.ALLOWED_CONTENT_TYPES.join(", "),
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
      if (contentLength && parseInt(contentLength) > CONFIG.MAX_CONTENT_SIZE) {
        throw new Error(
          `Response too large (max: ${CONFIG.MAX_CONTENT_SIZE} bytes)`
        );
      }

      // Check content type
      const contentType = response.headers.get("content-type") || "";
      if (!isContentTypeAllowed(contentType)) {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      // Convert headers to plain object
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const data = await processResponse(response, contentType);

      console.log("Fetch tool response:", {
        status: response.status,
        data,
      });

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
      url,
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
