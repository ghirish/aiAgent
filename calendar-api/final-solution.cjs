const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Simple, direct Google Calendar integration
async function createRealCalendarEvent(eventDetails) {
  try {
    console.log('🚀 Direct Google Calendar integration...');
    
    // Import Google Calendar service directly
    const { GoogleCalendarService } = await import(path.resolve(__dirname, '../dist/services/google-calendar.js'));
    const { createLogger } = await import(path.resolve(__dirname, '../dist/utils/logger.js'));
    
    // Initialize logger and calendar service
    const logger = createLogger('info');
    const calendarService = new GoogleCalendarService(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
      logger
    );
    
    // Load existing OAuth tokens
    const fs = require('fs');
    const tokensPath = path.resolve(__dirname, '../tokens.json');
    
    if (fs.existsSync(tokensPath)) {
      const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
      calendarService.setAccessToken(tokens.access_token, tokens.refresh_token);
      console.log('✅ OAuth tokens loaded');
    } else {
      throw new Error('No OAuth tokens found. Run OAuth flow first.');
    }
    
    // Create the event directly using Google Calendar API
    console.log('📅 Creating event with data:', JSON.stringify(eventDetails, null, 2));
    
    const createdEvent = await calendarService.createEvent(eventDetails);
    
    console.log('✅ SUCCESS! Real Google Calendar event created:', createdEvent.id);
    console.log('🔗 HTML Link received:', createdEvent.htmlLink);
    console.log('📋 Full created event:', JSON.stringify(createdEvent, null, 2));
    
    return createdEvent;
    
  } catch (error) {
    console.error('❌ Direct Calendar API error:', error.message);
    console.error('❌ Stack trace:', error.stack);
    throw error;
  }
}

module.exports = { createRealCalendarEvent }; 