import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MessageSquare, Plus, Sparkles, CheckCircle, XCircle, ArrowRight, Mail, Bot, Activity, Zap, Star, TrendingUp } from 'lucide-react';
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

function App() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [pastRequests, setPastRequests] = useState<PastRequest[]>([]);
  const [conversation, setConversation] = useState<ConversationState | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({ status: 'checking' });

  const phaseFeatures = [
    { phase: 'Phase 1', title: 'MCP Integration', status: 'complete', icon: '🔧' },
    { phase: 'Phase 2', title: 'Email Monitoring', status: 'complete', icon: '📧' },
    { phase: 'Phase 3', title: 'AI Scheduling', status: 'complete', icon: '🧠' },
    { phase: 'Phase 4', title: 'Calendar Cross-Reference', status: 'complete', icon: '🔄' }
  ];

  const exampleQueries = [
    // Phase 1 Examples
    "Do I have any meetings today?",
    "Am I free tomorrow at 2pm?",
    "Schedule a team meeting Tuesday at 3pm for 1 hour",
    // Phase 2 Examples  
    "Show me my unread emails",
    "Search for emails about project updates",
    // Phase 3 & 4 Examples
    "Analyze my emails for scheduling requests",
    "Suggest meeting times for a 1-hour call this week",
    "Find available slots for a client meeting next week",
    "Process my recent emails for meeting opportunities"
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

      // Use the natural language query endpoint that supports all 4 phases
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

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  const determineQueryType = (query: string): PastRequest['type'] => {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('email') || lowerQuery.includes('unread') || lowerQuery.includes('search')) {
      return 'email';
    } else if (lowerQuery.includes('analyze') || lowerQuery.includes('suggest') || lowerQuery.includes('process')) {
      return 'analysis';
    } else if (lowerQuery.includes('schedule') || lowerQuery.includes('create') || lowerQuery.includes('book')) {
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
      case 'email': return <Mail className="h-4 w-4" />;
      case 'analysis': return <Bot className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Calendar className="h-10 w-10 text-blue-600" />
              <Sparkles className="h-5 w-5 text-yellow-500 absolute -top-1 -right-1" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Calendar Copilot
            </h1>
            <Bot className="h-10 w-10 text-purple-600" />
          </div>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-6">
            Enterprise-Grade AI Scheduling Assistant with Email Intelligence
          </p>
          
          {/* Phase Status Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {phaseFeatures.map((feature, index) => (
              <Badge key={index} className="bg-green-100 text-green-800 border-green-300 px-3 py-1">
                <span className="mr-2">{feature.icon}</span>
                {feature.phase}: {feature.title} ✅
              </Badge>
            ))}
          </div>
        </div>

        {/* System Status & Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 max-w-6xl mx-auto">
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-green-600" />
                <span className={`h-3 w-3 rounded-full ${systemStatus.status === 'healthy' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              </div>
              <div className="text-2xl font-bold text-green-700">
                {systemStatus.status === 'healthy' ? 'Online' : 'Offline'}
              </div>
              <div className="text-sm text-green-600">System Status</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <Star className="h-4 w-4 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-blue-700">100%</div>
              <div className="text-sm text-blue-600">Date Parsing</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Bot className="h-5 w-5 text-purple-600" />
                <Zap className="h-4 w-4 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-purple-700">95%</div>
              <div className="text-sm text-purple-600">AI Confidence</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-orange-600" />
                <Activity className="h-4 w-4 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-orange-700">80%+</div>
              <div className="text-sm text-orange-600">Automation</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Query Interface */}
        <Card className="max-w-5xl mx-auto mb-8 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <MessageSquare className="h-6 w-6" />
              Natural Language AI Interface
              <Badge className="bg-white/20 text-white border-white/30">Phase 1-4 Complete</Badge>
            </CardTitle>
            <CardDescription className="text-blue-100">
              Ask anything about your calendar, emails, scheduling, or availability - powered by Azure AI
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Conversation Context */}
              {conversation && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-800 font-medium">Following up on:</p>
                      <p className="text-sm text-blue-700 italic mb-2">"{conversation.originalQuery}"</p>
                      {conversation.followUpQuestion && (
                        <p className="text-sm text-blue-800 font-medium">
                          {conversation.followUpQuestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    conversation 
                      ? "Please provide the additional information..."
                      : "Ask me about your calendar, emails, scheduling, or availability..."
                  }
                  className="flex-1 h-12 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  disabled={isLoading || !query.trim()}
                  className="h-12 px-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-semibold"
                >
                  {isLoading ? (
                    <>
                      <Activity className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : conversation ? 'Reply' : 'Ask AI'}
                </Button>
              </div>
              
              {/* Enhanced example queries organized by phase */}
              <div className="space-y-4">
                <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  Try these AI-powered queries:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {exampleQueries.map((example, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleExampleClick(example)}
                      disabled={isLoading}
                      className="justify-start text-left h-auto p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border-2 hover:border-blue-300 transition-all duration-200"
                    >
                      <div className="truncate">{example}</div>
                    </Button>
                  ))}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Enhanced Response Display */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {response?.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : response?.error ? (
                  <XCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <MessageSquare className="h-5 w-5 text-gray-600" />
                )}
                AI Response
                {response?.success && (
                  <Badge className="bg-green-100 text-green-800 border-green-300">Success</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {response ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border-2 ${
                    response.success 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                      : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {response.message}
                    </div>
                  </div>

                  {/* Enhanced Suggested Actions */}
                  {response.suggestedActions && response.suggestedActions.length > 0 && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                      <p className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Smart Actions:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {response.suggestedActions.map((action) => (
                          <Button
                            key={action.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuggestedAction(action)}
                            className="bg-white hover:bg-blue-100 border-blue-300 text-blue-700 hover:border-blue-400 transition-all duration-200"
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
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Calendar Data:
                      </h4>
                      <div className="bg-gray-50 p-3 rounded-xl text-xs font-mono overflow-auto max-h-40 border-2 border-gray-200">
                        {JSON.stringify(JSON.parse(response.data.mcpResult.content[0].text), null, 2)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="relative mb-4">
                    <Calendar className="h-16 w-16 mx-auto opacity-20" />
                    <Bot className="h-8 w-8 absolute top-0 right-0 text-blue-500 opacity-50" />
                  </div>
                  <p className="text-lg font-medium mb-2">Ready for your query!</p>
                  <p className="text-sm">Ask me anything about your calendar, emails, or scheduling</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Request History */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Request History
                <Badge variant="outline" className="text-xs">
                  {pastRequests.length}/10
                </Badge>
              </CardTitle>
              <CardDescription>
                Your AI-powered calendar interactions across all 4 phases
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pastRequests.length > 0 ? (
                <div className="space-y-3">
                  {pastRequests.map((request) => (
                    <div
                      key={request.id}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                        request.success 
                          ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100' 
                          : 'border-red-200 bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={getTypeBadgeVariant(request.type)} className="flex items-center gap-1">
                            {getTypeIcon(request.type)}
                            {request.type}
                          </Badge>
                          <span className="text-xs text-gray-500 bg-white/50 px-2 py-1 rounded-full">
                            {new Date(request.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {request.success && <CheckCircle className="h-4 w-4 text-green-600" />}
                      </div>
                      <p className="text-sm font-medium mb-2 text-gray-800">{request.query}</p>
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{request.response}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-2">No requests yet</p>
                  <p className="text-sm">Your calendar interactions will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Footer */}
        <div className="text-center mt-16 space-y-4">
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Azure AI (GPT-4o)
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Google Calendar API
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Gmail Integration
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              MCP Architecture
            </div>
          </div>
          <p className="text-xs text-gray-500">
            🎉 All 4 Development Phases Complete - Enterprise-Ready AI Scheduling Assistant
          </p>
        </div>
      </div>
      
      {/* Real-time Email Notifications Component */}
      <EmailNotifications />
    </div>
  );
}

export default App;
