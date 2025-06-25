# 📅 Calendar Copilot - AI-Powered Email-to-Calendar Assistant

An intelligent, real-time calendar management system that automatically detects meeting requests in emails, analyzes scheduling intent using Azure AI, and generates professional responses with seamless calendar integration.

## 🌟 Key Features

### 🔄 **Real-Time Email Monitoring**
- **30-second polling** for new meeting-related emails
- **Keyword-based pre-filtering** for performance optimization
- **WebSocket notifications** for instant UI updates
- **Azure AI analysis** with 80%+ confidence scoring

### 🤖 **Intelligent Response Generation**
- **Multi-response types**: Accept, Counter-propose, Decline, Request-info
- **Professional email formatting** with appropriate tone detection
- **Custom message integration** and meeting details handling
- **Calendar invite generation** for accepted meetings

### 🎨 **Interactive User Interface**
- **Real-time notification panel** with action buttons
- **Response editing modal** with live preview
- **Status tracking** (generating → editing → sending → sent)
- **Professional UI styling** with color-coded workflow states

### 📊 **Advanced Calendar Operations**
- **Natural language processing** for calendar queries
- **Conflict detection** and alternative time suggestions
- **Availability checking** across multiple calendars
- **Smart scheduling** with user preference learning

## 🏗️ System Architecture

```
Email Detection → AI Analysis → WebSocket Notification → 
User Response Selection → AI Generation → Edit Modal → Send Response
```

### **Core Components:**
- **Backend API** (Node.js/Express) - Port 3000
- **Frontend UI** (React/TypeScript) - Port 3001  
- **MCP Server** - Model Context Protocol integration
- **Real-time Monitor** - Email polling and WebSocket broadcasting
- **Azure AI Service** - GPT-4o for scheduling analysis
- **Google APIs** - Calendar and Gmail integration

## 🚀 Quick Start

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
cd ../calendar-copilot-frontend && npm install
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

# calendar-copilot-frontend/.env
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
cd calendar-copilot-frontend && npm start
```

### 5. Test the System
- Open: http://localhost:3001
- Click "🧪 Test Meeting Email" for demo
- Use "🚀 Phase 6 Test" for full workflow testing

## 🧪 Testing & Validation

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

## 📡 API Endpoints

### **Email Monitoring**
- `GET /api/email-monitor-status` - Monitor status
- `POST /api/test-meeting-email` - Create test notification
- `POST /api/check-emails` - Manual email check

### **Response Management**
- `POST /api/generate-response` - Generate email responses
- `POST /api/send-response` - Send email responses
- `POST /api/email-notification` - WebSocket notification

### **Calendar Operations** 
- `POST /api/natural-query` - Natural language calendar queries
- All operations via MCP server integration

## 🛠️ MCP Tools Available

### **Calendar Management**
- `get_calendar_events` - Retrieve calendar events
- `check_availability` - Check time availability  
- `create_event` - Create new calendar events
- `update_event` - Modify existing events
- `cancel_event` - Cancel/delete events
- `find_meeting_slots` - Find optimal meeting times
- `get_calendar_summary` - Daily/weekly summaries

### **Email Operations**
- `get_recent_emails` - Fetch recent emails
- `get_unread_emails` - Get unread messages
- `search_emails` - Search email content
- `draft_scheduling_response` - Generate responses
- `send_email_response` - Send email replies

### **AI Analysis**
- `process_natural_query` - Natural language processing
- `analyze_email_for_scheduling` - Meeting intent detection

## 🔒 Security Features

### **Data Protection**
- ✅ **Environment variables** for all sensitive data
- ✅ **JWT tokens** for authentication
- ✅ **Encryption keys** for data security  
- ✅ **OAuth 2.0** for Google API access
- ✅ **No hardcoded credentials** in source code

### **API Security**
- Rate limiting on endpoints
- CORS configuration for frontend
- Input validation and sanitization
- Error handling without data exposure

## 📈 Performance & Reliability

### **Monitoring**
- **30-second email polling** - Balance of responsiveness & resource usage
- **WebSocket connections** - Real-time UI updates
- **Fallback systems** - Graceful degradation when services unavailable
- **Error logging** - Comprehensive debugging information

### **Scalability**
- **Modular architecture** - Easy to extend and maintain
- **Service separation** - Frontend, backend, MCP server isolation
- **Async processing** - Non-blocking operations
- **Batch processing** - Efficient email handling

## 🎯 What's Next

### **Immediate Enhancements**
- [ ] **Multi-calendar support** - Integrate multiple Google accounts
- [ ] **Smart scheduling rules** - User preference learning system
- [ ] **Email templates** - Customizable response templates
- [ ] **Meeting insights** - Analytics on scheduling patterns

### **Advanced Features**
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

## 🤝 Contributing

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

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Azure AI** for GPT-4o integration
- **Google APIs** for Calendar and Gmail access
- **MCP Protocol** for intelligent tool orchestration
- **React/TypeScript** for modern frontend development

---

**🎉 Calendar Copilot is production-ready and actively maintained!**

For support, feature requests, or bug reports, please open an issue on GitHub. 