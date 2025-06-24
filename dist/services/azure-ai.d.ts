import { ParsedQuery, AvailableSlot, MeetingSlotRequest } from '../types/index.js';
import { Logger } from '../utils/logger.js';
export declare class AzureAIService {
    private openai;
    private deploymentName;
    private logger;
    constructor(endpoint: string, apiKey: string, deploymentName: string, apiVersion: string, logger: Logger);
    parseCalendarQuery(query: string, conversationContext?: any): Promise<ParsedQuery>;
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
    analyzeEmailForScheduling(emailText: string): Promise<{
        hasSchedulingIntent: boolean;
        confidence: number;
        details?: {
            proposedTimes?: string[];
            meetingTopic?: string;
            participants?: string[];
            urgency?: 'low' | 'medium' | 'high';
            meetingType?: 'one-on-one' | 'team-meeting' | 'interview' | 'casual' | 'formal';
            estimatedDuration?: number;
            actionItems?: string[];
            responseRequired?: boolean;
            confidence?: number;
        };
    }>;
    private fallbackEmailAnalysis;
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
    generateSchedulingResponse(params: {
        originalEmail: {
            subject: string;
            from: string;
            content: string;
            proposedTimes?: string[];
        };
        responseType: 'accept' | 'counter-propose' | 'decline' | 'request-info';
        selectedTime?: string;
        counterProposals?: string[];
        reason?: string;
        additionalMessage?: string;
        includeCalendarInvite?: boolean;
        meetingDetails?: {
            location?: string;
            duration?: number;
            agenda?: string;
        };
    }): Promise<{
        subject: string;
        body: string;
        tone: string;
        urgency: 'low' | 'medium' | 'high';
    }>;
    private buildResponsePrompt;
    private generateFallbackResponse;
}
