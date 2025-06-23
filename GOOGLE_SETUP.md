# Google Calendar Authentication Setup

Follow these steps to fix the "No access, refresh token, API key or refresh handler callback is set" error.

## Quick Setup (Service Account - Recommended for Development)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name your project (e.g., "Calendar Copilot")
4. Click "Create"

### Step 2: Enable Google Calendar API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

### Step 3: Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in details:
   - **Service account name**: `calendar-copilot-service`
   - **Service account ID**: (auto-generated)
   - **Description**: `Service account for Calendar Copilot app`
4. Click "Create and Continue"
5. Skip role assignment (click "Continue")
6. Skip user access (click "Done")

### Step 4: Create Service Account Key

1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Select "JSON" format
5. Click "Create"
6. **Save the downloaded JSON file as `google-service-account.json` in your project root**

### Step 5: Share Your Calendar

1. Open [Google Calendar](https://calendar.google.com)
2. On the left sidebar, find your calendar and click the 3 dots next to it
3. Select "Settings and sharing"
4. Scroll to "Share with specific people or groups"
5. Click "Add people and groups"
6. **Enter the service account email** (found in the JSON file as `client_email`)
7. Set permission to **"Make changes to events"**
8. Click "Send"

### Step 6: Update Environment

1. Make sure `google-service-account.json` is in your project root
2. Your `.env` file should have:
   ```bash
   GOOGLE_SERVICE_ACCOUNT_PATH=./google-service-account.json
   ```

### Step 7: Test the Setup

1. Restart your servers:
   ```bash
   # Kill existing servers
   lsof -ti:3000 | xargs kill -9
   
   # Start calendar API
   cd calendar-api && node index.js
   ```

2. Test with a query:
   ```bash
   curl -X POST http://localhost:3000/api/calendar-query \
     -H "Content-Type: application/json" \
     -d '{"query": "What do I have today?"}'
   ```

## Security Notes

- **Never commit `google-service-account.json` to version control**
- Add it to your `.gitignore` file
- For production, use environment variables or secure key management

## Troubleshooting

### "Service account key file not found"
- Ensure `google-service-account.json` is in the project root
- Check the file path in `GOOGLE_SERVICE_ACCOUNT_PATH`

### "Calendar not found" or "Insufficient permissions"
- Make sure you shared your calendar with the service account email
- Verify the service account has "Make changes to events" permission

### "API not enabled"
- Go back to Google Cloud Console
- Ensure Google Calendar API is enabled for your project

## Alternative: OAuth 2.0 Setup (For Production)

If you prefer OAuth 2.0 (better for production with multiple users):

1. In Google Cloud Console → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Add authorized redirect URIs: `http://localhost:3000/auth/callback`
5. Download the credentials and update your `.env` file

## Success Indicators

When properly configured, you should see:
- ✅ "Service account authentication initialized successfully" in logs
- ✅ Calendar queries return actual events or "No events found"
- ✅ No authentication errors

## Need Help?

If you're still having issues:
1. Check the server logs for detailed error messages
2. Verify all steps above were completed
3. Ensure the service account email matches what you added to calendar sharing 