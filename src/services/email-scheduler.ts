import { EmailStorageService } from './email-storage.js';
import { EmailMonitorService } from './email-monitor.js';
import { AzureAIService } from './azure-ai.js';
import { GoogleCalendarService } from './google-calendar.js';
import { GmailService } from './gmail.js';
import { 
  EmailSummary, 
  ProcessedEmail, 
  CalendarEvent,
  AvailableSlot,
  CalendarCopilotError
} from '../types/index.js';
import { Logger } from '../utils/logger.js';
import * as chrono from 'chrono-node';

/**
 * EmailSchedulerError class for Phase 3
 */
export class EmailSchedulerError extends CalendarCopilotError {
  constructor(message: string, details?: unknown) {
    super(message, 'EMAIL_SCHEDULER_ERROR', 503, details);
    this.name = 'EmailSchedulerError';
  }
}

/**
 * Phase 3: Email Scheduling Intent Service
 * Orchestrates the entire email-to-calendar workflow
 */
export class EmailSchedulerService {
  private logger: Logger;
  private emailStorage: EmailStorageService;
  private emailMonitor: EmailMonitorService;
  private azureAI: AzureAIService;
  private googleCalendar: GoogleCalendarService;
  private gmail: GmailService;

  constructor(
    logger: Logger,
    emailStorage: EmailStorageService,
    emailMonitor: EmailMonitorService,
    azureAI: AzureAIService,
    googleCalendar: GoogleCalendarService,
    gmail: GmailService
  ) {
    this.logger = logger.child({ component: 'EmailScheduler' });
    this.emailStorage = emailStorage;
    this.emailMonitor = emailMonitor;
    this.azureAI = azureAI;
    this.googleCalendar = googleCalendar;
    this.gmail = gmail;
  }

  /**
   * Phase 3 Main Method: Analyze email for scheduling intent with enhanced AI
   */
  async analyzeEmailForScheduling(email: EmailSummary): Promise<{
    hasSchedulingIntent: boolean;
    confidence: number;
    schedulingDetails?: {
      proposedTimes: string[];
      parsedDates: Array<{ original: string; parsed: Date; confidence: number }>;
      meetingTopic: string;
      participants: string[];
      urgency: 'low' | 'medium' | 'high';
      meetingType: 'one-on-one' | 'team-meeting' | 'interview' | 'casual' | 'formal';
      estimatedDuration: number; // in minutes
      actionItems: string[];
      responseRequired: boolean;
      calendarAvailability?: {
        hasConflicts: boolean;
        suggestedAlternatives?: AvailableSlot[];
      };
    };
    suggestedActions: Array<{
      type: 'create_event' | 'check_availability' | 'suggest_times' | 'draft_response' | 'suggest_meeting_times';
      priority: 'high' | 'medium' | 'low';
      description: string;
      data?: any;
    }>;
  }> {
    this.logger.info('Analyzing email for scheduling intent', { 
      emailId: email.id, 
      subject: email.subject 
    });

    try {
      // Enhanced Azure AI prompt for Phase 3
      const analysisResult = await this.enhancedSchedulingAnalysis(email);
      
      // Parse relative dates to actual dates
      const parsedDates = await this.parseProposedTimes(analysisResult.proposedTimes || []);
      
      // Check calendar availability if dates were found
      let calendarAvailability;
      if (parsedDates.length > 0 && analysisResult.hasSchedulingIntent) {
        calendarAvailability = await this.checkCalendarAvailability(parsedDates);
      }

      // Generate suggested actions
      const suggestedActions = await this.generateSuggestedActions(
        analysisResult, 
        parsedDates, 
        calendarAvailability
      );

      return {
        hasSchedulingIntent: analysisResult.hasSchedulingIntent,
        confidence: analysisResult.confidence,
        schedulingDetails: analysisResult.hasSchedulingIntent ? {
          proposedTimes: analysisResult.proposedTimes || [],
          parsedDates,
          meetingTopic: analysisResult.meetingTopic || email.subject,
          participants: analysisResult.participants || [email.from],
          urgency: analysisResult.urgency || 'medium',
          meetingType: analysisResult.meetingType || 'one-on-one',
          estimatedDuration: analysisResult.estimatedDuration || 60,
          actionItems: analysisResult.actionItems || [],
          responseRequired: analysisResult.responseRequired || true,
          calendarAvailability,
        } : undefined,
        suggestedActions,
      };

    } catch (error) {
      this.logger.error('Email scheduling analysis failed:', error);
      throw new EmailSchedulerError('Scheduling analysis failed', error);
    }
  }

