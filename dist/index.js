#!/usr/bin/env node
import { getConfig } from './utils/config.js';
import { createLogger } from './utils/logger.js';
import { CalendarCopilotServer } from './mcp/server.js';
import { CalendarCopilotError } from './types/index.js';
async function main() {
    let logger = createLogger();
    try {
        logger.info('Starting Calendar Copilot MCP Server...');
        const config = getConfig();
        logger = createLogger(config.app.logLevel, {
            service: 'calendar-copilot',
            version: config.mcp.serverVersion
        });
        logger.info('Configuration loaded successfully', {
            nodeEnv: config.app.nodeEnv,
            serverName: config.mcp.serverName,
            serverVersion: config.mcp.serverVersion,
        });
        const server = new CalendarCopilotServer(config, logger);
        await server.start();
        process.on('SIGINT', () => {
            logger.info('Received SIGINT, shutting down gracefully...');
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            logger.info('Received SIGTERM, shutting down gracefully...');
            process.exit(0);
        });
    }
    catch (error) {
        if (error instanceof CalendarCopilotError) {
            logger.error('Calendar Copilot error occurred', {
                code: error.code,
                message: error.message,
                statusCode: error.statusCode,
                details: error.details,
            });
        }
        else if (error instanceof Error) {
            logger.logError(error, 'Unexpected error occurred during startup');
        }
        else {
            logger.error('Unknown error occurred', { error });
        }
        process.exit(1);
    }
}
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
main().catch((error) => {
    console.error('Failed to start Calendar Copilot:', error);
    process.exit(1);
});
