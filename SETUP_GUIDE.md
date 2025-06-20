# Calendar Copilot - Setup & Usage Guide

## 🎯 Overview

Calendar Copilot is an intelligent MCP (Model Context Protocol) server that provides AI-powered calendar management through natural language operations. It integrates Google Calendar with Azure AI Foundry to offer smart scheduling, event management, and calendar insights.

## 🏗️ Architecture

- **MCP Server**: Handles tool requests and responses
- **Google Calendar API**: Calendar data and operations
- **Azure AI Foundry**: Natural language processing and smart scheduling
- **8 Core Tools**: Complete calendar management capabilities

## 📋 Prerequisites

1. **Node.js** (v18 or higher)
2. **Google Cloud Account** with Calendar API access
3. **Azure Account** with AI Foundry/OpenAI service
4. **API Credentials** (as provided in previous setup guide)

## 🚀 Quick Start

### 1. Environment Setup

Create your `.env` file with your API credentials:

```bash
# Copy from template
cp env.example .env

# Edit with your actual values
nano .env
```

Required environment variables:
```env
# Google Calendar API
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/callback

# Azure AI Foundry
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_azure_api_key
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Security
JWT_SECRET=your_32_character_random_string
ENCRYPTION_KEY=your_32_character_random_string

# App Configuration
NODE_ENV=development
LOG_LEVEL=info
PORT=3000
```

### 2. Install & Build

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### 3. Authentication Setup

The server needs Google Calendar access. You have two options:

#### Option A: Interactive OAuth Flow
```bash
# Start the server
npm start

# Follow OAuth prompts in the logs
# Visit the authorization URL and get the code
# The server will handle token exchange
```

#### Option B: Pre-configured Tokens
```javascript
// In your client code
const server = new CalendarCopilotServer(config, logger);
server.setAccessToken('your_access_token', 'your_refresh_token');
await server.start();
```

## 🔧 Available Tools

### 1. **get_calendar_events**
Fetch calendar events for a date range.

```json
{
  "name": "get_calendar_events",
  "arguments": {
    "timeMin": "2024-01-01T00:00:00Z",
    "timeMax": "2024-01-31T23:59:59Z",
    "calendarId": "primary",
    "maxResults": 50
  }
}
```

### 2. **check_availability**
Check free/busy status for specific time ranges.

```json
{
  "name": "check_availability",
  "arguments": {
    "timeMin": "2024-01-15T09:00:00Z",
    "timeMax": "2024-01-15T17:00:00Z",
    "calendarIds": ["primary", "team@company.com"]
  }
}
```

### 3. **find_meeting_slots**
AI-powered optimal meeting slot finder.

```json
{
  "name": "find_meeting_slots",
  "arguments": {
    "duration": 60,
    "timeMin": "2024-01-15T09:00:00Z",
    "timeMax": "2024-01-19T17:00:00Z",
    "workingHours": {
      "start": "09:00",
      "end": "17:00"
    },
    "bufferTime": 15,
    "maxSuggestions": 5
  }
}
```

### 4. **create_event**
Create new calendar events.

```json
{
  "name": "create_event",
  "arguments": {
    "summary": "Team Meeting",
    "start": {
      "dateTime": "2024-01-15T14:00:00Z",
      "timeZone": "America/New_York"
    },
    "end": {
      "dateTime": "2024-01-15T15:00:00Z",
      "timeZone": "America/New_York"
    },
    "description": "Weekly team sync",
    "location": "Conference Room A",
    "attendees": [
      {
        "email": "john@company.com",
        "displayName": "John Doe"
      }
    ]
  }
}
```

### 5. **update_event**
Modify existing calendar events.

```json
{
  "name": "update_event",
  "arguments": {
    "eventId": "event_12345",
    "summary": "Updated Team Meeting",
    "start": {
      "dateTime": "2024-01-15T15:00:00Z"
    },
    "end": {
      "dateTime": "2024-01-15T16:00:00Z"
    }
  }
}
```

### 6. **cancel_event**
Cancel/delete calendar events.

