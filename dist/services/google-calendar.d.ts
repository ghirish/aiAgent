import { CalendarEvent, FreeBusyRequest, FreeBusyResponse } from '../types/index.js';
import { Logger } from '../utils/logger.js';
export declare class GoogleCalendarService {
    private oauth2Client;
    private calendar;
    private logger;
    constructor(clientId: string, clientSecret: string, redirectUri: string, logger: Logger);
    getAuthUrl(): string;
    exchangeCodeForTokens(code: string): Promise<void>;
    setAccessToken(accessToken: string, refreshToken?: string): void;
    getEvents(timeMin: string, timeMax: string, calendarId?: string, maxResults?: number): Promise<CalendarEvent[]>;
    createEvent(eventData: Partial<CalendarEvent>, calendarId?: string): Promise<CalendarEvent>;
    updateEvent(eventId: string, eventData: Partial<CalendarEvent>, calendarId?: string): Promise<CalendarEvent>;
    deleteEvent(eventId: string, calendarId?: string, sendNotifications?: boolean): Promise<void>;
    checkFreeBusy(request: FreeBusyRequest): Promise<FreeBusyResponse>;
    getCalendarSummary(timeMin: string, timeMax: string, calendarId?: string, includeAnalytics?: boolean): Promise<{
        totalEvents: number;
        events: CalendarEvent[];
        analytics?: {
            busyHours: number;
            averageEventDuration: number;
            mostCommonEventType: string;
        };
    }>;
}
