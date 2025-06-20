import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { ValidationError } from '../types/index.js';
import { GoogleCalendarService } from '../services/google-calendar.js';
import { AzureAIService } from '../services/azure-ai.js';
export class CalendarCopilotServer {
    server;
    config;
    logger;
    calendarService;
    aiService;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger.child({ component: 'MCPServer' });
        this.calendarService = new GoogleCalendarService(config.google.clientId, config.google.clientSecret, config.google.redirectUri, logger);
        this.aiService = new AzureAIService(config.azure.endpoint, config.azure.apiKey, config.azure.deploymentName, config.azure.apiVersion, logger);
        this.server = new Server({
            name: config.mcp.serverName,
            version: config.mcp.serverVersion,
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
    }
    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            this.logger.debug('Listing available tools');
            return {
                tools: this.getAvailableTools(),
            };
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            this.logger.info('Tool call received', { toolName: name, args });
            try {
                const result = await this.handleToolCall(name, args);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            catch (error) {
                this.logger.logError(error, `Tool call failed: ${name}`);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    getAvailableTools() {
        return [
            {
                name: 'get_calendar_events',
                description: 'Fetch calendar events for a specified date range',
                inputSchema: {
                    type: 'object',
                    properties: {
                        timeMin: {
                            type: 'string',
                            description: 'Start time in ISO 8601 format (e.g., 2024-01-01T00:00:00Z)',
                        },
                        timeMax: {
                            type: 'string',
                            description: 'End time in ISO 8601 format (e.g., 2024-01-31T23:59:59Z)',
                        },
                        calendarId: {
                            type: 'string',
                            description: 'Calendar ID (defaults to primary calendar)',
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Maximum number of events to return',
                        },
                    },
                    required: ['timeMin', 'timeMax'],
                },
            },
            {
                name: 'check_availability',
                description: 'Check free/busy status for specified time range',
                inputSchema: {
                    type: 'object',
                    properties: {
                        timeMin: {
                            type: 'string',
                            description: 'Start time in ISO 8601 format',
                        },
                        timeMax: {
                            type: 'string',
                            description: 'End time in ISO 8601 format',
                        },
                        calendarIds: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Array of calendar IDs to check',
                        },
                    },
                    required: ['timeMin', 'timeMax'],
                },
            },
            {
                name: 'find_meeting_slots',
                description: 'Find available meeting slots for scheduling',
                inputSchema: {
                    type: 'object',
                    properties: {
                        duration: {
                            type: 'number',
                            description: 'Meeting duration in minutes',
                        },
                        timeMin: {
                            type: 'string',
                            description: 'Earliest possible start time in ISO 8601 format',
                        },
                        timeMax: {
                            type: 'string',
                            description: 'Latest possible end time in ISO 8601 format',
                        },
                        workingHours: {
                            type: 'object',
                            properties: {
                                start: { type: 'string', description: 'Working hours start (HH:MM)' },
                                end: { type: 'string', description: 'Working hours end (HH:MM)' },
                            },
                            description: 'Working hours constraints',
                        },
                        bufferTime: {
                            type: 'number',
                            description: 'Buffer time between meetings in minutes',
                        },
                        maxSuggestions: {
                            type: 'number',
                            description: 'Maximum number of slot suggestions to return',
                        },
                    },
                    required: ['duration', 'timeMin', 'timeMax'],
                },
            },
            {
                name: 'create_event',
                description: 'Create a new calendar event',
                inputSchema: {
                    type: 'object',
                    properties: {
                        summary: {
                            type: 'string',
                            description: 'Event title/summary',
                        },
                        start: {
                            type: 'object',
                            properties: {
                                dateTime: { type: 'string', description: 'Start time in ISO 8601 format' },
                                timeZone: { type: 'string', description: 'Time zone (optional)' },
                            },
                            required: ['dateTime'],
                        },
                        end: {
                            type: 'object',
                            properties: {
                                dateTime: { type: 'string', description: 'End time in ISO 8601 format' },
                                timeZone: { type: 'string', description: 'Time zone (optional)' },
                            },
                            required: ['dateTime'],
                        },
                        description: {
                            type: 'string',
                            description: 'Event description (optional)',
                        },
                        location: {
                            type: 'string',
                            description: 'Event location (optional)',
                        },
                        attendees: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    email: { type: 'string' },
                                    displayName: { type: 'string' },
                                },
                                required: ['email'],
                            },
                            description: 'Event attendees (optional)',
                        },
                        calendarId: {
                            type: 'string',
                            description: 'Calendar ID (defaults to primary)',
                        },
                    },
                    required: ['summary', 'start', 'end'],
                },
            },
            {
                name: 'update_event',
                description: 'Update an existing calendar event',
                inputSchema: {
                    type: 'object',
                    properties: {
                        eventId: {
                            type: 'string',
                            description: 'ID of the event to update',
                        },
                        calendarId: {
                            type: 'string',
                            description: 'Calendar ID (defaults to primary)',
                        },
                        summary: { type: 'string', description: 'Updated event title' },
                        start: {
                            type: 'object',
                            properties: {
                                dateTime: { type: 'string' },
                                timeZone: { type: 'string' },
                            },
                        },
                        end: {
                            type: 'object',
                            properties: {
                                dateTime: { type: 'string' },
                                timeZone: { type: 'string' },
                            },
                        },
                        description: { type: 'string' },
                        location: { type: 'string' },
                        attendees: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    email: { type: 'string' },
                                    displayName: { type: 'string' },
                                },
                            },
                        },
                    },
                    required: ['eventId'],
                },
            },
            {
                name: 'cancel_event',
                description: 'Cancel/delete a calendar event',
                inputSchema: {
                    type: 'object',
                    properties: {
                        eventId: {
                            type: 'string',
                            description: 'ID of the event to cancel',
                        },
                        calendarId: {
                            type: 'string',
                            description: 'Calendar ID (defaults to primary)',
                        },
                        sendNotifications: {
                            type: 'boolean',
                            description: 'Whether to send cancellation notifications to attendees',
                        },
                    },
                    required: ['eventId'],
                },
            },
            {
                name: 'get_calendar_summary',
                description: 'Get a summary of calendar events for a time period',
                inputSchema: {
                    type: 'object',
                    properties: {
                        timeMin: {
                            type: 'string',
                            description: 'Start time in ISO 8601 format',
                        },
                        timeMax: {
                            type: 'string',
                            description: 'End time in ISO 8601 format',
                        },
                        calendarId: {
                            type: 'string',
                            description: 'Calendar ID (defaults to primary)',
                        },
                        includeAnalytics: {
                            type: 'boolean',
                            description: 'Include analytics data (meeting patterns, busy hours, etc.)',
                        },
                    },
                    required: ['timeMin', 'timeMax'],
                },
            },
            {
                name: 'parse_natural_query',
                description: 'Parse natural language calendar queries and extract intent and entities',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Natural language query about calendar operations',
                        },
                    },
                    required: ['query'],
                },
            },
        ];
    }
    async handleToolCall(name, args) {
        switch (name) {
            case 'get_calendar_events':
                return this.handleGetCalendarEvents(args);
            case 'check_availability':
                return this.handleCheckAvailability(args);
            case 'find_meeting_slots':
                return this.handleFindMeetingSlots(args);
            case 'create_event':
                return this.handleCreateEvent(args);
            case 'update_event':
                return this.handleUpdateEvent(args);
            case 'cancel_event':
                return this.handleCancelEvent(args);
            case 'get_calendar_summary':
                return this.handleGetCalendarSummary(args);
            case 'parse_natural_query':
                return this.handleParseNaturalQuery(args);
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    async handleGetCalendarEvents(args) {
        const { timeMin, timeMax, calendarId = 'primary', maxResults = 50 } = args;
        return this.calendarService.getEvents(timeMin, timeMax, calendarId, maxResults);
    }
    async handleCheckAvailability(args) {
        const { timeMin, timeMax, calendarIds = ['primary'] } = args;
        const request = {
            timeMin,
            timeMax,
            calendarIds,
        };
        return this.calendarService.checkFreeBusy(request);
    }
    async handleFindMeetingSlots(args) {
        const { duration, timeMin, timeMax, workingHours, bufferTime, maxSuggestions, } = args;
        const freeBusyRequest = {
            timeMin,
            timeMax,
            calendarIds: ['primary'],
        };
        const freeBusyResponse = await this.calendarService.checkFreeBusy(freeBusyRequest);
        const busyTimes = freeBusyResponse.calendars['primary']?.busy || [];
        const validBusyTimes = busyTimes.filter((time) => typeof time.start === 'string' && typeof time.end === 'string');
        const request = {
            duration,
            timeMin,
            timeMax,
            workingHours,
            bufferTime,
            maxSuggestions,
        };
        return this.aiService.findOptimalMeetingSlots(request, validBusyTimes);
    }
    async handleCreateEvent(args) {
        const { calendarId = 'primary', ...eventData } = args;
        return this.calendarService.createEvent(eventData, calendarId);
    }
    async handleUpdateEvent(args) {
        const { eventId, calendarId = 'primary', ...eventData } = args;
        if (!eventId) {
            throw new ValidationError('eventId is required for updating events');
        }
        return this.calendarService.updateEvent(eventId, eventData, calendarId);
    }
    async handleCancelEvent(args) {
        const { eventId, calendarId = 'primary', sendNotifications = true } = args;
        if (!eventId) {
            throw new ValidationError('eventId is required for canceling events');
        }
        await this.calendarService.deleteEvent(eventId, calendarId, sendNotifications);
        return {
            success: true,
            message: `Event ${eventId} has been cancelled successfully`,
        };
    }
    async handleGetCalendarSummary(args) {
        const { timeMin, timeMax, calendarId = 'primary', includeAnalytics = false } = args;
        return this.calendarService.getCalendarSummary(timeMin, timeMax, calendarId, includeAnalytics);
    }
    async handleParseNaturalQuery(args) {
        const { query } = args;
        if (!query) {
            throw new ValidationError('query is required for parsing natural language');
        }
        return this.aiService.parseCalendarQuery(query);
    }
    setAccessToken(accessToken, refreshToken) {
        this.calendarService.setAccessToken(accessToken, refreshToken);
    }
    getAuthUrl() {
        return this.calendarService.getAuthUrl();
    }
    async exchangeCodeForTokens(code) {
        await this.calendarService.exchangeCodeForTokens(code);
    }
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        this.logger.info('Calendar Copilot MCP server started', {
            serverName: this.config.mcp.serverName,
            version: this.config.mcp.serverVersion,
            tools: this.getAvailableTools().length,
        });
    }
}
