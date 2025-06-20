import { Config } from '../types/index.js';
import { Logger } from '../utils/logger.js';
export declare class CalendarCopilotServer {
    private server;
    private config;
    private logger;
    private calendarService;
    private aiService;
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
    private handleParseNaturalQuery;
    setAccessToken(accessToken: string, refreshToken?: string): void;
    getAuthUrl(): string;
    exchangeCodeForTokens(code: string): Promise<void>;
    start(): Promise<void>;
}
