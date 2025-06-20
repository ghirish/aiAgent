#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
const server = new Server({
    name: 'calendar-copilot-test',
    version: '1.0.0',
});
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'test_tool',
                description: 'A simple test tool to verify MCP server functionality',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'A test message',
                        },
                    },
                    required: ['message'],
                },
            },
        ],
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'test_tool') {
        const message = request.params.arguments?.message || 'Hello from Calendar Copilot!';
        return {
            content: [
                {
                    type: 'text',
                    text: `Test successful! Phase 1 working! Message: ${message}`,
                },
            ],
        };
    }
    return {
        content: [
            {
                type: 'text',
                text: `Unknown tool: ${request.params.name}`,
            },
        ],
        isError: true,
    };
});
async function main() {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error('🎉 Calendar Copilot Phase 1 test server started successfully!');
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});
