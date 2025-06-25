// Load environment variables from parent directory
require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const { MCPClient } = require('./mcp-client.cjs');
const http = require('http');
const { Server } = require('socket.io');
const { RealTimeEmailMonitor } = require('./real-time-email-monitor.js');

const app = express();
app.use(cors());
app.use(express.json());

// Server configuration
const PORT = process.env.PORT || 3000;

// Create HTTP server for Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected to WebSocket');
  connectedClients.add(socket);
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected from WebSocket');
    connectedClients.delete(socket);
  });
});

// Global variables
let mcpClient = null;
let azureAIService = null;
let conversations = new Map();
let emailMonitor = null;
let connectedClients = new Set();

async function initializeServices() {
  try {
    // Initialize MCP client
    mcpClient = new MCPClient();
    const success = await mcpClient.initialize();
    if (success) {
      console.log('🎉 MCP client ready for calendar operations');
      
      // Test by listing tools with timeout handling
      try {
        const tools = await Promise.race([
          mcpClient.listTools(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tools list timeout')), 5000)
          )
        ]);
        console.log(`📋 Available tools: ${tools.tools.length}`);
      } catch (toolsError) {
        console.log('⚠️  Tools list failed, but proceeding anyway:', toolsError.message);
      }
    }

    // Initialize Azure AI Service for natural language processing
    const { AzureAIService } = await import('../dist/services/azure-ai.js');
    const { Logger } = await import('../dist/utils/logger.js');
    
    const logger = new Logger('debug');
    azureAIService = new AzureAIService(
      process.env.AZURE_OPENAI_ENDPOINT,
      process.env.AZURE_OPENAI_API_KEY,
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      process.env.AZURE_OPENAI_API_VERSION,
      logger
    );
    
    console.log('🧠 Azure AI service initialized for natural language processing');
    
    return success;
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    return false;
  }
}

// Test endpoint for get_calendar_events
app.post('/api/test-get-events', async (req, res) => {
  try {
    const { timeMin, timeMax, tool, ...params } = req.body;
    const toolName = tool || 'get_calendar_events';
    
    console.log(`🧪 Testing MCP tool: ${toolName}`, params);

    let result;
    if (toolName === 'get_calendar_events') {
      result = await mcpClient.callTool('get_calendar_events', {
        timeMin,
        timeMax,
        maxResults: 10
      });
    } else {
      // Test any MCP tool with provided parameters
      result = await mcpClient.callTool(toolName, params);
    }

    res.json({
      success: true,
      message: `Successfully tested ${toolName}`,
      data: result
    });

  } catch (error) {
    console.error(`❌ Error testing MCP tool:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to test MCP tool`,
      details: error.message
    });
  }
});

// Helper function to find the next available time slot
async function findNextAvailableSlot(requestedStart, durationMs, mcpClient) {
  const maxDaysToCheck = 7; // Check up to 7 days ahead
  const businessHoursStart = 9; // 9 AM
  const businessHoursEnd = 18; // 6 PM
  const slotIncrementMinutes = 30; // Check every 30 minutes
  
  const requestedStartDate = new Date(requestedStart);
  const currentDate = new Date(requestedStartDate);
  
  // Start checking from the same day, but after the requested time
  for (let dayOffset = 0; dayOffset < maxDaysToCheck; dayOffset++) {
    const checkDate = new Date(currentDate);
    checkDate.setDate(currentDate.getDate() + dayOffset);
    
    // For the first day, start checking after the requested time
    // For subsequent days, start at business hours
    let startHour = dayOffset === 0 ? requestedStartDate.getHours() : businessHoursStart;
    let startMinute = dayOffset === 0 ? Math.ceil(requestedStartDate.getMinutes() / slotIncrementMinutes) * slotIncrementMinutes : 0;
    
    // If we're past business hours on the first day, skip to next day
    if (dayOffset === 0 && startHour >= businessHoursEnd) {
      continue;
    }
    
    // Check time slots throughout business hours
    for (let hour = startHour; hour < businessHoursEnd; hour++) {
      const minutesToCheck = hour === startHour ? [startMinute] : [0, 30];
      
      for (const minute of minutesToCheck) {
        if (minute >= 60) continue; // Skip invalid minutes
        
        const slotStart = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), hour, minute);
        const slotEnd = new Date(slotStart.getTime() + durationMs);
        
        // Make sure the slot ends within business hours
        if (slotEnd.getHours() > businessHoursEnd || (slotEnd.getHours() === businessHoursEnd && slotEnd.getMinutes() > 0)) {
          continue;
        }
        
        // Check if this slot is available
        try {
          const availabilityResult = await mcpClient.callTool('check_availability', {
            timeMin: slotStart.toISOString(),
            timeMax: slotEnd.toISOString(),
            calendarIds: ['primary']
          });
          
          const resultData = typeof availabilityResult === 'string' ? JSON.parse(availabilityResult) : availabilityResult;
          const availability = resultData?.content?.[0]?.text ? JSON.parse(resultData.content[0].text) : resultData;
          
          if (availability.success && (availability.totalBusyPeriods || 0) === 0) {
            // Found an available slot!
            return {
              start: slotStart.toISOString(),
              end: slotEnd.toISOString()
            };
          }
        } catch (error) {
          console.error(`Error checking availability for slot ${slotStart.toISOString()}:`, error);
          continue;
        }
      }
    }
  }
  
  // No available slot found
  return null;
}

