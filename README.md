# 📅 Calendar Copilot - MCP Server

An intelligent calendar management system that integrates with Google Calendar and Azure AI Foundry to provide natural language calendar operations through the Model Context Protocol (MCP).

## 🚀 Features

### Core Capabilities
- **Google Calendar Integration** - Full CRUD operations on calendar events
- **Azure AI-Powered NLP** - Natural language understanding for calendar queries
- **Smart Scheduling** - Intelligent meeting slot recommendations
- **Availability Checking** - Real-time free/busy status
- **MCP Protocol** - Standard interface for AI assistants

### Available Tools
- `get_calendar_events` - Fetch events for date ranges
- `check_availability` - Check free/busy status
- `find_meeting_slots` - Smart meeting scheduling
- `create_event` - Create new calendar events
- `update_event` - Modify existing events
- `cancel_event` - Delete calendar events
- `get_calendar_summary` - Calendar analytics and summaries

## 📋 Prerequisites

- Node.js 18+ 
- Google Cloud Project with Calendar API enabled
- Azure AI Foundry resource
- Google OAuth 2.0 credentials

## 🛠️ Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy the environment template and fill in your credentials:
```bash
cp env.example .env
```

Configure the following variables in `.env`:

#### Google Calendar API
- `GOOGLE_CLIENT_ID` - Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth client secret  
- `GOOGLE_REDIRECT_URI` - OAuth redirect URI (e.g., http://localhost:3000/auth/callback)

#### Azure AI Foundry
- `AZURE_OPENAI_ENDPOINT` - Your Azure OpenAI endpoint
- `AZURE_OPENAI_API_KEY` - Your Azure OpenAI API key
- `AZURE_OPENAI_DEPLOYMENT_NAME` - Your deployment name
- `AZURE_OPENAI_API_VERSION` - API version (default: 2024-02-15-preview)

#### Security
- `JWT_SECRET` - Secret for JWT token signing
- `ENCRYPTION_KEY` - 32-character encryption key

### 3. Google Cloud Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Calendar API**
   ```bash
   gcloud services enable calendar-json.googleapis.com
   ```

3. **Create OAuth 2.0 Credentials**
   - Go to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URIs

### 4. Azure AI Foundry Setup

1. **Create Azure OpenAI Resource**
   - Deploy through Azure AI Foundry
   - Note the endpoint and API key

2. **Deploy a Model**
   - Deploy GPT-4 or GPT-3.5-turbo
   - Note the deployment name

## 🏃‍♂️ Running the Server

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## 🔧 Usage

The Calendar Copilot runs as an MCP server that AI assistants can connect to. Once running, it provides calendar management tools that can be called through the MCP protocol.

### Example Tool Calls

```typescript
// Get events for the next 7 days
{
  "tool": "get_calendar_events",
  "arguments": {
    "timeMin": "2024-01-01T00:00:00Z",
    "timeMax": "2024-01-08T00:00:00Z"
  }
}

// Find available meeting slots
{
  "tool": "find_meeting_slots", 
  "arguments": {
    "duration": 60,
    "timeMin": "2024-01-15T09:00:00Z",
    "timeMax": "2024-01-15T17:00:00Z"
  }
}

// Create a new event
{
  "tool": "create_event",
  "arguments": {
    "summary": "Team Standup",
    "start": {"dateTime": "2024-01-15T10:00:00Z"},
    "end": {"dateTime": "2024-01-15T10:30:00Z"}
  }
}
```

## 🏗️ Architecture

```
Calendar Copilot MCP Server
├── MCP Protocol Layer      (Tool definitions & request handling)
├── Calendar Service        (Google Calendar API integration)
├── AI Service             (Azure AI natural language processing)
├── Scheduling Engine      (Smart meeting slot algorithms)
└── Utilities              (Config, logging, validation)
```

## 🔒 Security

- OAuth 2.0 for Google Calendar access
- JWT tokens for session management
- Environment-based secret management
- Input validation with Zod schemas
- Structured error handling

## 📊 Logging

The server uses structured JSON logging with contextual information:

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "info", 
  "message": "Tool call received",
  "context": {
    "component": "MCPServer",
    "toolName": "get_calendar_events"
  }
}
```

## 🧪 Development

### Project Structure
```
src/
├── types/          # TypeScript type definitions
├── utils/          # Configuration and logging utilities  
├── mcp/            # MCP server implementation
├── services/       # Google Calendar & Azure AI services
├── scheduling/     # Meeting slot algorithms
└── index.ts        # Main entry point
```

### Scripts
- `npm run build` - Compile TypeScript
- `npm run dev` - Development with hot reload
- `npm run lint` - ESLint check
- `npm run format` - Prettier formatting
- `npm test` - Run tests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details 