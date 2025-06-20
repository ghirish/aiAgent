export class Logger {
    logLevel;
    context;
    constructor(logLevel = 'info', baseContext = {}) {
        this.logLevel = logLevel;
        this.context = baseContext;
    }
    child(additionalContext) {
        return new Logger(this.logLevel, { ...this.context, ...additionalContext });
    }
    setLevel(level) {
        this.logLevel = level;
    }
    shouldLog(level) {
        const levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
        };
        return levels[level] >= levels[this.logLevel];
    }
    formatLog(level, message, data, context) {
        const timestamp = new Date().toISOString();
        const logEntry = {
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
    debug(message, data, context) {
        if (this.shouldLog('debug')) {
            console.log(this.formatLog('debug', message, data, context));
        }
    }
    info(message, data, context) {
        if (this.shouldLog('info')) {
            console.log(this.formatLog('info', message, data, context));
        }
    }
    warn(message, data, context) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatLog('warn', message, data, context));
        }
    }
    error(message, data, context) {
        if (this.shouldLog('error')) {
            console.error(this.formatLog('error', message, data, context));
        }
    }
    logError(error, message, context) {
        this.error(message || 'An error occurred', {
            name: error.name,
            message: error.message,
            stack: error.stack,
        }, context);
    }
}
export function createLogger(logLevel = 'info', context = {}) {
    return new Logger(logLevel, context);
}
export const logger = createLogger();
