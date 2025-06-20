import { LogLevel, LogContext } from '../types/index.js';
export declare class Logger {
    private logLevel;
    private context;
    constructor(logLevel?: LogLevel, baseContext?: LogContext);
    child(additionalContext: LogContext): Logger;
    setLevel(level: LogLevel): void;
    private shouldLog;
    private formatLog;
    debug(message: string, data?: unknown, context?: LogContext): void;
    info(message: string, data?: unknown, context?: LogContext): void;
    warn(message: string, data?: unknown, context?: LogContext): void;
    error(message: string, data?: unknown, context?: LogContext): void;
    logError(error: Error, message?: string, context?: LogContext): void;
}
export declare function createLogger(logLevel?: LogLevel, context?: LogContext): Logger;
export declare const logger: Logger;
