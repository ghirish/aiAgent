const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Smart Calendar - Uses GPT-4 for all intelligence
class SmartCalendar {
  constructor() {
    this.calendarService = null;
    this.aiService = null;
    this.logger = null;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Smart Calendar with GPT-4...');
      
      // Import services
      const { GoogleCalendarService } = await import(path.resolve(__dirname, '../dist/services/google-calendar.js'));
      const { AzureAIService } = await import(path.resolve(__dirname, '../dist/services/azure-ai.js'));
      const { createLogger } = await import(path.resolve(__dirname, '../dist/utils/logger.js'));
      
      // Initialize services
      this.logger = createLogger('info');
      this.calendarService = new GoogleCalendarService(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI,
        this.logger
      );
      
      this.aiService = new AzureAIService(
        process.env.AZURE_OPENAI_ENDPOINT,
        process.env.AZURE_OPENAI_API_KEY,
        process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        process.env.AZURE_OPENAI_API_VERSION,
        this.logger
      );
      
      // Load OAuth tokens
      const fs = require('fs');
      const tokensPath = path.resolve(__dirname, '../tokens.json');
      
      if (fs.existsSync(tokensPath)) {
        const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
        this.calendarService.setAccessToken(tokens.access_token, tokens.refresh_token);
        console.log('✅ Smart Calendar initialized with GPT-4 + Google Calendar');
        return true;
      } else {
        throw new Error('No OAuth tokens found');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Smart Calendar:', error.message);
      return false;
    }
  }

  // Get calendar data for a time range
  async getCalendarData(timeMin, timeMax, maxResults = 100) {
    try {
      const events = await this.calendarService.getEvents(timeMin, timeMax, 'primary', maxResults);
      
      // Also get free/busy data
      const freeBusy = await this.calendarService.checkFreeBusy({
        timeMin: timeMin,
        timeMax: timeMax,
        calendarIds: ['primary']
      });
      
      return {
        events: events,
        freeBusy: freeBusy,
        timeRange: { timeMin, timeMax }
      };
    } catch (error) {
      console.error('❌ Error getting calendar data:', error.message);
      throw error;
    }
  }

  // Universal function: Get calendar data + ask GPT-4
  async processRequest(userRequest, tool = 'general', timeMin = null, timeMax = null) {
    try {
      console.log(`🤖 Processing request with GPT-4: "${userRequest}"`);
      
      // Get relevant calendar data
      let calendarData = {};
      if (timeMin && timeMax) {
        calendarData = await this.getCalendarData(timeMin, timeMax);
      } else {
        // Default to a reasonable time range (past week + next month)
        const now = new Date();
        const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        calendarData = await this.getCalendarData(pastWeek.toISOString(), nextMonth.toISOString());
      }
      
      // Create prompt for GPT-4
      const prompt = this.createPrompt(userRequest, calendarData, tool);
      
      // Ask GPT-4
      const response = await this.aiService.generateResponse(prompt);
      
      return {
        success: true,
        userRequest: userRequest,
        calendarData: calendarData,
        aiResponse: response,
        tool: tool
      };
      
    } catch (error) {
      console.error('❌ Error processing request:', error.message);
      throw error;
    }
  }

  createPrompt(userRequest, calendarData, tool) {
    const currentTime = new Date().toISOString();
    
    return `You are a Calendar Copilot AI assistant. 

CURRENT TIME: ${currentTime}
USER REQUEST: "${userRequest}"
TOOL: ${tool}

CALENDAR DATA:
Events: ${JSON.stringify(calendarData.events, null, 2)}
Free/Busy: ${JSON.stringify(calendarData.freeBusy, null, 2)}
Time Range: ${JSON.stringify(calendarData.timeRange, null, 2)}

Based on the user's request and their calendar data, provide a helpful, intelligent response. 

For different types of requests:
- LIST EVENTS: Summarize what events they have
- CHECK AVAILABILITY: Tell them if they're free/busy and when
- FIND SLOTS: Suggest available meeting times
- CREATE EVENT: Check for conflicts and suggest best times
- CONFLICTS: Identify overlapping events and suggest alternatives
- NATURAL QUERIES: Answer their questions about their calendar

Respond in JSON format:
{
  "type": "events_list|availability_check|slot_suggestions|conflict_analysis|general_response",
  "message": "Human-readable response",
  "data": {
    // Relevant structured data based on request type
  },
  "suggestions": ["practical suggestions for the user"],
  "conflicts": ["any conflicts found"],
  "recommendations": ["AI recommendations"]
}

Be conversational, helpful, and intelligent. Use the actual calendar data to provide specific, accurate responses.`;
  }

