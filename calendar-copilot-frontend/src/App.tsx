import React, { useState } from 'react';
import { Calendar, Clock, MessageSquare, Plus, Sparkles, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';

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
  type: 'query' | 'schedule' | 'update' | 'cancel' | 'availability';
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

function App() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [pastRequests, setPastRequests] = useState<PastRequest[]>([]);
  const [conversation, setConversation] = useState<ConversationState | null>(null);

  const exampleQueries = [
    "What events do I have tomorrow?",
    "Schedule a team meeting tomorrow at 3pm for 1 hour",
    "Am I free at 2pm today?",
    "Update the working test meeting to be 2 hours long",
    "Cancel the test meeting",
    "Schedule a lunch meeting with John next Tuesday at 12:30pm"
  ];

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
      setConversation(null);
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
      setQuery('');
    }
  };

  const handleSuggestedAction = async (action: SuggestedAction) => {
    setQuery(action.action);
    // Trigger form submission
    const formEvent = new Event('submit') as any;
    formEvent.preventDefault = () => {};
    await handleSubmit(formEvent);
  };

  const determineQueryType = (query: string): PastRequest['type'] => {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('schedule') || lowerQuery.includes('create') || lowerQuery.includes('book')) {
      return 'schedule';
    } else if (lowerQuery.includes('update') || lowerQuery.includes('change') || lowerQuery.includes('modify')) {
      return 'update';
    } else if (lowerQuery.includes('cancel') || lowerQuery.includes('delete') || lowerQuery.includes('remove')) {
      return 'cancel';
    } else if (lowerQuery.includes('free') || lowerQuery.includes('available') || lowerQuery.includes('busy')) {
      return 'availability';
    } else {
      return 'query';
    }
  };

  const getTypeIcon = (type: PastRequest['type']) => {
    switch (type) {
      case 'schedule': return <Plus className="h-4 w-4" />;
      case 'update': return <Clock className="h-4 w-4" />;
      case 'cancel': return <XCircle className="h-4 w-4" />;
      case 'availability': return <CheckCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeBadgeVariant = (type: PastRequest['type']) => {
    switch (type) {
      case 'schedule': return 'default';
      case 'update': return 'secondary';
      case 'cancel': return 'destructive';
      case 'availability': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Calendar className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Calendar Copilot</h1>
            <Sparkles className="h-8 w-8 text-yellow-500" />
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            AI-powered calendar management with conflict detection and smart scheduling
          </p>
        </div>

        {/* Main Query Interface */}
        <Card className="max-w-4xl mx-auto mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Ask your calendar anything
            </CardTitle>
            <CardDescription>
              Schedule meetings, check availability, update events, or ask about your calendar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Conversation Context */}
              {conversation && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-800 font-medium">Following up on:</p>
                      <p className="text-sm text-blue-700 italic">"{conversation.originalQuery}"</p>
                      {conversation.followUpQuestion && (
                        <p className="text-sm text-blue-800 mt-2 font-medium">
                          {conversation.followUpQuestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    conversation 
                      ? "Please provide the additional information..."
                      : "What would you like to do with your calendar?"
                  }
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading || !query.trim()}>
                  {isLoading ? 'Processing...' : conversation ? 'Reply' : 'Ask'}
                </Button>
              </div>
              
              {/* Example queries */}
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-500">Try:</span>
                {exampleQueries.map((example, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery(example)}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Response Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {response?.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : response?.error ? (
                  <XCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <MessageSquare className="h-5 w-5" />
                )}
                Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              {response ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${
                    response.success 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm">
                      {response.message}
                    </div>
                  </div>

                  {/* Suggested Actions */}
                  {response.suggestedActions && response.suggestedActions.length > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-3">Quick Actions:</p>
                      <div className="flex flex-wrap gap-2">
                        {response.suggestedActions.map((action) => (
                          <Button
                            key={action.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuggestedAction(action)}
                            className="bg-white hover:bg-blue-100 border-blue-300 text-blue-700"
                            disabled={isLoading}
                          >
                            <ArrowRight className="h-3 w-3 mr-1" />
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {response.data?.mcpResult?.content?.[0]?.text && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Calendar Data:</h4>
                      <div className="bg-gray-50 p-3 rounded text-xs font-mono overflow-auto max-h-40">
                        {JSON.stringify(JSON.parse(response.data.mcpResult.content[0].text), null, 2)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Ask a question to see the response here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Requests
              </CardTitle>
              <CardDescription>
                Your last 10 calendar interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pastRequests.length > 0 ? (
                <div className="space-y-3">
                  {pastRequests.map((request) => (
                    <div
                      key={request.id}
                      className={`p-3 rounded-lg border ${
                        request.success 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getTypeBadgeVariant(request.type)} className="flex items-center gap-1">
                            {getTypeIcon(request.type)}
                            {request.type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(request.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-medium mb-1">{request.query}</p>
                      <p className="text-xs text-gray-600 line-clamp-2">{request.response}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent requests</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p className="flex items-center justify-center gap-2">
            🤖 Powered by GPT-4, Google Calendar API & MCP
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
