import { ParsedQuery, AvailableSlot, MeetingSlotRequest } from '../types/index.js';
import { Logger } from '../utils/logger.js';
export declare class AzureAIService {
    private openai;
    private deploymentName;
    private logger;
    constructor(endpoint: string, apiKey: string, deploymentName: string, apiVersion: string, logger: Logger);
    parseCalendarQuery(query: string): Promise<ParsedQuery>;
    private fallbackParse;
    private extractDuration;
    private extractEmails;
    private extractTitle;
    findOptimalMeetingSlots(request: MeetingSlotRequest, busyTimes: Array<{
        start: string;
        end: string;
    }>, preferences?: {
        preferredTimes?: string[];
        avoidTimes?: string[];
    }): Promise<AvailableSlot[]>;
    private generateDaySlots;
    private scoreSlots;
    generateEventSuggestions(query: string, context?: {
        recentEvents?: string[];
        userPreferences?: Record<string, unknown>;
    }): Promise<{
        suggestions: Array<{
            title: string;
            description?: string;
            duration: number;
            type: string;
        }>;
    }>;
}
