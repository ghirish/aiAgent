#!/usr/bin/env node

/**
 * Calendar Copilot MCP Server - Main Entry Point
 * 
 * This MCP server provides calendar management capabilities including:
 * - Google Calendar integration
 * - Azure AI-powered natural language processing
 * - Smart scheduling and availability checking
 * - Event management (CRUD operations)
 */

import { getConfig } from './utils/config.js';
import { createLogger } from './utils/logger.js';
import { CalendarCopilotServer } from './mcp/server.js';
import { CalendarCopilotError } from './types/index.js';

async function main(): Promise<void> {
  let logger = createLogger();
  
  try {
    // Load and validate configuration
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

    // Initialize MCP server
    const server = new CalendarCopilotServer(config, logger);
    
    // Start the server
    await server.start();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });

  } catch (error) {
    if (error instanceof CalendarCopilotError) {
      logger.error('Calendar Copilot error occurred', {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
      });
    } else if (error instanceof Error) {
      logger.logError(error, 'Unexpected error occurred during startup');
    } else {
      logger.error('Unknown error occurred', { error });
    }
    
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
main().catch((error) => {
  console.error('Failed to start Calendar Copilot:', error);
  process.exit(1);
}); 