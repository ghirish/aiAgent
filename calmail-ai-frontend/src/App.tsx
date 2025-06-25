import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MessageSquare, Plus, Sparkles, CheckCircle, XCircle, ArrowRight, Mail, Bot, Activity, Zap, Star, TrendingUp, Menu } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import EmailNotifications from './components/EmailNotifications';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  htmlLink?: string;
  googleCalendarLink?: string;
  originalPrompt?: string;
  createdAt?: string;
}

export interface QueryResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  needsFollowUp?: boolean;
  followUpQuestion?: string;
  conversationId?: string;
  suggestedActions?: SuggestedAction[];
}

export interface SuggestedAction {
  id: string;
  label: string;
  action: string;
  data?: any;
}

export interface PastRequest {
  id: string;
  query: string;
  timestamp: string;
  success: boolean;
  response: string;
  type: 'query' | 'schedule' | 'update' | 'cancel' | 'availability' | 'email' | 'analysis';
  prompt?: string;
  eventTitle?: string;
  eventId?: string;
  error?: string;
}

export interface ConversationState {
  id: string;
  originalQuery: string;
  context: any;
  awaitingResponse: boolean;
  followUpQuestion: string;
}

export interface SystemStatus {
  status: string;
  services?: {
    mcp?: string;
    azureAI?: string;
  };
  message?: string;
}

// Component to render formatted calendar messages with proper indentation
const FormattedMessage: React.FC<{ message: string; className?: string }> = ({ message, className }) => {
  const lines = message.split('\n');
  
  return (
    <div className={className}>
      {lines.map((line, index) => {
        // Skip empty lines
        if (!line.trim()) return <div key={index} className="h-2" />;
        
        // Handle headers with emojis
        if (line.includes('📅 Found') || line.includes('⚠️ **PARTIALLY FREE**') || line.includes('✅ YES') || line.includes('❌ NO')) {
          return (
            <div key={index} className="font-semibold text-green-800 mb-3">
              {line.replace(/\*\*(.*?)\*\*/g, '$1')}
            </div>
          );
        }
        
        // Handle numbered items (main events)
        if (/^\d+\.\s/.test(line)) {
          return (
            <div key={index} className="mb-3">
              <div className="font-medium text-gray-900">
                {line.replace(/\*\*(.*?)\*\*/g, '$1')}
              </div>
            </div>
          );
        }
        
        // Handle indented lines (event details)
        if (line.startsWith('   ') || line.startsWith('\t')) {
          const cleanLine = line.trim().replace(/\*\*(.*?)\*\*/g, '$1');
          
          // Different styling for different types of details
          let iconClass = '';
          let textClass = 'text-gray-600';
          
          if (cleanLine.includes('🗓️')) {
            iconClass = 'text-blue-600';
          } else if (cleanLine.includes('📍')) {
            iconClass = 'text-red-500';
          } else if (cleanLine.includes('👥')) {
            iconClass = 'text-purple-600';
          } else if (cleanLine.includes('🕐')) {
            iconClass = 'text-green-600';
          }
          
          return (
            <div key={index} className={`ml-6 mb-1 text-sm ${textClass} ${iconClass}`}>
              {cleanLine}
            </div>
          );
        }
        
        // Handle conflict messages and other special lines
        if (line.includes('⚠️') || line.includes('❌') || line.includes('✅')) {
          return (
            <div key={index} className="my-2 text-sm text-gray-700">
              {line.replace(/\*\*(.*?)\*\*/g, '$1')}
            </div>
          );
        }
        
        // Default line formatting
        return (
          <div key={index} className="text-sm text-gray-700 mb-1">
            {line.replace(/\*\*(.*?)\*\*/g, '$1')}
          </div>
        );
      })}
    </div>
  );
};

