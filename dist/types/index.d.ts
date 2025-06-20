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
        dateTime: z.ZodString;
        timeZone: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        dateTime?: string;
        timeZone?: string;
    }, {
        dateTime?: string;
        timeZone?: string;
    }>;
    end: z.ZodObject<{
        dateTime: z.ZodString;
        timeZone: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        dateTime?: string;
        timeZone?: string;
    }, {
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
        dateTime?: string;
        timeZone?: string;
    };
    end?: {
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
        dateTime?: string;
        timeZone?: string;
    };
    end?: {
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
    intent: z.ZodEnum<["schedule", "query", "update", "cancel", "availability"]>;
    entities: z.ZodObject<{
        dateTime: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        title: z.ZodOptional<z.ZodString>;
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
    }, {
        description?: string;
        dateTime?: string;
        attendees?: string[];
        location?: string;
        duration?: number;
        title?: string;
    }>;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    confidence?: number;
    intent?: "schedule" | "query" | "update" | "cancel" | "availability";
    entities?: {
        description?: string;
        dateTime?: string;
        attendees?: string[];
        location?: string;
        duration?: number;
        title?: string;
    };
}, {
    confidence?: number;
    intent?: "schedule" | "query" | "update" | "cancel" | "availability";
    entities?: {
        description?: string;
        dateTime?: string;
        attendees?: string[];
        location?: string;
        duration?: number;
        title?: string;
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
