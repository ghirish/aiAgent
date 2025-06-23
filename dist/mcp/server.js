import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { ValidationError } from '../types/index.js';
import { GoogleCalendarService } from '../services/google-calendar.js';
import { GmailService } from '../services/gmail.js';
import { EmailStorageService } from '../services/email-storage.js';
import { EmailMonitorService } from '../services/email-monitor.js';
import { EmailSchedulerService } from '../services/email-scheduler.js';
import { AzureAIService } from '../services/azure-ai.js';
export class CalendarCopilotServer {
    server;
    config;
    logger;
    googleCalendarService;
    gmailService;
    emailStorageService;
    emailMonitorService;
    emailSchedulerService;
    azureAIService;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger.child({ component: 'MCPServer' });
        this.server = new Server({
            name: 'calendar-copilot',
            version: '1.0.0',
            capabilities: {
                tools: {}
            }
        });
        this.setupHandlers();
    }
    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'get_calendar_events',
                        description: 'Get calendar events for a specific time range',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                timeMin: { type: 'string', description: 'Start time in ISO format' },
                                timeMax: { type: 'string', description: 'End time in ISO format' },
                                maxResults: { type: 'number', description: 'Maximum number of events to return', default: 10 }
                            },
                            required: ['timeMin', 'timeMax']
                        }
                    },
                    {
                        name: 'check_availability',
                        description: 'Check if user is available during a specific time period',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                timeMin: { type: 'string', description: 'Start time in ISO format' },
                                timeMax: { type: 'string', description: 'End time in ISO format' },
                                timeZone: { type: 'string', description: 'Time zone (optional)', default: 'UTC' }
                            },
                            required: ['timeMin', 'timeMax']
                        }
                    },
                    {
                        name: 'find_meeting_slots',
                        description: 'Find available meeting slots for scheduling',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                duration: { type: 'number', description: 'Meeting duration in minutes' },
                                timeMin: { type: 'string', description: 'Start of search range in ISO format' },
                                timeMax: { type: 'string', description: 'End of search range in ISO format' },
                                maxSuggestions: { type: 'number', description: 'Maximum number of suggestions', default: 5 }
                            },
                            required: ['duration', 'timeMin', 'timeMax']
                        }
                    },
                    {
                        name: 'create_event',
                        description: 'Create a new calendar event',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                summary: { type: 'string', description: 'Event title/summary' },
                                startTime: { type: 'string', description: 'Start time in ISO format' },
                                endTime: { type: 'string', description: 'End time in ISO format' },
                                description: { type: 'string', description: 'Event description (optional)' },
                                location: { type: 'string', description: 'Event location (optional)' },
                                attendees: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'List of attendee email addresses (optional)'
                                }
                            },
                            required: ['summary', 'startTime', 'endTime']
                        }
                    },
                    {
                        name: 'update_event',
                        description: 'Update an existing calendar event',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                eventId: { type: 'string', description: 'Event ID to update' },
                                summary: { type: 'string', description: 'New event title/summary (optional)' },
                                startTime: { type: 'string', description: 'New start time in ISO format (optional)' },
                                endTime: { type: 'string', description: 'New end time in ISO format (optional)' },
                                description: { type: 'string', description: 'New event description (optional)' },
                                location: { type: 'string', description: 'New event location (optional)' }
                            },
                            required: ['eventId']
                        }
                    },
                    {
                        name: 'cancel_event',
                        description: 'Cancel/delete a calendar event',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                eventId: { type: 'string', description: 'Event ID to cancel' }
                            },
                            required: ['eventId']
                        }
                    },
                    {
                        name: 'get_calendar_summary',
                        description: 'Get a summary of calendar events for a time period',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                timeMin: { type: 'string', description: 'Start time in ISO format' },
                                timeMax: { type: 'string', description: 'End time in ISO format' }
                            },
                            required: ['timeMin', 'timeMax']
                        }
                    },
                    {
                        name: 'get_recent_emails',
                        description: 'Get recent emails from Gmail',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                maxResults: { type: 'number', description: 'Maximum number of emails to return', default: 20 }
                            }
                        }
                    },
                    {
                        name: 'search_emails',
                        description: 'Search emails by query',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: { type: 'string', description: 'Gmail search query' },
                                maxResults: { type: 'number', description: 'Maximum number of emails to return', default: 10 }
                            },
                            required: ['query']
                        }
                    },
                    {
                        name: 'get_unread_emails',
                        description: 'Get unread emails from Gmail',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                maxResults: { type: 'number', description: 'Maximum number of emails to return', default: 20 }
                            }
                        }
                    },
                    {
                        name: 'monitor_new_emails',
                        description: 'Check for new emails and analyze for scheduling intent',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'get_email_monitoring_status',
                        description: 'Get email monitoring service status and statistics',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'update_email_monitoring_config',
                        description: 'Update email monitoring configuration',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                enabled: { type: 'boolean', description: 'Enable/disable monitoring' },
                                pollingIntervalMinutes: { type: 'number', description: 'Polling interval in minutes' },
                                maxEmailsPerCheck: { type: 'number', description: 'Max emails to check per cycle' },
                                confidenceThreshold: { type: 'number', description: 'AI confidence threshold (0-1)' },
                                autoSuggestMeetings: { type: 'boolean', description: 'Auto-suggest meetings' },
                                autoCreateCalendarEvents: { type: 'boolean', description: 'Auto-create calendar events' }
                            }
                        }
                    },
                    {
                        name: 'get_scheduling_emails',
                        description: 'Get emails that contain scheduling intent',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                hoursBack: { type: 'number', description: 'Hours to look back', default: 24 }
                            }
                        }
                    },
                    {
                        name: 'analyze_email_for_scheduling',
                        description: 'Analyze an email for scheduling intent with AI-powered extraction',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                emailId: { type: 'string', description: 'Email ID to analyze' },
                                subject: { type: 'string', description: 'Email subject' },
                                from: { type: 'string', description: 'Email sender' },
                                snippet: { type: 'string', description: 'Email content snippet' }
                            },
                            required: ['emailId', 'subject', 'from', 'snippet']
                        }
                    },
                    {
                        name: 'process_batch_emails',
                        description: 'Process multiple emails for scheduling analysis in batch',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                emails: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            subject: { type: 'string' },
                                            from: { type: 'string' },
                                            snippet: { type: 'string' }
                                        },
                                        required: ['id', 'subject', 'from', 'snippet']
                                    }
                                },
                                maxEmails: { type: 'number', default: 10 }
                            },
                            required: ['emails']
                        }
                    }
                ]
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
            case 'monitor_new_emails':
                return this.handleMonitorNewEmails();
            case 'get_email_monitoring_status':
                return this.handleGetEmailMonitoringStatus();
            case 'update_email_monitoring_config':
                return this.handleUpdateEmailMonitoringConfig(args);
            case 'get_scheduling_emails':
                return this.handleGetSchedulingEmails(args);
            case 'analyze_email_for_scheduling':
                return this.handleAnalyzeEmailForScheduling(args);
            case 'process_batch_emails':
                return this.handleProcessBatchEmails(args);
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
            const events = await this.googleCalendarService?.getEvents(timeMin, timeMax, calendarId, maxResults);
            return {
                success: true,
                timeRange: {
                    start: timeMin,
                    end: timeMax
                },
                totalEvents: events?.length || 0,
                events: events?.map(event => ({
                    id: event.id,
                    title: event.summary,
                    start: event.start.dateTime || event.start.date,
                    end: event.end.dateTime || event.end.date,
                    location: event.location,
                    description: event.description,
                    attendees: event.attendees?.map(a => a.email) || []
                })) || []
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
            const freeBusyResult = await this.googleCalendarService?.checkFreeBusy(freeBusyRequest);
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
        const { calendarId = 'primary', summary, startTime, endTime, description, location, attendees } = args;
        if (!summary || !startTime || !endTime) {
            throw new ValidationError('summary, startTime, and endTime are required');
        }
        try {
            this.logger.info('Creating calendar event', {
                summary,
                startTime,
                endTime,
                calendarId
            });
            const eventData = {
                summary,
                startTime,
                endTime,
                description,
                location,
                attendees: attendees?.map(email => ({
                    email: typeof email === 'string' ? email : email
                }))
            };
            const createdEvent = await this.googleCalendarService?.createEvent(eventData, calendarId);
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
        const { eventId, calendarId = 'primary', summary, startTime, endTime, description, location, attendees } = args;
        if (!eventId) {
            throw new ValidationError('eventId is required');
        }
        try {
            this.logger.info('Updating calendar event', {
                eventId,
                summary,
                startTime,
                endTime,
                calendarId
            });
            const eventData = {};
            if (summary !== undefined)
                eventData.summary = summary;
            if (startTime !== undefined)
                eventData.startTime = startTime;
            if (endTime !== undefined)
                eventData.endTime = endTime;
            if (description !== undefined)
                eventData.description = description;
            if (location !== undefined)
                eventData.location = location;
            if (attendees !== undefined)
                eventData.attendees = attendees;
            const updatedEvent = await this.googleCalendarService?.updateEvent(eventId, eventData, calendarId);
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
            await this.googleCalendarService?.deleteEvent(eventId, calendarId, sendNotifications);
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
            if (!this.gmailService?.isAuthenticated()) {
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
            if (!this.gmailService?.isAuthenticated()) {
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
            if (!this.gmailService?.isAuthenticated()) {
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
    async handleMonitorNewEmails() {
        if (!this.emailMonitorService) {
            throw new Error('Email monitor service not initialized');
        }
        await this.emailMonitorService.manualCheck();
        const status = this.emailMonitorService.getStatus();
        return {
            content: [{
                    type: 'text',
                    text: `✅ Email monitoring check completed!\n\n` +
                        `📊 **Status:**\n` +
                        `• Service Running: ${status.isRunning ? '✅' : '❌'}\n` +
                        `• Last Checked: ${new Date(status.lastChecked).toLocaleString()}\n` +
                        `• Total Emails Processed: ${status.stats.totalProcessed}\n` +
                        `• Scheduling Emails Found: ${status.stats.schedulingEmailsFound}\n` +
                        `• Polling Interval: ${status.config.pollingIntervalMinutes} minutes\n\n` +
                        `🔍 Use "get_scheduling_emails" to see recent scheduling-related emails.`
                }]
        };
    }
    async handleGetEmailMonitoringStatus() {
        if (!this.emailMonitorService) {
            throw new Error('Email monitor service not initialized');
        }
        const status = this.emailMonitorService.getStatus();
        return {
            content: [{
                    type: 'text',
                    text: `📊 **Email Monitoring Status**\n\n` +
                        `🔄 **Service Status:**\n` +
                        `• Running: ${status.isRunning ? '✅ Active' : '❌ Stopped'}\n` +
                        `• Processing: ${status.isProcessing ? '⏳ In Progress' : '✅ Idle'}\n` +
                        `• Last Checked: ${new Date(status.lastChecked).toLocaleString()}\n\n` +
                        `⚙️ **Configuration:**\n` +
                        `• Enabled: ${status.config.enabled ? '✅' : '❌'}\n` +
                        `• Polling Interval: ${status.config.pollingIntervalMinutes} minutes\n` +
                        `• Max Emails Per Check: ${status.config.maxEmailsPerCheck}\n` +
                        `• AI Confidence Threshold: ${(status.config.autoProcessing.confidenceThreshold * 100).toFixed(0)}%\n` +
                        `• Auto-Suggest Meetings: ${status.config.autoProcessing.autoSuggestMeetings ? '✅' : '❌'}\n` +
                        `• Auto-Create Events: ${status.config.autoProcessing.autoCreateCalendarEvents ? '✅' : '❌'}\n\n` +
                        `📈 **Statistics:**\n` +
                        `• Total Emails Processed: ${status.stats.totalProcessed}\n` +
                        `• Scheduling Emails Found: ${status.stats.schedulingEmailsFound}\n` +
                        `• Storage Size: ${status.stats.storageSize} emails tracked`
                }]
        };
    }
    async handleUpdateEmailMonitoringConfig(args) {
        if (!this.emailMonitorService) {
            throw new Error('Email monitor service not initialized');
        }
        const updates = {};
        if (args.enabled !== undefined)
            updates.enabled = args.enabled;
        if (args.pollingIntervalMinutes !== undefined)
            updates.pollingIntervalMinutes = args.pollingIntervalMinutes;
        if (args.maxEmailsPerCheck !== undefined)
            updates.maxEmailsPerCheck = args.maxEmailsPerCheck;
        if (args.confidenceThreshold !== undefined ||
            args.autoSuggestMeetings !== undefined ||
            args.autoCreateCalendarEvents !== undefined) {
            updates.autoProcessing = {};
            if (args.confidenceThreshold !== undefined)
                updates.autoProcessing.confidenceThreshold = args.confidenceThreshold;
            if (args.autoSuggestMeetings !== undefined)
                updates.autoProcessing.autoSuggestMeetings = args.autoSuggestMeetings;
            if (args.autoCreateCalendarEvents !== undefined)
                updates.autoProcessing.autoCreateCalendarEvents = args.autoCreateCalendarEvents;
        }
        this.emailMonitorService.updateConfig(updates);
        const newStatus = this.emailMonitorService.getStatus();
        return {
            content: [{
                    type: 'text',
                    text: `✅ **Email monitoring configuration updated!**\n\n` +
                        `📝 **Updated Settings:**\n` +
                        Object.entries(updates).map(([key, value]) => `• ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`).join('\n') +
                        `\n\n🔄 **Current Status:**\n` +
                        `• Service: ${newStatus.isRunning ? '✅ Running' : '❌ Stopped'}\n` +
                        `• Polling Interval: ${newStatus.config.pollingIntervalMinutes} minutes\n` +
                        `• AI Threshold: ${(newStatus.config.autoProcessing.confidenceThreshold * 100).toFixed(0)}%`
                }]
        };
    }
    async handleGetSchedulingEmails(args) {
        if (!this.emailStorageService) {
            throw new Error('Email storage service not initialized');
        }
        const hoursBack = args.hoursBack || 24;
        const recentEmails = this.emailStorageService.getRecentProcessedEmails(hoursBack);
        const schedulingEmails = recentEmails.filter(email => email.hasSchedulingIntent);
        if (schedulingEmails.length === 0) {
            return {
                content: [{
                        type: 'text',
                        text: `📭 **No scheduling emails found**\n\n` +
                            `Searched the last ${hoursBack} hours and found no emails with scheduling intent.\n\n` +
                            `💡 **Tip:** Try:\n` +
                            `• Increasing the search period with "hoursBack" parameter\n` +
                            `• Running "monitor_new_emails" to check for new messages\n` +
                            `• Checking "get_email_monitoring_status" to see if monitoring is active`
                    }]
            };
        }
        const emailList = schedulingEmails.slice(0, 10).map(email => {
            const confidence = email.schedulingDetails?.confidence;
            const confidenceDisplay = confidence ? ` (${(confidence * 100).toFixed(0)}% confidence)` : '';
            const urgency = email.schedulingDetails?.urgency ? ` • ${email.schedulingDetails.urgency.toUpperCase()} priority` : '';
            const topic = email.schedulingDetails?.meetingTopic ? `\n   📋 Topic: ${email.schedulingDetails.meetingTopic}` : '';
            const times = email.schedulingDetails?.proposedTimes?.length ?
                `\n   ⏰ Proposed times: ${email.schedulingDetails.proposedTimes.join(', ')}` : '';
            return `📧 **${email.subject}**${confidenceDisplay}\n` +
                `   👤 From: ${email.from}\n` +
                `   📅 Received: ${new Date(email.receivedAt).toLocaleString()}${urgency}${topic}${times}\n` +
                `   🎯 Action: ${email.actionTaken || 'none'}`;
        }).join('\n\n');
        return {
            content: [{
                    type: 'text',
                    text: `📬 **Scheduling Emails Found** (Last ${hoursBack} hours)\n\n` +
                        `Found ${schedulingEmails.length} emails with scheduling intent:\n\n` +
                        emailList +
                        (schedulingEmails.length > 10 ? `\n\n... and ${schedulingEmails.length - 10} more emails` : '') +
                        `\n\n💡 **Next Steps:**\n` +
                        `• Use calendar tools to check availability for proposed times\n` +
                        `• Create events using "create_event" tool\n` +
                        `• Update monitoring config to auto-suggest meetings`
                }]
        };
    }
    async handleAnalyzeEmailForScheduling(args) {
        const { emailId, subject, from, snippet } = args;
        try {
            this.logger.info('Analyzing email for scheduling intent', { emailId, subject, from });
            if (!this.emailSchedulerService) {
                throw new Error('EmailScheduler service not initialized');
            }
            const emailSummary = {
                id: emailId,
                subject,
                from,
                snippet,
                date: new Date().toISOString()
            };
            const analysis = await this.emailSchedulerService.analyzeEmailForScheduling(emailSummary);
            return {
                success: true,
                emailId,
                hasSchedulingIntent: analysis.hasSchedulingIntent,
                confidence: analysis.confidence,
                details: analysis.schedulingDetails,
                suggestedActions: analysis.suggestedActions
            };
        }
        catch (error) {
            this.logger.error('Failed to analyze email for scheduling', {
                emailId,
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Analysis failed',
                emailId,
                hasSchedulingIntent: false,
                confidence: 0
            };
        }
    }
    async handleProcessBatchEmails(args) {
        const { emails, maxEmails = 10 } = args;
        try {
            this.logger.info('Processing batch emails for scheduling analysis', {
                emailCount: emails.length,
                maxEmails
            });
            if (!this.emailSchedulerService) {
                throw new Error('EmailScheduler service not initialized');
            }
            const emailsToProcess = emails.slice(0, maxEmails);
            const emailSummaries = emailsToProcess.map(email => ({
                id: email.id,
                subject: email.subject,
                from: email.from,
                snippet: email.snippet,
                date: new Date().toISOString()
            }));
            const batchResult = await this.emailSchedulerService.processBatchEmails(emailSummaries);
            return {
                success: true,
                processed: batchResult.processed,
                schedulingEmails: batchResult.schedulingEmails,
                highPriorityActions: batchResult.highPriorityActions,
                results: batchResult.results.map(result => ({
                    email: {
                        id: result.email.id,
                        subject: result.email.subject,
                        from: result.email.from
                    },
                    hasSchedulingIntent: result.analysis.hasSchedulingIntent,
                    confidence: result.analysis.confidence,
                    details: result.analysis.schedulingDetails,
                    suggestedActions: result.analysis.suggestedActions
                }))
            };
        }
        catch (error) {
            this.logger.error('Failed to process batch emails', {
                emailCount: emails.length,
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Batch processing failed',
                processed: 0,
                schedulingEmails: 0,
                highPriorityActions: 0,
                results: []
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
        });
    }
    async initialize(config) {
        try {
            this.logger.info('Initializing MCP server...');
            this.azureAIService = new AzureAIService(config.azure.endpoint, config.azure.apiKey, config.azure.deploymentName, config.azure.apiVersion, this.logger);
            this.googleCalendarService = new GoogleCalendarService(config.google.clientId, config.google.clientSecret, config.google.redirectUri, this.logger);
            this.gmailService = new GmailService(config.google.clientId, config.google.clientSecret, config.google.redirectUri, this.logger);
            this.emailStorageService = new EmailStorageService(this.logger);
            this.emailMonitorService = new EmailMonitorService(this.logger, this.gmailService, this.emailStorageService, this.azureAIService);
            this.emailSchedulerService = new EmailSchedulerService(this.logger, this.emailStorageService, this.emailMonitorService, this.azureAIService, this.googleCalendarService, this.gmailService);
            this.emailMonitorService.start();
            this.logger.info('MCP server initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize MCP server:', error);
            throw error;
        }
    }
}
