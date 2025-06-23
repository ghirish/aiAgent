import { z } from 'zod';
export const ConfigSchema = z.object({
    google: z.object({
        clientId: z.string(),
        clientSecret: z.string(),
        redirectUri: z.string(),
    }),
    azure: z.object({
        endpoint: z.string(),
        apiKey: z.string(),
        deploymentName: z.string(),
        apiVersion: z.string(),
    }),
    app: z.object({
        nodeEnv: z.enum(['development', 'production', 'test']),
        logLevel: z.enum(['debug', 'info', 'warn', 'error']),
        port: z.number(),
    }),
    security: z.object({
        jwtSecret: z.string(),
        encryptionKey: z.string(),
    }),
    mcp: z.object({
        serverName: z.string(),
        serverVersion: z.string(),
    }),
});
export const CalendarEventSchema = z.object({
    id: z.string(),
    summary: z.string(),
    description: z.string().optional(),
    start: z.object({
        dateTime: z.string().optional(),
        date: z.string().optional(),
        timeZone: z.string().optional(),
    }),
    end: z.object({
        dateTime: z.string().optional(),
        date: z.string().optional(),
        timeZone: z.string().optional(),
    }),
    attendees: z.array(z.object({
        email: z.string(),
        displayName: z.string().optional(),
        responseStatus: z.enum(['accepted', 'declined', 'tentative', 'needsAction']).optional(),
    })).optional(),
    location: z.string().optional(),
    recurrence: z.array(z.string()).optional(),
    reminders: z.object({
        useDefault: z.boolean(),
        overrides: z.array(z.object({
            method: z.enum(['email', 'popup']),
            minutes: z.number(),
        })).optional(),
    }).optional(),
});
export const FreeBusyRequestSchema = z.object({
    timeMin: z.string(),
    timeMax: z.string(),
    timeZone: z.string().optional(),
    calendarIds: z.array(z.string()),
});
export const FreeBusyResponseSchema = z.object({
    calendars: z.record(z.object({
        busy: z.array(z.object({
            start: z.string(),
            end: z.string(),
        })),
        errors: z.array(z.object({
            domain: z.string(),
            reason: z.string(),
        })).optional(),
    })),
});
export const MeetingSlotRequestSchema = z.object({
    duration: z.number(),
    timeMin: z.string(),
    timeMax: z.string(),
    timeZone: z.string().optional(),
    workingHours: z.object({
        start: z.string(),
        end: z.string(),
    }).optional(),
    bufferTime: z.number().optional(),
    maxSuggestions: z.number().min(1).max(10).optional(),
});
export const AvailableSlotSchema = z.object({
    start: z.string(),
    end: z.string(),
    duration: z.number(),
    confidence: z.number(),
});
export const ParsedQuerySchema = z.object({
    intent: z.enum(['schedule', 'query', 'update', 'cancel', 'availability', 'email_query', 'email_search']),
    entities: z.object({
        dateTime: z.string().optional(),
        duration: z.number().optional(),
        title: z.string().optional(),
        attendees: z.array(z.string()).optional(),
        location: z.string().optional(),
        description: z.string().optional(),
    }),
    confidence: z.number(),
});
export class CalendarCopilotError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'CalendarCopilotError';
    }
}
export class GoogleCalendarError extends CalendarCopilotError {
    constructor(message, details) {
        super(message, 'GOOGLE_CALENDAR_ERROR', 503, details);
        this.name = 'GoogleCalendarError';
    }
}
export class AzureAIError extends CalendarCopilotError {
    constructor(message, details) {
        super(message, 'AZURE_AI_ERROR', 503, details);
        this.name = 'AzureAIError';
    }
}
export class ValidationError extends CalendarCopilotError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', 400, details);
        this.name = 'ValidationError';
    }
}
export const GmailMessageSchema = z.object({
    id: z.string(),
    threadId: z.string(),
    labelIds: z.array(z.string()).optional(),
    snippet: z.string(),
    payload: z.object({
        partId: z.string().optional(),
        mimeType: z.string(),
        filename: z.string().optional(),
        headers: z.array(z.object({
            name: z.string(),
            value: z.string(),
        })),
        body: z.object({
            attachmentId: z.string().optional(),
            size: z.number().optional(),
            data: z.string().optional(),
        }).optional(),
        parts: z.array(z.any()).optional(),
    }),
    sizeEstimate: z.number().optional(),
    historyId: z.string().optional(),
    internalDate: z.string().optional(),
});
export const EmailSummarySchema = z.object({
    id: z.string(),
    subject: z.string(),
    from: z.string(),
    to: z.array(z.string()),
    date: z.string(),
    snippet: z.string(),
    body: z.string().optional(),
    isUnread: z.boolean(),
    hasSchedulingIntent: z.boolean().optional(),
    schedulingDetails: z.object({
        proposedTimes: z.array(z.string()).optional(),
        meetingTopic: z.string().optional(),
        participants: z.array(z.string()).optional(),
        urgency: z.enum(['low', 'medium', 'high']).optional(),
    }).optional(),
});
export class GmailError extends CalendarCopilotError {
    constructor(message, details) {
        super(message, 'GMAIL_ERROR', 503, details);
        this.name = 'GmailError';
    }
}