  /**
   * Enhanced Azure AI analysis with comprehensive prompt
   */
  private async enhancedSchedulingAnalysis(email: EmailSummary): Promise<{
    hasSchedulingIntent: boolean;
    confidence: number;
    proposedTimes?: string[];
    meetingTopic?: string;
    participants?: string[];
    urgency?: 'low' | 'medium' | 'high';
    meetingType?: 'one-on-one' | 'team-meeting' | 'interview' | 'casual' | 'formal';
    estimatedDuration?: number;
    actionItems?: string[];
    responseRequired?: boolean;
  }> {
    const enhancedPrompt = `Analyze this email for scheduling/meeting intent with detailed extraction and relative date parsing.

Email:
Subject: ${email.subject}
From: ${email.from}
Content: ${email.snippet}

Current Context:
- Current Date: ${new Date().toISOString().split('T')[0]}
- Current Day: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}
- Current Time: ${new Date().toLocaleTimeString()}

Analyze and extract:
1. Does this email contain a request to schedule, reschedule, or discuss scheduling a meeting?
2. What is your confidence level (0-1)?
3. Extract ALL proposed times/dates mentioned (preserve original phrasing AND provide standardized format)
4. Parse relative dates accurately ("next Tuesday", "this Friday", "tomorrow", "next week")
5. Identify meeting topic/purpose
6. Extract participant emails/names mentioned
7. Assess urgency level based on language used
8. Determine meeting type and formality
9. Estimate appropriate meeting duration
10. Identify any action items or deadlines
11. Does this require a response?

IMPORTANT: For dates, provide both original text AND parsed ISO format when possible.

Respond in JSON format:
{
  "hasSchedulingIntent": boolean,
  "confidence": number (0-1),
  "proposedTimes": [
    {
      "original": "next Tuesday at 2pm",
      "parsed": "2024-01-16T14:00:00Z",
      "confidence": 0.9
    }
  ],
  "meetingTopic": "extracted topic" or null,
  "participants": ["email1", "name2"] or [],
  "urgency": "low|medium|high",
  "meetingType": "one-on-one|team-meeting|interview|casual|formal",
  "estimatedDuration": number (minutes),
  "actionItems": ["action1", "action2"] or [],
  "responseRequired": boolean
}

Focus on:
- Keywords: meeting, schedule, appointment, call, available, free, calendar, book, discuss, catch up
- Time expressions: today, tomorrow, next week, Monday, 2pm, this Friday, etc.
- Question patterns: "when are you free?", "does X work for you?"
- Rescheduling patterns: "move the meeting", "change our call"
- Availability patterns: "I'm available", "free this week"
- Multiple time options: "Tuesday or Wednesday", "10am or 2pm"`;

    try {
      const response = await this.azureAI.analyzeEmailForScheduling(enhancedPrompt);
      
      // Extract proposed times from AI response - check different formats
      let proposedTimes: string[] = [];
      
      if (response.details?.proposedTimes) {
        if (Array.isArray(response.details.proposedTimes)) {
          // If it's already an array of strings
          if (response.details.proposedTimes.length > 0 && typeof response.details.proposedTimes[0] === 'string') {
            proposedTimes = response.details.proposedTimes as string[];
          } 
          // If it's array of objects with original/parsed format
          else if (response.details.proposedTimes.length > 0 && (response.details.proposedTimes[0] as any)?.original) {
            proposedTimes = response.details.proposedTimes.map((t: any) => t.original);
          }
        }
      }
      
      // Also extract from direct text analysis
      if (proposedTimes.length === 0) {
        // Extract time patterns from email snippet
        const timePatterns = [
          /\b(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+\d{1,2}:?\d{0,2}\s*(am|pm)/gi,
          /\b(tomorrow|today)\s+(morning|afternoon|evening)?\s*at\s+\d{1,2}:?\d{0,2}\s*(am|pm)/gi,
          /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+\d{1,2}:?\d{0,2}\s*(am|pm)/gi,
          /\b\d{1,2}:?\d{0,2}\s*(am|pm)\b/gi,
          /\bnext week\b/gi,
          /\bthis week\b/gi
        ];
        
        for (const pattern of timePatterns) {
          const matches = email.snippet.match(pattern);
          if (matches) {
            proposedTimes.push(...matches);
          }
        }
        
        // Remove duplicates
        proposedTimes = [...new Set(proposedTimes)];
      }
      
      return {
        hasSchedulingIntent: response.hasSchedulingIntent,
        confidence: response.confidence,
        proposedTimes,
        meetingTopic: response.details?.meetingTopic,
        participants: response.details?.participants,
        urgency: response.details?.urgency,
        meetingType: response.details?.meetingType,
        estimatedDuration: response.details?.estimatedDuration,
        actionItems: response.details?.actionItems,
        responseRequired: response.details?.responseRequired
      };
    } catch (error) {
      this.logger.warn('Enhanced AI analysis failed, using basic detection:', error);
      return await this.fallbackSchedulingAnalysis(email);
    }
  }

  /**
   * Fallback analysis using keyword detection and pattern matching
   */
  private async fallbackSchedulingAnalysis(email: EmailSummary): Promise<{
    hasSchedulingIntent: boolean;
    confidence: number;
    proposedTimes?: string[];
    meetingTopic?: string;
    participants?: string[];
    urgency?: 'low' | 'medium' | 'high';
  }> {
    const text = `${email.subject} ${email.snippet}`.toLowerCase();
    
    const schedulingKeywords = [
      'meeting', 'schedule', 'appointment', 'call', 'available', 'free time',
      'calendar', 'book', 'reschedule', 'move the meeting', 'catch up',
      'discuss', 'sync', 'standup', 'review', 'interview'
    ];

    const hasKeywords = schedulingKeywords.some(keyword => text.includes(keyword));
    
    // Look for time expressions
    const timeExpressions = [
      'today', 'tomorrow', 'next week', 'this week', 'monday', 'tuesday', 
      'wednesday', 'thursday', 'friday', 'am', 'pm', 'morning', 'afternoon'
    ];
    
    const hasTimeExpressions = timeExpressions.some(expr => text.includes(expr));
    
    // Question patterns indicating scheduling
    const questionPatterns = [
      'when are you', 'are you free', 'available', 'does that work', 'work for you'
    ];
    
    const hasQuestions = questionPatterns.some(pattern => text.includes(pattern));

    const hasSchedulingIntent = hasKeywords && (hasTimeExpressions || hasQuestions);
    const confidence = hasSchedulingIntent ? 
      (hasKeywords ? 0.3 : 0) + (hasTimeExpressions ? 0.3 : 0) + (hasQuestions ? 0.4 : 0) : 0;

    return {
      hasSchedulingIntent,
      confidence: Math.min(confidence, 1),
      proposedTimes: hasTimeExpressions ? ['time mentioned'] : [],
      meetingTopic: email.subject,
      participants: [email.from],
      urgency: text.includes('urgent') || text.includes('asap') ? 'high' : 'medium',
    };
  }

  /**
   * Parse proposed times with enhanced relative date handling
   */
  private async parseProposedTimes(proposedTimes: string[]): Promise<Array<{
    original: string;
    parsed: Date;
    confidence: number;
  }>> {
    const parsedResults: Array<{ original: string; parsed: Date; confidence: number }> = [];

    for (const timeString of proposedTimes) {
      try {
        // Use chrono-node for natural language parsing
        const chronoResults = chrono.parse(timeString, new Date());
        
        if (chronoResults.length > 0) {
          const result = chronoResults[0];
          parsedResults.push({
            original: timeString,
            parsed: result.start.date(),
            confidence: this.calculateDateConfidence(result)
          });
        } else {
          // Fallback: try to parse common relative date patterns
          const fallbackDate = this.parseRelativeDateFallback(timeString);
          if (fallbackDate) {
            parsedResults.push({
              original: timeString,
              parsed: fallbackDate,
              confidence: 0.6 // Lower confidence for fallback parsing
            });
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to parse time string: ${timeString}`, error);
      }
    }

    return parsedResults;
  }

  /**
   * Enhanced relative date parsing fallback
   */
  private parseRelativeDateFallback(timeString: string): Date | null {
    const now = new Date();
    const lowerTimeString = timeString.toLowerCase();

    // Common patterns
    if (lowerTimeString.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Try to extract time
      const timeMatch = timeString.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const isPM = timeMatch[3].toLowerCase() === 'pm';
        
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        
        tomorrow.setHours(hours, minutes, 0, 0);
      }
      return tomorrow;
    }

    // Next week
    if (lowerTimeString.includes('next week')) {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(14, 0, 0, 0); // Default to 2 PM
      return nextWeek;
    }

    // This Friday, next Tuesday, etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < dayNames.length; i++) {
      if (lowerTimeString.includes(dayNames[i])) {
        const targetDay = new Date(now);
        const currentDay = now.getDay();
        let daysUntilTarget = i - currentDay;
        
        if (lowerTimeString.includes('next')) {
          daysUntilTarget += 7;
        } else if (daysUntilTarget <= 0) {
          daysUntilTarget += 7; // Move to next occurrence
        }
        
        targetDay.setDate(targetDay.getDate() + daysUntilTarget);
        targetDay.setHours(14, 0, 0, 0); // Default to 2 PM
        return targetDay;
      }
    }

    return null;
  }

  /**
   * Calculate confidence score for parsed dates
   */
  private calculateDateConfidence(chronoResult: any): number {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for specific dates
    if (chronoResult.start.get('year')) confidence += 0.2;
    if (chronoResult.start.get('month')) confidence += 0.2;
    if (chronoResult.start.get('day')) confidence += 0.2;
    if (chronoResult.start.get('hour')) confidence += 0.3;
    if (chronoResult.start.get('minute')) confidence += 0.1;
    
    return Math.min(confidence, 1);
  }

  /**
   * Phase 4: Enhanced calendar availability checking with cross-reference
   */
  private async checkCalendarAvailability(parsedDates: Array<{
    original: string;
    parsed: Date;
    confidence: number;
  }>): Promise<{
    hasConflicts: boolean;
    availability: Array<{
      proposedTime: string;
      date: Date;
      isAvailable: boolean;
      conflictDetails?: string;
    }>;
    suggestedAlternatives?: AvailableSlot[];
  }> {
    this.logger.info('Checking calendar availability for proposed times', { 
      dateCount: parsedDates.length 
    });

    const availability = [];
    let hasConflicts = false;

    for (const dateInfo of parsedDates) {
      try {
        // Check availability for each proposed time
        const startTime = new Date(dateInfo.parsed);
        const endTime = new Date(startTime.getTime() + (60 * 60 * 1000)); // Default 1 hour duration

        const freeBusyRequest = {
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          calendarIds: ['primary']
        };

        const freeBusyResult = await this.googleCalendar.checkFreeBusy(freeBusyRequest);
        const busyPeriods = freeBusyResult.calendars?.['primary']?.busy || [];

        const isAvailable = busyPeriods.length === 0;
        if (!isAvailable) {
          hasConflicts = true;
        }

        availability.push({
          proposedTime: dateInfo.original,
          date: dateInfo.parsed,
          isAvailable,
          conflictDetails: isAvailable ? undefined : `Conflict with ${busyPeriods.length} existing event(s)`
        });

      } catch (error) {
        this.logger.warn('Failed to check availability for date:', { 
          date: dateInfo.original, 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        availability.push({
          proposedTime: dateInfo.original,
          date: dateInfo.parsed,
          isAvailable: false,
          conflictDetails: 'Unable to check calendar'
        });
        hasConflicts = true;
      }
    }

    // If there are conflicts, suggest alternatives
    let suggestedAlternatives: AvailableSlot[] | undefined;
    if (hasConflicts) {
      suggestedAlternatives = await this.findAlternativeTimes(parsedDates);
    }

    return {
      hasConflicts,
      availability,
      suggestedAlternatives
    };
  }

  /**
   * Phase 4: Find alternative meeting times using existing find_meeting_slots logic
   */
  private async findAlternativeTimes(originalDates: Array<{ original: string; parsed: Date; confidence: number }>): Promise<AvailableSlot[]> {
    this.logger.info('Finding alternative meeting times');

    try {
      const alternatives: AvailableSlot[] = [];
      
      // Use the first proposed date as reference for the week
      const referenceDate = originalDates[0]?.parsed || new Date();
      const startOfWeek = new Date(referenceDate);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start of week
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7); // End of week

      // Check availability for business hours throughout the week
      const businessHours = [9, 10, 11, 14, 15, 16]; // 9 AM to 4 PM, skipping lunch
      
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const checkDate = new Date(startOfWeek);
        checkDate.setDate(checkDate.getDate() + dayOffset);
        
        // Skip weekends for business meetings
        if (checkDate.getDay() === 0 || checkDate.getDay() === 6) continue;
        
        for (const hour of businessHours) {
          const slotStart = new Date(checkDate);
          slotStart.setHours(hour, 0, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(hour + 1, 0, 0, 0);

          // Skip past times
          if (slotStart <= new Date()) continue;

          try {
            const freeBusyRequest = {
              timeMin: slotStart.toISOString(),
              timeMax: slotEnd.toISOString(),
              calendarIds: ['primary']
            };

            const freeBusyResult = await this.googleCalendar.checkFreeBusy(freeBusyRequest);
            const busyPeriods = freeBusyResult.calendars?.['primary']?.busy || [];

            if (busyPeriods.length === 0) {
              alternatives.push({
                start: slotStart.toISOString(),
                end: slotEnd.toISOString(),
                duration: 60 // minutes
              });

              // Limit to 5 alternatives
              if (alternatives.length >= 5) break;
            }
          } catch (error) {
            // Continue checking other slots if one fails
            continue;
          }
        }
        
        if (alternatives.length >= 5) break;
      }

      return alternatives;

    } catch (error) {
      this.logger.error('Failed to find alternative times:', error);
      return [];
    }
  }

  /**
   * Phase 4: Enhanced action generation with calendar cross-reference
   */
  private async generateSuggestedActions(
    analysis: any,
    parsedDates: any[],
    calendarAvailability?: any
  ): Promise<Array<{
    type: 'create_event' | 'check_availability' | 'suggest_times' | 'draft_response' | 'suggest_meeting_times';
    priority: 'high' | 'medium' | 'low';
    description: string;
    data?: any;
  }>> {
    const actions: any[] = [];

    if (!analysis.hasSchedulingIntent) {
      return actions;
    }

    // Phase 4: Enhanced action generation with calendar cross-reference
    
    // High priority: Create event if time is confirmed and available
    if (parsedDates.length > 0 && calendarAvailability && !calendarAvailability.hasConflicts) {
      const availableSlots = calendarAvailability.availability?.filter((slot: any) => slot.isAvailable) || [];
      
      if (availableSlots.length > 0) {
        actions.push({
          type: 'create_event',
          priority: 'high',
          description: 'Create calendar event for confirmed available time',
          data: {
            title: analysis.meetingTopic || 'Meeting',
            startTime: availableSlots[0].date.toISOString(),
            duration: analysis.estimatedDuration || 60,
            attendees: analysis.participants || [],
            originalProposal: availableSlots[0].proposedTime
          }
        });
      }
    }

    // High priority: Use suggest_meeting_times workflow if multiple options or conflicts
    if (parsedDates.length > 1 || (calendarAvailability?.hasConflicts && parsedDates.length > 0)) {
      actions.push({
        type: 'suggest_meeting_times',
        priority: 'high',
        description: 'Run intelligent meeting time suggestion workflow',
        data: {
          originalProposals: parsedDates.map((d: any) => d.original),
          meetingDetails: {
            topic: analysis.meetingTopic,
            duration: analysis.estimatedDuration || 60,
            participants: analysis.participants || [],
            urgency: analysis.urgency
          },
          conflicts: calendarAvailability?.availability || [],
          alternatives: calendarAvailability?.suggestedAlternatives || []
        }
      });
    }

    // Medium priority: Check availability if times are proposed but not yet checked
    if (parsedDates.length > 0 && !calendarAvailability) {
      actions.push({
        type: 'check_availability',
        priority: 'medium',
        description: 'Check calendar availability for proposed times',
        data: {
          proposedTimes: parsedDates.map((d: any) => ({
            original: d.original,
            parsed: d.parsed.toISOString(),
            confidence: d.confidence
          }))
        }
      });
    }

    // Medium priority: Suggest alternative times if conflicts exist (legacy support)
    if (calendarAvailability?.hasConflicts && !actions.some(a => a.type === 'suggest_meeting_times')) {
      actions.push({
        type: 'suggest_times',
        priority: 'medium',
        description: 'Suggest alternative meeting times due to conflicts',
        data: {
          conflictingTimes: calendarAvailability.availability?.filter((slot: any) => !slot.isAvailable).map((slot: any) => slot.proposedTime) || [],
          alternatives: calendarAvailability.suggestedAlternatives || []
        }
      });
    }

    // Medium priority: Draft response based on urgency and requirements
    if (analysis.responseRequired) {
      const priority = analysis.urgency === 'high' ? 'high' : 'medium';
      const hasAvailableTime = calendarAvailability?.availability?.some((slot: any) => slot.isAvailable) || false;
      
      actions.push({
        type: 'draft_response',
        priority,
        description: `Draft ${analysis.urgency} priority response email`,
        data: {
          urgency: analysis.urgency,
          meetingTopic: analysis.meetingTopic,
          hasConflicts: calendarAvailability?.hasConflicts || false,
          hasAvailableTime,
          responseType: hasAvailableTime ? 'accept' : 'counter-propose',
          suggestedResponse: await this.generateResponseSuggestion(analysis)
        }
      });
    }

    return actions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate AI-powered response suggestions
   */
  private async generateResponseSuggestion(analysis: any): Promise<string> {
    // This would use Azure AI to generate contextual responses
    // For now, return a simple template
    if (analysis.urgency === 'high') {
      return `Thank you for reaching out. I'll check my calendar and get back to you shortly regarding ${analysis.meetingTopic}.`;
    } else {
      return `I'd be happy to schedule time for ${analysis.meetingTopic}. Let me check my availability and propose some times.`;
    }
  }

  /**
   * Process a batch of emails for scheduling intent
   */
  async processBatchEmails(emails: EmailSummary[]): Promise<{
    processed: number;
    schedulingEmails: number;
    highPriorityActions: number;
    results: Array<{
      email: EmailSummary;
      analysis: Awaited<ReturnType<EmailSchedulerService['analyzeEmailForScheduling']>>;
    }>;
  }> {
    const results: any[] = [];
    let schedulingEmails = 0;
    let highPriorityActions = 0;

    for (const email of emails) {
      try {
        const analysis = await this.analyzeEmailForScheduling(email);
        
        if (analysis.hasSchedulingIntent) {
          schedulingEmails++;
          
          const highPriorityCount = analysis.suggestedActions.filter(
            action => action.priority === 'high'
          ).length;
          highPriorityActions += highPriorityCount;
        }

        results.push({ email, analysis });
        
      } catch (error) {
        this.logger.error('Failed to process email:', email.id, error);
      }
    }

    return {
      processed: results.length,
      schedulingEmails,
      highPriorityActions,
      results,
    };
  }

  /**
   * Phase 4: Suggest Meeting Times Workflow Tool
   * Orchestrates the complete calendar cross-reference process
   */
  async suggestMeetingTimes(requestData: {
    originalProposals: string[];
    meetingDetails: {
      topic?: string;
      duration?: number;
      participants?: string[];
      urgency?: 'low' | 'medium' | 'high';
    };
    preferredTimeRanges?: Array<{ start: string; end: string }>;
    excludeWeekends?: boolean;
  }): Promise<{
    success: boolean;
    originalProposalsAnalysis: Array<{
      proposal: string;
      parsed?: Date;
      isAvailable: boolean;
      conflicts?: string;
    }>;
    recommendedTimes: Array<{
      start: string;
      end: string;
      confidence: number;
      reason: string;
    }>;
    alternativeSuggestions: Array<{
      start: string;
      end: string;
      reason: string;
    }>;
    summary: string;
  }> {
    this.logger.info('Running suggest meeting times workflow', { 
      proposalCount: requestData.originalProposals.length,
      topic: requestData.meetingDetails.topic 
    });

    try {
      // 1. Parse all original proposals
      const parsedProposals = await this.parseProposedTimes(requestData.originalProposals);
      
      // 2. Check availability for all parsed times
      const availabilityCheck = await this.checkCalendarAvailability(parsedProposals);

      // 3. Analyze each original proposal
      const originalProposalsAnalysis = availabilityCheck.availability.map(slot => ({
        proposal: slot.proposedTime,
        parsed: slot.date,
        isAvailable: slot.isAvailable,
        conflicts: slot.conflictDetails
      }));

      // 4. Find available times from original proposals
      const availableOriginals = originalProposalsAnalysis
        .filter(proposal => proposal.isAvailable)
        .map(proposal => ({
          start: proposal.parsed!.toISOString(),
          end: new Date(proposal.parsed!.getTime() + (requestData.meetingDetails.duration || 60) * 60 * 1000).toISOString(),
          confidence: 0.9,
          reason: `Original proposal "${proposal.proposal}" is available`
        }));

      // 5. Get alternative suggestions if needed
      let alternativeSuggestions: Array<{ start: string; end: string; reason: string }> = [];
      
      if (availableOriginals.length === 0 || requestData.originalProposals.length > availableOriginals.length) {
        const alternatives = await this.findAlternativeTimes(parsedProposals);
        alternativeSuggestions = alternatives.map(alt => ({
          start: alt.start,
          end: alt.end,
          reason: 'Alternative time based on calendar availability'
        }));
      }

      // 6. Create final recommendations (prefer originals, then alternatives)
      const recommendedTimes = [
        ...availableOriginals,
        ...alternativeSuggestions.slice(0, Math.max(3 - availableOriginals.length, 0)).map(alt => ({
          ...alt,
          confidence: 0.8
        }))
      ].slice(0, 5); // Limit to top 5 recommendations

      // 7. Generate summary
      const availableCount = originalProposalsAnalysis.filter(p => p.isAvailable).length;
      const totalProposals = originalProposalsAnalysis.length;
      
      let summary = `Analyzed ${totalProposals} proposed time(s). `;
      
      if (availableCount === totalProposals) {
        summary += `All proposed times are available! `;
      } else if (availableCount > 0) {
        summary += `${availableCount} of ${totalProposals} proposed times are available. `;
      } else {
        summary += `None of the proposed times are available. `;
      }
      
      if (recommendedTimes.length > 0) {
        summary += `${recommendedTimes.length} meeting time options recommended.`;
      } else {
        summary += `No alternative times found in the requested timeframe.`;
      }

      return {
        success: true,
        originalProposalsAnalysis,
        recommendedTimes,
        alternativeSuggestions,
        summary
      };

    } catch (error) {
      this.logger.error('Suggest meeting times workflow failed:', error);
      
      return {
        success: false,
        originalProposalsAnalysis: [],
        recommendedTimes: [],
        alternativeSuggestions: [],
        summary: `Meeting time suggestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
} 