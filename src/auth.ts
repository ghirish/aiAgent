#!/usr/bin/env node

import { OAuth2Client } from 'google-auth-library';
import { promises as fs } from 'fs';
import * as readline from 'readline';

// Load configuration
async function loadConfig() {
  try {
    const envContent = await fs.readFile('.env', 'utf-8');
    const config: any = {};
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        config[key.trim()] = value;
      }
    });
    
    return config;
  } catch (error) {
    console.error('❌ Error loading .env file:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('🔐 Calendar Copilot OAuth Setup');
  console.log('================================');
  console.log('');

  const config = await loadConfig();
  
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    console.error('❌ Missing Google OAuth credentials in .env file');
    console.error('Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set');
    process.exit(1);
  }

  // Create OAuth2 client
  const oauth2Client = new OAuth2Client(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback'
  );

  // Generate auth URL
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });

  console.log('📋 Step 1: Open this URL in your browser:');
  console.log('');
  console.log(authUrl);
  console.log('');
  console.log('📋 Step 2: Complete the authorization');
  console.log('📋 Step 3: Copy the authorization code from the URL');
  console.log('         (it will be after "code=" in the browser URL)');
  console.log('');

  // Get authorization code from user
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const code = await new Promise<string>((resolve) => {
    rl.question('🔑 Paste the authorization code here: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  try {
    // Exchange code for tokens
    console.log('');
    console.log('🔄 Exchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    
    // Save tokens to file
    await fs.writeFile('tokens.json', JSON.stringify(tokens, null, 2));
    
    console.log('✅ OAuth setup complete!');
    console.log('✅ Tokens saved to tokens.json');
    console.log('');
    console.log('🎯 You can now create real calendar events!');
    console.log('');
    console.log('Test it with:');
    console.log('  ./test-real-calendar.sh');
    
  } catch (error) {
    console.error('❌ Error getting tokens:', error);
    console.error('');
    console.error('Make sure:');
    console.error('1. You copied the complete authorization code');
    console.error('2. The code hasn\'t expired (get a fresh one)');
    console.error('3. Your Google OAuth app is configured correctly');
  }
}

main().catch(console.error); 