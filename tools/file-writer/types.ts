// tools/file-writer/types.ts

export interface FileWriterInput {
  /**
   * The path to the file to write to
   * Must be relative to the project root
   */
  path: string;

  /**
   * The content to write to the file
   * This will completely replace any existing content
   */
  content: string;
}

export interface FileWriterResponse {
  /**
   * Whether the operation was successful
   */
  success: boolean;

  /**
   * The path of the file that was written to
   */
  path?: string;

  /**
   * Error message if the operation failed
   */
  error?: string;

  /**
   * Number of bytes written
   */
  bytesWritten?: number;
}
