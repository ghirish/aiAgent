# CalMail AI - Google Calendar & Gmail AI Agent

An intelligent, real-time calendar management AI agent built on **Model Context Protocol (MCP)** architecture that seamlessly integrates with Google Calendar and Gmail, automatically detecting meeting requests in emails, analyzing scheduling intent using GPT-4 model hosted on Azure AI Foundry, and generating professional responses with seamless calendar integration - designed as a dedicated AI assistant inspired by Teams-style AI agents.

## Key Features

### **Real-Time Email Monitoring**
- **30-second polling** for new meeting-related emails
- **Keyword-based pre-filtering** for performance optimization
- **WebSocket notifications** for instant UI updates
- **Azure AI analysis** with 80%+ confidence scoring

### **Intelligent Response Generation**
- **Multi-response types**: Accept, Counter-propose, Decline, Request-info
- **Professional email formatting** with appropriate tone detection
- **Custom message integration** and meeting details handling
- **Calendar invite generation** for accepted meetings

### **Teams-Inspired Interactive Interface**
- **Real-time notification panel** with action buttons
- **Response editing modal** with live preview
- **Status tracking** (generating → editing → sending → sent)
- **Professional UI styling** with Teams-inspired workflow states

### **Advanced Calendar Operations**
- **Natural language processing** for calendar queries
- **Conflict detection** and alternative time suggestions
- **Availability checking** across multiple calendars
- **Smart scheduling** with user preference learning

## System Architecture

```
Email Detection → AI Analysis → WebSocket Notification → 
User Response Selection → AI Generation → Edit Modal → Send Response
```

### **Core Components:**
- **Backend API** (Node.js/Express) - Port 3000
- **Frontend UI** (React/TypeScript) - Port 3001  
- **MCP Server** - **Model Context Protocol** for standardized AI tool integration
- **Real-time Monitor** - Email polling and WebSocket broadcasting
- **Azure AI Service** - GPT-4o for scheduling analysis via MCP tools
- **Google APIs** - Calendar and Gmail integration through MCP interface

## **MCP (Model Context Protocol) Integration**

This project showcases **Model Context Protocol** as a core architectural pattern for building AI agents:

### **Why MCP?**
- **Standardized Tool Interface**: MCP provides a consistent way for AI models to interact with external services
- **Tool Composability**: Calendar, email, and AI analysis tools work together seamlessly
- **Protocol-First Design**: Clean separation between AI reasoning and tool execution
- **Extensible Architecture**: Easy to add new tools and capabilities

### **MCP Tools Implemented:**
- **Calendar Operations**: `get_events`, `create_event`, `check_availability`, `find_slots`
- **Email Management**: `get_emails`, `search_emails`, `draft_response`, `send_reply`
- **AI Analysis**: `process_natural_query`, `analyze_scheduling_intent`

### **MCP Workflow:**
1. **Frontend** sends natural language query to Backend API
2. **Backend** forwards query to MCP Server via stdin/stdout communication
3. **MCP Server** uses Azure AI to determine which tools to call
4. **AI Model** executes appropriate MCP tools (calendar, email, analysis)
5. **Results** flow back through MCP → Backend → Frontend with real-time updates

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Google Cloud Console project with Calendar & Gmail APIs enabled
- Azure AI Foundry account with GPT-4o deployment

### 1. Clone & Install
```bash
git clone <repository-url>
cd aiAgent
npm install
cd calendar-api && npm install
cd ../calmail-ai-frontend && npm install
```

### 2. Environment Setup
Create `.env` files based on `env.example`:

```bash
# Root .env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
AZURE_OPENAI_ENDPOINT=your_azure_endpoint
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# calmail-ai-frontend/.env
PORT=3001
```

### 3. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable Calendar & Gmail APIs
3. Create OAuth 2.0 credentials
4. Add `http://localhost:3000/auth/callback` to redirect URIs
5. Add test users in OAuth consent screen

### 4. Start Services
```bash
# Terminal 1: Backend
cd calendar-api && npm start

# Terminal 2: Frontend  
cd calmail-ai-frontend && npm start
```

### 5. Test the System
- Open: http://localhost:3001
- Click "Test Meeting Email" for demo
- Use "Phase 6 Test" for full workflow testing

