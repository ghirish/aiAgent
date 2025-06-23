import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { 
  CalendarEvent, 
  FreeBusyRequest, 
  FreeBusyResponse, 
  GoogleCalendarError,
  ValidationError 
} from '../types/index.js';
import { Logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

/**
 * Google Calendar API Integration Service
 */
export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: any;
  private logger: Logger;
  private serviceAccountAuth: any;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    logger: Logger
  ) {
    this.logger = logger.child({ component: 'GoogleCalendar' });
    
    // Initialize OAuth2 client
    this.oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      redirectUri
    );

    // Try to initialize service account authentication
    this.initializeServiceAccount();

    // Initialize Calendar API with service account if available, otherwise OAuth2
    this.calendar = google.calendar({ 
      version: 'v3', 
      auth: this.serviceAccountAuth || this.oauth2Client 
    });

    this.logger.info('Google Calendar service initialized', {
      hasServiceAccount: !!this.serviceAccountAuth,
      hasOAuth2: !!this.oauth2Client
    });
  }

  /**
   * Initialize service account authentication if available
   */
  private initializeServiceAccount(): void {
    try {
      // First, try to load existing OAuth2 tokens
      this.loadExistingTokens();

      // Check for service account key file path in environment
      const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
      
      if (serviceAccountPath) {
        const fullPath = path.resolve(serviceAccountPath);
        
        if (fs.existsSync(fullPath)) {
          this.logger.info('Service account key file found, initializing service account auth');
          
          this.serviceAccountAuth = new google.auth.GoogleAuth({
            keyFile: fullPath,
            scopes: [
              'https://www.googleapis.com/auth/calendar',
              'https://www.googleapis.com/auth/calendar.events',
            ],
          });
          
          this.logger.info('✅ Service account authentication initialized successfully');
          return;
        } else {
          this.logger.warn('Service account key file not found at path:', fullPath);
        }
      }

      // Fallback: try common service account file names
      const commonPaths = [
        './google-service-account.json',
        './credentials/google-service-account.json',
        './service-account.json'
      ];

      for (const commonPath of commonPaths) {
        const fullPath = path.resolve(commonPath);
        if (fs.existsSync(fullPath)) {
          this.logger.info('Found service account key at:', commonPath);
          
          this.serviceAccountAuth = new google.auth.GoogleAuth({
            keyFile: fullPath,
            scopes: [
              'https://www.googleapis.com/auth/calendar',
              'https://www.googleapis.com/auth/calendar.events',
            ],
          });
          
          this.logger.info('✅ Service account authentication initialized from:', commonPath);
          return;
        }
      }

      // If no service account found, check if OAuth2 tokens are loaded
      if (this.oauth2Client.credentials && this.oauth2Client.credentials.access_token) {
        this.logger.info('✅ OAuth2 tokens loaded successfully');
        return;
      }

      this.logger.warn('No service account key file found and no OAuth2 tokens available.');
      
    } catch (error) {
      this.logger.warn('Failed to initialize authentication:', error);
    }
  }

  /**
   * Load existing OAuth2 tokens from common locations
   */
  private loadExistingTokens(): void {
    const tokenPaths = [
      './tokens.json',
      './token.json',
      './credentials/tokens.json'
    ];

    for (const tokenPath of tokenPaths) {
      try {
        const fullPath = path.resolve(tokenPath);
        if (fs.existsSync(fullPath)) {
          const tokens = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          
          // Check if tokens are still valid (not expired)
          if (tokens.expiry_date && tokens.expiry_date > Date.now()) {
            this.oauth2Client.setCredentials(tokens);
            this.logger.info('✅ Loaded valid OAuth2 tokens from:', tokenPath);
            return;
          } else if (tokens.refresh_token) {
            // Tokens expired but we have refresh token
            this.oauth2Client.setCredentials(tokens);
            this.logger.info('✅ Loaded OAuth2 tokens with refresh capability from:', tokenPath);
            return;
          } else {
            this.logger.warn('OAuth2 tokens expired and no refresh token available in:', tokenPath);
          }
        }
      } catch (error) {
        this.logger.debug('Could not load tokens from:', tokenPath, error);
      }
    }
  }

  /**
   * Check if service account authentication is available
   */
  hasServiceAccount(): boolean {
    return !!this.serviceAccountAuth;
  }

  /**
   * Get the appropriate auth client (service account or OAuth2)
   */
  private async getAuthClient() {
    if (this.serviceAccountAuth) {
      return await this.serviceAccountAuth.getClient();
    }
    return this.oauth2Client;
  }

  /**
   * Generate OAuth 2.0 authorization URL with Calendar and Gmail scopes
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });

    this.logger.info('Generated OAuth authorization URL with Calendar and Gmail scopes');
    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(code: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      this.logger.info('Successfully exchanged auth code for tokens');
    } catch (error) {
      this.logger.logError(error as Error, 'Failed to exchange auth code');
      throw new GoogleCalendarError('Failed to authenticate with Google Calendar');
    }
  }

  /**
   * Set access token directly (for testing or stored tokens)
   */
  setAccessToken(accessToken: string, refreshToken?: string): void {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    this.logger.info('Access token set for Google Calendar');
  }

  /**
   * Get calendar events for a specified time range
   */
  async getEvents(
    timeMin: string,
    timeMax: string,
    calendarId: string = 'primary',
    maxResults: number = 50
  ): Promise<CalendarEvent[]> {
    try {
      this.logger.debug('Fetching calendar events', {
        timeMin,
        timeMax,
        calendarId,
        maxResults,
        authType: this.serviceAccountAuth ? 'service-account' : 'oauth2'
      });

      // Get appropriate auth client
      const authClient = await this.getAuthClient();
      
      // Create calendar instance with proper auth
      const calendar = google.calendar({ version: 'v3', auth: authClient });

      const response = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      
      // Transform Google Calendar events to our format
      const transformedEvents: CalendarEvent[] = events.map((event: any) => ({
        id: event.id,
        summary: event.summary || 'Untitled Event',
        description: event.description,
        start: {
          dateTime: event.start?.dateTime || event.start?.date,
          timeZone: event.start?.timeZone,
        },
        end: {
          dateTime: event.end?.dateTime || event.end?.date,
          timeZone: event.end?.timeZone,
        },
        attendees: event.attendees?.map((attendee: any) => ({
          email: attendee.email,
          displayName: attendee.displayName,
          responseStatus: attendee.responseStatus,
        })),
        location: event.location,
        recurrence: event.recurrence,
        reminders: event.reminders,
      }));

      this.logger.info(`✅ Retrieved ${transformedEvents.length} calendar events using ${this.serviceAccountAuth ? 'service account' : 'OAuth2'}`);
      return transformedEvents;
    } catch (error) {
      this.logger.logError(error as Error, 'Failed to fetch calendar events');
      
      // Provide more helpful error message
      if (error instanceof Error && error.message.includes('No access, refresh token')) {
        throw new GoogleCalendarError(
          'Google Calendar authentication not configured. Please set up service account authentication or OAuth2 tokens. See README.md for setup instructions.',
          error
        );
      }
      
      throw new GoogleCalendarError('Failed to fetch calendar events', error);
    }
  }

  /**
   * Create a new calendar event
   */
  async createEvent(
    eventData: Partial<CalendarEvent>,
    calendarId: string = 'primary'
  ): Promise<CalendarEvent> {
    try {
      this.logger.debug('Creating calendar event', { eventData, calendarId });

      // Enhanced validation with detailed logging
      if (!eventData.summary || !eventData.start || !eventData.end) {
        const missingFields = [];
        if (!eventData.summary) missingFields.push('summary');
        if (!eventData.start) missingFields.push('start');
        if (!eventData.end) missingFields.push('end');
        
        this.logger.error('Missing required fields for event creation', { 
          missingFields, 
          providedData: eventData 
        });
        throw new ValidationError(`Missing required event fields: ${missingFields.join(', ')}`);
      }

      // Validate start/end time format
      if (!eventData.start.dateTime && !eventData.start.date) {
        this.logger.error('Invalid start time - missing dateTime or date', { start: eventData.start });
        throw new ValidationError('Start time must have either dateTime or date');
      }
      
      if (!eventData.end.dateTime && !eventData.end.date) {
        this.logger.error('Invalid end time - missing dateTime or date', { end: eventData.end });
        throw new ValidationError('End time must have either dateTime or date');
      }

      const googleEvent = {
        summary: eventData.summary,
        description: eventData.description,
        start: eventData.start,
        end: eventData.end,
        location: eventData.location,
        attendees: eventData.attendees,
        reminders: eventData.reminders || {
          useDefault: true,
        },
      };

      this.logger.info('Attempting to create Google Calendar event', { 
        googleEvent,
        calendarId,
        hasAuth: !!this.oauth2Client.credentials.access_token 
      });

      const response = await this.calendar.events.insert({
        calendarId,
        resource: googleEvent,
        sendNotifications: true,
      });

      this.logger.info('Google Calendar API response received', {
        status: response.status,
        statusText: response.statusText,
        eventId: response.data?.id,
        htmlLink: response.data?.htmlLink
      });

      const createdEvent = response.data;
      
      const transformedEvent: CalendarEvent = {
        id: createdEvent.id,
        summary: createdEvent.summary,
        description: createdEvent.description,
        start: {
          dateTime: createdEvent.start.dateTime || createdEvent.start.date,
          timeZone: createdEvent.start.timeZone,
        },
        end: {
          dateTime: createdEvent.end.dateTime || createdEvent.end.date,
          timeZone: createdEvent.end.timeZone,
        },
        attendees: createdEvent.attendees?.map((attendee: any) => ({
          email: attendee.email,
          displayName: attendee.displayName,
          responseStatus: attendee.responseStatus,
        })),
        location: createdEvent.location,
        recurrence: createdEvent.recurrence,
        reminders: createdEvent.reminders,
      };

      this.logger.info('✅ SUCCESSFULLY CREATED CALENDAR EVENT', { 
        eventId: createdEvent.id,
        htmlLink: createdEvent.htmlLink,
        summary: createdEvent.summary
      });
      
      return transformedEvent;
    } catch (error) {
      this.logger.error('❌ FAILED TO CREATE CALENDAR EVENT', { 
        error: error.message,
        code: error.code,
        details: error.details || error.response?.data,
        stack: error.stack
      });
      throw new GoogleCalendarError('Failed to create calendar event', error);
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(
    eventId: string,
    eventData: Partial<CalendarEvent>,
    calendarId: string = 'primary'
  ): Promise<CalendarEvent> {
    try {
      this.logger.debug('Updating calendar event', { eventId, eventData, calendarId });

      const googleEvent = {
        summary: eventData.summary,
        description: eventData.description,
        start: eventData.start,
        end: eventData.end,
        location: eventData.location,
        attendees: eventData.attendees,
      };

      const response = await this.calendar.events.patch({
        calendarId,
        eventId,
        resource: googleEvent,
        sendNotifications: true,
      });

      const updatedEvent = response.data;
      
      const transformedEvent: CalendarEvent = {
        id: updatedEvent.id,
        summary: updatedEvent.summary,
        description: updatedEvent.description,
        start: {
          dateTime: updatedEvent.start.dateTime || updatedEvent.start.date,
          timeZone: updatedEvent.start.timeZone,
        },
        end: {
          dateTime: updatedEvent.end.dateTime || updatedEvent.end.date,
          timeZone: updatedEvent.end.timeZone,
        },
        attendees: updatedEvent.attendees?.map((attendee: any) => ({
          email: attendee.email,
          displayName: attendee.displayName,
          responseStatus: attendee.responseStatus,
        })),
        location: updatedEvent.location,
        recurrence: updatedEvent.recurrence,
        reminders: updatedEvent.reminders,
      };

      this.logger.info('Updated calendar event', { eventId });
      return transformedEvent;
    } catch (error) {
      this.logger.logError(error as Error, 'Failed to update calendar event');
      throw new GoogleCalendarError('Failed to update calendar event', error);
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(
    eventId: string,
    calendarId: string = 'primary',
    sendNotifications: boolean = true
  ): Promise<void> {
    try {
      this.logger.debug('Deleting calendar event', { eventId, calendarId });

      await this.calendar.events.delete({
        calendarId,
        eventId,
        sendNotifications,
      });

      this.logger.info('Deleted calendar event', { eventId });
    } catch (error) {
      this.logger.logError(error as Error, 'Failed to delete calendar event');
      throw new GoogleCalendarError('Failed to delete calendar event', error);
    }
  }

  /**
   * Check free/busy status for calendars
   */
  async checkFreeBusy(request: FreeBusyRequest): Promise<FreeBusyResponse> {
    try {
      this.logger.debug('Checking free/busy status', request);

      const response = await this.calendar.freebusy.query({
        resource: {
          timeMin: request.timeMin,
          timeMax: request.timeMax,
          timeZone: request.timeZone || 'UTC',
          items: request.calendarIds.map(id => ({ id })),
        },
      });

      const freeBusyData = response.data;
      
      const transformedResponse: FreeBusyResponse = {
        calendars: {},
      };

      // Transform the response
      for (const [calendarId, calendar] of Object.entries(freeBusyData.calendars || {})) {
        const calendarData = calendar as any;
        transformedResponse.calendars[calendarId] = {
          busy: calendarData.busy?.map((period: any) => ({
            start: period.start,
            end: period.end,
          })) || [],
          errors: calendarData.errors?.map((error: any) => ({
            domain: error.domain,
            reason: error.reason,
          })),
        };
      }

      this.logger.info('Retrieved free/busy status', {
        calendarsChecked: request.calendarIds.length,
      });

      return transformedResponse;
    } catch (error) {
      this.logger.logError(error as Error, 'Failed to check free/busy status');
      throw new GoogleCalendarError('Failed to check free/busy status', error);
    }
  }

  /**
   * Get calendar summary with basic analytics
   */
  async getCalendarSummary(
    timeMin: string,
    timeMax: string,
    calendarId: string = 'primary',
    includeAnalytics: boolean = false
  ): Promise<{
    totalEvents: number;
    events: CalendarEvent[];
    analytics?: {
      busyHours: number;
      averageEventDuration: number;
      mostCommonEventType: string;
    };
  }> {
    try {
      const events = await this.getEvents(timeMin, timeMax, calendarId, 250);
      
      let analytics;
      if (includeAnalytics) {
        // Calculate basic analytics
        const totalDuration = events.reduce((total, event) => {
          const start = new Date(event.start.dateTime).getTime();
          const end = new Date(event.end.dateTime).getTime();
          return total + (end - start);
        }, 0);

        analytics = {
          busyHours: Math.round(totalDuration / (1000 * 60 * 60) * 100) / 100,
          averageEventDuration: events.length > 0 
            ? Math.round(totalDuration / events.length / (1000 * 60)) 
            : 0,
          mostCommonEventType: 'meeting', // Simplified - could analyze event titles
        };
      }

      return {
        totalEvents: events.length,
        events,
        analytics,
      };
    } catch (error) {
      this.logger.logError(error as Error, 'Failed to get calendar summary');
      throw new GoogleCalendarError('Failed to get calendar summary', error);
    }
  }
} 