// Helper function to check for incomplete requests and generate follow-up questions
function checkForIncompleteRequest(parsedQuery, conversationContext) {
  const { intent, entities } = parsedQuery;
  const missingInfo = [];
  let followUpQuestion = '';
  let message = '';

  switch (intent) {
    case 'schedule':
      // Check for missing information for scheduling
      if (!entities.title && !conversationContext?.entities?.title) {
        missingInfo.push('title');
      }
      if (!entities.dateTime && !conversationContext?.entities?.dateTime) {
        missingInfo.push('dateTime');
      }
      if (!entities.duration && !conversationContext?.entities?.duration) {
        missingInfo.push('duration');
      }

      if (missingInfo.length > 0) {
        if (missingInfo.includes('title')) {
          message = "I'd be happy to schedule that for you! ";
          followUpQuestion = "What would you like to call this meeting?";
        } else if (missingInfo.includes('dateTime')) {
          message = `I can schedule "${entities.title || conversationContext?.entities?.title}" for you. `;
          followUpQuestion = "What date and time would you prefer?";
        } else if (missingInfo.includes('duration')) {
          message = `I can schedule "${entities.title || conversationContext?.entities?.title}" for you. `;
          followUpQuestion = "How long should this meeting be?";
        }

        return {
          needsFollowUp: true,
          message,
          followUpQuestion,
          missingInfo
        };
      }
      break;

    case 'update':
      // Check for missing information for updates
      if (!entities.title && !conversationContext?.entities?.title) {
        missingInfo.push('eventIdentifier');
        message = "I can help you update an event. ";
        followUpQuestion = "Which event would you like to update? Please provide the event title.";
        
        return {
          needsFollowUp: true,
          message,
          followUpQuestion,
          missingInfo
        };
      }
      break;

    case 'cancel':
      // Check for missing information for cancellation
      if (!entities.title && !conversationContext?.entities?.title) {
        missingInfo.push('eventIdentifier');
        message = "I can help you cancel an event. ";
        followUpQuestion = "Which event would you like to cancel? Please provide the event title.";
        
        return {
          needsFollowUp: true,
          message,
          followUpQuestion,
          missingInfo
        };
      }
      break;
  }

  return { needsFollowUp: false };
}

// Helper function to generate suggested actions based on context
function generateSuggestedActions(intent, entities, conflicts = null) {
  const actions = [];

  if (intent === 'schedule' && conflicts) {
    // Conflict resolution actions
    if (conflicts.alternativeTime) {
      actions.push({
        id: 'accept_alternative',
        label: `Accept ${conflicts.alternativeTime}`,
        action: `Schedule ${entities.title} on ${conflicts.alternativeTime}`
      });
    }
    
    actions.push({
      id: 'find_more_times',
      label: 'Find more times',
      action: `Find more available times for ${entities.title}`
    });
  }

  if (intent === 'query') {
    // Query follow-up actions
    actions.push({
      id: 'check_availability',
      label: 'Check availability',
      action: 'Am I free today?'
    });
    
    actions.push({
      id: 'schedule_meeting',
      label: 'Schedule meeting',
      action: 'Schedule a meeting'
    });
  }

  return actions;
}

