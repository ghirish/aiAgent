import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { 
  ParsedQuery, 
  AzureAIError, 
  AvailableSlot,
  MeetingSlotRequest
} from '../types/index.js';
import { Logger } from '../utils/logger.js';
import * as chrono from 'chrono-node';
import { addMinutes, format, isWithinInterval, parseISO } from 'date-fns';

/**
 * Azure AI Service for natural language processing and calendar intelligence
 */
export class AzureAIService {
  private openai: OpenAIClient;
  private deploymentName: string;
  private logger: Logger;

  constructor(
    endpoint: string,
    apiKey: string,
    deploymentName: string,
    apiVersion: string,
    logger: Logger
  ) {
    this.logger = logger.child({ component: 'AzureAI' });
    this.deploymentName = deploymentName;

    // Initialize Azure OpenAI client
    this.openai = new OpenAIClient(
      endpoint,
      new AzureKeyCredential(apiKey)
    );

    this.logger.info('Azure AI service initialized', { deploymentName });
  }

  /**
   * Parse natural language query for calendar intent and entities
   */
  async parseCalendarQuery(query: string, conversationContext?: any): Promise<ParsedQuery> {
    try {
      this.logger.debug('Parsing calendar query', { query });

      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const currentDateTime = new Date().toISOString();
      
      let systemPrompt = `You are a calendar assistant that extracts intent and entities from natural language queries about calendar events.

CURRENT DATE CONTEXT: Today is ${currentDate} (${currentDateTime})

AVAILABLE INTENTS:
- schedule: User wants to create/book a new event
- query: User wants to find/list existing events
- update: User wants to modify an existing event
- cancel: User wants to delete/cancel an event
- availability: User wants to check free/busy time
- email_query: User wants to see/search emails
- email_search: User wants to search for specific emails

Extract the following information and respond ONLY with valid JSON:
{
  "intent": "one_of_the_intents_above",
  "entities": {
    "dateTime": "ISO string if specific time mentioned, null otherwise",
    "duration": "number in minutes if mentioned, null otherwise", 
    "title": "event title/subject if mentioned, null otherwise",
    "attendees": ["array", "of", "email", "addresses"] or null,
    "location": "location string if mentioned, null otherwise",
    "description": "additional details if mentioned, null otherwise"
  },
  "confidence": 0.95
}

Examples:
- "Schedule a meeting with john@example.com tomorrow at 2pm for 1 hour" 
- "What meetings do I have next week?"
- "Cancel my 3pm meeting today"
- "Am I free on Friday afternoon?"
- "Show me my recent emails" → intent: "email_query"
- "Get my unread emails" → intent: "email_query"
- "Search for emails about meetings" → intent: "email_search"
- "Find emails from john@example.com" → intent: "email_search"`;

      // Add conversation context if available
      if (conversationContext) {
        systemPrompt += `

CONVERSATION CONTEXT:
- Original query: "${conversationContext.originalQuery}"
- Previous intent: ${conversationContext.intent}
- Previously extracted entities: ${JSON.stringify(conversationContext.entities)}
- Missing information: ${conversationContext.missingInfo?.join(', ') || 'none'}

The user is providing additional information to complete their original request. Merge the new information with the existing context.`;
      }

      const response = await this.openai.getChatCompletions(
        this.deploymentName,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        {
          temperature: 0.1,
          maxTokens: 500,
        }
      );

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from Azure AI');
      }

      // Parse the JSON response
      let parsedQuery: ParsedQuery;
      try {
        parsedQuery = JSON.parse(content);
      } catch (parseError) {
        this.logger.warn('Failed to parse AI response as JSON', { content });
        // Fallback to basic parsing
        parsedQuery = await this.fallbackParse(query);
      }

      // Enhance with chrono date parsing if needed
      if (!parsedQuery.entities.dateTime && query) {
        const now = new Date();
        const chronoResults = chrono.parse(query, now); // Use current date as reference
        if (chronoResults.length > 0) {
          parsedQuery.entities.dateTime = chronoResults[0].start.date().toISOString();
        }
      }

      this.logger.info('Successfully parsed calendar query', { 
        intent: parsedQuery.intent,
        confidence: parsedQuery.confidence 
      });

      return parsedQuery;
    } catch (error) {
      this.logger.logError(error as Error, 'Failed to parse calendar query');
      // Return fallback parsing
      return this.fallbackParse(query);
    }
  }

  /**
   * Fallback parsing when AI fails
   */
  private async fallbackParse(query: string): Promise<ParsedQuery> {
    const lowerQuery = query.toLowerCase();
    
    let intent: ParsedQuery['intent'] = 'query';
    if (lowerQuery.includes('email') || lowerQuery.includes('inbox') || lowerQuery.includes('unread') || lowerQuery.includes('message')) {
      if (lowerQuery.includes('search') || lowerQuery.includes('find') || lowerQuery.includes('from') || lowerQuery.includes('about')) {
        intent = 'email_search';
      } else {
        intent = 'email_query';
      }
    } else if (lowerQuery.includes('schedule') || lowerQuery.includes('book') || lowerQuery.includes('create')) {
      intent = 'schedule';
    } else if (lowerQuery.includes('cancel') || lowerQuery.includes('delete')) {
      intent = 'cancel';
    } else if (lowerQuery.includes('update') || lowerQuery.includes('modify') || lowerQuery.includes('change')) {
      intent = 'update';
    } else if (lowerQuery.includes('free') || lowerQuery.includes('available') || lowerQuery.includes('busy')) {
      intent = 'availability';
    }

    // Basic date parsing with chrono using current date as reference
    const now = new Date();
    const chronoResults = chrono.parse(query, now);
    const dateTime = chronoResults.length > 0 ? chronoResults[0].start.date().toISOString() : undefined;

    return {
      intent,
      entities: {
        dateTime,
        duration: this.extractDuration(query),
        title: this.extractTitle(query),
        attendees: this.extractEmails(query),
        location: undefined,
        description: undefined,
      },
      confidence: 0.6, // Lower confidence for fallback
    };
  }

  /**
   * Extract duration from text
   */
  private extractDuration(text: string): number | undefined {
    const durationPatterns = [
      /(\d+)\s*(?:hour|hr|h)s?/i,
      /(\d+)\s*(?:minute|min|m)s?/i,
    ];

    for (const pattern of durationPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        return pattern.source.includes('hour|hr|h') ? value * 60 : value;
      }
    }

    return undefined;
  }

  /**
   * Extract email addresses from text
   */
  private extractEmails(text: string): string[] | undefined {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailPattern);
    return emails || undefined;
  }

  /**
   * Extract potential title from text
   */
  private extractTitle(text: string): string | undefined {
    // Look for quoted strings or "meeting about/for/with"
    const titlePatterns = [
      /"([^"]+)"/,
      /meeting (?:about|for|with|on)\s+([^,.\n]+)/i,
      /schedule\s+(?:a\s+)?(.+?)(?:\s+(?:at|on|for|with))/i,
    ];

    for (const pattern of titlePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Find optimal meeting slots using AI-powered analysis
   */
  async findOptimalMeetingSlots(
    request: MeetingSlotRequest,
    busyTimes: Array<{ start: string; end: string }>,
    preferences?: {
      preferredTimes?: string[];
      avoidTimes?: string[];
    }
  ): Promise<AvailableSlot[]> {
    try {
      this.logger.debug('Finding optimal meeting slots', { request, busyTimes });

      const workingStart = request.workingHours?.start || '09:00';
      const workingEnd = request.workingHours?.end || '17:00';
      const bufferMinutes = request.bufferTime || 15;

      // Generate potential slots
      const slots: AvailableSlot[] = [];
      const startDate = parseISO(request.timeMin);
      const endDate = parseISO(request.timeMax);
      
      // Iterate through each day
      let currentDate = startDate;
      while (currentDate <= endDate) {
        const daySlots = this.generateDaySlots(
          currentDate,
          workingStart,
          workingEnd,
          request.duration,
          bufferMinutes,
          busyTimes
        );
        slots.push(...daySlots);
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      }

      // Score and sort slots
      const scoredSlots = await this.scoreSlots(slots, preferences);
      
      // Return top suggestions
      const maxSuggestions = request.maxSuggestions || 5;
      return scoredSlots.slice(0, maxSuggestions);
    } catch (error) {
      this.logger.logError(error as Error, 'Failed to find optimal meeting slots');
      throw new AzureAIError('Failed to find optimal meeting slots', error);
    }
  }

  /**
   * Generate available slots for a single day
   */
  private generateDaySlots(
    date: Date,
    workingStart: string,
    workingEnd: string,
    duration: number,
    buffer: number,
    busyTimes: Array<{ start: string; end: string }>
  ): AvailableSlot[] {
    const slots: AvailableSlot[] = [];
    
    // Create working hours for this day
    const [startHour, startMin] = workingStart.split(':').map(Number);
    const [endHour, endMin] = workingEnd.split(':').map(Number);
    
    const dayStart = new Date(date);
    dayStart.setHours(startHour, startMin, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(endHour, endMin, 0, 0);

    // Generate 30-minute intervals throughout the day
    let currentTime = dayStart;
    while (currentTime < dayEnd) {
      const slotEnd = addMinutes(currentTime, duration);
      
      // Check if slot fits within working hours
      if (slotEnd <= dayEnd) {
        // Check if slot conflicts with busy times
        const slotStart = currentTime.toISOString();
        const slotEndISO = slotEnd.toISOString();
        
        const hasConflict = busyTimes.some(busy => {
          const busyStart = parseISO(busy.start);
          const busyEnd = parseISO(busy.end);
          
          return (
            isWithinInterval(currentTime, { start: busyStart, end: busyEnd }) ||
            isWithinInterval(slotEnd, { start: busyStart, end: busyEnd }) ||
            (currentTime <= busyStart && slotEnd >= busyEnd)
          );
        });

        if (!hasConflict) {
          slots.push({
            start: slotStart,
            end: slotEndISO,
            duration,
            confidence: 0.8, // Base confidence
          });
        }
      }
      
      currentTime = addMinutes(currentTime, 30); // Move to next 30-min slot
    }

    return slots;
  }

  /**
   * Score and rank available slots based on preferences
   */
  private async scoreSlots(
    slots: AvailableSlot[],
    preferences?: {
      preferredTimes?: string[];
      avoidTimes?: string[];
    }
  ): Promise<AvailableSlot[]> {
    const scoredSlots = slots.map(slot => {
      let score = slot.confidence;
      const slotTime = parseISO(slot.start);
      const hour = slotTime.getHours();

      // Prefer mid-morning and early afternoon
      if (hour >= 10 && hour <= 11) score += 0.2;
      if (hour >= 14 && hour <= 15) score += 0.15;
      
      // Slightly penalize very early or late times
      if (hour < 9 || hour > 16) score -= 0.1;

      // Apply user preferences if provided
      if (preferences?.preferredTimes) {
        const timeStr = format(slotTime, 'HH:mm');
        if (preferences.preferredTimes.includes(timeStr)) {
          score += 0.3;
        }
      }

      if (preferences?.avoidTimes) {
        const timeStr = format(slotTime, 'HH:mm');
        if (preferences.avoidTimes.includes(timeStr)) {
          score -= 0.4;
        }
      }

      return {
        ...slot,
        confidence: Math.max(0, Math.min(1, score)), // Clamp between 0-1
      };
    });

    // Sort by confidence score (highest first)
    return scoredSlots.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate smart event suggestions based on context
   */
  async generateEventSuggestions(
    query: string,
    context?: {
      recentEvents?: string[];
      userPreferences?: Record<string, unknown>;
    }
  ): Promise<{
    suggestions: Array<{
      title: string;
      description?: string;
      duration: number;
      type: string;
    }>;
  }> {
    try {
      this.logger.debug('Generating event suggestions', { query, context });

      const systemPrompt = `You are a calendar assistant that suggests event details based on user queries and context.

Based on the user's request, suggest appropriate event details. Respond with valid JSON only:

{
  "suggestions": [
    {
      "title": "suggested event title",
      "description": "optional description",
      "duration": 60,
      "type": "meeting|call|appointment|other"
    }
  ]
}

Consider:
- Meeting type (1-on-1, team meeting, interview, etc.)
- Appropriate duration (15min for quick check-ins, 60min for full meetings)
- Professional titles and descriptions
- Context from recent events if provided`;

      const contextStr = context?.recentEvents ? 
        `Recent events: ${context.recentEvents.join(', ')}` : '';

      const response = await this.openai.getChatCompletions(
        this.deploymentName,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${query}\n\n${contextStr}` }
        ],
        {
          temperature: 0.3,
          maxTokens: 300,
        }
      );

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from Azure AI');
      }

      const suggestions = JSON.parse(content);
      this.logger.info('Generated event suggestions', { 
        count: suggestions.suggestions?.length || 0 
      });

      return suggestions;
    } catch (error) {
      this.logger.logError(error as Error, 'Failed to generate event suggestions');
      
      // Fallback suggestions
      return {
        suggestions: [
          {
            title: 'Meeting',
            description: 'General meeting',
            duration: 60,
            type: 'meeting',
          },
        ],
      };
    }
  }
} 