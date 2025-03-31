/**
 * Logger utility that provides controlled logging with different severity levels
 * This replaces direct console.log calls with a more structured approach
 * that can be configured for different environments.
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

/**
 * Logger class with static methods for different log levels
 * Usage:
 * ```
 * import { Logger } from './utils/Logger';
 *
 * Logger.info('Loading data');
 * Logger.debug('Detailed debug info', someObject);
 * ```
 */
export class Logger {
  // Default to INFO in production, DEBUG in development
  private static level: LogLevel = process.env.NODE_ENV === 'production'
    ? LogLevel.INFO
    : LogLevel.DEBUG;

  /**
   * Set the global logging level
   * @param level The maximum level to display
   */
  static setLevel(level: LogLevel): void {
    Logger.level = level;
  }

  /**
   * Log an error message (always displayed)
   */
  static error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  /**
   * Log a warning message
   */
  static warn(message: string, ...args: any[]): void {
    if (Logger.level >= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Log an informational message
   */
  static info(message: string, ...args: any[]): void {
    if (Logger.level >= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log a debug message (only in debug mode)
   */
  static debug(message: string, ...args: any[]): void {
    if (Logger.level >= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log a message with a specific tag (for component-specific logging)
   */
  static tagged(tag: string, message: string, ...args: any[]): void {
    if (Logger.level >= LogLevel.INFO) {
      console.log(`[${tag}] ${message}`, ...args);
    }
  }
}
