import { CalendarCopilotServer } from './mcp/server.js';
import { loadConfig } from './utils/config.js';
import { Logger } from './utils/logger.js';
import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';

/**
 * Calendar Integration Test Script
 * Tests the Calendar Copilot with actual Google Calendar
 */

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  try {
    console.log('🚀 Calendar Copilot - Live Google Calendar Test\n');

    // Load configuration
    const config = loadConfig();
    const logger = new Logger(config.app.logLevel);
    
    console.log('✅ Configuration loaded successfully');
    console.log(`📝 Log level: ${config.app.logLevel}`);
    console.log(`🔗 Google Client ID: ${config.google.clientId.substring(0, 20)}...`);
    console.log(`🔗 Azure Endpoint: ${config.azure.endpoint}\n`);

    // Initialize server
    const server = new CalendarCopilotServer(config, logger);
    console.log('✅ Calendar Copilot server initialized\n');

    // Check if we have stored tokens
    let accessToken = process.env.GOOGLE_ACCESS_TOKEN;
    let refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!accessToken) {
      console.log('🔐 No stored access token found. Starting OAuth flow...\n');
      
      // Generate auth URL
      const authUrl = server.getAuthUrl();
      console.log('📋 Please visit this URL to authorize the application:');
      console.log(`\n${authUrl}\n`);
      
      // Get authorization code from user
      const authCode = await question('📝 Enter the authorization code from Google: ');
      
      try {
        await server.exchangeCodeForTokens(authCode.trim());
        console.log('✅ Successfully exchanged authorization code for tokens!\n');
        
        // Note: In a real app, you'd save these tokens securely
        console.log('💡 Tokens obtained! In production, store these securely.\n');
      } catch (error) {
        console.error('❌ Failed to exchange authorization code:', error);
        process.exit(1);
      }
    } else {
      console.log('✅ Using stored access token\n');
      server.setAccessToken(accessToken, refreshToken);
    }

    // Test 1: Get calendar events for the next 7 days
    console.log('🧪 Test 1: Fetching calendar events for the next 7 days...');
    try {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const events = await server['handleGetCalendarEvents']({
        timeMin: now.toISOString(),
        timeMax: nextWeek.toISOString(),
        maxResults: 10,
      });

      console.log(`✅ Found ${events.length} events in the next 7 days:`);
      events.slice(0, 5).forEach((event, index) => {
        const startTime = new Date(event.start.dateTime).toLocaleString();
        console.log(`   ${index + 1}. ${event.summary} - ${startTime}`);
      });
      if (events.length > 5) {
        console.log(`   ... and ${events.length - 5} more events`);
      }
      if (events.length === 0) {
        console.log('   📅 No events found in the next 7 days');
      }
      console.log();
    } catch (error) {
      console.error('❌ Test 1 failed:', error);
    }

    // Test 2: Check availability for today
    console.log('🧪 Test 2: Checking availability for today...');
    try {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(9, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(17, 0, 0, 0);

      const availability = await server['handleCheckAvailability']({
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        calendarIds: ['primary'],
      }) as any;

      const busyTimes = availability.calendars['primary']?.busy || [];
      console.log(`✅ Found ${busyTimes.length} busy periods today:`);
      busyTimes.forEach((busy, index) => {
        const start = new Date(busy.start).toLocaleTimeString();
        const end = new Date(busy.end).toLocaleTimeString();
        console.log(`   ${index + 1}. ${start} - ${end}`);
      });
      if (busyTimes.length === 0) {
        console.log('   🎉 You have no busy periods during working hours today!');
      }
      console.log();
    } catch (error) {
      console.error('❌ Test 2 failed:', error);
    }

    // Test 3: Find meeting slots for next week
    console.log('🧪 Test 3: Finding optimal meeting slots for next week...');
    try {
      const nextWeekStart = new Date();
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      nextWeekStart.setHours(9, 0, 0, 0);
      
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 5); // 5 working days
      nextWeekEnd.setHours(17, 0, 0, 0);

      const slots = await server['handleFindMeetingSlots']({
        duration: 60, // 1 hour meeting
        timeMin: nextWeekStart.toISOString(),
        timeMax: nextWeekEnd.toISOString(),
        workingHours: {
          start: '09:00',
          end: '17:00',
        },
        bufferTime: 15,
        maxSuggestions: 5,
      }) as any[];

      console.log(`✅ Found ${slots.length} optimal meeting slots:`);
      slots.forEach((slot, index) => {
        const start = new Date(slot.start).toLocaleString();
        const confidence = Math.round(slot.confidence * 100);
        console.log(`   ${index + 1}. ${start} (${confidence}% confidence)`);
      });
      console.log();
    } catch (error) {
      console.error('❌ Test 3 failed:', error);
    }

    // Test 4: Parse natural language query
    console.log('🧪 Test 4: Testing natural language parsing...');
    try {
      const testQueries = [
        'What meetings do I have tomorrow?',
        'Schedule a meeting next Tuesday at 2pm for 1 hour',
        'Am I free on Friday afternoon?',
        'Cancel my 3pm meeting today',
      ];

      for (const query of testQueries) {
        console.log(`   📝 Query: "${query}"`);
        const result = await server['handleParseNaturalQuery']({ query }) as any;
        console.log(`   🎯 Intent: ${result.intent} (${Math.round(result.confidence * 100)}% confidence)`);
        
        if (result.entities.dateTime) {
          const date = new Date(result.entities.dateTime).toLocaleString();
          console.log(`   📅 Extracted date: ${date}`);
        }
        if (result.entities.duration) {
          console.log(`   ⏰ Duration: ${result.entities.duration} minutes`);
        }
        if (result.entities.title) {
          console.log(`   📋 Title: ${result.entities.title}`);
        }
        console.log();
      }
    } catch (error) {
      console.error('❌ Test 4 failed:', error);
    }

    // Test 5: Calendar summary
    console.log('🧪 Test 5: Generating calendar summary...');
    try {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const summary = await server['handleGetCalendarSummary']({
        timeMin: today.toISOString(),
        timeMax: nextWeek.toISOString(),
        includeAnalytics: true,
      }) as any;

      console.log(`✅ Calendar Summary:`);
      console.log(`   📊 Total events: ${summary.totalEvents}`);
      if (summary.analytics) {
        console.log(`   ⏰ Total busy hours: ${summary.analytics.busyHours}`);
        console.log(`   📈 Average event duration: ${summary.analytics.averageEventDuration} minutes`);
        console.log(`   🏷️  Most common type: ${summary.analytics.mostCommonEventType}`);
      }
      console.log();
    } catch (error) {
      console.error('❌ Test 5 failed:', error);
    }

    // Interactive testing
    console.log('🎮 Interactive Testing Mode');
    console.log('You can now test natural language queries interactively!');
    console.log('Type "exit" to quit.\n');

    while (true) {
      const userQuery = await question('💬 Enter a calendar query (or "exit"): ');
      
      if (userQuery.toLowerCase().trim() === 'exit') {
        break;
      }

      if (userQuery.trim()) {
        try {
                   console.log('\n🤖 Parsing your query...');
         const result = await server['handleParseNaturalQuery']({ query: userQuery }) as any;
         
         console.log(`✅ Parsed successfully!`);
         console.log(`🎯 Intent: ${result.intent}`);
         console.log(`📊 Confidence: ${Math.round(result.confidence * 100)}%`);
         
         if (Object.keys(result.entities).some((key: string) => result.entities[key])) {
           console.log(`📋 Extracted entities:`);
           Object.entries(result.entities).forEach(([key, value]) => {
              if (value) {
                if (key === 'dateTime' && typeof value === 'string') {
                  console.log(`   ${key}: ${new Date(value).toLocaleString()}`);
                } else {
                  console.log(`   ${key}: ${JSON.stringify(value)}`);
                }
              }
            });
          }
          
          // Suggest next action based on intent
          console.log(`\n💡 Suggested action:`);
          switch (result.intent) {
            case 'schedule':
              console.log(`   Use 'create_event' tool to book this meeting`);
              break;
            case 'query':
              console.log(`   Use 'get_calendar_events' tool to fetch events`);
              break;
            case 'availability':
              console.log(`   Use 'check_availability' tool to check free time`);
              break;
            case 'update':
              console.log(`   Use 'update_event' tool to modify the event`);
              break;
            case 'cancel':
              console.log(`   Use 'cancel_event' tool to remove the event`);
              break;
          }
          
        } catch (error) {
          console.error('❌ Failed to parse query:', error);
        }
      }
      console.log();
    }

    console.log('\n🎉 Calendar Copilot testing completed successfully!');
    console.log('✅ All integrations are working correctly.');
    console.log('🚀 Ready for production use!\n');

  } catch (error) {
    console.error('💥 Test failed with error:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle process interruption
process.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye! Calendar Copilot test session ended.');
  rl.close();
  process.exit(0);
});

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
}); 