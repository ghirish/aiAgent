# 🧪 Testing Your Calendar Copilot with Google Calendar

## Pre-Testing Checklist

✅ **Environment Setup Complete**
- [ ] All API credentials set in `.env` file
- [ ] Google Calendar API enabled in Google Cloud Console
- [ ] Azure AI deployment configured
- [ ] Project built successfully (`npm run build`)

✅ **Required `.env` Variables**
```bash
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
```

## 🚀 Running the Live Calendar Test

### Step 1: Start the Test Script

```bash
node dist/test-calendar.js
```

### Step 2: OAuth Authentication

**If this is your first time:**

1. The script will display a Google authorization URL
2. **Copy and paste the URL** into your browser
3. **Sign in to your Google account**
4. **Authorize the Calendar Copilot** application
5. **Copy the authorization code** from the callback URL
6. **Paste the code** back into the terminal

**If you have stored tokens:**
- Add them to your `.env` file:
```bash
GOOGLE_ACCESS_TOKEN=your_access_token
GOOGLE_REFRESH_TOKEN=your_refresh_token
```

### Step 3: Automated Tests

The script will run 5 comprehensive tests:

#### 🧪 **Test 1: Fetch Calendar Events**
- Retrieves your events for the next 7 days
- Shows event titles and times
- Verifies Google Calendar API connection

**Expected Output:**
```
✅ Found 3 events in the next 7 days:
   1. Team Meeting - 1/15/2024, 2:00:00 PM
   2. Doctor Appointment - 1/16/2024, 10:00:00 AM
   3. Project Review - 1/17/2024, 3:00:00 PM
```

#### 🧪 **Test 2: Check Today's Availability**
- Analyzes your busy periods for today (9 AM - 5 PM)
- Shows free/busy status
- Tests calendar conflict detection

**Expected Output:**
```
✅ Found 2 busy periods today:
   1. 2:00:00 PM - 3:00:00 PM
   2. 4:30:00 PM - 5:00:00 PM
```

#### 🧪 **Test 3: Find Meeting Slots**
- AI-powered optimal slot finding for next week
- Shows confidence scores for suggestions
- Tests smart scheduling logic

**Expected Output:**
```
✅ Found 5 optimal meeting slots:
   1. 1/22/2024, 10:00:00 AM (95% confidence)
   2. 1/23/2024, 2:00:00 PM (88% confidence)
   3. 1/24/2024, 9:00:00 AM (82% confidence)
```

#### 🧪 **Test 4: Natural Language Parsing**
- Tests Azure AI integration
- Shows intent recognition accuracy
- Demonstrates entity extraction

**Expected Output:**
```
📝 Query: "Schedule a meeting next Tuesday at 2pm for 1 hour"
🎯 Intent: schedule (95% confidence)
📅 Extracted date: 1/23/2024, 2:00:00 PM
⏰ Duration: 60 minutes
```

#### 🧪 **Test 5: Calendar Summary**
- Generates analytics from your calendar
- Shows busy hours and patterns
- Tests summary generation

**Expected Output:**
```
✅ Calendar Summary:
   📊 Total events: 8
   ⏰ Total busy hours: 12.5
   📈 Average event duration: 60 minutes
   🏷️ Most common type: meeting
```

### Step 4: Interactive Testing

After automated tests, you'll enter **Interactive Mode**:

```
🎮 Interactive Testing Mode
💬 Enter a calendar query (or "exit"):
```

**Try these natural language queries:**

```
What meetings do I have tomorrow?
Schedule a coffee chat with john@company.com next Friday at 3pm
Am I free on Tuesday afternoon?
Find me a 2-hour block next week for deep work
Cancel my 4pm meeting today
```

**Each query will show:**
- 🎯 **Intent** (schedule, query, availability, etc.)
- 📊 **Confidence score** (0-100%)
- 📋 **Extracted entities** (dates, times, attendees)
- 💡 **Suggested next action**

## 🔍 Troubleshooting

### Common Issues & Solutions

#### ❌ **Authentication Errors**

**Problem:** `Failed to exchange authorization code`
```bash
❌ Failed to exchange authorization code: Error: invalid_grant
```

**Solution:**
1. Verify your Google OAuth credentials
2. Ensure redirect URI matches Google Cloud Console exactly
3. Use a fresh authorization code (they expire quickly)

#### ❌ **Azure AI Errors**

**Problem:** `Azure AI service failed`
```bash
❌ Test 4 failed: Error: 401 Unauthorized
```

**Solution:**
1. Check your Azure OpenAI endpoint URL
2. Verify API key is correct
3. Confirm deployment name exists in Azure AI Studio

#### ❌ **Calendar Access Errors**

**Problem:** `Insufficient permissions`
```bash
❌ Test 1 failed: Error: Insufficient Permission
```

**Solution:**
1. Ensure Google Calendar API is enabled
2. Check OAuth scopes include calendar access
3. Re-authorize with fresh permissions

### Debug Mode

For detailed debugging, enable debug logging:

```bash
LOG_LEVEL=debug node dist/test-calendar.js
```

## ✅ Success Criteria

Your Calendar Copilot is working correctly if:

- ✅ **Test 1** shows your actual calendar events
- ✅ **Test 2** displays accurate busy/free times
- ✅ **Test 3** suggests reasonable meeting slots
- ✅ **Test 4** correctly parses natural language
- ✅ **Test 5** generates meaningful calendar analytics
- ✅ **Interactive mode** responds to your queries

## 🎯 Next Steps

Once testing is successful:

1. **Integration**: Connect to Cursor/Claude via MCP
2. **Production**: Deploy with secure token storage
3. **Advanced Features**: Enable Phase 3 capabilities
4. **Customization**: Adjust working hours and preferences

## 📞 Support

If you encounter issues:

1. **Check logs** with debug mode enabled
2. **Verify credentials** in `.env` file
3. **Test basic connectivity** with simple test server
4. **Review API quotas** in Google Cloud Console

**Your Calendar Copilot is now ready for real-world calendar management!** 🚀 