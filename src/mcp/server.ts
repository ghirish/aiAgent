import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { 
  Config, 
  CalendarEvent, 
  FreeBusyRequest, 
  MeetingSlotRequest,
  ValidationError 
} from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { GoogleCalendarService } from '../services/google-calendar.js';
import { AzureAIService } from '../services/azure-ai.js';

/**
 * MCP Server for Calendar Copilot
 */
export class CalendarCopilotServer {
  private server: Server;
  private config: Config;
  private logger: Logger;
  private calendarService: GoogleCalendarService;
  private aiService: AzureAIService;

  constructor(config: Config, logger: Logger) {
    this.config = config;
    this.logger = logger.child({ component: 'MCPServer' });
    
    // Initialize services
    this.calendarService = new GoogleCalendarService(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri,
      logger
    );

    this.aiService = new AzureAIService(
      config.azure.endpoint,
      config.azure.apiKey,
      config.azure.deploymentName,
      config.azure.apiVersion,
      logger
    );
    
    this.server = new Server({
      name: config.mcp.serverName,
      version: config.mcp.serverVersion,
      capabilities: {
        tools: {},
      },
    });

    this.setupHandlers();
  }

  /**
   * Setup MCP protocol handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.debug('Listing available tools');
      return {
        tools: this.getAvailableTools(),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
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
      } catch (error) {
        this.logger.logError(error as Error, `Tool call failed: ${name}`);
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

  /**
   * Get all available tools
   */
  private getAvailableTools(): Tool[] {
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

  /**
   * Handle tool calls - delegates to appropriate service methods
   */
  private async handleToolCall(name: string, args: unknown): Promise<unknown> {
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

  /**
   * Handle get_calendar_events tool
   */
  private async handleGetCalendarEvents(args: unknown): Promise<CalendarEvent[]> {
    const { timeMin, timeMax, calendarId = 'primary', maxResults = 50 } = args as {
      timeMin: string;
      timeMax: string;
      calendarId?: string;
      maxResults?: number;
    };

    return this.calendarService.getEvents(timeMin, timeMax, calendarId, maxResults);
  }

  /**
   * Handle check_availability tool
   */
  private async handleCheckAvailability(args: unknown): Promise<unknown> {
    const { timeMin, timeMax, calendarIds = ['primary'] } = args as {
      timeMin: string;
      timeMax: string;
      calendarIds?: string[];
    };

    const request: FreeBusyRequest = {
      timeMin,
      timeMax,
      calendarIds,
    };

    return this.calendarService.checkFreeBusy(request);
  }

  /**
   * Handle find_meeting_slots tool
   */
  private async handleFindMeetingSlots(args: unknown): Promise<unknown> {
    const {
      duration,
      timeMin,
      timeMax,
      workingHours,
      bufferTime,
      maxSuggestions,
    } = args as MeetingSlotRequest;

    // Get busy times for the primary calendar
    const freeBusyRequest: FreeBusyRequest = {
      timeMin,
      timeMax,
      calendarIds: ['primary'],
    };

    const freeBusyResponse = await this.calendarService.checkFreeBusy(freeBusyRequest);
    const busyTimes = freeBusyResponse.calendars['primary']?.busy || [];

    // Filter out any invalid busy time entries
    const validBusyTimes = busyTimes.filter(
      (time): time is { start: string; end: string } => 
        typeof time.start === 'string' && typeof time.end === 'string'
    );

    const request: MeetingSlotRequest = {
      duration,
      timeMin,
      timeMax,
      workingHours,
      bufferTime,
      maxSuggestions,
    };

    return this.aiService.findOptimalMeetingSlots(request, validBusyTimes);
  }

  /**
   * Handle create_event tool
   */
  private async handleCreateEvent(args: unknown): Promise<CalendarEvent> {
    const { calendarId = 'primary', ...eventData } = args as Partial<CalendarEvent> & {
      calendarId?: string;
    };

    return this.calendarService.createEvent(eventData, calendarId);
  }

  /**
   * Handle update_event tool
   */
  private async handleUpdateEvent(args: unknown): Promise<CalendarEvent> {
    const { eventId, calendarId = 'primary', ...eventData } = args as {
      eventId: string;
      calendarId?: string;
    } & Partial<CalendarEvent>;

    if (!eventId) {
      throw new ValidationError('eventId is required for updating events');
    }

    return this.calendarService.updateEvent(eventId, eventData, calendarId);
  }

  /**
   * Handle cancel_event tool
   */
  private async handleCancelEvent(args: unknown): Promise<{ success: boolean; message: string }> {
    const { eventId, calendarId = 'primary', sendNotifications = true } = args as {
      eventId: string;
      calendarId?: string;
      sendNotifications?: boolean;
    };

    if (!eventId) {
      throw new ValidationError('eventId is required for canceling events');
    }

    await this.calendarService.deleteEvent(eventId, calendarId, sendNotifications);
    
    return {
      success: true,
      message: `Event ${eventId} has been cancelled successfully`,
    };
  }

  /**
   * Handle get_calendar_summary tool
   */
  private async handleGetCalendarSummary(args: unknown): Promise<unknown> {
    const { 
      timeMin, 
      timeMax, 
      calendarId = 'primary', 
      includeAnalytics = false 
    } = args as {
      timeMin: string;
      timeMax: string;
      calendarId?: string;
      includeAnalytics?: boolean;
    };

    return this.calendarService.getCalendarSummary(
      timeMin, 
      timeMax, 
      calendarId, 
      includeAnalytics
    );
  }

  /**
   * Handle parse_natural_query tool
   */
  private async handleParseNaturalQuery(args: unknown): Promise<unknown> {
    const { query } = args as { query: string };
    
    if (!query) {
      throw new ValidationError('query is required for parsing natural language');
    }

    return this.aiService.parseCalendarQuery(query);
  }

  /**
   * Set access token for Google Calendar (for authentication)
   */
  setAccessToken(accessToken: string, refreshToken?: string): void {
    this.calendarService.setAccessToken(accessToken, refreshToken);
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(): string {
    return this.calendarService.getAuthUrl();
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<void> {
    await this.calendarService.exchangeCodeForTokens(code);
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    this.logger.info('Calendar Copilot MCP server started', {
      serverName: this.config.mcp.serverName,
      version: this.config.mcp.serverVersion,
      tools: this.getAvailableTools().length,
    });
  }
} 