```json
{
  "name": "cancel_event",
  "arguments": {
    "eventId": "event_12345",
    "sendNotifications": true
  }
}
```

### 7. **get_calendar_summary**
Generate calendar summaries with analytics.

```json
{
  "name": "get_calendar_summary",
  "arguments": {
    "timeMin": "2024-01-01T00:00:00Z",
    "timeMax": "2024-01-07T23:59:59Z",
    "includeAnalytics": true
  }
}
```

### 8. **parse_natural_query**
Parse natural language calendar queries.

```json
{
  "name": "parse_natural_query",
  "arguments": {
    "query": "Schedule a meeting with john@company.com tomorrow at 2pm for 1 hour"
  }
}
```

## 🤖 Natural Language Examples

The `parse_natural_query` tool can understand various natural language patterns:

### Scheduling
- "Schedule a meeting with john@company.com tomorrow at 2pm for 1 hour"
- "Book a 30-minute call with the team next Tuesday at 10am"
- "Create an appointment for Friday afternoon"

### Queries
- "What meetings do I have next week?"
- "Show me my calendar for tomorrow"
- "List all meetings with John this month"

### Availability
- "Am I free on Friday afternoon?"
- "When is my next available 2-hour slot?"
- "Check if I'm available between 2-4pm today"

### Updates & Cancellations
- "Cancel my 3pm meeting today"
- "Move tomorrow's team meeting to 4pm"
- "Update the client call to include Sarah"

## 🔧 Integration Examples

### With Cursor/Claude

```typescript
import { CalendarCopilotServer } from './src/mcp/server.js';
import { loadConfig } from './src/utils/config.js';
import { Logger } from './src/utils/logger.js';

const config = loadConfig();
const logger = new Logger(config.app.logLevel);
const server = new CalendarCopilotServer(config, logger);

// Set up authentication
server.setAccessToken(process.env.GOOGLE_ACCESS_TOKEN!);

// Start the server
await server.start();
```

### With Custom MCP Client

```typescript
// Example client usage
const response = await mcpClient.callTool({
  name: 'parse_natural_query',
  arguments: {
    query: 'Find me a 2-hour slot next week for a design review'
  }
});

// The AI will parse the intent and suggest using find_meeting_slots
const parsed = JSON.parse(response.content[0].text);
console.log('Intent:', parsed.intent); // 'schedule'
console.log('Duration:', parsed.entities.duration); // 120 minutes
```

## 📊 Features & Capabilities

### Smart Scheduling
- AI-powered optimal time slot suggestions
- Working hours and buffer time respect
- Conflict detection and resolution
- Time zone handling

### Natural Language Processing
- Intent recognition (schedule, query, update, cancel, availability)
- Entity extraction (dates, times, attendees, locations)
- Fallback parsing with chrono-node for dates
- Confidence scoring for AI suggestions

### Calendar Operations
- Full CRUD operations for calendar events
- Multi-calendar support
- Free/busy status checking
- Event analytics and summaries

### Security & Reliability
- OAuth 2.0 authentication flow
- Token refresh handling
- Input validation with Zod schemas
- Comprehensive error handling and logging

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify Google OAuth credentials are correct
   - Check redirect URI matches Google Cloud Console
   - Ensure Calendar API is enabled

2. **Azure AI Errors**
   - Verify Azure OpenAI endpoint and API key
   - Check deployment name matches Azure AI Studio
   - Confirm API version compatibility

3. **Build Errors**
   - Run `npm install` to ensure all dependencies
   - Use Node.js v18 or higher
   - Check TypeScript configuration

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

### Test Mode

Run the simple test server:
```bash
node dist/test-server.js
```

## 🔄 Next Steps

Phase 3 will add:
- Advanced natural language understanding
- Smart conflict resolution
- Meeting preparation suggestions
- Calendar analytics and insights
- Recurring event intelligent management

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs with debug mode enabled  
3. Verify all API credentials and permissions
4. Test with the simple test server first

The Calendar Copilot is now ready for intelligent calendar management! 🚀 