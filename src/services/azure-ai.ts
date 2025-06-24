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
      
      let systemPrompt = `Extract intent and entities from calendar queries. Return valid JSON without markdown formatting.

EXAMPLES:
"Change test meeting to Project Review" → {"intent": "update", "entities": {"currentTitle": "test meeting", "newTitle": "Project Review"}, "confidence": 0.95}
"What do I have today?" → {"intent": "query", "entities": {"dateTime": "${currentDate}"}, "confidence": 0.95}
"Schedule meeting tomorrow 2pm" → {"intent": "schedule", "entities": {"dateTime": "tomorrow 2pm"}, "confidence": 0.95}

For updates: currentTitle = what to find, newTitle = what to change it to.

Return JSON only:`;

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
          {
            role: 'system',
            content: `You extract calendar intent from queries. For "Change X to Y" patterns, X is the current title to find, Y is the new title to set.

Return JSON: {"intent": "update", "entities": {"currentTitle": "X", "newTitle": "Y"}, "confidence": 0.95}`
          },
          { role: 'user', content: query }
        ],
        {
          temperature: 0.0,
          maxTokens: 200,
        }
      );

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from Azure AI');
      }

      console.log('🔍 RAW GPT-4 RESPONSE:', content);

      // Parse the JSON response (handle markdown wrapping)
      let parsedQuery: ParsedQuery;
      try {
        // Remove markdown code block wrapping if present
        const cleanContent = content.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        parsedQuery = JSON.parse(cleanContent);
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

    // For update intents, try to extract currentTitle and newTitle
    let currentTitle = undefined;
    let newTitle = undefined;
    
    if (intent === 'update') {
      // Pattern: "Change X to Y" or "Update X to Y"
      const changeToPattern = /(?:change|update|rename)\s+(.+?)\s+to\s+(.+?)(?:\s|$)/i;
      const match = query.match(changeToPattern);
      
      if (match) {
        currentTitle = match[1].trim();
        newTitle = match[2].trim();
      }
    }

    return {
      intent,
      entities: {
        dateTime,
        duration: this.extractDuration(query),
        title: this.extractTitle(query),
        currentTitle,
        newTitle,
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
   * Phase 3 Enhanced: Analyze email content for scheduling intent
   */
  async analyzeEmailForScheduling(emailText: string): Promise<{
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
  }> {
    const enhancedPrompt = `Analyze this email for scheduling/meeting intent with comprehensive extraction.

Email:
${emailText}

Perform deep analysis and extract:
1. Does this email contain a request to schedule, reschedule, or discuss scheduling a meeting/call/appointment?
2. What is your confidence level (0-1)?
3. Extract all time/date references (preserve exact phrasing)
4. Identify the main meeting topic/purpose
5. Extract participant names/emails mentioned
6. Assess urgency based on language (urgent, ASAP, soon, etc.)
7. Determine meeting type and formality level
8. Estimate appropriate meeting duration based on topic
9. Extract any action items or deadlines mentioned
10. Does this email require a response?

Respond ONLY with valid JSON in this exact format:
{
  "hasSchedulingIntent": boolean,
  "confidence": number,
  "proposedTimes": ["exact phrase 1", "exact phrase 2"],
  "meetingTopic": "extracted topic or null",
  "participants": ["email1", "name2"],
  "urgency": "low|medium|high",
  "meetingType": "one-on-one|team-meeting|interview|casual|formal",
  "estimatedDuration": number_in_minutes,
  "actionItems": ["action1", "action2"],
  "responseRequired": boolean
}

Key scheduling indicators:
- Direct: "schedule a meeting", "book time", "set up a call"
- Indirect: "when are you free?", "available this week?", "catch up"
- Rescheduling: "move our meeting", "change the time", "reschedule"
- Time references: "tomorrow", "next week", "Monday at 2pm", "this afternoon"`;

    try {
      const response = await this.openai.getChatCompletions(
        this.deploymentName,
        [{ role: 'user', content: enhancedPrompt }],
        {
          temperature: 0.2, // Very low for consistent structured output
          maxTokens: 600,
          frequencyPenalty: 0,
          presencePenalty: 0,
        }
      );

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from Azure AI');
      }

      // Clean the response to ensure valid JSON
      const cleanedResponse = aiResponse.trim();
      let jsonStart = cleanedResponse.indexOf('{');
      let jsonEnd = cleanedResponse.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('Invalid JSON response format');
      }

      const jsonString = cleanedResponse.substring(jsonStart, jsonEnd + 1);
      const analysis = JSON.parse(jsonString);
      
             // Validate and sanitize the response
       const confidence = Math.min(Math.max(Number(analysis.confidence) || 0, 0), 1);
       const sanitizedAnalysis = {
         hasSchedulingIntent: Boolean(analysis.hasSchedulingIntent),
         confidence,
         proposedTimes: Array.isArray(analysis.proposedTimes) ? analysis.proposedTimes : [],
         meetingTopic: typeof analysis.meetingTopic === 'string' ? analysis.meetingTopic : null,
         participants: Array.isArray(analysis.participants) ? analysis.participants : [],
         urgency: ['low', 'medium', 'high'].includes(analysis.urgency) ? analysis.urgency : 'medium',
         meetingType: ['one-on-one', 'team-meeting', 'interview', 'casual', 'formal'].includes(analysis.meetingType) ? 
           analysis.meetingType : 'one-on-one',
         estimatedDuration: Math.min(Math.max(Number(analysis.estimatedDuration) || 60, 15), 480),
         actionItems: Array.isArray(analysis.actionItems) ? analysis.actionItems : [],
         responseRequired: Boolean(analysis.responseRequired),
       };
      
      return {
        hasSchedulingIntent: sanitizedAnalysis.hasSchedulingIntent,
        confidence: sanitizedAnalysis.confidence,
        details: sanitizedAnalysis.hasSchedulingIntent ? sanitizedAnalysis : undefined,
      };

    } catch (error) {
      this.logger.error('Azure AI email analysis failed:', error);
      
      // Enhanced fallback analysis
      return this.fallbackEmailAnalysis(emailText);
    }
  }

  /**
   * Enhanced fallback email analysis using pattern matching
   */
  private fallbackEmailAnalysis(emailText: string): {
    hasSchedulingIntent: boolean;
    confidence: number;
    details?: any;
  } {
    const text = emailText.toLowerCase();
    
    // Enhanced scheduling keywords with weights
    const schedulingPatterns = [
      { pattern: /schedule|scheduling/, weight: 0.3 },
      { pattern: /meeting|meet/, weight: 0.3 },
      { pattern: /appointment|appt/, weight: 0.3 },
      { pattern: /call|calling/, weight: 0.25 },
      { pattern: /available|availability/, weight: 0.25 },
      { pattern: /free time|free/, weight: 0.2 },
      { pattern: /calendar/, weight: 0.25 },
      { pattern: /book|booking/, weight: 0.25 },
      { pattern: /reschedule|rescheduling/, weight: 0.35 },
      { pattern: /catch up|sync/, weight: 0.2 },
      { pattern: /discussion|discuss/, weight: 0.15 },
      { pattern: /interview/, weight: 0.3 },
    ];

    // Time expression patterns
    const timePatterns = [
      /today|tomorrow|tonight/,
      /next week|this week|next month/,
      /monday|tuesday|wednesday|thursday|friday|saturday|sunday/,
      /morning|afternoon|evening|night/,
      /\d{1,2}:\d{2}|am|pm/,
      /\d{1,2}\s*(am|pm)/,
    ];

    // Question patterns that indicate scheduling intent
    const questionPatterns = [
      /when are you|when would you/,
      /are you free|are you available/,
      /does.*work for you|work for you/,
      /what time|what day/,
      /can we|could we.*meet/,
    ];

    let confidence = 0;
    
    // Check scheduling patterns
    schedulingPatterns.forEach(({ pattern, weight }) => {
      if (pattern.test(text)) {
        confidence += weight;
      }
    });

    // Check time patterns
    const hasTimeReferences = timePatterns.some(pattern => pattern.test(text));
    if (hasTimeReferences) {
      confidence += 0.3;
    }

    // Check question patterns
    const hasSchedulingQuestions = questionPatterns.some(pattern => pattern.test(text));
    if (hasSchedulingQuestions) {
      confidence += 0.4;
    }

    // Urgency detection
    const urgencyPatterns = /urgent|asap|as soon as possible|immediately|emergency/;
    const urgency = urgencyPatterns.test(text) ? 'high' : 'medium';

    const hasSchedulingIntent = confidence > 0.4;
    
    return {
      hasSchedulingIntent,
      confidence: Math.min(confidence, 1),
      details: hasSchedulingIntent ? {
        proposedTimes: hasTimeReferences ? ['time mentioned in email'] : [],
        meetingTopic: 'Meeting discussion',
        participants: [],
        urgency,
        meetingType: 'one-on-one',
        estimatedDuration: 60,
        actionItems: [],
        responseRequired: hasSchedulingQuestions,
        confidence: Math.min(confidence, 1),
      } : undefined,
    };
  }

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

  /**
   * Phase 5: Generate professional email responses for scheduling requests
   */
  async generateSchedulingResponse(params: {
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
  }> {
    try {
      this.logger.debug('Generating scheduling response', { 
        responseType: params.responseType,
        originalSubject: params.originalEmail.subject 
      });

      const systemPrompt = `You are a professional email assistant that generates responses to scheduling requests. 
Generate a professional, friendly, and clear email response based on the user's requirements.

Response Types:
- accept: Confirm the proposed time and express enthusiasm
- counter-propose: Politely suggest alternative times
- decline: Professionally decline with a reason
- request-info: Ask for clarification or additional details

Guidelines:
- Be professional but warm
- Be concise but complete
- Include relevant details (location, duration, agenda if provided)
- Use appropriate tone for business communication
- If accepting, express enthusiasm for the meeting
- If counter-proposing, provide specific alternatives
- If declining, be apologetic but clear
- Always be respectful and helpful

Return valid JSON only:
{
  "subject": "Re: [original subject]",
  "body": "email body with proper formatting",
  "tone": "professional|friendly|formal",
  "urgency": "low|medium|high"
}`;

      const userPrompt = this.buildResponsePrompt(params);

      const response = await this.openai.getChatCompletions(
        this.deploymentName,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        {
          temperature: 0.3,
          maxTokens: 800,
        }
      );

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from Azure AI');
      }

      // Parse the JSON response
      let responseData;
      try {
        const cleanContent = content.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        responseData = JSON.parse(cleanContent);
      } catch (parseError) {
        this.logger.warn('Failed to parse AI response as JSON', { content });
        // Generate fallback response
        responseData = this.generateFallbackResponse(params);
      }

      this.logger.info('Generated scheduling response', { 
        responseType: params.responseType,
        tone: responseData.tone 
      });

      return responseData;

    } catch (error) {
      this.logger.logError(error as Error, 'Failed to generate scheduling response');
      
      // Return fallback response
      return this.generateFallbackResponse(params);
    }
  }

  /**
   * Build the prompt for email response generation
   */
  private buildResponsePrompt(params: {
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
  }): string {
    let prompt = `Original Email:
Subject: ${params.originalEmail.subject}
From: ${params.originalEmail.from}
Content: ${params.originalEmail.content}

Response Type: ${params.responseType}
`;

    if (params.selectedTime) {
      prompt += `Selected Time: ${params.selectedTime}\n`;
    }

    if (params.counterProposals && params.counterProposals.length > 0) {
      prompt += `Counter-Proposals: ${params.counterProposals.join(', ')}\n`;
    }

    if (params.reason) {
      prompt += `Reason: ${params.reason}\n`;
    }

    if (params.additionalMessage) {
      prompt += `Additional Message: ${params.additionalMessage}\n`;
    }

    if (params.includeCalendarInvite) {
      prompt += `Include mention of calendar invite: Yes\n`;
    }

    if (params.meetingDetails) {
      prompt += `Meeting Details:\n`;
      if (params.meetingDetails.location) {
        prompt += `- Location: ${params.meetingDetails.location}\n`;
      }
      if (params.meetingDetails.duration) {
        prompt += `- Duration: ${params.meetingDetails.duration} minutes\n`;
      }
      if (params.meetingDetails.agenda) {
        prompt += `- Agenda: ${params.meetingDetails.agenda}\n`;
      }
    }

    prompt += `\nGenerate a professional email response based on the above information.`;

    return prompt;
  }

  /**
   * Generate fallback response when AI fails
   */
  private generateFallbackResponse(params: {
    originalEmail: { subject: string; from: string; content: string };
    responseType: 'accept' | 'counter-propose' | 'decline' | 'request-info';
    selectedTime?: string;
    counterProposals?: string[];
    reason?: string;
    additionalMessage?: string;
  }): {
    subject: string;
    body: string;
    tone: string;
    urgency: 'low' | 'medium' | 'high';
  } {
    const originalSubject = params.originalEmail.subject;
    const subject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;

    let body = `Dear ${params.originalEmail.from.split('@')[0]},\n\nThank you for your email regarding ${originalSubject}.\n\n`;

    switch (params.responseType) {
      case 'accept':
        body += `I'm pleased to confirm that ${params.selectedTime || 'the proposed time'} works well for me. `;
        body += `I look forward to our meeting.\n\n`;
        if (params.additionalMessage) {
          body += `${params.additionalMessage}\n\n`;
        }
        body += `I'll send a calendar invite to confirm the details.`;
        break;

      case 'counter-propose':
        body += `Thank you for the meeting request. Unfortunately, ${params.selectedTime || 'the proposed time'} doesn't work for my schedule. `;
        if (params.counterProposals && params.counterProposals.length > 0) {
          body += `However, I'm available at the following times:\n\n`;
          params.counterProposals.forEach(time => {
            body += `- ${time}\n`;
          });
          body += `\nPlease let me know which option works best for you.`;
        } else {
          body += `Could you suggest some alternative times that might work better?`;
        }
        break;

      case 'decline':
        body += `Thank you for thinking of me for this meeting. Unfortunately, I won't be able to attend`;
        if (params.reason) {
          body += ` due to ${params.reason}`;
        }
        body += `.\n\nI apologize for any inconvenience this may cause.`;
        if (params.additionalMessage) {
          body += ` ${params.additionalMessage}`;
        }
        break;

      case 'request-info':
        body += `I'd be happy to meet with you. To help me prepare and confirm the details, could you please provide:\n\n`;
        body += `- The specific purpose/agenda for our meeting\n`;
        body += `- Your preferred duration\n`;
        body += `- Any materials I should review beforehand\n\n`;
        body += `Once I have these details, I'll be able to confirm a suitable time.`;
        break;
    }

    body += `\n\nBest regards,\n[Your Name]`;

    return {
      subject,
      body,
      tone: 'professional',
      urgency: 'medium'
    };
  }
} 