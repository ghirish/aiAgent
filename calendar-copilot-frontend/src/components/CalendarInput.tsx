import React, { useState } from 'react';
import { CalendarEvent } from '../App';
import './CalendarInput.css';

interface CalendarInputProps {
  onEventCreated: (event: CalendarEvent, originalPrompt: string) => void;
  onRequestFailed: (prompt: string, error: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const CalendarInput: React.FC<CalendarInputProps> = ({ 
  onEventCreated, 
  onRequestFailed,
  isLoading, 
  setIsLoading 
}) => {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastCreatedEvent, setLastCreatedEvent] = useState<CalendarEvent | null>(null);
  const [keepPrompt, setKeepPrompt] = useState(true);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);

  const examplePrompts = [
    "What meetings do I have today?",
    "Schedule a team meeting tomorrow at 3pm",
    "Am I free at 2pm on Friday?",
    "Create a lunch meeting with John next Tuesday at 12:30pm",
    "Do I have any conflicts this week?",
    "Find me a good time for a 1-hour meeting next week",
    "Show me my schedule for tomorrow"
  ];

  const formatEventDetails = (event: CalendarEvent) => {
    const startTime = new Date(event.start);
    const endTime = new Date(event.end);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    
    return {
      date: startTime.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: startTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      duration: duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      setError('Please enter a calendar request');
      return;
    }

    const originalPrompt = prompt.trim();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setLastCreatedEvent(null);

    try {
      // Determine if this is a query or create request
      const isQuery = isQuestionQuery(originalPrompt);
      const endpoint = isQuery ? '/api/query' : '/api/create-event';
      
      console.log(`Routing to ${endpoint} for: "${originalPrompt}"`);

      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: originalPrompt }),
      });

      const data = await response.json();

      if (response.ok) {
        if (isQuery) {
          // Handle query response - show LLM's answer
          handleQueryResponse(data, originalPrompt);
        } else {
          // Handle event creation response
          handleEventCreationResponse(data, originalPrompt);
        }
        
        // Only clear prompt if user wants it cleared
        if (!keepPrompt) {
          setPrompt('');
        }
      } else {
        const errorMsg = data.error || data.details || 'Failed to process request';
        setError(errorMsg);
        onRequestFailed(originalPrompt, errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Failed to connect to calendar service. Make sure the API server is running.';
      setError(errorMsg);
      onRequestFailed(originalPrompt, errorMsg);
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if this is a question/query vs a create event request
  const isQuestionQuery = (text: string): boolean => {
    const lowerText = text.toLowerCase().trim();
    
    // Question words and patterns
    const questionPatterns = [
      /^what/,
      /^when/,
      /^where/,
      /^who/,
      /^how/,
      /^do i have/,
      /^am i/,
      /^can i/,
      /^is there/,
      /^are there/,
      /^find me/,
      /^show me/,
      /^tell me/,
      /^check/,
      /\?$/
    ];
    
    // Keywords that indicate queries
    const queryKeywords = [
      'today', 'tomorrow', 'this week', 'next week',
      'free', 'busy', 'available', 'schedule',
      'meetings', 'events', 'conflicts'
    ];
    
    // Check for question patterns
    const hasQuestionPattern = questionPatterns.some(pattern => pattern.test(lowerText));
    
    // Check for creation keywords
    const creationKeywords = [
      'schedule', 'create', 'book', 'set up', 'add', 'make'
    ];
    const hasCreationKeyword = creationKeywords.some(keyword => 
      lowerText.startsWith(keyword) || lowerText.includes(`${keyword} a`) || lowerText.includes(`${keyword} an`)
    );
    
    // If it has question patterns, it's likely a query
    if (hasQuestionPattern) return true;
    
    // If it explicitly starts with creation words, it's likely event creation
    if (hasCreationKeyword && !hasQuestionPattern) return false;
    
    // Default: if it contains query keywords without creation intent, treat as query
    const hasQueryKeywords = queryKeywords.some(keyword => lowerText.includes(keyword));
    return hasQueryKeywords && !hasCreationKeyword;
  };

  const handleQueryResponse = (data: any, originalPrompt: string) => {
    try {
      let responseMessage = '';
      let calendarData = null;
      
      if (data.message && data.message.content && data.message.content[0]) {
        const content = data.message.content[0];
        if (content.text) {
          try {
            // Parse the nested JSON response
            const parsedResponse = JSON.parse(content.text);
            responseMessage = parsedResponse.message || 'Query processed successfully';
            
            // Extract calendar data for display
            if (parsedResponse.data) {
              calendarData = parsedResponse.data;
            }
            
          } catch (parseError) {
            responseMessage = content.text;
          }
        }
      } else {
        responseMessage = data.message || 'Query processed successfully';
      }
      
      // Format the response with actual data
      let formattedResponse = `🤖 ${responseMessage}`;
      
      if (calendarData) {
        formattedResponse += '\n\n';
        
        // Handle different types of calendar data
        if (calendarData['smart-event-search']) {
          const searchData = calendarData['smart-event-search'];
          
          if (searchData.events && searchData.events.length > 0) {
            formattedResponse += '📅 Your Events:\n';
            searchData.events.forEach((event: any, index: number) => {
              const startTime = new Date(event.start.dateTime);
              const endTime = new Date(event.end.dateTime);
              const timeStr = `${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
              const dateStr = startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              
              formattedResponse += `${index + 1}. ${event.summary}\n`;
              formattedResponse += `   📅 ${dateStr} at ${timeStr}\n`;
              if (event.location && event.location !== 'TBD') {
                formattedResponse += `   📍 ${event.location}\n`;
              }
              formattedResponse += '\n';
            });
          }
          
          if (searchData.summary) {
            formattedResponse += `📊 Summary: ${searchData.summary.totalEvents} total events`;
            if (searchData.summary.upcomingToday > 0) {
              formattedResponse += `, ${searchData.summary.upcomingToday} today`;
            }
            formattedResponse += '\n';
          }
          
          if (searchData.insights && searchData.insights.length > 0) {
            formattedResponse += '\n💡 Insights:\n';
            searchData.insights.forEach((insight: string) => {
              formattedResponse += `• ${insight}\n`;
            });
          }
        }
        
        // Handle time slot recommendations with buttons
        if (calendarData['find-optimal-slots'] && Array.isArray(calendarData['find-optimal-slots'])) {
          formattedResponse += '⏰ Available Time Slots:\n';
          calendarData['find-optimal-slots'].forEach((slot: any, index: number) => {
            const startTime = new Date(slot.start);
            const endTime = new Date(slot.end);
            const timeStr = `${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
            const dateStr = startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            
            formattedResponse += `${index + 1}. ${dateStr} at ${timeStr}`;
            if (slot.reasoning) {
              formattedResponse += ` (${slot.reasoning})`;
            }
            formattedResponse += '\n';
          });
          
          // Store the slots for interactive buttons
          setAvailableSlots(calendarData['find-optimal-slots']);
        }
      }
      
      setSuccess(formattedResponse);
      
    } catch (parseError) {
      console.error('Error parsing query response:', parseError);
      setSuccess(`🤖 Query processed successfully`);
    }
  };

  const handleEventCreationResponse = (data: any, originalPrompt: string) => {
    if (data.action === 'created' && data.event) {
      // Successful event creation
      const event: CalendarEvent = {
        id: data.event.id || 'temp_' + Date.now(),
        title: data.event.summary || data.event.title || 'New Event',
        start: data.event.start?.dateTime || data.event.start || new Date().toISOString(),
        end: data.event.end?.dateTime || data.event.end || new Date().toISOString(),
        location: data.event.location || '',
        description: data.event.description || '',
        googleCalendarLink: data.event.htmlLink || `https://calendar.google.com/calendar/event?eid=${data.event.id}`,
        originalPrompt: originalPrompt
      };
      
      const details = formatEventDetails(event);
      setSuccess(`✅ Event created successfully!\n📅 ${details.date} at ${details.time} (${details.duration})`);
      setLastCreatedEvent(event);
      onEventCreated(event, originalPrompt);
      
    } else if (data.action === 'analyzed') {
      // AI analyzed but didn't create event - parse the detailed response
      let responseMessage = '';
      let calendarData = null;
      
      if (typeof data.message === 'object' && data.message.content) {
        const content = data.message.content[0];
        if (content && content.text) {
          try {
            const parsedResponse = JSON.parse(content.text);
            responseMessage = parsedResponse.message || 'Request analyzed';
            
            if (parsedResponse.data) {
              calendarData = parsedResponse.data;
            }
          } catch {
            responseMessage = content.text;
          }
        }
      } else {
        responseMessage = data.message || 'Request analyzed';
      }
      
      // Format response with actual suggestions/slots
      let formattedResponse = `🤖 ${responseMessage}`;
      
      if (calendarData && calendarData['find-optimal-slots'] && Array.isArray(calendarData['find-optimal-slots'])) {
        formattedResponse += '\n\n⏰ Suggested Time Slots:\n';
        calendarData['find-optimal-slots'].forEach((slot: any, index: number) => {
          const startTime = new Date(slot.start);
          const endTime = new Date(slot.end);
          const timeStr = `${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
          const dateStr = startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          
          formattedResponse += `${index + 1}. ${dateStr} at ${timeStr}`;
          if (slot.reasoning) {
            formattedResponse += ` (${slot.reasoning})`;
          }
          formattedResponse += '\n';
        });
        formattedResponse += '\n💡 Would you like me to create an event for any of these times?';
      }
      
      setSuccess(formattedResponse);
    } else {
      // Generic success
      setSuccess(`✅ ${data.message || 'Request processed successfully'}`);
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  const handleClearPrompt = () => {
    setPrompt('');
    setError(null);
    setSuccess(null);
  };

  // Handle slot selection for event creation
  const handleSlotSelection = async (slot: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Extract event details from original prompt
      const eventTitle = extractEventTitle(prompt);
      
      const eventData = {
        title: eventTitle,
        start: slot.start,
        end: slot.end,
        location: extractLocation(prompt) || 'TBD',
        description: `Created from Calendar Copilot suggestion: "${prompt}"`
      };

      const response = await fetch('http://localhost:3001/api/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `Create "${eventTitle}" on ${new Date(slot.start).toLocaleDateString()} at ${new Date(slot.start).toLocaleTimeString()}`
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.action === 'created') {
        const event: CalendarEvent = {
          id: data.event.id,
          title: data.event.summary || eventTitle,
          start: data.event.start?.dateTime || slot.start,
          end: data.event.end?.dateTime || slot.end,
          location: data.event.location || eventData.location,
          description: data.event.description || eventData.description,
          googleCalendarLink: data.event.htmlLink || `https://calendar.google.com/calendar/event?eid=${data.event.id}`,
          originalPrompt: prompt
        };
        
        onEventCreated(event, prompt);
        setSuccess(`✅ Event "${eventTitle}" created successfully!\n📅 ${new Date(slot.start).toLocaleDateString()} at ${new Date(slot.start).toLocaleTimeString()}`);
        setAvailableSlots([]); // Clear slots after creation
        setLastCreatedEvent(event);
      } else {
        setError('Failed to create event from selected slot');
      }
      
    } catch (error) {
      setError('Failed to create event from selected slot');
      console.error('Error creating event from slot:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions to extract details from prompt
  const extractEventTitle = (text: string): string => {
    // Extract title from prompts like "Create a lunch meeting with John"
    const patterns = [
      /(?:create|schedule|book|add)\s+(?:a\s+)?(.+?)(?:\s+(?:at|on|for|tomorrow|today|next))/i,
      /(?:create|schedule|book|add)\s+(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return 'Meeting';
  };

  const extractLocation = (text: string): string | null => {
    const locationPattern = /(?:at|in)\s+([^,\n]+)/i;
    const match = text.match(locationPattern);
    return match ? match[1].trim() : null;
  };

  return (
    <div className="calendar-input-container">
      <div className="input-section">
        <h2>🤖 Ask me anything about your calendar</h2>
        
        <form onSubmit={handleSubmit} className="input-form">
          <div className="prompt-input-container">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What meetings do I have today? or Schedule a lunch meeting tomorrow at 1pm..."
              className="prompt-input"
              rows={3}
              disabled={isLoading}
            />
            
            <div className="input-controls">
              <label className="keep-prompt-checkbox">
                <input
                  type="checkbox"
                  checked={keepPrompt}
                  onChange={(e) => setKeepPrompt(e.target.checked)}
                />
                Keep prompt after submission
              </label>
              
              <div className="input-buttons">
                <button
                  type="button"
                  onClick={handleClearPrompt}
                  className="clear-button"
                  disabled={isLoading}
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={isLoading || !prompt.trim()}
                >
                  {isLoading ? 'Processing...' : '🤖 Ask Calendar Copilot'}
                </button>
              </div>
            </div>
          </div>
        </form>

        {error && (
          <div className="response-message error-message">
            <span className="message-icon">❌</span>
            <div className="message-content">
              <strong>Error:</strong>
              <pre>{error}</pre>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 whitespace-pre-line">{success}</p>
            
            {/* Google Calendar link for created events */}
            {lastCreatedEvent && (
              <div className="mt-3">
                <a 
                  href={lastCreatedEvent.googleCalendarLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  📅 Open in Google Calendar
                </a>
              </div>
            )}
            
            {/* Interactive slot selection buttons */}
            {availableSlots.length > 0 && (
              <div className="mt-4">
                <p className="text-green-700 font-medium mb-2">Click a time slot to create your event:</p>
                <div className="space-y-2">
                  {availableSlots.map((slot, index) => {
                    const startTime = new Date(slot.start);
                    const endTime = new Date(slot.end);
                    const timeStr = `${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
                    const dateStr = startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleSlotSelection(slot)}
                        disabled={isLoading}
                        className="w-full text-left p-3 bg-white border border-green-300 rounded-lg hover:bg-green-50 hover:border-green-400 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-green-800">
                              {dateStr} at {timeStr}
                            </div>
                            {slot.reasoning && (
                              <div className="text-sm text-green-600 mt-1">
                                {slot.reasoning}
                              </div>
                            )}
                          </div>
                          <div className="text-green-600">
                            ➤ Create Event
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="examples-section">
        <h3>💡 Try these examples:</h3>
        <div className="examples-grid">
          {examplePrompts.map((example, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(example)}
              className="example-button"
              disabled={isLoading}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarInput; 