## Testing & Validation

### **Automated Tests**
```bash
# Email monitoring system
node test-email-monitoring-setup.js

# Complete workflow (Phases 5-6)
node test-phase6-complete-workflow.js
```

### **Manual Testing Workflow**
1. **Email Detection**: Send yourself an email with meeting keywords
2. **AI Analysis**: System detects scheduling intent automatically  
3. **Response Generation**: Click Accept/Counter/Decline buttons
4. **Response Editing**: Use modal to customize before sending
5. **Calendar Integration**: Accepted meetings create calendar events

### **Sample Test Queries**
- "Schedule a team meeting tomorrow at 3pm"
- "Create a lunch meeting next Tuesday at 12:30pm"  
- "What do I have today?"
- "Check my availability this week"

## API Endpoints

### **Email Monitoring**
- `GET /api/email-monitor-status` - Monitor status
- `POST /api/test-meeting-email` - Create test notification
- `POST /api/check-emails` - Manual email check

### **Response Management**
- `POST /api/generate-response` - Generate email responses
- `POST /api/send-response` - Send email responses
- `POST /api/email-notification` - WebSocket notification

### **Calendar Operations (via MCP)** 
- `POST /api/natural-query` - Natural language calendar queries processed through MCP
- `POST /api/calendar-query` - Direct MCP server communication for calendar operations
- All calendar operations leverage MCP tools for standardized AI-service integration

## MCP Tools Available

The power of **Model Context Protocol** shines through our comprehensive tool ecosystem:

### **Calendar Management Tools**
- `get_calendar_events` - Retrieve calendar events with intelligent filtering
- `check_availability` - Check time availability across multiple calendars  
- `create_event` - Create new calendar events with conflict detection
- `update_event` - Modify existing events through natural language
- `cancel_event` - Cancel/delete events with confirmation workflows
- `find_meeting_slots` - Find optimal meeting times using AI reasoning
- `get_calendar_summary` - Generate daily/weekly summaries with insights

### **Email Operations Tools**
- `get_recent_emails` - Fetch recent emails with smart filtering
- `get_unread_emails` - Get unread messages with priority detection
- `search_emails` - Search email content using semantic understanding
- `draft_scheduling_response` - Generate contextual email responses
- `send_email_response` - Send email replies with calendar integration

### **AI Analysis Tools**
- `process_natural_query` - Natural language processing with intent recognition
- `analyze_email_for_scheduling` - Advanced meeting intent detection and extraction

### **MCP Architecture Benefits:**
- **Tool Discoverability**: AI can explore available tools dynamically
- **Composable Operations**: Tools work together for complex workflows
- **Type Safety**: Structured input/output with JSON schema validation
- **Error Handling**: Graceful fallbacks when tools are unavailable
- **Extensibility**: Easy to add new tools without changing core logic


## What's Next

### **Immediate Enhancements**
- [ ] **Microsoft Teams integration** - Native Teams app support
- [ ] **Multi-calendar support** - Integrate multiple Google accounts
- [ ] **Smart scheduling rules** - User preference learning system
- [ ] **Teams/Slack integration** - Extend beyond email
- [ ] **Voice commands** - Speech-to-text scheduling
- [ ] **Smart suggestions** - Proactive meeting recommendations

### **Enterprise Features**
- [ ] **Multi-tenant support** - Organization-wide deployment
- [ ] **Admin dashboard** - Team scheduling oversight
- [ ] **Integration APIs** - Third-party system connections
- [ ] **Compliance features** - GDPR, SOC2 compliance

### **AI Improvements**
- [ ] **Context awareness** - Learn from past interactions
- [ ] **Sentiment analysis** - Detect urgency and importance
- [ ] **Meeting optimization** - Suggest better meeting times

## Contributing

### **Development Setup**
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Follow existing code patterns and TypeScript interfaces
4. Add tests for new functionality
5. Update documentation as needed

### **Testing Guidelines**
- Test MCP tools individually before integration
- Validate end-to-end workflows with real data
- Include error handling and edge cases
- Document any external dependencies

## License

This project is licensed under the MIT License - see the LICENSE file for details.
---

**🎉 Calendar Copilot is production-ready and actively maintained!**

For support, feature requests, or bug reports, please open an issue on GitHub. 
