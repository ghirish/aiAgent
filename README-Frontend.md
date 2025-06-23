# 📅 Calendar Copilot - React Frontend

A beautiful React frontend for creating Google Calendar events using natural language.

## 🎯 What It Does

Type natural language requests like:
- **"Schedule a team meeting tomorrow at 3pm"**
- **"Create a lunch meeting with John next Tuesday at 12:30pm"** 
- **"Book a quick standup today at 10am for 30 minutes"**
- **"Set up a client demo next Friday at 2pm for 2 hours"**

And watch as Calendar Copilot creates actual Google Calendar events!

## 🏗️ Architecture

```
React Frontend → Express API → MCP Server → Google Calendar API
```

- **Frontend**: Beautiful React UI with natural language input
- **API**: Express server that handles requests and parses natural language
- **MCP Server**: Calendar Copilot backend with Google Calendar integration
- **Google Calendar**: Real calendar events created via API

## 🚀 Quick Start

### 1. Start the API Server
```bash
cd calendar-api
npm start
```

### 2. Start the React Frontend
```bash
cd calendar-copilot-frontend
npm start
```

### 3. Open Your Browser
Navigate to: http://localhost:3000

## 🎭 Demo Mode vs Production Mode

### Current State: Demo Mode
- ✅ Beautiful React UI working
- ✅ Natural language processing
- ✅ API endpoints functional
- 🎭 **Mock events** (not real Google Calendar)

### Production Mode (Optional)
To enable real Google Calendar integration:

1. **Uncomment MCP Integration** in `calendar-api/index.js`:
   ```javascript
   // Replace createMockEvent() with:
   const createdEvent = await sendToMCPServer(eventDetails);
   ```

2. **Ensure MCP Server is Built**:
   ```bash
   cd ../
   npm run build
   ```

3. **Verify OAuth Tokens**:
   ```bash
   # Make sure tokens.json exists with valid Google Calendar access
   ls -la tokens.json
   ```

## 🎨 Features

### React Frontend
- **Modern UI**: Beautiful gradient background with glassmorphism effects
- **Natural Language Input**: Large textarea for typing requests
- **Example Prompts**: Click-to-use example requests
- **Real-time Feedback**: Loading states, success/error messages
- **Event Display**: Beautiful cards showing created events
- **Responsive Design**: Works on desktop and mobile

### API Server  
- **Natural Language Processing**: Extracts time, duration, meeting type
- **Smart Event Naming**: Automatically detects meeting types (standup, lunch, demo, etc.)
- **Time Zone Handling**: Proper PST/PDT timezone support
- **Error Handling**: Comprehensive error messages and suggestions

### Supported Natural Language Patterns

#### **Time Expressions**
- "tomorrow at 3pm"
- "today at 10:30am" 
- "next Tuesday at 12:30pm"
- "in 2 hours"

#### **Duration Expressions**
- "for 1 hour"
- "for 30 minutes" 
- "for 2 hours"
- "quick" (30 min)

#### **Meeting Types**
- "standup" → Daily Standup
- "lunch" → Lunch Meeting  
- "demo" → Demo Session
- "interview" → Interview
- "1:1" → 1:1 Meeting

## 🛠️ Development

### File Structure
```
calendar-copilot-frontend/
├── src/
│   ├── App.tsx              # Main app component
│   ├── App.css              # Global styles
│   └── components/
│       ├── CalendarInput.tsx    # Natural language input
│       ├── CalendarInput.css    # Input component styles
│       ├── EventDisplay.tsx     # Event display cards
│       └── EventDisplay.css     # Event display styles

calendar-api/
├── index.js                 # Express API server
├── package.json            # Dependencies
└── api.log                 # Server logs
```

### Adding New Features

#### **New Meeting Types**
Add to `parseNaturalRequest()` in `calendar-api/index.js`:
```javascript
if (request.includes('retrospective')) {
  title = 'Team Retrospective';
  location = 'Meeting Room';
}
```

#### **New Time Patterns**
Extend the regex patterns in `parseNaturalRequest()`:
```javascript
const timeMatch = request.match(/your-new-pattern/i);
```

## 🔧 Troubleshooting

### API Server Issues
```bash
# Check if API is running
curl http://localhost:3001/api/health

# View server logs
tail -f calendar-api/api.log
```

### React Frontend Issues
```bash
# Clear React cache
cd calendar-copilot-frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

### Port Conflicts
- API Server: http://localhost:3001
- React Frontend: http://localhost:3000

Change ports in:
- `calendar-api/index.js` (PORT variable)
- `calendar-copilot-frontend/src/components/CalendarInput.tsx` (fetch URL)

## 🎉 What You've Built

A complete **natural language calendar interface** that:

1. **Takes human language** like "schedule a meeting tomorrow"
2. **Understands context** (time, duration, meeting type)
3. **Creates calendar events** with proper details
4. **Provides visual feedback** with beautiful UI
5. **Links to Google Calendar** for easy access

This demonstrates the power of **Model Context Protocol (MCP)** for creating intelligent, context-aware applications!

## 🔜 Next Steps

- **Real Google Calendar Integration**: Enable production mode
- **Meeting Attendees**: Add support for "@john.doe@email.com" 
- **Recurring Events**: "every Tuesday at 10am"
- **Calendar Conflicts**: Check existing events before scheduling
- **Voice Input**: Speech-to-text for hands-free scheduling
- **Multiple Calendars**: Support for different calendar types

---

**🎊 Congratulations!** You've successfully built a complete Calendar Copilot frontend with natural language processing capabilities! 