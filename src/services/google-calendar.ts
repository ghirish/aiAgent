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

/**
 * Google Calendar API Integration Service
 */
export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: any;
  private logger: Logger;

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

    // Initialize Calendar API
    this.calendar = google.calendar({ 
      version: 'v3', 
      auth: this.oauth2Client 
    });

    this.logger.info('Google Calendar service initialized');
  }

  /**
   * Generate OAuth 2.0 authorization URL
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });

    this.logger.info('Generated OAuth authorization URL');
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
      });

      const response = await this.calendar.events.list({
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

      this.logger.info(`Retrieved ${transformedEvents.length} calendar events`);
      return transformedEvents;
    } catch (error) {
      this.logger.logError(error as Error, 'Failed to fetch calendar events');
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

      if (!eventData.summary || !eventData.start || !eventData.end) {
        throw new ValidationError('Missing required event fields: summary, start, end');
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

      const response = await this.calendar.events.insert({
        calendarId,
        resource: googleEvent,
        sendNotifications: true,
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

      this.logger.info('Created calendar event', { eventId: createdEvent.id });
      return transformedEvent;
    } catch (error) {
      this.logger.logError(error as Error, 'Failed to create calendar event');
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