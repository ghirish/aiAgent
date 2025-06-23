import { Config } from '../types/index.js';
import { Logger } from '../utils/logger.js';
export declare class CalendarCopilotServer {
    private server;
    private config;
    private logger;
    private googleCalendarService?;
    private gmailService?;
    private emailStorageService?;
    private emailMonitorService?;
    private emailSchedulerService?;
    private azureAIService?;
    constructor(config: Config, logger: Logger);
    private setupHandlers;
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
    private handleMonitorNewEmails;
    private handleGetEmailMonitoringStatus;
    private handleUpdateEmailMonitoringConfig;
    private handleGetSchedulingEmails;
    private handleAnalyzeEmailForScheduling;
    private handleProcessBatchEmails;
    private loadOAuthTokens;
    start(): Promise<void>;
    initialize(config: {
        azure: {
            endpoint: string;
            apiKey: string;
            deploymentName: string;
            apiVersion: string;
        };
        google: {
            clientId: string;
            clientSecret: string;
            redirectUri: string;
        };
    }): Promise<void>;
}
