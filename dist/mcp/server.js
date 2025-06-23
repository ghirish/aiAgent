import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { ValidationError } from '../types/index.js';
import { GoogleCalendarService } from '../services/google-calendar.js';
import { GmailService } from '../services/gmail.js';
export class CalendarCopilotServer {
    server;
    config;
    logger;
    calendarService;
    gmailService;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger.child({ component: 'MCPServer' });
        this.calendarService = new GoogleCalendarService(config.google.clientId, config.google.clientSecret, config.google.redirectUri, logger);
        this.gmailService = new GmailService(config.google.clientId, config.google.clientSecret, config.google.redirectUri, logger);
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
            return {
                tools: this.getAvailableTools(),
            };
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                const result = await this.handleToolCall(name, args);
                return {
                    content: [
                        {
                            type: 'text',
                            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            catch (error) {
                this.logger.error('Tool call failed', {
                    tool: name,
                    error: error instanceof Error ? error.message : String(error)
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
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
                description: 'Fetch calendar events for a specified time range',
                inputSchema: {
                    type: 'object',
                    properties: {
                        timeMin: {
                            type: 'string',
                            description: 'Start time in ISO 8601 format (e.g., "2024-01-01T00:00:00Z")',
                        },
                        timeMax: {
                            type: 'string',
                            description: 'End time in ISO 8601 format (e.g., "2024-01-31T23:59:59Z")',
                        },
                        calendarId: {
                            type: 'string',
                            description: 'Calendar ID (defaults to "primary")',
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Maximum number of events to return (default: 50)',
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
                            description: 'Array of calendar IDs to check (defaults to ["primary"])',
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
                        maxSuggestions: {
                            type: 'number',
                            description: 'Maximum number of slot suggestions to return (default: 5)',
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
                            description: 'Calendar ID (defaults to "primary")',
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
                            description: 'Calendar ID (defaults to "primary")',
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
                            description: 'Calendar ID (defaults to "primary")',
                        },
                        sendNotifications: {
                            type: 'boolean',
                            description: 'Whether to send cancellation notifications to attendees (default: false)',
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
                            description: 'Calendar ID (defaults to "primary")',
                        },
                    },
                    required: ['timeMin', 'timeMax'],
                },
            },
            {
                name: 'get_recent_emails',
                description: 'Get recent emails from Gmail inbox',
                inputSchema: {
                    type: 'object',
                    properties: {
                        maxResults: {
                            type: 'number',
                            description: 'Maximum number of emails to return (default: 20)',
                        },
                        query: {
                            type: 'string',
                            description: 'Gmail search query (optional)',
                        },
                    },
                    required: [],
                },
            },
            {
                name: 'search_emails',
                description: 'Search emails with specific query',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Gmail search query',
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Maximum number of emails to return (default: 10)',
                        },
                    },
                    required: ['query'],
                },
            },
            {
                name: 'get_unread_emails',
                description: 'Get unread emails from Gmail',
                inputSchema: {
                    type: 'object',
                    properties: {
                        maxResults: {
                            type: 'number',
                            description: 'Maximum number of emails to return (default: 20)',
                        },
                    },
                    required: [],
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
            case 'get_recent_emails':
                return this.handleGetRecentEmails(args);
            case 'search_emails':
                return this.handleSearchEmails(args);
            case 'get_unread_emails':
                return this.handleGetUnreadEmails(args);
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    async handleGetCalendarEvents(args) {
        const { timeMin, timeMax, calendarId = 'primary', maxResults = 50 } = args;
        if (!timeMin || !timeMax) {
            throw new ValidationError('timeMin and timeMax are required');
        }
        try {
            this.logger.info('Fetching calendar events', {
                timeMin,
                timeMax,
                calendarId,
                maxResults
            });
            const events = await this.calendarService.getEvents(timeMin, timeMax, calendarId, maxResults);
            return {
                success: true,
                timeRange: {
                    start: timeMin,
                    end: timeMax
                },
                totalEvents: events.length,
                events: events.map(event => ({
                    id: event.id,
                    title: event.summary,
                    start: event.start.dateTime || event.start.date,
                    end: event.end.dateTime || event.end.date,
                    location: event.location,
                    description: event.description,
                    attendees: event.attendees?.map(a => a.email) || []
                }))
            };
        }
        catch (error) {
            this.logger.error('Failed to get calendar events', {
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                timeRange: { start: timeMin, end: timeMax },
                totalEvents: 0,
                events: []
            };
        }
    }
    async handleCheckAvailability(args) {
        const { timeMin, timeMax, calendarIds = ['primary'] } = args;
        if (!timeMin || !timeMax) {
            throw new ValidationError('timeMin and timeMax are required');
        }
        try {
            this.logger.info('Checking calendar availability', {
                timeMin,
                timeMax,
                calendarIds
            });
            const freeBusyRequest = {
                timeMin,
                timeMax,
                calendarIds: calendarIds
            };
            const freeBusyResult = await this.calendarService.checkFreeBusy(freeBusyRequest);
            const availability = [];
            const busyTimes = [];
            for (const calendarId of calendarIds) {
                const calendarBusy = freeBusyResult.calendars?.[calendarId]?.busy || [];
                for (const busyPeriod of calendarBusy) {
                    busyTimes.push({
                        calendarId,
                        start: busyPeriod.start,
                        end: busyPeriod.end
                    });
                }
            }
            const timeRangeStart = new Date(timeMin);
            const timeRangeEnd = new Date(timeMax);
            busyTimes.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
            let currentTime = timeRangeStart;
            for (const busyPeriod of busyTimes) {
                const busyStart = new Date(busyPeriod.start);
                if (currentTime < busyStart) {
                    availability.push({
                        start: currentTime.toISOString(),
                        end: busyStart.toISOString(),
                        status: 'free'
                    });
                }
                const busyEnd = new Date(busyPeriod.end);
                if (busyEnd > currentTime) {
                    currentTime = busyEnd;
                }
            }
            if (currentTime < timeRangeEnd) {
                availability.push({
                    start: currentTime.toISOString(),
                    end: timeRangeEnd.toISOString(),
                    status: 'free'
                });
            }
            return {
                success: true,
                timeRange: {
                    start: timeMin,
                    end: timeMax
                },
                calendarsChecked: calendarIds,
                totalBusyPeriods: busyTimes.length,
                busyTimes: busyTimes,
                availability: availability,
                summary: availability.length > 0
                    ? `Found ${availability.length} free time slot(s)`
                    : 'No free time available in the specified period'
            };
        }
        catch (error) {
            this.logger.error('Failed to check availability', {
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                timeRange: { start: timeMin, end: timeMax },
                calendarsChecked: calendarIds,
                busyTimes: [],
                availability: []
            };
        }
    }
    async handleFindMeetingSlots(args) {
        throw new Error('find_meeting_slots not yet implemented');
    }
    async handleCreateEvent(args) {
        const { calendarId = 'primary', summary, start, end, description, location, attendees } = args;
        if (!summary || !start || !end) {
            throw new ValidationError('summary, start, and end are required');
        }
        try {
            this.logger.info('Creating calendar event', {
                summary,
                start: start.dateTime,
                end: end.dateTime,
                calendarId
            });
            const eventData = {
                summary,
                start,
                end,
                description,
                location,
                attendees
            };
            const createdEvent = await this.calendarService.createEvent(eventData, calendarId);
            return {
                success: true,
                action: 'created',
                event: {
                    id: createdEvent.id,
                    summary: createdEvent.summary,
                    start: createdEvent.start.dateTime || createdEvent.start.date,
                    end: createdEvent.end.dateTime || createdEvent.end.date,
                    location: createdEvent.location,
                    description: createdEvent.description,
                    attendees: createdEvent.attendees?.map(a => a.email) || [],
                    htmlLink: `https://calendar.google.com/calendar/event?eid=${createdEvent.id}`
                },
                message: `Successfully created event: ${createdEvent.summary}`
            };
        }
        catch (error) {
            this.logger.error('Failed to create calendar event', {
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                action: 'create_failed',
                event: null
            };
        }
    }
    async handleUpdateEvent(args) {
        const { eventId, calendarId = 'primary', summary, start, end, description, location, attendees } = args;
        if (!eventId) {
            throw new ValidationError('eventId is required');
        }
        try {
            this.logger.info('Updating calendar event', {
                eventId,
                summary,
                start: start?.dateTime,
                end: end?.dateTime,
                calendarId
            });
            const eventData = {};
            if (summary !== undefined)
                eventData.summary = summary;
            if (start !== undefined)
                eventData.start = start;
            if (end !== undefined)
                eventData.end = end;
            if (description !== undefined)
                eventData.description = description;
            if (location !== undefined)
                eventData.location = location;
            if (attendees !== undefined)
                eventData.attendees = attendees;
            const updatedEvent = await this.calendarService.updateEvent(eventId, eventData, calendarId);
            return {
                success: true,
                action: 'updated',
                event: {
                    id: updatedEvent.id,
                    summary: updatedEvent.summary,
                    start: updatedEvent.start.dateTime || updatedEvent.start.date,
                    end: updatedEvent.end.dateTime || updatedEvent.end.date,
                    location: updatedEvent.location,
                    description: updatedEvent.description,
                    attendees: updatedEvent.attendees?.map(a => a.email) || [],
                    htmlLink: `https://calendar.google.com/calendar/event?eid=${updatedEvent.id}`
                },
                message: `Successfully updated event: ${updatedEvent.summary}`
            };
        }
        catch (error) {
            this.logger.error('Failed to update calendar event', {
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                action: 'update_failed',
                eventId
            };
        }
    }
    async handleCancelEvent(args) {
        const { eventId, calendarId = 'primary', sendNotifications = true } = args;
        if (!eventId) {
            throw new ValidationError('eventId is required');
        }
        try {
            this.logger.info('Deleting calendar event', {
                eventId,
                calendarId,
                sendNotifications
            });
            await this.calendarService.deleteEvent(eventId, calendarId, sendNotifications);
            return {
                success: true,
                action: 'cancelled',
                eventId,
                message: `Successfully cancelled event: ${eventId}`
            };
        }
        catch (error) {
            this.logger.error('Failed to cancel calendar event', {
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                action: 'cancel_failed',
                eventId
            };
        }
    }
    async handleGetCalendarSummary(args) {
        throw new Error('get_calendar_summary not yet implemented');
    }
    async handleGetRecentEmails(args) {
        const { maxResults = 20, query } = args;
        try {
            this.logger.info('Fetching recent emails', { maxResults, query });
            if (!this.gmailService.isAuthenticated()) {
                return {
                    success: false,
                    error: 'Gmail not authenticated. Please authenticate with Gmail first.',
                    emails: []
                };
            }
            const emails = await this.gmailService.getRecentEmails(maxResults, query);
            return {
                success: true,
                totalEmails: emails.length,
                emails: emails.map(email => ({
                    id: email.id,
                    subject: email.subject,
                    from: email.from,
                    date: email.date,
                    snippet: email.snippet,
                    isUnread: email.isUnread
                }))
            };
        }
        catch (error) {
            this.logger.error('Failed to get recent emails', {
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                emails: []
            };
        }
    }
    async handleSearchEmails(args) {
        const { query, maxResults = 10 } = args;
        if (!query) {
            throw new ValidationError('query is required for email search');
        }
        try {
            this.logger.info('Searching emails', { query, maxResults });
            if (!this.gmailService.isAuthenticated()) {
                return {
                    success: false,
                    error: 'Gmail not authenticated. Please authenticate with Gmail first.',
                    emails: []
                };
            }
            const emails = await this.gmailService.searchEmails(query, maxResults);
            return {
                success: true,
                query,
                totalEmails: emails.length,
                emails: emails.map(email => ({
                    id: email.id,
                    subject: email.subject,
                    from: email.from,
                    date: email.date,
                    snippet: email.snippet,
                    isUnread: email.isUnread
                }))
            };
        }
        catch (error) {
            this.logger.error('Failed to search emails', {
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                emails: []
            };
        }
    }
    async handleGetUnreadEmails(args) {
        const { maxResults = 20 } = args;
        try {
            this.logger.info('Fetching unread emails', { maxResults });
            if (!this.gmailService.isAuthenticated()) {
                return {
                    success: false,
                    error: 'Gmail not authenticated. Please authenticate with Gmail first.',
                    emails: []
                };
            }
            const emails = await this.gmailService.getUnreadEmails(maxResults);
            return {
                success: true,
                totalUnreadEmails: emails.length,
                emails: emails.map(email => ({
                    id: email.id,
                    subject: email.subject,
                    from: email.from,
                    date: email.date,
                    snippet: email.snippet,
                    isUnread: email.isUnread
                }))
            };
        }
        catch (error) {
            this.logger.error('Failed to get unread emails', {
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                emails: []
            };
        }
    }
    async loadOAuthTokens() {
        try {
            this.logger.info('OAuth token loading placeholder - tokens should be set via authentication flow');
        }
        catch (error) {
            this.logger.warn('No OAuth tokens found or failed to load', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async start() {
        await this.loadOAuthTokens();
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        this.logger.info('Calendar Copilot MCP server started', {
            serverName: this.config.mcp.serverName,
            version: this.config.mcp.serverVersion,
            tools: this.getAvailableTools().length,
        });
    }
}
