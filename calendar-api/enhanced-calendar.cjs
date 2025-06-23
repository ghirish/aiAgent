const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Enhanced Calendar Features - Direct Google Calendar integration
class EnhancedCalendarFeatures {
  constructor() {
    this.calendarService = null;
    this.logger = null;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Enhanced Calendar Features...');
      
      // Import Google Calendar service
      const { GoogleCalendarService } = await import(path.resolve(__dirname, '../dist/services/google-calendar.js'));
      const { createLogger } = await import(path.resolve(__dirname, '../dist/utils/logger.js'));
      
      // Initialize services
      this.logger = createLogger('info');
      this.calendarService = new GoogleCalendarService(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI,
        this.logger
      );
      
      // Load OAuth tokens
      const fs = require('fs');
      const tokensPath = path.resolve(__dirname, '../tokens.json');
      
      if (fs.existsSync(tokensPath)) {
        const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
        this.calendarService.setAccessToken(tokens.access_token, tokens.refresh_token);
        console.log('✅ Enhanced Calendar Features initialized with OAuth tokens');
        return true;
      } else {
        throw new Error('No OAuth tokens found');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Calendar Features:', error.message);
      return false;
    }
  }

  async getEvents(timeMin, timeMax, maxResults = 50) {
    try {
      if (!this.calendarService) {
        throw new Error('Calendar service not initialized');
      }

      console.log(`📅 Fetching events from ${timeMin} to ${timeMax}...`);
      const events = await this.calendarService.getEvents(timeMin, timeMax, 'primary', maxResults);
      
      return {
        success: true,
        events: events,
        totalEvents: events.length,
        message: `Found ${events.length} events`
      };
    } catch (error) {
      console.error('❌ Error fetching events:', error.message);
      throw error;
    }
  }

  async checkAvailability(timeMin, timeMax, calendarIds = ['primary']) {
    try {
      if (!this.calendarService) {
        throw new Error('Calendar service not initialized');
      }

      console.log(`🔍 Checking availability from ${timeMin} to ${timeMax}...`);
      
      const freeBusyData = await this.calendarService.checkFreeBusy({
        timeMin: timeMin,
        timeMax: timeMax,
        calendarIds: calendarIds
      });

      return {
        success: true,
        availability: freeBusyData,
        isFree: !freeBusyData.calendars?.primary?.busy?.length,
        busyPeriods: freeBusyData.calendars?.primary?.busy || [],
        message: freeBusyData.calendars?.primary?.busy?.length ? 
          `Found ${freeBusyData.calendars.primary.busy.length} busy periods` : 
          'You are free during this time!'
      };
    } catch (error) {
      console.error('❌ Error checking availability:', error.message);
      throw error;
    }
  }

  async detectConflicts(proposedEvent) {
    try {
      if (!this.calendarService) {
        throw new Error('Calendar service not initialized');
      }

      console.log('🔍 Checking for conflicts with proposed event...');
      
      // Get events in the same time range as the proposed event
      const startTime = new Date(proposedEvent.start.dateTime);
      const endTime = new Date(proposedEvent.end.dateTime);
      
      // Check a wider range to catch overlapping events
      const checkStart = new Date(startTime.getTime() - 60 * 60 * 1000); // 1 hour before
      const checkEnd = new Date(endTime.getTime() + 60 * 60 * 1000); // 1 hour after
      
      const existingEvents = await this.calendarService.getEvents(
        checkStart.toISOString(), 
        checkEnd.toISOString(), 
        'primary', 
        50
      );

      // Find overlapping events
      const conflicts = existingEvents.filter(event => {
        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);
        
        // Check for overlap
        return (startTime < eventEnd && endTime > eventStart);
      });

      if (conflicts.length > 0) {
        // Generate alternative time suggestions
        const alternatives = this.generateAlternativeSlots(startTime, endTime, existingEvents);
        
        return {
          success: true,
          hasConflicts: true,
          conflicts: conflicts,
          alternatives: alternatives,
          message: `Found ${conflicts.length} conflicting event(s)`,
          resolutionSuggestions: [
            'Consider rescheduling to one of the suggested alternative times',
            'Check if any of the conflicting meetings can be moved',
            'Reduce the meeting duration if possible'
          ]
        };
      }

      return {
        success: true,
        hasConflicts: false,
        conflicts: [],
        message: 'No conflicts detected'
      };
    } catch (error) {
      console.error('❌ Error detecting conflicts:', error.message);
      throw error;
    }
  }

  generateAlternativeSlots(originalStart, originalEnd, existingEvents) {
    const duration = originalEnd.getTime() - originalStart.getTime();
    const alternatives = [];
    
    // Try slots 30 minutes before and after
    const timeSlots = [
      -30 * 60 * 1000, // 30 minutes earlier
      30 * 60 * 1000,  // 30 minutes later
      60 * 60 * 1000,  // 1 hour later
      -60 * 60 * 1000  // 1 hour earlier
    ];

    for (const offset of timeSlots) {
      const newStart = new Date(originalStart.getTime() + offset);
      const newEnd = new Date(newStart.getTime() + duration);
      
      // Skip if outside working hours (9 AM - 5 PM)
      if (newStart.getHours() < 9 || newEnd.getHours() > 17) {
        continue;
      }
      
      // Check if this slot conflicts with existing events
      const hasConflict = existingEvents.some(event => {
        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);
        return (newStart < eventEnd && newEnd > eventStart);
      });
      
      if (!hasConflict) {
        alternatives.push({
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
          score: 100 - Math.abs(offset / (60 * 60 * 1000)) * 10, // Prefer closer times
          reason: offset < 0 ? 'Earlier alternative' : 'Later alternative'
        });
      }
    }

    return alternatives.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  async findMeetingSlots(duration, timeMin, timeMax, workingHours = { start: '09:00', end: '17:00' }) {
    try {
      if (!this.calendarService) {
        throw new Error('Calendar service not initialized');
      }

      console.log(`🔍 Finding ${duration}-minute slots between ${timeMin} and ${timeMax}...`);
      
      // Get existing events in the time range
      const existingEvents = await this.calendarService.getEvents(timeMin, timeMax, 'primary', 100);
      
      // Generate time slots
      const slots = [];
      const start = new Date(timeMin);
      const end = new Date(timeMax);
      const durationMs = duration * 60 * 1000;
      
      // Check every 30-minute increment
      for (let current = new Date(start); current < end; current.setMinutes(current.getMinutes() + 30)) {
        const slotEnd = new Date(current.getTime() + durationMs);
        
        // Skip if slot goes beyond end time
        if (slotEnd > end) break;
        
        // Check working hours
        if (current.getHours() < parseInt(workingHours.start.split(':')[0]) || 
            slotEnd.getHours() > parseInt(workingHours.end.split(':')[0])) {
          continue;
        }
        
        // Check for conflicts with existing events
        const hasConflict = existingEvents.some(event => {
          const eventStart = new Date(event.start.dateTime);
          const eventEnd = new Date(event.end.dateTime);
          return (current < eventEnd && slotEnd > eventStart);
        });
        
        if (!hasConflict) {
          slots.push({
            start: current.toISOString(),
            end: slotEnd.toISOString(),
            score: 90, // Base score
            reason: 'Available slot'
          });
        }
      }

      return {
        success: true,
        availableSlots: slots.slice(0, 10), // Return top 10 slots
        totalSlots: slots.length,
        message: `Found ${slots.length} available time slots`
      };
    } catch (error) {
      console.error('❌ Error finding meeting slots:', error.message);
      throw error;
    }
  }
}

module.exports = { EnhancedCalendarFeatures }; 