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
      type: 'create_event' | 'check_availability' | 'suggest_times' | 'draft_response';
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
    const enhancedPrompt = `Analyze this email for scheduling/meeting intent with detailed extraction.

Email:
Subject: ${email.subject}
From: ${email.from}
Content: ${email.snippet}

Analyze and extract:
1. Does this email contain a request to schedule, reschedule, or discuss scheduling a meeting?
2. What is your confidence level (0-1)?
3. Extract proposed times/dates mentioned (preserve original phrasing)
4. Identify meeting topic/purpose
5. Extract participant emails/names mentioned
6. Assess urgency level based on language used
7. Determine meeting type and formality
8. Estimate appropriate meeting duration
9. Identify any action items or deadlines
10. Does this require a response?

Respond in JSON format:
{
  "hasSchedulingIntent": boolean,
  "confidence": number (0-1),
  "proposedTimes": ["time1", "time2"] or [],
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
- Time expressions: today, tomorrow, next week, Monday, 2pm, etc.
- Question patterns: "when are you free?", "does X work for you?"
- Rescheduling patterns: "move the meeting", "change our call"
- Availability patterns: "I'm available", "free this week"`;

    try {
      const response = await this.azureAI.analyzeEmailForScheduling(enhancedPrompt);
      return {
        hasSchedulingIntent: response.hasSchedulingIntent,
        confidence: response.confidence,
        ...response.details
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
   * Parse natural language time expressions to actual dates
   */
  private async parseProposedTimes(proposedTimes: string[]): Promise<Array<{
    original: string;
    parsed: Date;
    confidence: number;
  }>> {
    const results: Array<{ original: string; parsed: Date; confidence: number }> = [];
    const now = new Date();

    for (const timeText of proposedTimes) {
      try {
        const chronoResults = chrono.parse(timeText, now);
        
        for (const result of chronoResults) {
          results.push({
            original: timeText,
            parsed: result.start.date(),
            confidence: this.calculateDateConfidence(result),
          });
        }
      } catch (error) {
        this.logger.warn('Failed to parse time expression:', timeText, error);
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
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
   * Check calendar availability for proposed times
   */
  private async checkCalendarAvailability(parsedDates: Array<{
    original: string;
    parsed: Date;
    confidence: number;
  }>): Promise<{
    hasConflicts: boolean;
    suggestedAlternatives?: AvailableSlot[];
  }> {
    try {
      const conflicts: boolean[] = [];
      
      for (const dateInfo of parsedDates.slice(0, 3)) { // Check up to 3 dates
        const timeMin = dateInfo.parsed.toISOString();
        const timeMax = new Date(dateInfo.parsed.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour
        
        const freeBusyResult = await this.googleCalendar.checkFreeBusy({
          timeMin,
          timeMax,
          calendarIds: ['primary'],
        });
        
        const busyPeriods = freeBusyResult.calendars['primary']?.busy || [];
        conflicts.push(busyPeriods.length > 0);
      }

      const hasConflicts = conflicts.some(conflict => conflict);
      
      // If conflicts found, suggest alternatives
      let suggestedAlternatives: AvailableSlot[] | undefined;
      if (hasConflicts && parsedDates.length > 0) {
        const firstDate = parsedDates[0].parsed;
        const startOfDay = new Date(firstDate);
        startOfDay.setHours(9, 0, 0, 0);
        const endOfDay = new Date(firstDate);
        endOfDay.setHours(17, 0, 0, 0);
        
        suggestedAlternatives = await this.azureAI.findOptimalMeetingSlots({
          duration: 60,
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          maxSuggestions: 3,
        }, []);
      }

      return {
        hasConflicts,
        suggestedAlternatives,
      };

    } catch (error) {
      this.logger.warn('Calendar availability check failed:', error);
      return { hasConflicts: false };
    }
  }

  /**
   * Generate suggested actions based on analysis
   */
  private async generateSuggestedActions(
    analysis: any,
    parsedDates: any[],
    calendarAvailability?: any
  ): Promise<Array<{
    type: 'create_event' | 'check_availability' | 'suggest_times' | 'draft_response';
    priority: 'high' | 'medium' | 'low';
    description: string;
    data?: any;
  }>> {
    const actions: any[] = [];

    if (!analysis.hasSchedulingIntent) {
      return actions;
    }

    // High priority: Response required
    if (analysis.responseRequired) {
      actions.push({
        type: 'draft_response',
        priority: analysis.urgency === 'high' ? 'high' : 'medium',
        description: 'Draft response to scheduling request',
        data: { 
          emailContext: analysis,
          suggestedResponse: await this.generateResponseSuggestion(analysis)
        }
      });
    }

    // Medium priority: Check availability if specific times mentioned
    if (parsedDates.length > 0) {
      actions.push({
        type: 'check_availability',
        priority: 'medium',
        description: `Check availability for ${parsedDates.length} proposed time(s)`,
        data: { proposedTimes: parsedDates }
      });

      // If no conflicts, suggest creating event
      if (calendarAvailability && !calendarAvailability.hasConflicts) {
        actions.push({
          type: 'create_event',
          priority: 'high',
          description: 'Create calendar event for confirmed time',
          data: {
            suggestedEvent: {
              title: analysis.meetingTopic,
              startTime: parsedDates[0].parsed,
              duration: analysis.estimatedDuration || 60,
              attendees: analysis.participants,
            }
          }
        });
      }
    }

    // If conflicts or no specific times, suggest alternatives
    if (!parsedDates.length || (calendarAvailability?.hasConflicts)) {
      actions.push({
        type: 'suggest_times',
        priority: 'medium',
        description: 'Suggest alternative meeting times',
        data: { alternatives: calendarAvailability?.suggestedAlternatives }
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
} 