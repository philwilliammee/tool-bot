export interface OctokitInput {
  /**
   * The GitHub API operation to perform
   * Example: "GET /repos/{owner}/{repo}"
   */
  operation: string;

  /**
   * Parameters for the operation
   * Example: { owner: "octokit", repo: "octokit.js" }
   */
  parameters?: Record<string, any>;
}

export interface OctokitResponse {
  /**
   * The data returned from the GitHub API
   */
  data: any;

  /**
   * Optional error information
   */
  error?: boolean;
  message?: string;

  /**
   * Response status code
   */
  status?: number;

  /**
   * Response headers
   */
  headers?: Record<string, string>;
}