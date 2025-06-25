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

interface EmailNotificationsProps {
  isOpen: boolean;
  onToggle: () => void;
}

const EmailNotifications: React.FC<EmailNotificationsProps> = ({ isOpen, onToggle }) => {
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

  // Generate Response for Email
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

  // Open Response for Editing
  const openResponseEditor = (notification: Notification) => {
    if (notification.generatedResponse) {
      setResponseModal({
        isOpen: true,
        notification,
        editedResponse: { ...notification.generatedResponse }
      });
    }
  };

  // Update Edited Response
  const updateEditedResponse = (field: keyof EmailResponse, value: any) => {
    setResponseModal(prev => ({
      ...prev,
      editedResponse: prev.editedResponse ? {
        ...prev.editedResponse,
        [field]: value
      } : null
    }));
  };

  // Send Email Response
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
        alert('❌ Failed to check emails: ' + result.error);
      }
    } catch (error: any) {
      console.error('Manual check failed:', error);
      alert('❌ Failed to check emails: ' + error.message);
    }
  };

  const getStatusColor = (status: Notification['responseStatus']) => {
    switch (status) {
      case 'generating': return '#f59e0b';
      case 'generated': return '#10b981';
      case 'editing': return '#3b82f6';
      case 'sending': return '#8b5cf6';
      case 'sent': return '#22c55e';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: Notification['responseStatus']) => {
    switch (status) {
      case 'generating': return 'Generating...';
      case 'generated': return 'Ready to Edit';
      case 'editing': return 'Editing';
      case 'sending': return 'Sending...';
      case 'sent': return 'Sent';
      case 'failed': return 'Failed';
      default: return '';
    }
  };

  return (
    <>
      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 999
          }}
          onClick={onToggle}
        />
      )}

      {/* Sidebar Panel */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          right: isOpen ? 0 : '-420px',
          width: '420px',
          height: '100vh',
          backgroundColor: 'white',
          boxShadow: isOpen ? '-4px 0 12px rgba(0,0,0,0.15)' : 'none',
          transition: 'right 0.3s ease-in-out',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>📧</div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                Meeting Alerts
              </h3>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                marginTop: '4px'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isConnected ? '#22c55e' : '#ef4444'
                }} />
                <span style={{ 
                  fontSize: '12px', 
                  color: isConnected ? '#16a34a' : '#dc2626',
                  fontWeight: '500'
                }}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '8px',
              color: '#6b7280',
              borderRadius: '4px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ✕
          </button>
        </div>

        {/* Test Controls */}
        <div style={{ 
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ 
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={testEmailMonitoring}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              🧪 Test Meeting Email
            </button>
            <button 
              onClick={manualEmailCheck}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              🔍 Manual Check
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto',
          padding: '16px'
        }}>
          {notifications.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#6b7280', 
              padding: '40px 20px',
              fontSize: '14px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📭</div>
              <div style={{ fontWeight: '500', marginBottom: '8px' }}>No meeting email notifications yet</div>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                Try the "Test Meeting Email" button above
              </div>
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id}
                style={{
                  border: `2px solid ${notification.isNew ? '#3b82f6' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '12px',
                  backgroundColor: notification.isNew ? '#eff6ff' : '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                {/* Email Header */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: '600', 
                      fontSize: '14px',
                      marginBottom: '6px',
                      color: '#1f2937'
                    }}>
                      {notification.data?.subject || 'Meeting Email'}
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
                      color: '#9ca3af',
                      borderRadius: '4px'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    ✕
                  </button>
                </div>

                {/* Confidence & Status */}
                <div className="text-xs text-gray-500 mt-1">
                  {notification.data?.confidence && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      🎯 {notification.data.confidence}% Confidence
                    </span>
                  )}
                  
                  {notification.responseStatus !== 'none' && (
                    <div style={{ 
                      fontSize: '12px',
                      padding: '4px 8px',
                      backgroundColor: getStatusColor(notification.responseStatus) + '20',
                      borderRadius: '4px',
                      color: getStatusColor(notification.responseStatus),
                      border: `1px solid ${getStatusColor(notification.responseStatus)}40`,
                      fontWeight: '500'
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
                    backgroundColor: '#f8fafc',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    fontStyle: 'italic',
                    border: '1px solid #e5e7eb'
                  }}>
                    "{notification.data.snippet.substring(0, 150)}..."
                  </div>
                )}

                {/* Generated Response Preview */}
                {notification.generatedResponse && notification.responseStatus === 'generated' && (
                  <div style={{ 
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: '600',
                      color: '#15803d',
                      marginBottom: '6px'
                    }}>
                      ✅ Response Ready ({notification.generatedResponse.responseType}):
                    </div>
                    <div style={{ 
                      fontSize: '12px',
                      color: '#166534',
                      marginBottom: '6px'
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

                {/* Action Buttons */}
                {notification.responseStatus === 'none' && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '6px', 
                    flexWrap: 'wrap',
                    marginTop: '8px'
                  }}>
                    <button
                      onClick={() => generateResponse(notification, 'accept')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        backgroundColor: '#22c55e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      ✅ Accept
                    </button>
                    <button
                      onClick={() => generateResponse(notification, 'counter-propose')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      🔄 Counter
                    </button>
                    <button
                      onClick={() => generateResponse(notification, 'decline')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      ❌ Decline
                    </button>
                    <button
                      onClick={() => generateResponse(notification, 'request-info')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      ❓ Ask Info
                    </button>
                  </div>
                )}

                {/* Edit/Send Buttons */}
                {notification.responseStatus === 'generated' && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px',
                    marginTop: '8px'
                  }}>
                    <button
                      onClick={() => openResponseEditor(notification)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        flex: 1
                      }}
                    >
                      ✏️ Edit Response
                    </button>
                    <button
                      onClick={() => sendResponse(notification, notification.generatedResponse!)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        flex: 1
                      }}
                    >
                      📤 Send
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Response Edit Modal */}
      {responseModal.isOpen && responseModal.notification && responseModal.editedResponse && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
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
                Edit Email Response
              </h3>
              <button
                onClick={() => setResponseModal({ isOpen: false, notification: null, editedResponse: null })}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px',
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
                fontWeight: '500',
                marginBottom: '6px',
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
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500',
                marginBottom: '6px',
                color: '#374151'
              }}>
                Message:
              </label>
              <textarea
                value={responseModal.editedResponse.body}
                onChange={(e) => updateEditedResponse('body', e.target.value)}
                rows={8}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setResponseModal({ isOpen: false, notification: null, editedResponse: null })}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => sendResponse(responseModal.notification!, responseModal.editedResponse!)}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                📤 Send Response
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmailNotifications; 