  // Specific tool implementations - all use the same pattern
  async getEvents(timeMin, timeMax) {
    return await this.processRequest(`Show me my events from ${timeMin} to ${timeMax}`, 'get_events', timeMin, timeMax);
  }

  async checkAvailability(timeMin, timeMax) {
    return await this.processRequest(`Am I available from ${timeMin} to ${timeMax}?`, 'check_availability', timeMin, timeMax);
  }

  async findMeetingSlots(duration, timeMin, timeMax, preferences = {}) {
    const request = `Find me available ${duration}-minute meeting slots between ${timeMin} and ${timeMax}. Preferences: ${JSON.stringify(preferences)}`;
    return await this.processRequest(request, 'find_slots', timeMin, timeMax);
  }

  async createEvent(eventDetails) {
    const request = `I want to create this event: ${JSON.stringify(eventDetails)}. Check for conflicts and let me know if it's a good time.`;
    const startTime = new Date(eventDetails.start.dateTime);
    const timeMin = new Date(startTime.getTime() - 24 * 60 * 60 * 1000).toISOString(); // Day before
    const timeMax = new Date(startTime.getTime() + 24 * 60 * 60 * 1000).toISOString(); // Day after
    return await this.processRequest(request, 'create_event', timeMin, timeMax);
  }

  async detectConflicts(proposedEvent) {
    const request = `Check if this proposed event conflicts with my existing schedule: ${JSON.stringify(proposedEvent)}`;
    const startTime = new Date(proposedEvent.start.dateTime);
    const timeMin = new Date(startTime.getTime() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours before
    const timeMax = new Date(startTime.getTime() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours after
    return await this.processRequest(request, 'conflict_detection', timeMin, timeMax);
  }

  async processNaturalQuery(query) {
    return await this.processRequest(query, 'natural_query');
  }

  async getCalendarSummary(timeMin, timeMax) {
    return await this.processRequest(`Give me a summary of my calendar from ${timeMin} to ${timeMax}`, 'calendar_summary', timeMin, timeMax);
  }

  // Schedule meeting - uses GPT-4 to find best time and create event
  async scheduleMeeting(meetingDetails) {
    const request = `I need to schedule a meeting: ${JSON.stringify(meetingDetails)}. Find the best available time and create the event.`;
    const response = await this.processRequest(request, 'schedule_meeting');
    
    // If GPT-4 suggests a good time and no conflicts, actually create the event
    try {
      const aiData = JSON.parse(response.aiResponse);
      if (aiData.type === 'slot_suggestions' && aiData.data.recommendedSlot && aiData.conflicts.length === 0) {
        const eventDetails = {
          summary: meetingDetails.title || meetingDetails.summary || 'Meeting',
          start: { dateTime: aiData.data.recommendedSlot.start },
          end: { dateTime: aiData.data.recommendedSlot.end },
          description: meetingDetails.description || `Scheduled via Calendar Copilot`,
          location: meetingDetails.location || 'TBD'
        };
        
        const createdEvent = await this.calendarService.createEvent(eventDetails);
        response.createdEvent = createdEvent;
        response.actuallyCreated = true;
      }
    } catch (e) {
      console.log('Note: Could not auto-create event, but provided recommendations');
    }
    
    return response;
  }
}

module.exports = { SmartCalendar }; 