// Main endpoint: User Query → Azure GPT → Tool Selection + Parameter Extraction → MCP Tool
app.post('/api/calendar-query', async (req, res) => {
  try {
    const { query, conversationId, context } = req.body;
    console.log('🤖 Processing natural language query with Azure GPT:', query);

    if (!azureAIService) {
      throw new Error('Azure AI service not initialized');
    }

    // Handle conversation context
    let conversationContext = null;
    if (conversationId && conversations.has(conversationId)) {
      conversationContext = conversations.get(conversationId);
      console.log('📝 Continuing conversation:', conversationId, conversationContext);
    }

    // STEP 1: Use Azure GPT to parse the natural language query
    console.log('🧠 Step 1: Parsing query with Azure GPT...');
    const parsedQuery = await azureAIService.parseCalendarQuery(query, conversationContext);
    
    console.log('📊 Parsed query:', {
      intent: parsedQuery.intent,
      confidence: parsedQuery.confidence,
      entities: parsedQuery.entities
    });

    // STEP 2: Check for incomplete requests and generate follow-up questions
    console.log('🛠️ Step 2: Checking for incomplete requests...');
    const incompleteCheck = checkForIncompleteRequest(parsedQuery, conversationContext);
    
    if (incompleteCheck.needsFollowUp) {
      // Generate conversation ID and store context
      const newConversationId = conversationId || 'conv_' + Date.now().toString(36);
      conversations.set(newConversationId, {
        originalQuery: conversationContext?.originalQuery || query,
        intent: parsedQuery.intent,
        entities: parsedQuery.entities,
        missingInfo: incompleteCheck.missingInfo,
        timestamp: Date.now()
      });

      return res.json({
        success: true,
        message: incompleteCheck.message,
        needsFollowUp: true,
        followUpQuestion: incompleteCheck.followUpQuestion,
        conversationId: newConversationId,
        context: conversations.get(newConversationId),
        data: {
          originalQuery: query,
          parsedIntent: parsedQuery.intent,
          confidence: parsedQuery.confidence,
          extractedEntities: parsedQuery.entities,
          missingInfo: incompleteCheck.missingInfo
        }
      });
    }

    // STEP 3: Tool Selection and Parameter Extraction based on intent
    console.log('🛠️ Step 3: Selecting MCP tool and extracting parameters...');
    let mcpToolName;
    let mcpParameters;
    let responseMessage;

    switch (parsedQuery.intent) {
      case 'query':
        mcpToolName = 'get_calendar_events';
        
        // Extract time range from entities or use default
        if (parsedQuery.entities.dateTime) {
          // If specific date/time provided, use that day
          // Fix: Handle date-only strings properly to avoid timezone issues
          let targetDate;
          
          if (parsedQuery.entities.dateTime.includes('T')) {
            // Has time component - parse normally
            targetDate = new Date(parsedQuery.entities.dateTime);
          } else {
            // Date-only string (like "2025-06-22") - parse as local date to avoid timezone shift
            const dateStr = parsedQuery.entities.dateTime;
            const [year, month, day] = dateStr.split('-').map(Number);
            targetDate = new Date(year, month - 1, day); // month is 0-indexed
          }
          
          // Create day boundaries using the corrected target date
          const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
          const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);
          
          mcpParameters = {
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString()
          };
          
          console.log(`🗓️ Date parsing fix: "${parsedQuery.entities.dateTime}" → ${targetDate.toDateString()} (${dayStart.toISOString()} to ${dayEnd.toISOString()})`);
        } else {
          // Default to today if no specific time mentioned
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
          
          mcpParameters = {
            timeMin: todayStart.toISOString(),
            timeMax: todayEnd.toISOString()
          };
        }
        break;

      case 'schedule':
        // STEP 1: Parse the requested time and duration
        let requestedStartDateTime, requestedEndDateTime, requestedDuration;
        
        if (parsedQuery.entities.dateTime) {
          // Parse the dateTime properly to preserve the intended local time
          let localDateTime;
          
          // Check for timezone indicators: Z, +HH:MM, or -HH:MM (but not date hyphens)
          const hasTimezone = parsedQuery.entities.dateTime.includes('Z') || 
                             /[+-]\d{2}:\d{2}$/.test(parsedQuery.entities.dateTime);
          
          if (!hasTimezone) {
            // No timezone info - treat as local time and format for Google Calendar
            // Parse the date components manually to avoid timezone confusion
            const dateTimeStr = parsedQuery.entities.dateTime;
            if (dateTimeStr.includes('T')) {
              // Has time component like "2025-06-22T14:00:00"
              const [datePart, timePart] = dateTimeStr.split('T');
              const [year, month, day] = datePart.split('-').map(Number);
              const [hour, minute, second = 0] = timePart.split(':').map(Number);
              localDateTime = new Date(year, month - 1, day, hour, minute, second);
            } else {
              // Date only - default to current time
              const [year, month, day] = dateTimeStr.split('-').map(Number);
              const now = new Date();
              localDateTime = new Date(year, month - 1, day, now.getHours(), now.getMinutes());
            }
            
            // Format as ISO string but preserve local time intention
            requestedStartDateTime = localDateTime.toISOString();
          } else {
            // Has timezone info - use as is
            requestedStartDateTime = parsedQuery.entities.dateTime;
          }
          
          // Calculate end time by adding duration to the start time
          requestedDuration = parsedQuery.entities.duration || 60; // Default 1 hour
          const durationMs = requestedDuration * 60000;
          requestedEndDateTime = new Date(new Date(requestedStartDateTime).getTime() + durationMs).toISOString();
        } else {
          // Default to current time
          requestedStartDateTime = new Date().toISOString();
          requestedDuration = parsedQuery.entities.duration || 60;
          requestedEndDateTime = new Date(Date.now() + requestedDuration * 60000).toISOString();
        }
        
        // STEP 2: Check for conflicts by getting events for that time period
        mcpToolName = 'check_availability';
        mcpParameters = {
          timeMin: requestedStartDateTime,
          timeMax: requestedEndDateTime,
          calendarIds: ['primary'],
          _scheduleIntent: {
            title: parsedQuery.entities.title || 'New Event',
            requestedStart: requestedStartDateTime,
            requestedEnd: requestedEndDateTime,
            duration: requestedDuration,
            description: parsedQuery.entities.description,
            location: parsedQuery.entities.location,
            attendees: parsedQuery.entities.attendees?.map(email => ({ email }))
          }
        };
        
        console.log(`🔍 Checking for conflicts: "${parsedQuery.entities.title}" from ${new Date(requestedStartDateTime).toLocaleString()} to ${new Date(requestedEndDateTime).toLocaleString()}`);
        break;

      case 'update':
        // For update operations, we need to find the event first by title
        // This is a two-step process: 1) Find event by title, 2) Update it
        const currentTitle = parsedQuery.entities.currentTitle || parsedQuery.entities.title;
        const newTitle = parsedQuery.entities.newTitle || parsedQuery.entities.title;
        
        if (!currentTitle) {
          throw new Error('Event updates require an event title to find the event. Please specify which event to update.');
        }
        
        // First, search for events with the current title in the next 30 days
        const searchStart = new Date();
        const searchEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        
        mcpToolName = 'get_calendar_events';
        mcpParameters = {
          timeMin: searchStart.toISOString(),
          timeMax: searchEnd.toISOString(),
          searchTitle: currentTitle // Search for the CURRENT title
        };
        
        // Store the update intent for processing after we find the event
        mcpParameters._updateIntent = {
          currentTitle: currentTitle,
          newTitle: newTitle,
          duration: parsedQuery.entities.duration,
          description: parsedQuery.entities.description,
          location: parsedQuery.entities.location
        };
        
        console.log(`🔍 Searching for event "${currentTitle}" to update${newTitle !== currentTitle ? ` → "${newTitle}"` : ''}`);
        break;

      case 'cancel':
        // For cancel operations, we need to find the event first by title
        if (!parsedQuery.entities.title) {
          throw new Error('Event cancellation requires an event title to find the event. Please specify which event to cancel.');
        }
        
        // First, search for events with the specified title in the next 30 days
        const cancelSearchStart = new Date();
        const cancelSearchEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        
        mcpToolName = 'get_calendar_events';
        mcpParameters = {
          timeMin: cancelSearchStart.toISOString(),
          timeMax: cancelSearchEnd.toISOString(),
          searchTitle: parsedQuery.entities.title // We'll use this to filter events
        };
        
        // Store the cancel intent for processing after we find the event
        mcpParameters._cancelIntent = {
          title: parsedQuery.entities.title
        };
        
        console.log(`🔍 Searching for event "${parsedQuery.entities.title}" to cancel`);
        break;

      case 'availability':
        mcpToolName = 'check_availability';
        
        if (parsedQuery.entities.dateTime) {
          // If specific date/time provided, use that day
          // Fix: Use the actual parsed date consistently
          const actualDate = new Date(parsedQuery.entities.dateTime);
          
          // Check if user specified a specific time (like "10am")
          const originalQuery = parsedQuery.originalQuery || query;
          const timeMatch = originalQuery.match(/(\d{1,2})(:\d{2})?\s*(am|pm)/i);
          
          if (timeMatch) {
            // User asked about a specific time - check a 1-hour window around that time
            const hour = parseInt(timeMatch[1]);
            const isPM = timeMatch[3].toLowerCase() === 'pm';
            const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
            
            // Fix: Get today's date in local timezone, don't rely on the parsed date which might have timezone issues
            const today = new Date();
            const specificStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour24, 0, 0);
            const specificEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour24 + 1, 0, 0);
            
            mcpParameters = {
              timeMin: specificStart.toISOString(),
              timeMax: specificEnd.toISOString(),
              calendarIds: ['primary']
            };
            
            console.log(`🕐 Specific time check: "${originalQuery}" → ${specificStart.toLocaleTimeString()} - ${specificEnd.toLocaleTimeString()}`);
          } else {
            // For general availability, use business hours (9 AM to 6 PM)
            // Fix: For "today" queries, use actual today's date in local timezone
            const today = new Date();
            const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0);  // 9 AM
            const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0, 0);   // 6 PM
            
            mcpParameters = {
              timeMin: dayStart.toISOString(),
              timeMax: dayEnd.toISOString(),
              calendarIds: ['primary']
            };
            
            console.log(`🗓️ Availability check: "${parsedQuery.entities.dateTime}" → ${dayStart.toDateString()} 9 AM-6 PM`);
          }
        } else {
          // Default to today's business hours if no specific time mentioned
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0);
          const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0, 0);
          
          mcpParameters = {
            timeMin: todayStart.toISOString(),
            timeMax: todayEnd.toISOString(),
            calendarIds: ['primary']
          };
        }
        break;

      case 'email_query':
        mcpToolName = 'get_recent_emails';
        mcpParameters = {
          maxResults: 20
        };
        
        // Check for specific email queries like "unread" 
        if (query.toLowerCase().includes('unread')) {
          mcpToolName = 'get_unread_emails';
        }
        console.log(`📧 Email query: ${mcpToolName}`);
        break;

      case 'email_search':
        mcpToolName = 'search_emails';
        
        // Extract search query from the original query
        const emailQuery = query.toLowerCase()
          .replace(/search|find|look|show|get/g, '')
          .replace(/emails?|messages?/g, '')
          .replace(/about|for/g, '')
          .trim();
        
        mcpParameters = {
          query: emailQuery || 'in:inbox',
          maxResults: 10
        };
        console.log(`🔍 Email search: "${emailQuery}"`);
        break;

      default:
        throw new Error(`Intent '${parsedQuery.intent}' not yet supported`);
    }

    console.log(`🎯 Selected tool: ${mcpToolName} with parameters:`, mcpParameters);

    // STEP 3: Call the appropriate MCP Tool
    console.log('⚡ Step 3: Calling MCP tool...');
    const mcpResult = await mcpClient.callTool(mcpToolName, mcpParameters);

    // STEP 4: Format the response based on the tool result
    console.log('💬 Step 4: Formatting user-friendly response...');
    if (mcpToolName === 'get_calendar_events') {
      const resultData = typeof mcpResult === 'string' ? JSON.parse(mcpResult) : mcpResult;
      const events = resultData?.content?.[0]?.text ? JSON.parse(resultData.content[0].text) : resultData;
      
      // Check if this is a search for update or cancel operations
      if (mcpParameters._updateIntent || mcpParameters._cancelIntent) {
        const intent = mcpParameters._updateIntent ? 'update' : 'cancel';
        const targetTitle = mcpParameters._updateIntent?.currentTitle || mcpParameters._cancelIntent?.title;
        
        if (events.success && events.totalEvents > 0) {
          // Filter events by title with multiple matching strategies
          const normalizedTarget = targetTitle.toLowerCase().trim();
          
          // Try exact match first
          let matchingEvents = events.events.filter(event => 
            event.title.toLowerCase().trim() === normalizedTarget
          );
          
          // If no exact match, try partial match
          if (matchingEvents.length === 0) {
            matchingEvents = events.events.filter(event => 
              event.title.toLowerCase().includes(normalizedTarget) || 
              normalizedTarget.includes(event.title.toLowerCase())
            );
          }
          
          if (matchingEvents.length === 0) {
            responseMessage = `❌ No events found matching "${targetTitle}". Available events:\n\n`;
            events.events.slice(0, 5).forEach((event, i) => {
              const time = new Date(event.start).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
              });
              const date = new Date(event.start).toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              });
              responseMessage += `${i + 1}. "${event.title}" on ${date} at ${time} (ID: ${event.id.slice(-8)})\n`;
            });
            if (events.events.length > 5) {
              responseMessage += `... and ${events.events.length - 5} more events.\n`;
            }
            responseMessage += `\nTry using the exact event title or a more specific search.`;
          } else if (matchingEvents.length === 1) {
            // Found exactly one matching event - proceed with update/cancel
            const targetEvent = matchingEvents[0];
            
                         if (intent === 'update') {
               // Perform the actual update
               const updateIntent = mcpParameters._updateIntent;
               const updateParams = {
                 eventId: targetEvent.id
               };
               
               // Build update parameters based on what needs to be changed
               if (updateIntent.duration) {
                 // Update the end time based on new duration
                 const startTime = new Date(targetEvent.start);
                 const newEndTime = new Date(startTime.getTime() + updateIntent.duration * 60000);
                 updateParams.end = {
                   dateTime: newEndTime.toISOString(),
                   timeZone: 'America/Los_Angeles'
                 };
               }
               
               if (updateIntent.newTitle && updateIntent.newTitle !== targetEvent.title) {
                 updateParams.summary = updateIntent.newTitle;
               }
               
               if (updateIntent.description !== null) {
                 updateParams.description = updateIntent.description;
               }
               
               if (updateIntent.location !== null) {
                 updateParams.location = updateIntent.location;
               }
               
               // Make the update call
               try {
                 console.log(`🔄 Updating event ${targetEvent.id} with parameters:`, updateParams);
                 const updateResult = await mcpClient.callTool('update_event', updateParams);
                 const updateResultData = typeof updateResult === 'string' ? JSON.parse(updateResult) : updateResult;
                 const updateEventResult = updateResultData?.content?.[0]?.text ? JSON.parse(updateResultData.content[0].text) : updateResultData;
                 
                 if (updateEventResult.success) {
                   const updatedEvent = updateEventResult.event;
                   const startTime = new Date(updatedEvent.start).toLocaleTimeString('en-US', { 
                     hour: 'numeric', 
                     minute: '2-digit', 
                     hour12: true 
                   });
                   const startDate = new Date(updatedEvent.start).toLocaleDateString('en-US', { 
                     weekday: 'short', 
                     month: 'short', 
                     day: 'numeric' 
                   });
                   
                   responseMessage = `✅ Event updated successfully!\n\n`;
                   responseMessage += `📅 ${updatedEvent.summary}\n`;
                   responseMessage += `🗓️ ${startDate} at ${startTime}\n`;
                   if (updatedEvent.location) responseMessage += `📍 ${updatedEvent.location}\n`;
                   if (updatedEvent.description) responseMessage += `📝 ${updatedEvent.description}\n`;
                   responseMessage += `\n🔗 View in Google Calendar: ${updatedEvent.htmlLink}`;
                 } else {
                   responseMessage = `❌ Failed to update event: ${updateEventResult.error || 'Unknown error'}`;
                 }
               } catch (updateError) {
                 responseMessage = `❌ Failed to update event: ${updateError.message}`;
               }
             } else {
               // Perform the actual cancel
               try {
                 console.log(`🗑️ Cancelling event ${targetEvent.id}`);
                 const cancelResult = await mcpClient.callTool('cancel_event', { eventId: targetEvent.id });
                 const cancelResultData = typeof cancelResult === 'string' ? JSON.parse(cancelResult) : cancelResult;
                 const cancelEventResult = cancelResultData?.content?.[0]?.text ? JSON.parse(cancelResultData.content[0].text) : cancelResultData;
                 
                 if (cancelEventResult.success) {
                   responseMessage = `✅ Event cancelled successfully!\n\n`;
                   responseMessage += `🗑️ "${targetEvent.title}" has been removed from your calendar.`;
                 } else {
                   responseMessage = `❌ Failed to cancel event: ${cancelEventResult.error || 'Unknown error'}`;
                 }
               } catch (cancelError) {
                 responseMessage = `❌ Failed to cancel event: ${cancelError.message}`;
               }
             }
          } else {
            // Multiple matching events - ask user to be more specific
            responseMessage = `❌ Found ${matchingEvents.length} events matching "${targetTitle}":\n\n`;
            matchingEvents.forEach((event, i) => {
              const time = new Date(event.start).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
              });
              const date = new Date(event.start).toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              });
              responseMessage += `${i + 1}. ${event.title} on ${date} at ${time}\n`;
            });
            responseMessage += `\nPlease be more specific about which event you want to ${intent}.`;
          }
        } else {
          responseMessage = `❌ No events found with title "${targetTitle}". ${events.error || 'Please check the event name and try again.'}`;
        }
      } else {
        // Normal event listing
        if (events.success && events.totalEvents > 0) {
          responseMessage = `Found ${events.totalEvents} event(s):\n`;
          events.events.forEach((event, i) => {
            const time = new Date(event.start).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            });
            responseMessage += `${i + 1}. ${event.title} at ${time}`;
            if (event.location) responseMessage += ` (${event.location})`;
            responseMessage += '\n';
          });
        } else {
          responseMessage = events.error || 'No events found for the specified time period.';
        }
      }
    } else if (mcpToolName === 'check_availability') {
      const resultData = typeof mcpResult === 'string' ? JSON.parse(mcpResult) : mcpResult;
      const availability = resultData?.content?.[0]?.text ? JSON.parse(resultData.content[0].text) : resultData;
      
      // Check if this is for scheduling conflict detection
      const scheduleIntent = mcpParameters._scheduleIntent;
      
      if (availability.success) {
        const totalBusyPeriods = availability.totalBusyPeriods || 0;
        
        if (scheduleIntent) {
          // This is a scheduling request - handle conflicts and alternatives
          if (totalBusyPeriods === 0) {
            // No conflicts - proceed with creating the event
            console.log(`✅ No conflicts found, creating event: ${scheduleIntent.title}`);
            
            try {
              const createResult = await mcpClient.callTool('create_event', {
                summary: scheduleIntent.title,
                startTime: scheduleIntent.requestedStart,
                endTime: scheduleIntent.requestedEnd,
                description: scheduleIntent.description,
                location: scheduleIntent.location,
                attendees: scheduleIntent.attendees
              });
              
              const createResultData = typeof createResult === 'string' ? JSON.parse(createResult) : createResult;
              let eventResult;
              try {
                eventResult = createResultData?.content?.[0]?.text ? JSON.parse(createResultData.content[0].text) : createResultData;
              } catch (parseError) {
                // If JSON parsing fails, treat the content as an error message
                eventResult = {
                  success: false,
                  error: createResultData?.content?.[0]?.text || 'Failed to parse event creation response'
                };
              }
              
              if (eventResult.success) {
                const event = eventResult.event;
                const startTime = new Date(event.start).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit', 
                  hour12: true 
                });
                const startDate = new Date(event.start).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                });
                
                responseMessage = `✅ Event created successfully!\n\n`;
                responseMessage += `📅 ${event.summary}\n`;
                responseMessage += `🗓️ ${startDate} at ${startTime}\n`;
                if (event.location) responseMessage += `📍 ${event.location}\n`;
                responseMessage += `\n🔗 View in Google Calendar: ${event.htmlLink}`;
              } else {
                responseMessage = `❌ Failed to create event: ${eventResult.error || 'Unknown error'}`;
              }
            } catch (createError) {
              responseMessage = `❌ Failed to create event: ${createError.message}`;
            }
          } else {
            // Conflicts found - suggest alternative times
            const requestedStartTime = new Date(scheduleIntent.requestedStart).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            });
            const requestedDate = new Date(scheduleIntent.requestedStart).toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            });
            
            responseMessage = `⚠️ CONFLICT DETECTED!\n\n`;
            responseMessage += `❌ You're already busy at ${requestedStartTime} on ${requestedDate}.\n\n`;
            
            // Find the next available time slot
            const requestedDurationMs = scheduleIntent.duration * 60000;
            const nextSlot = await findNextAvailableSlot(
              scheduleIntent.requestedStart, 
              requestedDurationMs, 
              mcpClient
            );
            
            if (nextSlot) {
              const nextStartTime = new Date(nextSlot.start).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
              });
              const nextDate = new Date(nextSlot.start).toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              });
              
              responseMessage += `💡 ALTERNATIVE SUGGESTION:\n`;
              responseMessage += `✅ Next available slot: ${nextDate} at ${nextStartTime}\n\n`;
              responseMessage += `🤖 Would you like me to schedule "${scheduleIntent.title}" at this time instead?`;
              
              // TODO: In a more advanced version, we could auto-schedule with user confirmation
              // For now, just suggest the alternative time
            } else {
              responseMessage += `❌ No alternative slots found within the next 7 days.\n`;
              responseMessage += `💡 Try scheduling for a different day or time.`;
            }
          }
        } else {
          // Regular availability check (not for scheduling)
          const totalFreeTime = availability.availability?.length || 0;
          
          if (totalBusyPeriods === 0) {
            // Completely free - show the actual time range requested
            const timeRangeStart = new Date(availability.timeRange.start);
            const timeRangeEnd = new Date(availability.timeRange.end);
            const startTimeStr = timeRangeStart.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            });
            const endTimeStr = timeRangeEnd.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            });
            
            responseMessage = `✅ YES, you are completely free during this time!\n\n`;
            responseMessage += `Available from ${startTimeStr} to ${endTimeStr} with no conflicts.`;
          } else if (totalFreeTime > 0) {
            // Partially free - give suggestions
            responseMessage = `⚠️ PARTIALLY FREE - You have ${totalBusyPeriods} conflict(s), but here are available slots:\n\n`;
            
            availability.availability.forEach((slot, i) => {
              const startTime = new Date(slot.start).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
              });
              const endTime = new Date(slot.end).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
              });
              responseMessage += `${i + 1}. Free from ${startTime} to ${endTime}\n`;
            });
          } else {
            // Completely busy
            responseMessage = `❌ NO, you are completely booked during this time.\n\n`;
            responseMessage += `You have ${totalBusyPeriods} conflict(s) with no free slots available.`;
          }
        }
      } else {
        responseMessage = availability.error || 'Could not check availability.';
      }
    } else if (mcpToolName === 'create_event') {
      const resultData = typeof mcpResult === 'string' ? JSON.parse(mcpResult) : mcpResult;
      let eventResult;
      try {
        eventResult = resultData?.content?.[0]?.text ? JSON.parse(resultData.content[0].text) : resultData;
      } catch (parseError) {
        // If JSON parsing fails, treat the content as an error message
        eventResult = {
          success: false,
          error: resultData?.content?.[0]?.text || 'Failed to parse event response'
        };
      }
      
      if (eventResult.success) {
        const event = eventResult.event;
        const startTime = new Date(event.start).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
        const startDate = new Date(event.start).toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        });
        
        responseMessage = `✅ Event created successfully!\n\n`;
        responseMessage += `📅 ${event.summary}\n`;
        responseMessage += `🗓️ ${startDate} at ${startTime}\n`;
        if (event.location) responseMessage += `📍 ${event.location}\n`;
        if (event.description) responseMessage += `📝 ${event.description}\n`;
        responseMessage += `\n🔗 View in Google Calendar: ${event.htmlLink}`;
      } else {
        responseMessage = eventResult.error || 'Failed to create event.';
      }
    } else if (mcpToolName === 'update_event') {
      const resultData = typeof mcpResult === 'string' ? JSON.parse(mcpResult) : mcpResult;
      let eventResult;
      try {
        eventResult = resultData?.content?.[0]?.text ? JSON.parse(resultData.content[0].text) : resultData;
      } catch (parseError) {
        // If JSON parsing fails, treat the content as an error message
        eventResult = {
          success: false,
          error: resultData?.content?.[0]?.text || 'Failed to parse event response'
        };
      }
      
      if (eventResult.success) {
        const event = eventResult.event;
        const startTime = new Date(event.start).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
        const startDate = new Date(event.start).toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        });
        
        responseMessage = `✅ Event updated successfully!\n\n`;
        responseMessage += `📅 ${event.summary}\n`;
        responseMessage += `🗓️ ${startDate} at ${startTime}\n`;
        if (event.location) responseMessage += `📍 ${event.location}\n`;
        if (event.description) responseMessage += `📝 ${event.description}\n`;
        responseMessage += `\n🔗 View in Google Calendar: ${event.htmlLink}`;
      } else {
        responseMessage = eventResult.error || 'Failed to update event.';
      }
    } else if (mcpToolName === 'cancel_event') {
      const resultData = typeof mcpResult === 'string' ? JSON.parse(mcpResult) : mcpResult;
      let eventResult;
      try {
        eventResult = resultData?.content?.[0]?.text ? JSON.parse(resultData.content[0].text) : resultData;
      } catch (parseError) {
        // If JSON parsing fails, treat the content as an error message
        eventResult = {
          success: false,
          error: resultData?.content?.[0]?.text || 'Failed to parse event response'
        };
      }
      
      if (eventResult.success) {
        responseMessage = `✅ Event cancelled successfully!\n\n`;
        responseMessage += `🗑️ Event ID: ${eventResult.eventId}`;
      } else {
        responseMessage = eventResult.error || 'Failed to cancel event.';
      }
    } else if (mcpToolName === 'get_recent_emails' || mcpToolName === 'get_unread_emails' || mcpToolName === 'search_emails') {
      // Gmail tools response formatting
      const resultData = typeof mcpResult === 'string' ? JSON.parse(mcpResult) : mcpResult;
      let emailResult;
      try {
        emailResult = resultData?.content?.[0]?.text ? JSON.parse(resultData.content[0].text) : resultData;
      } catch (parseError) {
        // If JSON parsing fails, treat the content as an error message
        emailResult = {
          success: false,
          error: resultData?.content?.[0]?.text || 'Failed to parse email response'
        };
      }
      
      if (emailResult.success) {
        const emails = emailResult.emails || [];
        const totalEmails = emailResult.totalEmails || emailResult.totalUnreadEmails || emails.length;
        
        if (totalEmails === 0) {
          if (mcpToolName === 'get_unread_emails') {
            responseMessage = `✅ Great news! You have no unread emails. 📧\n\nYour inbox is all caught up! 🎉`;
          } else if (mcpToolName === 'search_emails') {
            responseMessage = `🔍 No emails found matching your search criteria.\n\nTry a different search term or check your spelling.`;
          } else {
            responseMessage = `📧 No recent emails found in your inbox.`;
          }
        } else {
          let emailType = 'recent emails';
          if (mcpToolName === 'get_unread_emails') {
            emailType = 'unread emails';
          } else if (mcpToolName === 'search_emails') {
            emailType = `emails matching "${emailResult.query || 'your search'}"`;
          }
          
          responseMessage = `📧 Found ${totalEmails} ${emailType}:\n\n`;
          
          emails.slice(0, 10).forEach((email, i) => {
            const fromName = email.from.split('<')[0].trim().replace(/"/g, '') || email.from;
            const date = new Date(email.date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            
            responseMessage += `${i + 1}. ${email.isUnread ? '🔴 ' : ''}**${email.subject}**\n`;
            responseMessage += `   📤 From: ${fromName}\n`;
            responseMessage += `   📅 ${date}\n`;
            responseMessage += `   💬 ${email.snippet.substring(0, 100)}${email.snippet.length > 100 ? '...' : ''}\n\n`;
          });
          
          if (totalEmails > 10) {
            responseMessage += `... and ${totalEmails - 10} more emails.\n\n`;
          }
          
          responseMessage += `💡 You can ask me to search for specific emails or check scheduling opportunities!`;
        }
      } else {
        if (emailResult.error && emailResult.error.includes('not authenticated')) {
          responseMessage = `🔐 Gmail Authentication Required\n\n`;
          responseMessage += `To access your emails, you need to authenticate with Gmail first.\n`;
          responseMessage += `Please complete the OAuth flow to connect your Gmail account.`;
        } else {
          responseMessage = emailResult.error || 'Failed to fetch emails.';
        }
      }
    } else {
      responseMessage = `Tool ${mcpToolName} executed. Result: ${JSON.stringify(mcpResult)}`;
    }

    // Generate suggested actions (including conflict resolution if applicable)
    let conflictInfo = null;
    if (responseMessage.includes('CONFLICT DETECTED') && responseMessage.includes('ALTERNATIVE SUGGESTION')) {
      // Extract alternative time from response message for suggested actions
      const altMatch = responseMessage.match(/Next available slot: (.+?) at (.+?)\n/);
      if (altMatch) {
        conflictInfo = {
          alternativeTime: `${altMatch[1]} at ${altMatch[2]}`
        };
      }
    }
    
    const suggestedActions = generateSuggestedActions(parsedQuery.intent, parsedQuery.entities, conflictInfo);

    // Clean up conversation if it was completed
    if (conversationId) {
      conversations.delete(conversationId);
    }

    res.json({
      success: true,
      message: responseMessage,
      suggestedActions: suggestedActions,
      data: {
        originalQuery: query,
        parsedIntent: parsedQuery.intent,
        confidence: parsedQuery.confidence,
        extractedEntities: parsedQuery.entities,
        mcpTool: mcpToolName,
        mcpParameters: mcpParameters,
        mcpResult: mcpResult
      }
    });

  } catch (error) {
    console.error('❌ Error in natural language processing workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process natural language query',
      details: error.message,
      stack: error.stack
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    if (!mcpClient) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'MCP client not initialized' 
      });
    }

    if (!azureAIService) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'Azure AI service not initialized' 
      });
    }

    // Test MCP connection by listing tools
    await mcpClient.listTools();
    
    res.json({ 
      status: 'healthy', 
      message: 'Calendar API, MCP server, and Azure AI ready',
      architecture: 'User Query → Azure GPT → Tool Selection → MCP Tool',
      services: {
        mcp: 'connected',
        azureAI: 'connected'
      }
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      message: 'Service health check failed',
      details: error.message
    });
  }
});

