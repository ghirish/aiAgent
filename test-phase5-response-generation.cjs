const { MCPClient } = require('./calendar-api/mcp-client.cjs');
require('dotenv').config();

async function testPhase5ResponseGeneration() {
  console.log('🚀 Testing Phase 5: Email Response Generation\n');

  const client = new MCPClient();

  try {
    // Initialize the client
    await client.initialize();
    console.log('✅ Client initialized successfully\n');

    // Test scenarios for different response types
    const testScenarios = [
      {
        name: 'Accept Meeting Request',
        type: 'accept',
        originalEmail: {
          subject: 'Project Kickoff Meeting - Next Tuesday 2pm',
          from: 'john.doe@company.com',
          content: 'Hi! I\'d like to schedule our project kickoff meeting for next Tuesday at 2pm. Does this work for you? We\'ll cover the project timeline, deliverables, and team assignments. The meeting should take about an hour. Let me know if you can make it!'
        },
        selectedTime: '2024-01-16T14:00:00Z',
        includeCalendarInvite: true,
        meetingDetails: {
          location: 'Conference Room A',
          duration: 60,
          agenda: 'Project timeline, deliverables, team assignments'
        }
      },
      {
        name: 'Counter-Propose Meeting Time',
        type: 'counter-propose',
        originalEmail: {
          subject: 'Weekly Sync Meeting',
          from: 'sarah.smith@company.com',
          content: 'Hi there! Can we schedule our weekly sync for this Friday at 10am? I want to go over the latest progress and address any blockers.'
        },
        counterProposals: [
          'Friday at 2pm',
          'Monday at 10am',
          'Tuesday at 3pm'
        ],
        reason: 'I have a client meeting at 10am',
        additionalMessage: 'Looking forward to catching up on the project progress!'
      },
      {
        name: 'Decline Meeting Request',
        type: 'decline',
        originalEmail: {
          subject: 'All-Hands Meeting - Tomorrow 9am',
          from: 'ceo@company.com',
          content: 'Team, we\'re having an important all-hands meeting tomorrow at 9am to discuss Q4 results and Q1 planning. Please confirm your attendance.'
        },
        reason: 'I\'ll be traveling for a client meeting',
        additionalMessage: 'Please share the meeting notes with me afterward. I\'m particularly interested in the Q1 planning discussion.'
      },
      {
        name: 'Request More Information',
        type: 'request-info',
        originalEmail: {
          subject: 'Product Strategy Discussion',
          from: 'product.manager@company.com',
          content: 'Hi! I\'d like to set up a meeting to discuss our product strategy. Are you available sometime next week?'
        },
        additionalMessage: 'I\'m excited to contribute to the product strategy discussion!'
      }
    ];

    // Test each scenario
    for (const scenario of testScenarios) {
      console.log(`📧 Testing: ${scenario.name}`);
      console.log(`📋 Response Type: ${scenario.type}`);
      console.log(`📝 Original Subject: "${scenario.originalEmail.subject}"`);
      console.log(`👤 From: ${scenario.originalEmail.from}\n`);

      try {
        const result = await client.callTool('draft_scheduling_response', {
          originalEmail: scenario.originalEmail,
          responseType: scenario.type,
          selectedTime: scenario.selectedTime,
          counterProposals: scenario.counterProposals,
          reason: scenario.reason,
          additionalMessage: scenario.additionalMessage,
          includeCalendarInvite: scenario.includeCalendarInvite || false,
          meetingDetails: scenario.meetingDetails
        });

        // Parse the MCP response - it's nested in content[0].text
        let parsedResult;
        try {
          if (result.content && result.content[0] && result.content[0].text) {
            parsedResult = JSON.parse(result.content[0].text);
          } else {
            parsedResult = result; // fallback
          }
        } catch (parseError) {
          console.log('❌ Failed to parse MCP response:', parseError.message);
          parsedResult = { success: false, error: 'Failed to parse response' };
        }

        if (parsedResult.success) {
          console.log('✅ Response Generated Successfully!');
          console.log(`📮 Subject: ${parsedResult.emailResponse.subject}`);
          console.log(`🎭 Tone: ${parsedResult.emailResponse.tone}`);
          console.log(`⚡ Urgency: ${parsedResult.emailResponse.urgency}`);
          console.log('\n📄 Email Body:');
          console.log('─'.repeat(50));
          console.log(parsedResult.emailResponse.body);
          console.log('─'.repeat(50));

          if (parsedResult.calendarInvite) {
            console.log('\n📅 Calendar Invite Created:');
            console.log(`   Event ID: ${parsedResult.calendarInvite.eventId}`);
            console.log(`   Summary: ${parsedResult.calendarInvite.summary}`);
            console.log(`   Start: ${parsedResult.calendarInvite.start?.dateTime}`);
            console.log(`   Location: ${parsedResult.calendarInvite.location || 'Not specified'}`);
          }

          if (parsedResult.suggestedActions && parsedResult.suggestedActions.length > 0) {
            console.log('\n💡 Suggested Actions:');
            parsedResult.suggestedActions.forEach((action, index) => {
              console.log(`   ${index + 1}. ${action}`);
            });
          }
        } else {
          console.log('❌ Response Generation Failed:');
          console.log(`   Error: ${parsedResult.error}`);
        }

      } catch (error) {
        console.log('❌ Test Failed:');
        console.log(`   Error: ${error.message}`);
      }

      console.log('\n' + '='.repeat(80) + '\n');
    }

    // Test edge cases
    console.log('🧪 Testing Edge Cases\n');

    // Test with minimal data
    try {
      console.log('📧 Testing: Minimal Data (Accept)');
      const minimalResult = await client.callTool('draft_scheduling_response', {
        originalEmail: {
          subject: 'Quick Chat',
          from: 'colleague@company.com',
          content: 'Hey, want to chat sometime?'
        },
        responseType: 'accept'
      });

      // Parse the MCP response for minimal test too
      let parsedMinimalResult;
      try {
        if (minimalResult.content && minimalResult.content[0] && minimalResult.content[0].text) {
          parsedMinimalResult = JSON.parse(minimalResult.content[0].text);
        } else {
          parsedMinimalResult = minimalResult;
        }
      } catch (parseError) {
        parsedMinimalResult = { success: false, error: 'Failed to parse response' };
      }

      if (parsedMinimalResult.success) {
        console.log('✅ Minimal data test passed');
        console.log(`📮 Subject: ${parsedMinimalResult.emailResponse.subject}`);
        console.log(`📄 Body preview: ${parsedMinimalResult.emailResponse.body.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`❌ Minimal data test failed: ${error.message}`);
    }

    console.log('\n🎉 Phase 5 Response Generation Testing Complete!');
    console.log('\n📊 Test Summary:');
    console.log(`   Total Scenarios: ${testScenarios.length + 1}`);
    console.log('   Response Types Tested: accept, counter-propose, decline, request-info');
    console.log('   Features Tested: Calendar invites, custom messages, meeting details');

  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    await client.destroy();
  }
}

// Run the tests
testPhase5ResponseGeneration().catch(console.error); 