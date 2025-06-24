#!/usr/bin/env node

/**
 * Comprehensive Email Notification System Test
 * Tests all pathways: Direct notification, Test email, Manual check, Real emails
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testNotificationSystem() {
  console.log('🧪 Starting comprehensive notification system test...\n');

  // Test 1: Direct notification (we know this works)
  console.log('📡 TEST 1: Direct notification endpoint');
  try {
    const response = await axios.post(`${BASE_URL}/api/email-notification`, {
      id: `test-direct-${Date.now()}`,
      type: 'TEST_DIRECT',
      title: '✅ Direct Test: System Check',
      from: 'test@system.com',
      date: new Date().toISOString(),
      content: 'This is a direct notification test to verify WebSocket connectivity.',
      confidence: 100,
      suggestedActions: [
        'Direct endpoint working perfectly',
        'WebSocket connection confirmed',
        'UI notifications functioning'
      ]
    });
    console.log(`✅ Direct notification sent successfully (${response.status})\n`);
  } catch (error) {
    console.error(`❌ Direct notification failed: ${error.message}\n`);
  }

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Test meeting email button
  console.log('📧 TEST 2: Test meeting email creation');
  try {
    const response = await axios.post(`${BASE_URL}/api/test-meeting-email`);
    console.log(`✅ Test email endpoint responded (${response.status}):`, response.data);
    console.log('📊 Check UI for notification...\n');
  } catch (error) {
    console.error(`❌ Test email failed: ${error.message}\n`);
  }

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Manual email check
  console.log('🔍 TEST 3: Manual email check');
  try {
    const response = await axios.post(`${BASE_URL}/api/check-emails`);
    console.log(`✅ Manual check endpoint responded (${response.status}):`, response.data);
    console.log('📊 This should find your real Gmail emails and trigger notifications\n');
  } catch (error) {
    console.error(`❌ Manual check failed: ${error.message}\n`);
  }

  // Test 4: Monitor status
  console.log('📊 TEST 4: Monitor status check');
  try {
    const response = await axios.get(`${BASE_URL}/api/email-monitor-status`);
    console.log(`✅ Monitor status (${response.status}):`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error(`❌ Status check failed: ${error.message}`);
  }

  console.log('\n🎯 Test completed! Check your UI for notifications.');
  console.log('💡 The system should have triggered multiple notifications if working correctly.');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled promise rejection:', reason);
});

// Run the test
testNotificationSystem().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
}); 