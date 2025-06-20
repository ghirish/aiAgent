import { LogLevel, LogContext } from '../types/index.js';

/**
 * Structured logger with contextual information
 */
export class Logger {
  private logLevel: LogLevel;
  private context: LogContext;

  constructor(logLevel: LogLevel = 'info', baseContext: LogContext = {}) {
    this.logLevel = logLevel;
    this.context = baseContext;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger(this.logLevel, { ...this.context, ...additionalContext });
  }

  /**
   * Set the log level
   */
  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Format log entry
   */
  private formatLog(level: LogLevel, message: string, data?: unknown, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logEntry: Record<string, unknown> = {
      timestamp,
      level,
      message,
      context: { ...this.context, ...context },
    };

    if (data) {
      logEntry.data = data;
    }

    return JSON.stringify(logEntry);
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: unknown, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatLog('debug', message, data, context));
    }
  }

  /**
   * Log info message
   */
  info(message: string, data?: unknown, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatLog('info', message, data, context));
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: unknown, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message, data, context));
    }
  }

  /**
   * Log error message
   */
  error(message: string, data?: unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatLog('error', message, data, context));
    }
  }

  /**
   * Log error object with stack trace
   */
  logError(error: Error, message?: string, context?: LogContext): void {
    this.error(message || 'An error occurred', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }, context);
  }
}

/**
 * Create a default logger instance
 */
export function createLogger(logLevel: LogLevel = 'info', context: LogContext = {}): Logger {
  return new Logger(logLevel, context);
}

/**
 * Default logger instance
 */
export const logger = createLogger(); 