// OAuth endpoints for Google Calendar authentication
app.get('/api/auth/google', (req, res) => {
  // In a real implementation, this would redirect to Google OAuth
  res.json({
    message: 'Google OAuth flow would start here',
    authUrl: 'https://accounts.google.com/oauth/authorize?...'
  });
});

app.get('/api/auth/callback', (req, res) => {
  // Handle OAuth callback
  res.json({
    message: 'OAuth callback - would exchange code for tokens here'
  });
});

// Test meeting email endpoint
app.post('/api/test-meeting-email', async (req, res) => {
  try {
    if (!emailMonitor) {
      return res.status(500).json({ success: false, error: 'Email monitor not initialized' });
    }

    const result = await emailMonitor.createTestMeetingEmail();
    res.json(result);
  } catch (error) {
    console.error('Test meeting email failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Simple test notification endpoint (bypasses email parsing issues)
app.post('/api/test-simple-notification', async (req, res) => {
  try {
    if (!emailMonitor) {
      return res.status(500).json({ success: false, error: 'Email monitor not initialized' });
    }

    const result = await emailMonitor.createSimpleTestNotification();
    res.json(result);
  } catch (error) {
    console.error('Simple test notification failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Super simple email checker (guaranteed to work)
app.post('/api/simple-email-check', async (req, res) => {
  try {
    console.log('🔍 Simple email check starting...');
    
    // Get emails directly
    const result = await mcpClient.callTool('get_recent_emails', { maxResults: 5 });
    console.log('📧 Raw email result:', JSON.stringify(result, null, 2));
    
    // Parse the MCP result
    let emails = [];
    if (result?.content?.[0]?.text) {
      const textContent = JSON.parse(result.content[0].text);
      emails = textContent?.emails || [];
    }
    
    console.log(`📧 Found ${emails.length} emails to check`);
    
    // Check each email for meeting keywords
    for (const email of emails) {
      if (email && email.subject && email.snippet) {
        const emailText = `${email.subject} ${email.snippet}`.toLowerCase();
        const meetingKeywords = ['meeting', 'schedule', 'appointment', 'call', 'available'];
        
        const hasKeywords = meetingKeywords.some(keyword => emailText.includes(keyword));
        
        if (hasKeywords) {
          console.log('🎯 Meeting email found:', email.subject);
          
          // Send notification directly to all connected clients
          connectedClients.forEach(socket => {
            socket.emit('email-notification', {
              type: 'meeting-email-detected',
              data: {
                emailId: email.id,
                subject: email.subject,
                from: email.from,
                snippet: email.snippet,
                confidence: 0.85,
                suggestedActions: [
                  'Meeting email detected automatically',
                  'Check your calendar availability', 
                  'Respond to confirm or propose alternatives'
                ],
                detectedAt: new Date().toISOString()
              },
              timestamp: new Date().toISOString()
            });
          });
          
          console.log('✅ Notification sent for:', email.subject);
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: `Checked ${emails.length} emails`,
      meetingEmailsFound: emails.filter(e => e && e.subject && 
        ['meeting', 'schedule', 'appointment', 'call', 'available'].some(k => 
          `${e.subject} ${e.snippet}`.toLowerCase().includes(k.toLowerCase())
        )
      ).length
    });
  } catch (error) {
    console.error('Simple email check failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual email check endpoint
app.post('/api/check-emails', async (req, res) => {
  try {
    if (!emailMonitor) {
      return res.status(500).json({ success: false, error: 'Email monitor not initialized' });
    }

    await emailMonitor.triggerManualCheck();
    res.json({ success: true, message: 'Manual email check completed' });
  } catch (error) {
    console.error('Manual email check failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Email monitor status endpoint
app.get('/api/email-monitor-status', (req, res) => {
  try {
    if (!emailMonitor) {
      return res.json({ isRunning: false, error: 'Email monitor not initialized' });
    }

    const status = emailMonitor.getStatus();
    res.json({ success: true, status });
  } catch (error) {
    console.error('Failed to get email monitor status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Email notification endpoint (for WebSocket broadcasting)
app.post('/api/email-notification', (req, res) => {
  try {
    const notificationData = req.body;
    console.log('📧 Broadcasting email notification to all clients:', notificationData.title);
    
    // Broadcast to all connected Socket.IO clients
    io.emit('email-notification', {
      type: 'meeting-email-detected',
      data: notificationData,
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, message: 'Notification sent to all connected clients' });
  } catch (error) {
    console.error('❌ Failed to broadcast notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Phase 6: Generate email response endpoint
app.post('/api/generate-response', async (req, res) => {
  try {
    if (!mcpClient) {
      return res.status(500).json({ success: false, error: 'MCP client not initialized' });
    }

    const { originalEmail, responseType, includeCalendarInvite } = req.body;
    
    console.log('✏️ Generating response:', { 
      subject: originalEmail.subject, 
      responseType,
      includeCalendarInvite 
    });

    // Use MCP draft_scheduling_response tool
    const result = await mcpClient.callTool('draft_scheduling_response', {
      originalEmail: {
        subject: originalEmail.subject,
        from: originalEmail.from,
        content: originalEmail.content || originalEmail.snippet
      },
      responseType,
      includeCalendarInvite,
      selectedTimes: responseType === 'accept' ? [] : undefined,
      counterProposal: responseType === 'counter-propose' ? {
        suggestedTimes: ['Tomorrow at 2pm', 'Friday at 10am'],
        reason: 'Original time conflicts with existing meeting'
      } : undefined,
      meetingDetails: responseType === 'accept' ? {
        duration: 60,
        location: 'Conference Room A',
        agenda: 'Project discussion'
      } : undefined,
      customMessage: ''
    });

    // Parse MCP response
    let emailResponse;
    if (result?.content?.[0]?.text) {
      const parsedResult = JSON.parse(result.content[0].text);
      emailResponse = parsedResult.emailResponse || parsedResult;
    } else {
      emailResponse = result.emailResponse || result;
    }

    console.log('✅ Response generated successfully');
    
    res.json({
      success: true,
      emailResponse: {
        subject: emailResponse.subject || `Re: ${originalEmail.subject}`,
        body: emailResponse.body || emailResponse.message || 'Response generated successfully.',
        tone: emailResponse.tone || 'professional',
        urgency: emailResponse.urgency || 'normal',
        responseType,
        calendarInvite: emailResponse.calendarInvite,
        suggestedActions: emailResponse.suggestedActions || ['Review and send']
      }
    });

  } catch (error) {
    console.error('❌ Failed to generate response:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate response',
      details: error.message 
    });
  }
});

// Phase 6: Send email response endpoint
app.post('/api/send-response', async (req, res) => {
  try {
    if (!mcpClient) {
      return res.status(500).json({ success: false, error: 'MCP client not initialized' });
    }

    const { originalEmailId, response, calendarInvite } = req.body;
    
    console.log('📤 Sending email response:', { 
      to: response.to,
      subject: response.subject 
    });

    // Use MCP send_email tool (if available) or simulate sending
    try {
      const result = await mcpClient.callTool('send_email', {
        to: response.to,
        subject: response.subject,
        body: response.body,
        inReplyTo: originalEmailId
      });

      // If calendar invite is included, create calendar event
      if (calendarInvite) {
        console.log('📅 Creating calendar event...');
        try {
          await mcpClient.callTool('create_calendar_event', {
            summary: calendarInvite.summary || response.subject,
            description: calendarInvite.description || response.body,
            startTime: calendarInvite.startTime,
            endTime: calendarInvite.endTime,
            attendees: [response.to],
            location: calendarInvite.location
          });
          console.log('✅ Calendar event created');
        } catch (calendarError) {
          console.error('⚠️ Calendar event creation failed:', calendarError.message);
          // Continue anyway - email was sent
        }
      }

      console.log('✅ Email response sent successfully');
      
      res.json({
        success: true,
        message: 'Email response sent successfully',
        sentAt: new Date().toISOString(),
        calendarEventCreated: !!calendarInvite
      });

    } catch (sendError) {
      // Fallback: simulate sending for testing
      console.log('📧 Simulating email send (send_email tool not available)');
      
      // Log the "sent" email for testing
      console.log('=== SIMULATED EMAIL SENT ===');
      console.log(`To: ${response.to}`);
      console.log(`Subject: ${response.subject}`);
      console.log(`Body: ${response.body}`);
      console.log('============================');
      
      res.json({
        success: true,
        message: 'Email response simulated successfully (testing mode)',
        sentAt: new Date().toISOString(),
        simulated: true,
        calendarEventCreated: false
      });
    }

  } catch (error) {
    console.error('❌ Failed to send response:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send response',
      details: error.message 
    });
  }
});

async function startServer() {
  const services = await initializeServices();
  if (services) {
    // Initialize email monitor after services are ready
    const notificationCallback = (notificationData) => {
      console.log('📧 Email monitor callback triggered');
      io.emit('email-notification', {
        type: 'meeting-email-detected',
        data: notificationData,
        timestamp: new Date().toISOString()
      });
    };
    
    emailMonitor = new RealTimeEmailMonitor(mcpClient, notificationCallback);
    console.log('✅ Email monitor initialized');
    
    // Start server and email monitoring
    server.listen(PORT, () => {
      console.log(`✅ Calendar API server running on port ${PORT}`);
      console.log('🔌 WebSocket server ready for real-time notifications');
      console.log('📧 Real-time email monitoring will start in 5 seconds...');
      console.log('');
      console.log('🏗️ ARCHITECTURE:');
      console.log('   User Query → Azure GPT → Tool Selection → MCP Tool → Response');
      console.log('   New Email → Real-time Monitor → AI Analysis → UI Notification');
      console.log('');
      console.log('🧠 Natural Language Processing: Azure AI Foundry (GPT-4o)');
      console.log('🛠️ MCP Server: Simple, reliable API gateway');
      console.log('📅 Calendar Integration: Google Calendar API');
      console.log('📧 Real-time Email Monitoring: WebSocket notifications');
      console.log('');
      console.log('📋 Available endpoints:');
      console.log('  POST /api/calendar-query - Natural language calendar queries (Azure GPT powered)');
      console.log('  POST /api/test-get-events - Direct MCP tool testing');
      console.log('  POST /api/email-notification - Real-time email notifications');
      console.log('  POST /api/check-emails - Manual email check');
      console.log('  POST /api/test-meeting-email - Create test meeting email');
      console.log('  POST /api/generate-response - Phase 6: Generate email responses');
      console.log('  POST /api/send-response - Phase 6: Send email responses');
      console.log('  GET  /api/email-monitor-status - Email monitor status');
      console.log('  GET  /api/health - Health check');
      console.log('');
      console.log('🧪 Test real-time email: POST /api/test-meeting-email');
      console.log('🧪 Manual check: POST /api/check-emails');
      
      // Start email monitoring after server is running
      if (emailMonitor) {
        setTimeout(() => {
          emailMonitor.start();
        }, 5000);
      }
    });
  } else {
    console.error('❌ Failed to initialize services. Please check your configuration.');
    process.exit(1);
  }
}

startServer().catch(console.error); 