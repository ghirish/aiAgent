#!/usr/bin/env node

import axios from 'axios';

console.log('🧪 Testing Real-time Email Monitoring Setup\n');

async function testEmailMonitoringSystem() {
  const API_BASE = 'http://localhost:3000';
  
  console.log('1. 🔍 Checking API server health...');
  try {
    const healthResponse = await axios.get(`${API_BASE}/api/health`);
    console.log('   ✅ API server is running');
    console.log('   📊 Status:', healthResponse.data.status);
  } catch (error) {
    console.log('   ❌ API server not available. Start with: cd calendar-api && npm start');
    return;
  }

  console.log('\n2. 📧 Checking email monitor status...');
  try {
    const statusResponse = await axios.get(`${API_BASE}/api/email-monitor-status`);
    console.log('   ✅ Email monitor available');
    
    if (statusResponse.data.status) {
      console.log('   📊 Monitor Status:', statusResponse.data.status.isRunning ? 'Running' : 'Stopped');
      console.log('   ⏰ Polling Interval:', statusResponse.data.status.pollingIntervalSeconds, 'seconds');
      console.log('   📬 Processed Emails:', statusResponse.data.status.processedEmailsCount);
    }
  } catch (error) {
    console.log('   ❌ Email monitor not available:', error.message);
  }

  console.log('\n3. 🧪 Testing meeting email creation...');
  try {
    const testResponse = await axios.post(`${API_BASE}/api/test-meeting-email`);
    console.log('   ✅ Test meeting email created');
    console.log('   📝 Result:', testResponse.data.message);
  } catch (error) {
    console.log('   ❌ Test email creation failed:', error.response?.data?.error || error.message);
  }

  console.log('\n4. 🔄 Testing manual email check...');
  try {
    const checkResponse = await axios.post(`${API_BASE}/api/check-emails`);
    console.log('   ✅ Manual email check completed');
    console.log('   📝 Result:', checkResponse.data.message);
  } catch (error) {
    console.log('   ❌ Manual email check failed:', error.response?.data?.error || error.message);
  }

  console.log('\n5. 📧 Testing email notification endpoint...');
  try {
    const notificationData = {
      emailData: {
        emailId: 'test-notification-' + Date.now(),
        subject: 'Test Meeting Email Notification',
        from: 'test@example.com',
        snippet: 'Can we schedule a meeting for tomorrow?',
        confidence: 0.95,
        suggestedActions: ['Check Calendar', 'Draft Response'],
        detectedAt: new Date().toISOString()
      }
    };

    const notifyResponse = await axios.post(`${API_BASE}/api/email-notification`, notificationData);
    console.log('   ✅ Email notification sent successfully');
    console.log('   📝 Result:', notifyResponse.data.message);
  } catch (error) {
    console.log('   ❌ Email notification failed:', error.response?.data?.error || error.message);
  }

  console.log('\n📋 TESTING COMPLETE');
  console.log('\n🎯 Next Steps:');
  console.log('   1. Start the frontend: cd calendar-copilot-frontend && npm start');
  console.log('   2. Open http://localhost:3001 in your browser');
  console.log('   3. Look for the "📧 Meeting Email Alerts" panel on the right');
  console.log('   4. Click "🧪 Test Meeting Email" to trigger a notification');
  console.log('   5. Send yourself a real email with meeting keywords to test real-time detection');
  console.log('\n🔗 Real-time Email Monitoring Architecture:');
  console.log('   New Email → 30s Polling → AI Analysis → WebSocket → UI Notification');
  console.log('\n✨ Phase 5 & 6 Ready: Response Generation + User Confirmation Flow');
}

// Run the test
testEmailMonitoringSystem().catch(console.error); 