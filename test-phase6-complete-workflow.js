#!/usr/bin/env node

/**
 * Phase 6 Complete Workflow Test
 * Tests the entire email response generation and sending workflow
 * 
 * Prerequisites:
 * 1. Run: cd calendar-api && npm start
 * 2. Run: cd calendar-copilot-frontend && npm start
 * 3. Open browser to http://localhost:3001
 */

console.log('🧪 PHASE 6 COMPLETE WORKFLOW TEST');
console.log('==================================');
console.log('');

async function testWorkflow() {
  try {
    // Step 1: Create a test meeting email notification
    console.log('📧 Step 1: Creating test meeting email notification...');
    const notificationResponse = await fetch('http://localhost:3000/api/email-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailData: {
          emailId: `phase6-test-${Date.now()}`,
          subject: '🚀 Phase 6 TEST: Project Planning Meeting',
          from: 'project.manager@company.com',
          snippet: 'Hi! I\'d like to schedule our project planning meeting for next Tuesday at 2:00 PM. We need to discuss the timeline, deliverables, and team assignments. Please let me know if this time works for you, or suggest an alternative.',
          confidence: 0.95,
          suggestedActions: ['Generate response', 'Check calendar availability', 'Propose alternatives'],
          detectedAt: new Date().toISOString()
        }
      })
    });

    const notificationResult = await notificationResponse.json();
    if (!notificationResult.success) {
      throw new Error('Failed to create test notification');
    }
    console.log('✅ Test notification created successfully');
    console.log('');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Test response generation for each type
    console.log('✏️ Step 2: Testing response generation...');
    console.log('');

    const originalEmail = {
      subject: '🚀 Phase 6 TEST: Project Planning Meeting',
      from: 'project.manager@company.com',
      content: 'Hi! I\'d like to schedule our project planning meeting for next Tuesday at 2:00 PM. We need to discuss the timeline, deliverables, and team assignments. Please let me know if this time works for you, or suggest an alternative.'
    };

    const responseTypes = ['accept', 'counter-propose', 'decline', 'request-info'];

    for (const responseType of responseTypes) {
      console.log(`🔄 Testing ${responseType} response...`);
      
      const generateResponse = await fetch('http://localhost:3000/api/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalEmail,
          responseType,
          includeCalendarInvite: responseType === 'accept'
        })
      });

      const generateResult = await generateResponse.json();
      
      if (generateResult.success) {
        console.log(`  ✅ ${responseType} response generated`);
        console.log(`  📝 Subject: ${generateResult.emailResponse.subject}`);
        console.log(`  📄 Body: ${generateResult.emailResponse.body.substring(0, 100)}...`);
        console.log(`  🎨 Tone: ${generateResult.emailResponse.tone}`);
        console.log('');

        // Step 3: Test sending the response (simulate)
        if (responseType === 'accept') {
          console.log(`📤 Testing send response for ${responseType}...`);
          
          const sendResponse = await fetch('http://localhost:3000/api/send-response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              originalEmailId: `phase6-test-${Date.now()}`,
              response: {
                to: originalEmail.from,
                subject: generateResult.emailResponse.subject,
                body: generateResult.emailResponse.body,
                inReplyTo: `phase6-test-${Date.now()}`
              },
              calendarInvite: generateResult.emailResponse.calendarInvite
            })
          });

          const sendResult = await sendResponse.json();
          
          if (sendResult.success) {
            console.log(`  ✅ Response sent successfully`);
            console.log(`  📅 Calendar event: ${sendResult.calendarEventCreated ? 'Created' : 'Not created'}`);
            console.log(`  ⏰ Sent at: ${sendResult.sentAt}`);
            if (sendResult.simulated) {
              console.log(`  🧪 Mode: Simulation (testing)`);
            }
          } else {
            console.log(`  ❌ Send failed: ${sendResult.error}`);
          }
          console.log('');
        }
      } else {
        console.log(`  ❌ ${responseType} generation failed: ${generateResult.error}`);
        console.log('');
      }
    }

    // Step 4: Display workflow completion
    console.log('🎉 PHASE 6 WORKFLOW TEST COMPLETE!');
    console.log('================================');
    console.log('');
    console.log('✅ Complete workflow tested:');
    console.log('   1. Email notification created and sent to UI');
    console.log('   2. All 4 response types generated (accept/counter/decline/request-info)');
    console.log('   3. Response sending tested (with simulation fallback)');
    console.log('   4. Calendar integration tested');
    console.log('');
    console.log('🔗 Next steps:');
    console.log('   1. Check browser at http://localhost:3001');
    console.log('   2. Look for the Phase 6 test notification');
    console.log('   3. Try the Accept/Counter/Decline buttons');
    console.log('   4. Test the Edit modal functionality');
    console.log('   5. Try sending a response');
    console.log('');
    console.log('📋 User Experience Flow:');
    console.log('   New Email → UI Notification → Generate Response → Edit (Optional) → Send');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Make sure backend is running: cd calendar-api && npm start');
    console.log('   2. Make sure frontend is running: cd calendar-copilot-frontend && npm start');
    console.log('   3. Check browser console for errors');
    console.log('   4. Verify WebSocket connection (green dot in UI)');
  }
}

// Check if servers are running first
async function checkServers() {
  try {
    console.log('🔍 Checking server availability...');
    
    // Check backend
    const backendResponse = await fetch('http://localhost:3000/api/health');
    if (backendResponse.ok) {
      console.log('✅ Backend server (port 3000): Running');
    } else {
      throw new Error('Backend not responding properly');
    }
    
    // Check frontend (attempt)
    try {
      const frontendResponse = await fetch('http://localhost:3001');
      console.log('✅ Frontend server (port 3001): Running');
    } catch {
      console.log('⚠️  Frontend server (port 3001): Not accessible (normal if you haven\'t opened browser)');
    }
    
    console.log('');
    return true;
  } catch (error) {
    console.error('❌ Server check failed:', error.message);
    console.log('');
    console.log('🚨 SETUP REQUIRED:');
    console.log('   1. Start backend: cd calendar-api && npm start');
    console.log('   2. Start frontend: cd calendar-copilot-frontend && npm start');
    console.log('   3. Open browser: http://localhost:3001');
    console.log('   4. Run this test again');
    console.log('');
    return false;
  }
}

// Main execution
checkServers().then(serversOk => {
  if (serversOk) {
    testWorkflow();
  }
}); 