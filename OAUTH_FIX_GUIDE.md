# 🔧 Fixing Google OAuth "Access Denied" Error

## Problem
You're seeing this error when trying to authenticate:
```
Error 403: access_denied
Access blocked: Calendar Copilot has not completed the Google verification process
```

## Root Cause
- Your Google Cloud Console project is in **testing mode**
- Google requires apps to be verified OR explicitly add test users during development
- Currently only the project owner can access the OAuth flow

## 🛠️ Solution: Add Test Users

### Step 1: Open Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Calendar Copilot project
3. Navigate to **APIs & Services > OAuth consent screen**

### Step 2: Configure OAuth Consent Screen
1. You should see your app is in **"Testing"** status
2. If not already configured, fill out the required fields:
   - **App name**: Calendar Copilot
   - **User support email**: your email
   - **Developer contact email**: your email

### Step 3: Add Test Users
1. Scroll down to the **"Test users"** section
2. Click **"ADD USERS"**
3. Add the Google account email you're trying to authenticate with:
   ```
   ghirish05@gmail.com
   ```
4. Click **"SAVE"**

### Step 4: Verify Scopes
1. Go to **APIs & Services > OAuth consent screen**
2. Click **"EDIT APP"**
3. Go to **"Scopes"** section
4. Ensure these scopes are added:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. If missing, add them by clicking **"ADD OR REMOVE SCOPES"**

### Step 5: Double-Check Credentials
1. Go to **APIs & Services > Credentials**
2. Click on your OAuth 2.0 Client ID
3. Verify the **Authorized redirect URIs** contains:
   ```
   http://localhost:3000/auth/callback
   ```
4. If missing, add it and save

## 🧪 Test the Fix

### Method 1: Try OAuth Flow Again
```bash
node dist/test-calendar.js
```

### Method 2: Use Fresh Authorization URL
If the error persists, ensure you're using a completely fresh authorization URL:

1. **Clear browser cookies** for accounts.google.com
2. **Use incognito/private browsing mode**
3. **Copy the EXACT URL** from the terminal output
4. **Make sure you're signed in** to the test user account (ghirish05@gmail.com)

## 🔄 Alternative: Use Your Own Google Account

If you want to use a different Google account:

1. **Add that email as a test user** in the OAuth consent screen
2. **Sign in to that account** in your browser
3. **Try the OAuth flow again**

## 🚨 Important Notes

### During Development (Testing Mode)
- ✅ **Works**: Added test users can authenticate
- ❌ **Blocked**: Any other Google users will see the "access denied" error
- ⏱️ **Token Expiry**: Refresh tokens last 7 days max in testing mode

### For Production (Verified App)
- ✅ **Works**: Any Google user can authenticate
- 📝 **Required**: Complete Google's app verification process
- 🔒 **Security**: Enhanced review for calendar scopes

## 🎯 Expected Result

After adding test users, you should see:
1. **No more "access denied" error**
2. **Normal OAuth consent screen** asking for calendar permissions
3. **Successful authorization code** in the callback URL
4. **Working calendar operations** in your test script

## 🔍 Troubleshooting

### Still Getting "Access Denied"?
1. **Verify the email address** matches exactly (case-sensitive)
2. **Wait 5-10 minutes** for Google's changes to propagate
3. **Clear browser cache** completely
4. **Try in incognito mode**

### "App Not Verified" Warning?
This is normal during development. You'll see:
- ⚠️ Warning that Google hasn't verified the app
- **"Advanced"** link to proceed anyway
- Click **"Go to Calendar Copilot (unsafe)"**

### Need Production Access?
For real users, you'll need to:
1. Complete Google's app verification process
2. Submit for security review
3. Wait for Google approval (can take weeks)

## ✅ Quick Checklist

- [ ] Added `ghirish05@gmail.com` as test user
- [ ] Verified redirect URI is correct
- [ ] Confirmed calendar scopes are present
- [ ] Cleared browser cache
- [ ] Tried in incognito mode
- [ ] Used fresh authorization URL

**Your Calendar Copilot OAuth should now work! 🚀** 