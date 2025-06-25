import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface NotificationData {
  emailId: string;
  subject: string;
  from: string;
  snippet: string;
  confidence: number;
  schedulingDetails?: any;
  suggestedActions?: string[];
  detectedAt: string;
}

interface Notification {
  id: number;
  type: string;
  data: NotificationData;
  timestamp: string;
  isNew: boolean;
  generatedResponse?: EmailResponse;
  responseStatus?: 'none' | 'generating' | 'generated' | 'editing' | 'sending' | 'sent' | 'failed';
}

interface EmailResponse {
  subject: string;
  body: string;
  tone: string;
  urgency: string;
  responseType: 'accept' | 'counter-propose' | 'decline' | 'request-info';
  calendarInvite?: any;
  suggestedActions: string[];
}

interface ResponseEditModal {
  isOpen: boolean;
  notification: Notification | null;
  editedResponse: EmailResponse | null;
}

const EmailNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [responseModal, setResponseModal] = useState<ResponseEditModal>({
    isOpen: false,
    notification: null,
    editedResponse: null
  });

  useEffect(() => {
    // Connect to WebSocket server
    console.log('🔌 Attempting to connect to WebSocket at http://localhost:3000');
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('🔌 Connected to real-time email notifications');
      console.log('✅ Socket ID:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from real-time email notifications');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Listen for meeting email notifications
    newSocket.on('meeting-email-notification', (notification: any) => {
      console.log('📧 New meeting email notification received:', notification);
      
      setNotifications(prev => [{
        id: Date.now(),
        ...notification,
        isNew: true,
        responseStatus: 'none'
      }, ...prev].slice(0, 10)); // Keep only last 10 notifications
    });

    // Also listen for the general email-notification event
    newSocket.on('email-notification', (notification: any) => {
      console.log('📧 General email notification received:', notification);
      
      setNotifications(prev => [{
        id: Date.now(),
        ...notification,
        isNew: true,
        responseStatus: 'none'
      }, ...prev].slice(0, 10));
    });

    return () => {
      console.log('🔌 Cleaning up WebSocket connection');
      newSocket.close();
    };
  }, []);

  const dismissNotification = (id: number) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, isNew: false } : notif
      )
    );
  };

  const updateNotificationStatus = (id: number, status: Notification['responseStatus'], response?: EmailResponse) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { 
          ...notif, 
          responseStatus: status,
          ...(response && { generatedResponse: response })
        } : notif
      )
    );
  };

  // Phase 6: Generate Response for Email
  const generateResponse = async (notification: Notification, responseType: EmailResponse['responseType']) => {
    updateNotificationStatus(notification.id, 'generating');
    
    try {
      const response = await fetch('http://localhost:3000/api/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          originalEmail: {
            subject: notification.data.subject,
            from: notification.data.from,
            content: notification.data.snippet
          },
          responseType,
          includeCalendarInvite: responseType === 'accept'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        updateNotificationStatus(notification.id, 'generated', result.emailResponse);
      } else {
        updateNotificationStatus(notification.id, 'failed');
        alert('❌ Failed to generate response: ' + result.error);
      }
    } catch (error: any) {
      console.error('Response generation failed:', error);
      updateNotificationStatus(notification.id, 'failed');
      alert('❌ Failed to generate response: ' + error.message);
    }
  };

  // Phase 6: Open Response for Editing
  const openResponseEditor = (notification: Notification) => {
    if (notification.generatedResponse) {
      setResponseModal({
        isOpen: true,
        notification,
        editedResponse: { ...notification.generatedResponse }
      });
    }
  };

  // Phase 6: Update Edited Response
  const updateEditedResponse = (field: keyof EmailResponse, value: any) => {
    setResponseModal(prev => ({
      ...prev,
      editedResponse: prev.editedResponse ? {
        ...prev.editedResponse,
        [field]: value
      } : null
    }));
  };

  // Phase 6: Send Email Response
  const sendResponse = async (notification: Notification, response: EmailResponse) => {
    updateNotificationStatus(notification.id, 'sending');
    setResponseModal({ isOpen: false, notification: null, editedResponse: null });
    
    try {
      const sendResponse = await fetch('http://localhost:3000/api/send-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          originalEmailId: notification.data.emailId,
          response: {
            to: notification.data.from,
            subject: response.subject,
            body: response.body,
            inReplyTo: notification.data.emailId
          },
          calendarInvite: response.calendarInvite
        })
      });
      
      const result = await sendResponse.json();
      
      if (result.success) {
        updateNotificationStatus(notification.id, 'sent');
        alert('✅ Response sent successfully!');
      } else {
        updateNotificationStatus(notification.id, 'failed');
        alert('❌ Failed to send response: ' + result.error);
      }
    } catch (error: any) {
      console.error('Send response failed:', error);
      updateNotificationStatus(notification.id, 'failed');
      alert('❌ Failed to send response: ' + error.message);
    }
  };

  const testEmailMonitoring = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/test-meeting-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      console.log('Test email result:', result);
      
      if (result.success) {
        alert('✅ Test meeting email created! Check the notifications above.');
      } else {
        alert('❌ Failed to create test email: ' + result.error);
      }
    } catch (error: any) {
      console.error('Test email failed:', error);
      alert('❌ Failed to test email monitoring: ' + error.message);
    }
  };

  const manualEmailCheck = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/check-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      console.log('Manual check result:', result);
      
      if (result.success) {
        alert('✅ Manual email check completed!');
      } else {
        alert('❌ Manual email check failed: ' + result.error);
      }
    } catch (error: any) {
      console.error('Manual check failed:', error);
      alert('❌ Failed to trigger manual check: ' + error.message);
    }
  };

  const testDirectNotification = async () => {
    try {
      console.log('🧪 Testing direct notification...');
      const response = await fetch('http://localhost:3000/api/email-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailData: {
            emailId: `ui-test-${Date.now()}`,
            subject: '🚀 Phase 6 TEST: Project Meeting Request',
            from: 'colleague@company.com',
            snippet: 'Hi! I\'d like to schedule a project meeting for next Tuesday at 2pm. Does this work for you? We need to discuss the project timeline and deliverables.',
            confidence: 0.95,
            suggestedActions: ['Generate response', 'Check calendar availability'],
            detectedAt: new Date().toISOString()
          }
        })
      });
      
      const result = await response.json();
      console.log('🚀 Direct test result:', result);
      
      if (result.success) {
        alert('✅ Phase 6 test sent! Try generating a response.');
      } else {
        alert('❌ Direct test failed: ' + result.error);
      }
    } catch (error: any) {
      console.error('Direct test failed:', error);
      alert('❌ Failed to send direct test: ' + error.message);
    }
  };

  const getStatusColor = (status: Notification['responseStatus']) => {
    switch (status) {
      case 'generating': return '#f59e0b';
      case 'generated': return '#10b981';
      case 'editing': return '#3b82f6';
      case 'sending': return '#f59e0b';
      case 'sent': return '#22c55e';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: Notification['responseStatus']) => {
    switch (status) {
      case 'generating': return '⏳ Generating...';
      case 'generated': return '✅ Response Ready';
      case 'editing': return '✏️ Editing';
      case 'sending': return '📤 Sending...';
      case 'sent': return '✅ Sent';
      case 'failed': return '❌ Failed';
      default: return '';
    }
  };

  return (
    <>
      <div className="email-notifications-container" style={{ 
      position: 'fixed', 
      top: '20px', 
      right: '20px', 
      width: '400px',
      maxHeight: '80vh',
      overflow: 'auto',
      zIndex: 1000,
      backgroundColor: 'white',
      border: '1px solid #ccc',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      padding: '16px'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '16px',
        borderBottom: '1px solid #eee',
        paddingBottom: '12px'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          📧 Calendar Copilot
        </h3>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px' 
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isConnected ? '#22c55e' : '#ef4444'
          }} />
          <span style={{ 
            fontSize: '12px', 
            color: isConnected ? '#16a34a' : '#dc2626' 
          }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Test Controls */}
      <div style={{ 
        marginBottom: '16px',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        <button 
          onClick={testEmailMonitoring}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🧪 Test Meeting Email
        </button>
        <button 
          onClick={manualEmailCheck}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔍 Manual Check
        </button>
        <button 
          onClick={testDirectNotification}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
                  >
            🚀 Phase 6 Test
          </button>
      </div>

      {/* Notifications List */}
      <div style={{ maxHeight: '400px', overflow: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#6b7280', 
            padding: '32px 16px',
            fontSize: '14px'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📭</div>
            <div>No meeting email notifications yet</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Try the "Test Meeting Email" button above
            </div>
          </div>
        ) : (
          notifications.map((notification) => (
            <div 
              key={notification.id}
              style={{
                border: `2px solid ${notification.isNew ? '#3b82f6' : '#e5e7eb'}`,
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: notification.isNew ? '#eff6ff' : '#f9fafb'
              }}
            >
              {/* Email Header */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '8px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: '600', 
                    fontSize: '14px',
                    marginBottom: '4px',
                    color: '#1f2937'
                  }}>
                    📧 {notification.data?.subject || 'Meeting Email'}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6b7280',
                    marginBottom: '4px'
                  }}>
                    From: {notification.data?.from || 'Unknown'}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#9ca3af'
                  }}>
                    {new Date(notification.timestamp).toLocaleString()}
                  </div>
                </div>
                
                <button
                  onClick={() => dismissNotification(notification.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '16px',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#6b7280'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Confidence & Status */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {notification.data?.confidence && (
                  <div style={{ 
                    fontSize: '12px',
                    padding: '4px 8px',
                    backgroundColor: '#dbeafe',
                    borderRadius: '4px',
                    color: '#1e40af'
                  }}>
                    🎯 {(notification.data.confidence * 100).toFixed(0)}%
                  </div>
                )}
                
                {notification.responseStatus !== 'none' && (
                  <div style={{ 
                    fontSize: '12px',
                    padding: '4px 8px',
                    backgroundColor: getStatusColor(notification.responseStatus) + '20',
                    borderRadius: '4px',
                    color: getStatusColor(notification.responseStatus),
                    border: `1px solid ${getStatusColor(notification.responseStatus)}40`
                  }}>
                    {getStatusText(notification.responseStatus)}
                  </div>
                )}
              </div>

              {/* Email Snippet */}
              {notification.data?.snippet && (
                <div style={{ 
                  fontSize: '13px',
                  color: '#4b5563',
                  backgroundColor: '#f3f4f6',
                  padding: '8px',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  fontStyle: 'italic'
                }}>
                  "{notification.data.snippet.substring(0, 150)}..."
                </div>
              )}

              {/* Generated Response Preview */}
              {notification.generatedResponse && notification.responseStatus === 'generated' && (
                <div style={{ 
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '4px',
                  padding: '8px',
                  marginBottom: '8px'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: '600',
                    color: '#15803d',
                    marginBottom: '4px'
                  }}>
                    ✅ Generated Response ({notification.generatedResponse.responseType}):
                  </div>
                  <div style={{ 
                    fontSize: '12px',
                    color: '#166534',
                    marginBottom: '4px'
                  }}>
                    <strong>Subject:</strong> {notification.generatedResponse.subject}
                  </div>
                  <div style={{ 
                    fontSize: '11px',
                    color: '#166534',
                    maxHeight: '60px',
                    overflow: 'hidden'
                  }}>
                    {notification.generatedResponse.body.substring(0, 120)}...
                  </div>
                </div>
              )}

              {/* Suggested Actions */}
              {notification.data?.suggestedActions && notification.data.suggestedActions.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '4px'
                  }}>
                    💡 Suggested Actions:
                  </div>
                  {notification.data.suggestedActions.slice(0, 3).map((action, index) => (
                    <div 
                      key={index}
                      style={{
                        fontSize: '11px',
                        color: '#6b7280',
                        marginLeft: '8px',
                        marginBottom: '2px'
                      }}
                    >
                      • {action}
                    </div>
                  ))}
                </div>
              )}

              {/* Phase 6: Response Action Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '6px',
                flexWrap: 'wrap',
                marginTop: '8px'
              }}>
                {notification.isNew && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    ✓ Mark Read
                  </button>
                )}
                
                {/* Response Generation Buttons */}
                {notification.responseStatus === 'none' && (
                  <>
                    <button
                      onClick={() => generateResponse(notification, 'accept')}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        backgroundColor: '#22c55e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      ✅ Accept
                    </button>
                    <button
                      onClick={() => generateResponse(notification, 'counter-propose')}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      🔄 Counter
                    </button>
                    <button
                      onClick={() => generateResponse(notification, 'decline')}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      ❌ Decline
                    </button>
                  </>
                )}
                
                {/* Edit and Send Buttons */}
                {notification.responseStatus === 'generated' && (
                  <>
                    <button
                      onClick={() => openResponseEditor(notification)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => notification.generatedResponse && sendResponse(notification, notification.generatedResponse)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        backgroundColor: '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      📤 Send
                    </button>
                  </>
                )}
                
                {notification.responseStatus === 'sent' && (
                  <div style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    borderRadius: '3px'
                  }}>
                    ✅ Response Sent
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>

    {/* Phase 6: Response Edit Modal */}
    {responseModal.isOpen && responseModal.notification && responseModal.editedResponse && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          padding: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '12px'
          }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
              ✏️ Edit Response
            </h3>
            <button
              onClick={() => setResponseModal({ isOpen: false, notification: null, editedResponse: null })}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600',
              marginBottom: '4px',
              color: '#374151'
            }}>
              Subject:
            </label>
            <input
              type="text"
              value={responseModal.editedResponse.subject}
              onChange={(e) => updateEditedResponse('subject', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600',
              marginBottom: '4px',
              color: '#374151'
            }}>
              Email Body:
            </label>
            <textarea
              value={responseModal.editedResponse.body}
              onChange={(e) => updateEditedResponse('body', e.target.value)}
              rows={12}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: '600',
                marginBottom: '4px',
                color: '#374151'
              }}>
                Tone:
              </label>
              <select
                value={responseModal.editedResponse.tone}
                onChange={(e) => updateEditedResponse('tone', e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: '600',
                marginBottom: '4px',
                color: '#374151'
              }}>
                Response Type:
              </label>
              <select
                value={responseModal.editedResponse.responseType}
                onChange={(e) => updateEditedResponse('responseType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                <option value="accept">Accept</option>
                <option value="counter-propose">Counter-Propose</option>
                <option value="decline">Decline</option>
                <option value="request-info">Request Info</option>
              </select>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => setResponseModal({ isOpen: false, notification: null, editedResponse: null })}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (responseModal.notification && responseModal.editedResponse) {
                  // Update the notification with edited response
                  updateNotificationStatus(responseModal.notification.id, 'generated', responseModal.editedResponse);
                  setResponseModal({ isOpen: false, notification: null, editedResponse: null });
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Save Changes
            </button>
            <button
              onClick={() => {
                if (responseModal.notification && responseModal.editedResponse) {
                  sendResponse(responseModal.notification, responseModal.editedResponse);
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📤 Send Now
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default EmailNotifications; 