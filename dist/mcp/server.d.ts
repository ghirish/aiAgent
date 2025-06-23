import { Config } from '../types/index.js';
import { Logger } from '../utils/logger.js';
export declare class CalendarCopilotServer {
    private server;
    private config;
    private logger;
    private calendarService;
    private gmailService;
    constructor(config: Config, logger: Logger);
    private setupHandlers;
    private getAvailableTools;
    private handleToolCall;
    private handleGetCalendarEvents;
    private handleCheckAvailability;
    private handleFindMeetingSlots;
    private handleCreateEvent;
    private handleUpdateEvent;
    private handleCancelEvent;
    private handleGetCalendarSummary;
    private handleGetRecentEmails;
    private handleSearchEmails;
    private handleGetUnreadEmails;
    private loadOAuthTokens;
    start(): Promise<void>;
}