function App() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [pastRequests, setPastRequests] = useState<PastRequest[]>([]);
  const [conversation, setConversation] = useState<ConversationState | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({ status: 'checking' });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const exampleQueries = [
    "Do I have any meetings today?",
    "Am I free tomorrow at 2pm?",
    "Schedule a team meeting Tuesday at 3pm for 1 hour",
    "Show me my unread emails",
    "Search for emails about project updates",
    "Analyze my emails for scheduling requests",
    "Suggest meeting times for a 1-hour call this week",
    "Find available slots for a client meeting next week"
  ];

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();
      setSystemStatus(data);
    } catch (error) {
      setSystemStatus({ status: 'error', message: 'Unable to connect to server' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;

    const originalQuery = query.trim();
    setIsLoading(true);
    setResponse(null);

    try {
      const requestBody = {
        query: originalQuery,
        conversationId: conversation?.id,
        context: conversation?.context
      };

      // Use the natural language query endpoint
      const response = await fetch('http://localhost:3000/api/calendar-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        const queryResponse: QueryResponse = {
          success: true,
          message: data.message,
          data: data.data,
          needsFollowUp: data.needsFollowUp,
          followUpQuestion: data.followUpQuestion,
          conversationId: data.conversationId,
          suggestedActions: data.suggestedActions
        };

        setResponse(queryResponse);

        // Handle conversation state
        if (data.needsFollowUp) {
          setConversation({
            id: data.conversationId || 'conv_' + Date.now().toString(36),
            originalQuery: conversation?.originalQuery || originalQuery,
            context: data.context || {},
            awaitingResponse: true,
            followUpQuestion: data.followUpQuestion
          });
        } else {
          setConversation(null);
        }

        // Add to past requests
        const pastRequest: PastRequest = {
          id: 'req_' + Date.now().toString(36),
          query: originalQuery,
          timestamp: new Date().toISOString(),
          success: true,
          response: data.message,
          type: determineQueryType(originalQuery)
        };
        setPastRequests(prev => [pastRequest, ...prev.slice(0, 9)]); // Keep last 10
      } else {
        const errorMsg = data.error || data.details || 'Failed to process request';
        setResponse({
          success: false,
          message: errorMsg,
          error: errorMsg
        });

        // Clear conversation on error
        setConversation(null);

        // Add failed request to history
        const pastRequest: PastRequest = {
          id: 'req_' + Date.now().toString(36),
          query: originalQuery,
          timestamp: new Date().toISOString(),
          success: false,
          response: errorMsg,
          type: determineQueryType(originalQuery)
        };
        setPastRequests(prev => [pastRequest, ...prev.slice(0, 9)]);
      }
    } catch (err) {
      const errorMsg = 'Failed to connect to calendar service. Make sure the API server is running.';
      setResponse({
        success: false,
        message: errorMsg,
        error: errorMsg
      });

      // Clear conversation on error
      setConversation(null);

      // Add failed request to history
      const pastRequest: PastRequest = {
        id: 'req_' + Date.now().toString(36),
        query: originalQuery,
        timestamp: new Date().toISOString(),
        success: false,
        response: errorMsg,
        type: 'query'
      };
      setPastRequests(prev => [pastRequest, ...prev.slice(0, 9)]);
    } finally {
      setIsLoading(false);
      setQuery('');
    }
  };

  const handleSuggestedAction = async (action: SuggestedAction) => {
    // Execute suggested action
    setQuery(action.action);
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  const determineQueryType = (query: string): PastRequest['type'] => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('schedule') || lowerQuery.includes('create') || lowerQuery.includes('book')) {
      return 'schedule';
    } else if (lowerQuery.includes('update') || lowerQuery.includes('change') || lowerQuery.includes('modify')) {
      return 'update';
    } else if (lowerQuery.includes('cancel') || lowerQuery.includes('delete') || lowerQuery.includes('remove')) {
      return 'cancel';
    } else if (lowerQuery.includes('free') || lowerQuery.includes('available') || lowerQuery.includes('availability')) {
      return 'availability';
    } else if (lowerQuery.includes('email') || lowerQuery.includes('message')) {
      return 'email';
    } else if (lowerQuery.includes('analyze') || lowerQuery.includes('suggest') || lowerQuery.includes('find')) {
      return 'analysis';
    } else {
      return 'query';
    }
  };

  const getTypeIcon = (type: PastRequest['type']) => {
    switch (type) {
      case 'schedule': return <Plus className="w-3 h-3" />;
      case 'update': return <ArrowRight className="w-3 h-3" />;
      case 'cancel': return <XCircle className="w-3 h-3" />;
      case 'availability': return <Clock className="w-3 h-3" />;
      case 'email': return <Mail className="w-3 h-3" />;
      case 'analysis': return <Bot className="w-3 h-3" />;
      default: return <MessageSquare className="w-3 h-3" />;
    }
  };

  const getTypeBadgeVariant = (type: PastRequest['type']) => {
    switch (type) {
      case 'schedule': return 'default';
      case 'update': return 'secondary';
      case 'cancel': return 'destructive';
      case 'availability': return 'outline';
      case 'email': return 'default';
      case 'analysis': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Cal mail AI</h1>
                <p className="text-sm text-gray-500">Google Calendar & Gmail AI Agent</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* System Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  systemStatus.status === 'healthy' ? 'bg-green-500' : 
                  systemStatus.status === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-sm text-gray-600">
                  {systemStatus.status === 'healthy' ? 'Connected' : 
                   systemStatus.status === 'checking' ? 'Connecting...' : 'Disconnected'}
                </span>
              </div>

              {/* Email Notifications Toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">Meeting Alerts</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Query Interface */}
          <div className="lg:col-span-2 space-y-6">
            {/* Query Input */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  <span>What would you like me to help you with?</span>
                </CardTitle>
                <CardDescription>
                  Ask me about your calendar, schedule meetings, check availability, or manage your emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Schedule a team meeting tomorrow at 2pm for 1 hour..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="pr-12 h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                    <Button 
                      type="submit" 
                      disabled={isLoading || !query.trim()}
                      className="absolute right-1 top-1 h-10 px-4 bg-blue-500 hover:bg-blue-600"
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </form>

                {/* Follow-up Question */}
                {conversation?.awaitingResponse && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Follow-up:</strong> {conversation.followUpQuestion}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Response Display */}
            {response && (
              <Card className={`shadow-lg border-0 ${
                response.success 
                  ? 'bg-green-50/80 border-green-200' 
                  : 'bg-red-50/80 border-red-200'
              } backdrop-blur-sm`}>
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${
                      response.success ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {response.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <FormattedMessage 
                        message={response.message} 
                        className={`leading-relaxed ${
                          response.success ? 'text-green-800' : 'text-red-800'
                        }`}
                      />

                      {/* Display calendar events if available */}
                      {response.success && response.data?.events && response.data.events.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-sm font-semibold text-gray-700">Calendar Events:</h4>
                          {response.data.events.map((event: CalendarEvent, index: number) => (
                            <div key={index} className="bg-white/70 p-3 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{event.title}</p>
                                  <p className="text-sm text-gray-600">
                                    {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleString()}
                                  </p>
                                  {event.location && (
                                    <p className="text-sm text-gray-500">📍 {event.location}</p>
                                  )}
                                </div>
                                {event.htmlLink && (
                                  <a 
                                    href={event.htmlLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                  >
                                    View →
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Display time slots if available */}
                      {response.success && response.data?.timeSlots && response.data.timeSlots.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-sm font-semibold text-gray-700">Available Time Slots:</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {response.data.timeSlots.slice(0, 6).map((slot: any, index: number) => (
                              <div key={index} className="bg-white/70 p-2 rounded border border-gray-200 text-sm">
                                <div className="font-medium">{new Date(slot.start).toLocaleDateString()}</div>
                                <div className="text-gray-600">
                                  {new Date(slot.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                                  {new Date(slot.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested Actions */}
                      {response.suggestedActions && response.suggestedActions.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-sm font-semibold text-gray-700">Suggested Actions:</h4>
                          <div className="flex flex-wrap gap-2">
                            {response.suggestedActions.map((action, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => handleSuggestedAction(action)}
                                className="text-xs"
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Example Queries */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-purple-500" />
                  <span>Try These Examples</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {exampleQueries.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(example)}
                      className="text-left p-3 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
                      disabled={isLoading}
                    >
                      "{example}"
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Recent Activity */}
          <div className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pastRequests.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No recent activity yet. Try asking me something!
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {pastRequests.map((request) => (
                      <div key={request.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={getTypeBadgeVariant(request.type)} className="text-xs">
                            {getTypeIcon(request.type)}
                            <span className="ml-1 capitalize">{request.type}</span>
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(request.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          "{request.query}"
                        </p>
                        <p className={`text-xs ${
                          request.success ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {request.response.length > 100 
                            ? `${request.response.substring(0, 100)}...` 
                            : request.response
                          }
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Email Notifications Sidebar */}
      <EmailNotifications 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
    </div>
  );
}

export default App;
