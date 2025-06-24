import { z } from 'zod';
export declare const ConfigSchema: z.ZodObject<{
    google: z.ZodObject<{
        clientId: z.ZodString;
        clientSecret: z.ZodString;
        redirectUri: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        clientId?: string;
        clientSecret?: string;
        redirectUri?: string;
    }, {
        clientId?: string;
        clientSecret?: string;
        redirectUri?: string;
    }>;
    azure: z.ZodObject<{
        endpoint: z.ZodString;
        apiKey: z.ZodString;
        deploymentName: z.ZodString;
        apiVersion: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        endpoint?: string;
        apiKey?: string;
        deploymentName?: string;
        apiVersion?: string;
    }, {
        endpoint?: string;
        apiKey?: string;
        deploymentName?: string;
        apiVersion?: string;
    }>;
    app: z.ZodObject<{
        nodeEnv: z.ZodEnum<["development", "production", "test"]>;
        logLevel: z.ZodEnum<["debug", "info", "warn", "error"]>;
        port: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        nodeEnv?: "development" | "production" | "test";
        logLevel?: "debug" | "info" | "warn" | "error";
        port?: number;
    }, {
        nodeEnv?: "development" | "production" | "test";
        logLevel?: "debug" | "info" | "warn" | "error";
        port?: number;
    }>;
    security: z.ZodObject<{
        jwtSecret: z.ZodString;
        encryptionKey: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        jwtSecret?: string;
        encryptionKey?: string;
    }, {
        jwtSecret?: string;
        encryptionKey?: string;
    }>;
    mcp: z.ZodObject<{
        serverName: z.ZodString;
        serverVersion: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        serverName?: string;
        serverVersion?: string;
    }, {
        serverName?: string;
        serverVersion?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    google?: {
        clientId?: string;
        clientSecret?: string;
        redirectUri?: string;
    };
    azure?: {
        endpoint?: string;
        apiKey?: string;
        deploymentName?: string;
        apiVersion?: string;
    };
    app?: {
        nodeEnv?: "development" | "production" | "test";
        logLevel?: "debug" | "info" | "warn" | "error";
        port?: number;
    };
    security?: {
        jwtSecret?: string;
        encryptionKey?: string;
    };
    mcp?: {
        serverName?: string;
        serverVersion?: string;
    };
}, {
    google?: {
        clientId?: string;
        clientSecret?: string;
        redirectUri?: string;
    };
    azure?: {
        endpoint?: string;
        apiKey?: string;
        deploymentName?: string;
        apiVersion?: string;
    };
    app?: {
        nodeEnv?: "development" | "production" | "test";
        logLevel?: "debug" | "info" | "warn" | "error";
        port?: number;
    };
    security?: {
        jwtSecret?: string;
        encryptionKey?: string;
    };
    mcp?: {
        serverName?: string;
        serverVersion?: string;
    };
}>;
export type Config = z.infer<typeof ConfigSchema>;
export declare const CalendarEventSchema: z.ZodObject<{
    id: z.ZodString;
    summary: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    start: z.ZodObject<{
        dateTime: z.ZodOptional<z.ZodString>;
        date: z.ZodOptional<z.ZodString>;
        timeZone: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        date?: string;
        dateTime?: string;
        timeZone?: string;
    }, {
        date?: string;
        dateTime?: string;
        timeZone?: string;
    }>;
    end: z.ZodObject<{
        dateTime: z.ZodOptional<z.ZodString>;
        date: z.ZodOptional<z.ZodString>;
        timeZone: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        date?: string;
        dateTime?: string;
        timeZone?: string;
    }, {
        date?: string;
        dateTime?: string;
        timeZone?: string;
    }>;
    attendees: z.ZodOptional<z.ZodArray<z.ZodObject<{
        email: z.ZodString;
        displayName: z.ZodOptional<z.ZodString>;
        responseStatus: z.ZodOptional<z.ZodEnum<["accepted", "declined", "tentative", "needsAction"]>>;
    }, "strip", z.ZodTypeAny, {
        email?: string;
        displayName?: string;
        responseStatus?: "accepted" | "declined" | "tentative" | "needsAction";
    }, {
        email?: string;
        displayName?: string;
        responseStatus?: "accepted" | "declined" | "tentative" | "needsAction";
    }>, "many">>;
    location: z.ZodOptional<z.ZodString>;
    recurrence: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    reminders: z.ZodOptional<z.ZodObject<{
        useDefault: z.ZodBoolean;
        overrides: z.ZodOptional<z.ZodArray<z.ZodObject<{
            method: z.ZodEnum<["email", "popup"]>;
            minutes: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            method?: "email" | "popup";
            minutes?: number;
        }, {
            method?: "email" | "popup";
            minutes?: number;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        useDefault?: boolean;
        overrides?: {
            method?: "email" | "popup";
            minutes?: number;
        }[];
    }, {
        useDefault?: boolean;
        overrides?: {
            method?: "email" | "popup";
            minutes?: number;
        }[];
    }>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    summary?: string;
    description?: string;
    start?: {
        date?: string;
        dateTime?: string;
        timeZone?: string;
    };
    end?: {
        date?: string;
        dateTime?: string;
        timeZone?: string;
    };
    attendees?: {
        email?: string;
        displayName?: string;
        responseStatus?: "accepted" | "declined" | "tentative" | "needsAction";
    }[];
    location?: string;
    recurrence?: string[];
    reminders?: {
        useDefault?: boolean;
        overrides?: {
            method?: "email" | "popup";
            minutes?: number;
        }[];
    };
}, {
    id?: string;
    summary?: string;
    description?: string;
    start?: {
        date?: string;
        dateTime?: string;
        timeZone?: string;
    };
    end?: {
        date?: string;
        dateTime?: string;
        timeZone?: string;
    };
    attendees?: {
        email?: string;
        displayName?: string;
        responseStatus?: "accepted" | "declined" | "tentative" | "needsAction";
    }[];
    location?: string;
    recurrence?: string[];
    reminders?: {
        useDefault?: boolean;
        overrides?: {
            method?: "email" | "popup";
            minutes?: number;
        }[];
    };
}>;
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;
export declare const FreeBusyRequestSchema: z.ZodObject<{
    timeMin: z.ZodString;
    timeMax: z.ZodString;
    timeZone: z.ZodOptional<z.ZodString>;
    calendarIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    timeZone?: string;
    timeMin?: string;
    timeMax?: string;
    calendarIds?: string[];
}, {
    timeZone?: string;
    timeMin?: string;
    timeMax?: string;
    calendarIds?: string[];
}>;
export type FreeBusyRequest = z.infer<typeof FreeBusyRequestSchema>;
export declare const FreeBusyResponseSchema: z.ZodObject<{
    calendars: z.ZodRecord<z.ZodString, z.ZodObject<{
        busy: z.ZodArray<z.ZodObject<{
            start: z.ZodString;
            end: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            start?: string;
            end?: string;
        }, {
            start?: string;
            end?: string;
        }>, "many">;
        errors: z.ZodOptional<z.ZodArray<z.ZodObject<{
            domain: z.ZodString;
            reason: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            domain?: string;
            reason?: string;
        }, {
            domain?: string;
            reason?: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        busy?: {
            start?: string;
            end?: string;
        }[];
        errors?: {
            domain?: string;
            reason?: string;
        }[];
    }, {
        busy?: {
            start?: string;
            end?: string;
        }[];
        errors?: {
            domain?: string;
            reason?: string;
        }[];
    }>>;
}, "strip", z.ZodTypeAny, {
    calendars?: Record<string, {
        busy?: {
            start?: string;
            end?: string;
        }[];
        errors?: {
            domain?: string;
            reason?: string;
        }[];
    }>;
}, {
    calendars?: Record<string, {
        busy?: {
            start?: string;
            end?: string;
        }[];
        errors?: {
            domain?: string;
            reason?: string;
        }[];
    }>;
}>;
export type FreeBusyResponse = z.infer<typeof FreeBusyResponseSchema>;
export declare const MeetingSlotRequestSchema: z.ZodObject<{
    duration: z.ZodNumber;
    timeMin: z.ZodString;
    timeMax: z.ZodString;
    timeZone: z.ZodOptional<z.ZodString>;
    workingHours: z.ZodOptional<z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        start?: string;
        end?: string;
    }, {
        start?: string;
        end?: string;
    }>>;
    bufferTime: z.ZodOptional<z.ZodNumber>;
    maxSuggestions: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timeZone?: string;
    timeMin?: string;
    timeMax?: string;
    duration?: number;
    workingHours?: {
        start?: string;
        end?: string;
    };
    bufferTime?: number;
    maxSuggestions?: number;
}, {
    timeZone?: string;
    timeMin?: string;
    timeMax?: string;
    duration?: number;
    workingHours?: {
        start?: string;
        end?: string;
    };
    bufferTime?: number;
    maxSuggestions?: number;
}>;
export type MeetingSlotRequest = z.infer<typeof MeetingSlotRequestSchema>;
export declare const AvailableSlotSchema: z.ZodObject<{
    start: z.ZodString;
    end: z.ZodString;
    duration: z.ZodNumber;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    start?: string;
    end?: string;
    duration?: number;
    confidence?: number;
}, {
    start?: string;
    end?: string;
    duration?: number;
    confidence?: number;
}>;
export type AvailableSlot = z.infer<typeof AvailableSlotSchema>;
export declare const ParsedQuerySchema: z.ZodObject<{
    intent: z.ZodEnum<["schedule", "query", "update", "cancel", "availability", "email_query", "email_search"]>;
    entities: z.ZodObject<{
        dateTime: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        title: z.ZodOptional<z.ZodString>;
        currentTitle: z.ZodOptional<z.ZodString>;
        newTitle: z.ZodOptional<z.ZodString>;
        attendees: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        location: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        dateTime?: string;
        attendees?: string[];
        location?: string;
        duration?: number;
        title?: string;
        currentTitle?: string;
        newTitle?: string;
    }, {
        description?: string;
        dateTime?: string;
        attendees?: string[];
        location?: string;
        duration?: number;
        title?: string;
        currentTitle?: string;
        newTitle?: string;
    }>;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    confidence?: number;
    intent?: "schedule" | "query" | "update" | "cancel" | "availability" | "email_query" | "email_search";
    entities?: {
        description?: string;
        dateTime?: string;
        attendees?: string[];
        location?: string;
        duration?: number;
        title?: string;
        currentTitle?: string;
        newTitle?: string;
    };
}, {
    confidence?: number;
    intent?: "schedule" | "query" | "update" | "cancel" | "availability" | "email_query" | "email_search";
    entities?: {
        description?: string;
        dateTime?: string;
        attendees?: string[];
        location?: string;
        duration?: number;
        title?: string;
        currentTitle?: string;
        newTitle?: string;
    };
}>;
export type ParsedQuery = z.infer<typeof ParsedQuerySchema>;
export declare class CalendarCopilotError extends Error {
    code: string;
    statusCode: number;
    details?: unknown;
    constructor(message: string, code: string, statusCode?: number, details?: unknown);
}
export declare class GoogleCalendarError extends CalendarCopilotError {
    constructor(message: string, details?: unknown);
}
export declare class AzureAIError extends CalendarCopilotError {
    constructor(message: string, details?: unknown);
}
export declare class ValidationError extends CalendarCopilotError {
    constructor(message: string, details?: unknown);
}
export interface LogContext {
    userId?: string;
    requestId?: string;
    operation?: string;
    [key: string]: unknown;
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export declare const GmailMessageSchema: z.ZodObject<{
    id: z.ZodString;
    threadId: z.ZodString;
    labelIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    snippet: z.ZodString;
    payload: z.ZodObject<{
        partId: z.ZodOptional<z.ZodString>;
        mimeType: z.ZodString;
        filename: z.ZodOptional<z.ZodString>;
        headers: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            value?: string;
            name?: string;
        }, {
            value?: string;
            name?: string;
        }>, "many">;
        body: z.ZodOptional<z.ZodObject<{
            attachmentId: z.ZodOptional<z.ZodString>;
            size: z.ZodOptional<z.ZodNumber>;
            data: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            attachmentId?: string;
            size?: number;
            data?: string;
        }, {
            attachmentId?: string;
            size?: number;
            data?: string;
        }>>;
        parts: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    }, "strip", z.ZodTypeAny, {
        partId?: string;
        mimeType?: string;
        filename?: string;
        headers?: {
            value?: string;
            name?: string;
        }[];
        body?: {
            attachmentId?: string;
            size?: number;
            data?: string;
        };
        parts?: any[];
    }, {
        partId?: string;
        mimeType?: string;
        filename?: string;
        headers?: {
            value?: string;
            name?: string;
        }[];
        body?: {
            attachmentId?: string;
            size?: number;
            data?: string;
        };
        parts?: any[];
    }>;
    sizeEstimate: z.ZodOptional<z.ZodNumber>;
    historyId: z.ZodOptional<z.ZodString>;
    internalDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    threadId?: string;
    labelIds?: string[];
    snippet?: string;
    payload?: {
        partId?: string;
        mimeType?: string;
        filename?: string;
        headers?: {
            value?: string;
            name?: string;
        }[];
        body?: {
            attachmentId?: string;
            size?: number;
            data?: string;
        };
        parts?: any[];
    };
    sizeEstimate?: number;
    historyId?: string;
    internalDate?: string;
}, {
    id?: string;
    threadId?: string;
    labelIds?: string[];
    snippet?: string;
    payload?: {
        partId?: string;
        mimeType?: string;
        filename?: string;
        headers?: {
            value?: string;
            name?: string;
        }[];
        body?: {
            attachmentId?: string;
            size?: number;
            data?: string;
        };
        parts?: any[];
    };
    sizeEstimate?: number;
    historyId?: string;
    internalDate?: string;
}>;
export type GmailMessage = z.infer<typeof GmailMessageSchema>;
export declare const EmailSummarySchema: z.ZodObject<{
    id: z.ZodString;
    subject: z.ZodString;
    from: z.ZodString;
    to: z.ZodArray<z.ZodString, "many">;
    date: z.ZodString;
    snippet: z.ZodString;
    body: z.ZodOptional<z.ZodString>;
    isUnread: z.ZodBoolean;
    hasSchedulingIntent: z.ZodOptional<z.ZodBoolean>;
    schedulingDetails: z.ZodOptional<z.ZodObject<{
        proposedTimes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        meetingTopic: z.ZodOptional<z.ZodString>;
        participants: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        urgency: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
    }, "strip", z.ZodTypeAny, {
        proposedTimes?: string[];
        meetingTopic?: string;
        participants?: string[];
        urgency?: "low" | "medium" | "high";
    }, {
        proposedTimes?: string[];
        meetingTopic?: string;
        participants?: string[];
        urgency?: "low" | "medium" | "high";
    }>>;
}, "strip", z.ZodTypeAny, {
    date?: string;
    id?: string;
    snippet?: string;
    body?: string;
    subject?: string;
    from?: string;
    to?: string[];
    isUnread?: boolean;
    hasSchedulingIntent?: boolean;
    schedulingDetails?: {
        proposedTimes?: string[];
        meetingTopic?: string;
        participants?: string[];
        urgency?: "low" | "medium" | "high";
    };
}, {
    date?: string;
    id?: string;
    snippet?: string;
    body?: string;
    subject?: string;
    from?: string;
    to?: string[];
    isUnread?: boolean;
    hasSchedulingIntent?: boolean;
    schedulingDetails?: {
        proposedTimes?: string[];
        meetingTopic?: string;
        participants?: string[];
        urgency?: "low" | "medium" | "high";
    };
}>;
export type EmailSummary = z.infer<typeof EmailSummarySchema>;
export declare class GmailError extends CalendarCopilotError {
    constructor(message: string, details?: unknown);
}
export declare const EmailMonitorStateSchema: z.ZodObject<{
    lastChecked: z.ZodString;
    processedEmails: z.ZodSet<z.ZodString>;
    totalEmailsProcessed: z.ZodNumber;
    schedulingEmailsFound: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    lastChecked?: string;
    processedEmails?: Set<string>;
    totalEmailsProcessed?: number;
    schedulingEmailsFound?: number;
}, {
    lastChecked?: string;
    processedEmails?: Set<string>;
    totalEmailsProcessed?: number;
    schedulingEmailsFound?: number;
}>;
export type EmailMonitorState = z.infer<typeof EmailMonitorStateSchema>;
export declare const ProcessedEmailSchema: z.ZodObject<{
    id: z.ZodString;
    subject: z.ZodString;
    from: z.ZodString;
    receivedAt: z.ZodString;
    processedAt: z.ZodString;
    hasSchedulingIntent: z.ZodBoolean;
    schedulingDetails: z.ZodOptional<z.ZodObject<{
        proposedTimes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        meetingTopic: z.ZodOptional<z.ZodString>;
        participants: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        urgency: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        confidence?: number;
        proposedTimes?: string[];
        meetingTopic?: string;
        participants?: string[];
        urgency?: "low" | "medium" | "high";
    }, {
        confidence?: number;
        proposedTimes?: string[];
        meetingTopic?: string;
        participants?: string[];
        urgency?: "low" | "medium" | "high";
    }>>;
    actionTaken: z.ZodOptional<z.ZodEnum<["none", "notification_sent", "calendar_suggestion", "auto_scheduled"]>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    subject?: string;
    from?: string;
    hasSchedulingIntent?: boolean;
    schedulingDetails?: {
        confidence?: number;
        proposedTimes?: string[];
        meetingTopic?: string;
        participants?: string[];
        urgency?: "low" | "medium" | "high";
    };
    receivedAt?: string;
    processedAt?: string;
    actionTaken?: "none" | "notification_sent" | "calendar_suggestion" | "auto_scheduled";
}, {
    id?: string;
    subject?: string;
    from?: string;
    hasSchedulingIntent?: boolean;
    schedulingDetails?: {
        confidence?: number;
        proposedTimes?: string[];
        meetingTopic?: string;
        participants?: string[];
        urgency?: "low" | "medium" | "high";
    };
    receivedAt?: string;
    processedAt?: string;
    actionTaken?: "none" | "notification_sent" | "calendar_suggestion" | "auto_scheduled";
}>;
export type ProcessedEmail = z.infer<typeof ProcessedEmailSchema>;
export declare const EmailMonitoringConfigSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    pollingIntervalMinutes: z.ZodNumber;
    maxEmailsPerCheck: z.ZodNumber;
    schedulingKeywords: z.ZodArray<z.ZodString, "many">;
    notificationWebhookUrl: z.ZodOptional<z.ZodString>;
    autoProcessing: z.ZodObject<{
        enabled: z.ZodBoolean;
        confidenceThreshold: z.ZodNumber;
        autoSuggestMeetings: z.ZodBoolean;
        autoCreateCalendarEvents: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean;
        confidenceThreshold?: number;
        autoSuggestMeetings?: boolean;
        autoCreateCalendarEvents?: boolean;
    }, {
        enabled?: boolean;
        confidenceThreshold?: number;
        autoSuggestMeetings?: boolean;
        autoCreateCalendarEvents?: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    enabled?: boolean;
    pollingIntervalMinutes?: number;
    maxEmailsPerCheck?: number;
    schedulingKeywords?: string[];
    notificationWebhookUrl?: string;
    autoProcessing?: {
        enabled?: boolean;
        confidenceThreshold?: number;
        autoSuggestMeetings?: boolean;
        autoCreateCalendarEvents?: boolean;
    };
}, {
    enabled?: boolean;
    pollingIntervalMinutes?: number;
    maxEmailsPerCheck?: number;
    schedulingKeywords?: string[];
    notificationWebhookUrl?: string;
    autoProcessing?: {
        enabled?: boolean;
        confidenceThreshold?: number;
        autoSuggestMeetings?: boolean;
        autoCreateCalendarEvents?: boolean;
    };
}>;
export type EmailMonitoringConfig = z.infer<typeof EmailMonitoringConfigSchema>;
export declare class EmailSchedulerError extends CalendarCopilotError {
    constructor(message: string, details?: unknown);
}
export declare const SchedulingAnalysisSchema: z.ZodObject<{
    hasSchedulingIntent: z.ZodBoolean;
    confidence: z.ZodNumber;
    schedulingDetails: z.ZodOptional<z.ZodObject<{
        proposedTimes: z.ZodArray<z.ZodString, "many">;
        parsedDates: z.ZodArray<z.ZodObject<{
            original: z.ZodString;
            parsed: z.ZodDate;
            confidence: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            confidence?: number;
            original?: string;
            parsed?: Date;
        }, {
            confidence?: number;
            original?: string;
            parsed?: Date;
        }>, "many">;
        meetingTopic: z.ZodString;
        participants: z.ZodArray<z.ZodString, "many">;
        urgency: z.ZodEnum<["low", "medium", "high"]>;
        meetingType: z.ZodEnum<["one-on-one", "team-meeting", "interview", "casual", "formal"]>;
        estimatedDuration: z.ZodNumber;
        actionItems: z.ZodArray<z.ZodString, "many">;
        responseRequired: z.ZodBoolean;
        calendarAvailability: z.ZodOptional<z.ZodObject<{
            hasConflicts: z.ZodBoolean;
            suggestedAlternatives: z.ZodOptional<z.ZodArray<z.ZodObject<{
                start: z.ZodString;
                end: z.ZodString;
                duration: z.ZodNumber;
                confidence: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                start?: string;
                end?: string;
                duration?: number;
                confidence?: number;
            }, {
                start?: string;
                end?: string;
                duration?: number;
                confidence?: number;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            hasConflicts?: boolean;
            suggestedAlternatives?: {
                start?: string;
                end?: string;
                duration?: number;
                confidence?: number;
            }[];
        }, {
            hasConflicts?: boolean;
            suggestedAlternatives?: {
                start?: string;
                end?: string;
                duration?: number;
                confidence?: number;
            }[];
        }>>;
    }, "strip", z.ZodTypeAny, {
        proposedTimes?: string[];
        meetingTopic?: string;
        participants?: string[];
        urgency?: "low" | "medium" | "high";
        parsedDates?: {
            confidence?: number;
            original?: string;
            parsed?: Date;
        }[];
        meetingType?: "one-on-one" | "team-meeting" | "interview" | "casual" | "formal";
        estimatedDuration?: number;
        actionItems?: string[];
        responseRequired?: boolean;
        calendarAvailability?: {
            hasConflicts?: boolean;
            suggestedAlternatives?: {
                start?: string;
                end?: string;
                duration?: number;
                confidence?: number;
            }[];
        };
    }, {
        proposedTimes?: string[];
        meetingTopic?: string;
        participants?: string[];
        urgency?: "low" | "medium" | "high";
        parsedDates?: {
            confidence?: number;
            original?: string;
            parsed?: Date;
        }[];
        meetingType?: "one-on-one" | "team-meeting" | "interview" | "casual" | "formal";
        estimatedDuration?: number;
        actionItems?: string[];
        responseRequired?: boolean;
        calendarAvailability?: {
            hasConflicts?: boolean;
            suggestedAlternatives?: {
                start?: string;
                end?: string;
                duration?: number;
                confidence?: number;
            }[];
        };
    }>>;
    suggestedActions: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["create_event", "check_availability", "suggest_times", "draft_response"]>;
        priority: z.ZodEnum<["high", "medium", "low"]>;
        description: z.ZodString;
        data: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        type?: "create_event" | "check_availability" | "suggest_times" | "draft_response";
        description?: string;
        data?: any;
        priority?: "low" | "medium" | "high";
    }, {
        type?: "create_event" | "check_availability" | "suggest_times" | "draft_response";
        description?: string;
        data?: any;
        priority?: "low" | "medium" | "high";
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    confidence?: number;
    hasSchedulingIntent?: boolean;
    schedulingDetails?: {
        proposedTimes?: string[];
        meetingTopic?: string;
        participants?: string[];
        urgency?: "low" | "medium" | "high";
        parsedDates?: {
            confidence?: number;
            original?: string;
            parsed?: Date;
        }[];
        meetingType?: "one-on-one" | "team-meeting" | "interview" | "casual" | "formal";
        estimatedDuration?: number;
        actionItems?: string[];
        responseRequired?: boolean;
        calendarAvailability?: {
            hasConflicts?: boolean;
            suggestedAlternatives?: {
                start?: string;
                end?: string;
                duration?: number;
                confidence?: number;
            }[];
        };
    };
    suggestedActions?: {
        type?: "create_event" | "check_availability" | "suggest_times" | "draft_response";
        description?: string;
        data?: any;
        priority?: "low" | "medium" | "high";
    }[];
}, {
    confidence?: number;
    hasSchedulingIntent?: boolean;
    schedulingDetails?: {
        proposedTimes?: string[];
        meetingTopic?: string;
        participants?: string[];
        urgency?: "low" | "medium" | "high";
        parsedDates?: {
            confidence?: number;
            original?: string;
            parsed?: Date;
        }[];
        meetingType?: "one-on-one" | "team-meeting" | "interview" | "casual" | "formal";
        estimatedDuration?: number;
        actionItems?: string[];
        responseRequired?: boolean;
        calendarAvailability?: {
            hasConflicts?: boolean;
            suggestedAlternatives?: {
                start?: string;
                end?: string;
                duration?: number;
                confidence?: number;
            }[];
        };
    };
    suggestedActions?: {
        type?: "create_event" | "check_availability" | "suggest_times" | "draft_response";
        description?: string;
        data?: any;
        priority?: "low" | "medium" | "high";
    }[];
}>;
export type SchedulingAnalysis = z.infer<typeof SchedulingAnalysisSchema>;
export declare const EmailBatchProcessingResultSchema: z.ZodObject<{
    processed: z.ZodNumber;
    schedulingEmails: z.ZodNumber;
    highPriorityActions: z.ZodNumber;
    results: z.ZodArray<z.ZodObject<{
        email: z.ZodObject<{
            id: z.ZodString;
            subject: z.ZodString;
            from: z.ZodString;
            to: z.ZodArray<z.ZodString, "many">;
            date: z.ZodString;
            snippet: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            isUnread: z.ZodBoolean;
            hasSchedulingIntent: z.ZodOptional<z.ZodBoolean>;
            schedulingDetails: z.ZodOptional<z.ZodObject<{
                proposedTimes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                meetingTopic: z.ZodOptional<z.ZodString>;
                participants: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                urgency: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
            }, "strip", z.ZodTypeAny, {
                proposedTimes?: string[];
                meetingTopic?: string;
                participants?: string[];
                urgency?: "low" | "medium" | "high";
            }, {
                proposedTimes?: string[];
                meetingTopic?: string;
                participants?: string[];
                urgency?: "low" | "medium" | "high";
            }>>;
        }, "strip", z.ZodTypeAny, {
            date?: string;
            id?: string;
            snippet?: string;
            body?: string;
            subject?: string;
            from?: string;
            to?: string[];
            isUnread?: boolean;
            hasSchedulingIntent?: boolean;
            schedulingDetails?: {
                proposedTimes?: string[];
                meetingTopic?: string;
                participants?: string[];
                urgency?: "low" | "medium" | "high";
            };
        }, {
            date?: string;
            id?: string;
            snippet?: string;
            body?: string;
            subject?: string;
            from?: string;
            to?: string[];
            isUnread?: boolean;
            hasSchedulingIntent?: boolean;
            schedulingDetails?: {
                proposedTimes?: string[];
                meetingTopic?: string;
                participants?: string[];
                urgency?: "low" | "medium" | "high";
            };
        }>;
        analysis: z.ZodObject<{
            hasSchedulingIntent: z.ZodBoolean;
            confidence: z.ZodNumber;
            schedulingDetails: z.ZodOptional<z.ZodObject<{
                proposedTimes: z.ZodArray<z.ZodString, "many">;
                parsedDates: z.ZodArray<z.ZodObject<{
                    original: z.ZodString;
                    parsed: z.ZodDate;
                    confidence: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    confidence?: number;
                    original?: string;
                    parsed?: Date;
                }, {
                    confidence?: number;
                    original?: string;
                    parsed?: Date;
                }>, "many">;
                meetingTopic: z.ZodString;
                participants: z.ZodArray<z.ZodString, "many">;
                urgency: z.ZodEnum<["low", "medium", "high"]>;
                meetingType: z.ZodEnum<["one-on-one", "team-meeting", "interview", "casual", "formal"]>;
                estimatedDuration: z.ZodNumber;
                actionItems: z.ZodArray<z.ZodString, "many">;
                responseRequired: z.ZodBoolean;
                calendarAvailability: z.ZodOptional<z.ZodObject<{
                    hasConflicts: z.ZodBoolean;
                    suggestedAlternatives: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        start: z.ZodString;
                        end: z.ZodString;
                        duration: z.ZodNumber;
                        confidence: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        start?: string;
                        end?: string;
                        duration?: number;
                        confidence?: number;
                    }, {
                        start?: string;
                        end?: string;
                        duration?: number;
                        confidence?: number;
                    }>, "many">>;
                }, "strip", z.ZodTypeAny, {
                    hasConflicts?: boolean;
                    suggestedAlternatives?: {
                        start?: string;
                        end?: string;
                        duration?: number;
                        confidence?: number;
                    }[];
                }, {
                    hasConflicts?: boolean;
                    suggestedAlternatives?: {
                        start?: string;
                        end?: string;
                        duration?: number;
                        confidence?: number;
                    }[];
                }>>;
            }, "strip", z.ZodTypeAny, {
                proposedTimes?: string[];
                meetingTopic?: string;
                participants?: string[];
                urgency?: "low" | "medium" | "high";
                parsedDates?: {
                    confidence?: number;
                    original?: string;
                    parsed?: Date;
                }[];
                meetingType?: "one-on-one" | "team-meeting" | "interview" | "casual" | "formal";
                estimatedDuration?: number;
                actionItems?: string[];
                responseRequired?: boolean;
                calendarAvailability?: {
                    hasConflicts?: boolean;
                    suggestedAlternatives?: {
                        start?: string;
                        end?: string;
                        duration?: number;
                        confidence?: number;
                    }[];
                };
            }, {
                proposedTimes?: string[];
                meetingTopic?: string;
                participants?: string[];
                urgency?: "low" | "medium" | "high";
                parsedDates?: {
                    confidence?: number;
                    original?: string;
                    parsed?: Date;
                }[];
                meetingType?: "one-on-one" | "team-meeting" | "interview" | "casual" | "formal";
                estimatedDuration?: number;
                actionItems?: string[];
                responseRequired?: boolean;
                calendarAvailability?: {
                    hasConflicts?: boolean;
                    suggestedAlternatives?: {
                        start?: string;
                        end?: string;
                        duration?: number;
                        confidence?: number;
                    }[];
                };
            }>>;
            suggestedActions: z.ZodArray<z.ZodObject<{
                type: z.ZodEnum<["create_event", "check_availability", "suggest_times", "draft_response"]>;
                priority: z.ZodEnum<["high", "medium", "low"]>;
                description: z.ZodString;
                data: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                type?: "create_event" | "check_availability" | "suggest_times" | "draft_response";
                description?: string;
                data?: any;
                priority?: "low" | "medium" | "high";
            }, {
                type?: "create_event" | "check_availability" | "suggest_times" | "draft_response";
                description?: string;
                data?: any;
                priority?: "low" | "medium" | "high";
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            confidence?: number;
            hasSchedulingIntent?: boolean;
            schedulingDetails?: {
                proposedTimes?: string[];
                meetingTopic?: string;
                participants?: string[];
                urgency?: "low" | "medium" | "high";
                parsedDates?: {
                    confidence?: number;
                    original?: string;
                    parsed?: Date;
                }[];
                meetingType?: "one-on-one" | "team-meeting" | "interview" | "casual" | "formal";
                estimatedDuration?: number;
                actionItems?: string[];
                responseRequired?: boolean;
                calendarAvailability?: {
                    hasConflicts?: boolean;
                    suggestedAlternatives?: {
                        start?: string;
                        end?: string;
                        duration?: number;
                        confidence?: number;
                    }[];
                };
            };
            suggestedActions?: {
                type?: "create_event" | "check_availability" | "suggest_times" | "draft_response";
                description?: string;
                data?: any;
                priority?: "low" | "medium" | "high";
            }[];
        }, {
            confidence?: number;
            hasSchedulingIntent?: boolean;
            schedulingDetails?: {
                proposedTimes?: string[];
                meetingTopic?: string;
                participants?: string[];
                urgency?: "low" | "medium" | "high";
                parsedDates?: {
                    confidence?: number;
                    original?: string;
                    parsed?: Date;
                }[];
                meetingType?: "one-on-one" | "team-meeting" | "interview" | "casual" | "formal";
                estimatedDuration?: number;
                actionItems?: string[];
                responseRequired?: boolean;
                calendarAvailability?: {
                    hasConflicts?: boolean;
                    suggestedAlternatives?: {
                        start?: string;
                        end?: string;
                        duration?: number;
                        confidence?: number;
                    }[];
                };
            };
            suggestedActions?: {
                type?: "create_event" | "check_availability" | "suggest_times" | "draft_response";
                description?: string;
                data?: any;
                priority?: "low" | "medium" | "high";
            }[];
        }>;
    }, "strip", z.ZodTypeAny, {
        email?: {
            date?: string;
            id?: string;
            snippet?: string;
            body?: string;
            subject?: string;
            from?: string;
            to?: string[];
            isUnread?: boolean;
            hasSchedulingIntent?: boolean;
            schedulingDetails?: {
                proposedTimes?: string[];
                meetingTopic?: string;
                participants?: string[];
                urgency?: "low" | "medium" | "high";
            };
        };
        analysis?: {
            confidence?: number;
            hasSchedulingIntent?: boolean;
            schedulingDetails?: {
                proposedTimes?: string[];
                meetingTopic?: string;
                participants?: string[];
                urgency?: "low" | "medium" | "high";
                parsedDates?: {
                    confidence?: number;
                    original?: string;
                    parsed?: Date;
                }[];
                meetingType?: "one-on-one" | "team-meeting" | "interview" | "casual" | "formal";
                estimatedDuration?: number;
                actionItems?: string[];
                responseRequired?: boolean;
                calendarAvailability?: {
                    hasConflicts?: boolean;
                    suggestedAlternatives?: {
                        start?: string;
                        end?: string;
                        duration?: number;
                        confidence?: number;
                    }[];
                };
            };
            suggestedActions?: {
                type?: "create_event" | "check_availability" | "suggest_times" | "draft_response";
                description?: string;
                data?: any;
                priority?: "low" | "medium" | "high";
            }[];
        };
    }, {
        email?: {
            date?: string;
            id?: string;
            snippet?: string;
            body?: string;
            subject?: string;
            from?: string;
            to?: string[];
            isUnread?: boolean;
            hasSchedulingIntent?: boolean;
            schedulingDetails?: {
                proposedTimes?: string[];
                meetingTopic?: string;
                participants?: string[];
                urgency?: "low" | "medium" | "high";
            };
        };
        analysis?: {
            confidence?: number;
            hasSchedulingIntent?: boolean;
            schedulingDetails?: {
                proposedTimes?: string[];
                meetingTopic?: string;
                participants?: string[];
                urgency?: "low" | "medium" | "high";
                parsedDates?: {
                    confidence?: number;
                    original?: string;
                    parsed?: Date;
                }[];
                meetingType?: "one-on-one" | "team-meeting" | "interview" | "casual" | "formal";
                estimatedDuration?: number;
                actionItems?: string[];
                responseRequired?: boolean;
                calendarAvailability?: {
                    hasConflicts?: boolean;
                    suggestedAlternatives?: {
                        start?: string;
                        end?: string;
                        duration?: number;
                        confidence?: number;
                    }[];
                };
            };
            suggestedActions?: {
                type?: "create_event" | "check_availability" | "suggest_times" | "draft_response";
                description?: string;
                data?: any;
                priority?: "low" | "medium" | "high";
            }[];
        };
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    processed?: number;
    schedulingEmails?: number;
    highPriorityActions?: number;
    results?: {
        email?: {
            date?: string;
            id?: string;
            snippet?: string;
            body?: string;
            subject?: string;
            from?: string;
            to?: string[];
            isUnread?: boolean;
            hasSchedulingIntent?: boolean;
            schedulingDetails?: {
                proposedTimes?: string[];
                meetingTopic?: string;
                participants?: string[];
                urgency?: "low" | "medium" | "high";
            };
        };
        analysis?: {
            confidence?: number;
            hasSchedulingIntent?: boolean;
            schedulingDetails?: {
                proposedTimes?: string[];
                meetingTopic?: string;
                participants?: string[];
                urgency?: "low" | "medium" | "high";
                parsedDates?: {
                    confidence?: number;
                    original?: string;
                    parsed?: Date;
                }[];
                meetingType?: "one-on-one" | "team-meeting" | "interview" | "casual" | "formal";
                estimatedDuration?: number;
                actionItems?: string[];
                responseRequired?: boolean;
                calendarAvailability?: {
                    hasConflicts?: boolean;
                    suggestedAlternatives?: {
                        start?: string;
                        end?: string;
                        duration?: number;
                        confidence?: number;
                    }[];
                };
            };
            suggestedActions?: {
                type?: "create_event" | "check_availability" | "suggest_times" | "draft_response";
                description?: string;
                data?: any;
                priority?: "low" | "medium" | "high";
            }[];
        };
    }[];
}, {
    processed?: number;
    schedulingEmails?: number;
    highPriorityActions?: number;
    results?: {
        email?: {
            date?: string;
            id?: string;
            snippet?: string;
            body?: string;
            subject?: string;
            from?: string;
            to?: string[];
            isUnread?: boolean;
            hasSchedulingIntent?: boolean;
            schedulingDetails?: {
                proposedTimes?: string[];
                meetingTopic?: string;
                participants?: string[];
                urgency?: "low" | "medium" | "high";
            };
        };
        analysis?: {
            confidence?: number;
            hasSchedulingIntent?: boolean;
            schedulingDetails?: {
                proposedTimes?: string[];
                meetingTopic?: string;
                participants?: string[];
                urgency?: "low" | "medium" | "high";
                parsedDates?: {
                    confidence?: number;
                    original?: string;
                    parsed?: Date;
                }[];
                meetingType?: "one-on-one" | "team-meeting" | "interview" | "casual" | "formal";
                estimatedDuration?: number;
                actionItems?: string[];
                responseRequired?: boolean;
                calendarAvailability?: {
                    hasConflicts?: boolean;
                    suggestedAlternatives?: {
                        start?: string;
                        end?: string;
                        duration?: number;
                        confidence?: number;
                    }[];
                };
            };
            suggestedActions?: {
                type?: "create_event" | "check_availability" | "suggest_times" | "draft_response";
                description?: string;
                data?: any;
                priority?: "low" | "medium" | "high";
            }[];
        };
    }[];
}>;
export type EmailBatchProcessingResult = z.infer<typeof EmailBatchProcessingResultSchema>;
export declare const EnhancedParsedQuerySchema: z.ZodObject<{
    entities: z.ZodObject<{
        dateTime: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        title: z.ZodOptional<z.ZodString>;
        currentTitle: z.ZodOptional<z.ZodString>;
        newTitle: z.ZodOptional<z.ZodString>;
        attendees: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        location: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        dateTime?: string;
        attendees?: string[];
        location?: string;
        duration?: number;
        title?: string;
        currentTitle?: string;
        newTitle?: string;
    }, {
        description?: string;
        dateTime?: string;
        attendees?: string[];
        location?: string;
        duration?: number;
        title?: string;
        currentTitle?: string;
        newTitle?: string;
    }>;
    confidence: z.ZodNumber;
} & {
    intent: z.ZodEnum<["schedule", "query", "update", "cancel", "availability", "email_query", "email_search", "email_schedule_analysis", "email_batch_process"]>;
    schedulingContext: z.ZodOptional<z.ZodObject<{
        emailId: z.ZodOptional<z.ZodString>;
        batchSize: z.ZodOptional<z.ZodNumber>;
        analysisDepth: z.ZodOptional<z.ZodEnum<["basic", "enhanced", "comprehensive"]>>;
    }, "strip", z.ZodTypeAny, {
        emailId?: string;
        batchSize?: number;
        analysisDepth?: "basic" | "enhanced" | "comprehensive";
    }, {
        emailId?: string;
        batchSize?: number;
        analysisDepth?: "basic" | "enhanced" | "comprehensive";
    }>>;
}, "strip", z.ZodTypeAny, {
    confidence?: number;
    intent?: "schedule" | "query" | "update" | "cancel" | "availability" | "email_query" | "email_search" | "email_schedule_analysis" | "email_batch_process";
    entities?: {
        description?: string;
        dateTime?: string;
        attendees?: string[];
        location?: string;
        duration?: number;
        title?: string;
        currentTitle?: string;
        newTitle?: string;
    };
    schedulingContext?: {
        emailId?: string;
        batchSize?: number;
        analysisDepth?: "basic" | "enhanced" | "comprehensive";
    };
}, {
    confidence?: number;
    intent?: "schedule" | "query" | "update" | "cancel" | "availability" | "email_query" | "email_search" | "email_schedule_analysis" | "email_batch_process";
    entities?: {
        description?: string;
        dateTime?: string;
        attendees?: string[];
        location?: string;
        duration?: number;
        title?: string;
        currentTitle?: string;
        newTitle?: string;
    };
    schedulingContext?: {
        emailId?: string;
        batchSize?: number;
        analysisDepth?: "basic" | "enhanced" | "comprehensive";
    };
}>;
export type EnhancedParsedQuery = z.infer<typeof EnhancedParsedQuerySchema>;
