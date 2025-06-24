#!/usr/bin/env node

/**
 * Comprehensive Email Notification System Test (CommonJS)
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
      title: '✅ System Check Complete',
      from: 'test@system.com',
      date: new Date().toISOString(),
      content: 'Direct notification test - verifying WebSocket connectivity and UI rendering.',
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

  // Test 2: Test meeting email 
  console.log('📧 TEST 2: Test meeting email creation');
  try {
    const response = await axios.post(`${BASE_URL}/api/test-meeting-email`);
    console.log(`✅ Test email responded (${response.status}):`, response.data);
  } catch (error) {
    console.error(`❌ Test email failed: ${error.message}`);
  }

  console.log('\n🎯 Tests completed! Check your UI for notifications.');
}

testNotificationSystem().catch(console.error); 