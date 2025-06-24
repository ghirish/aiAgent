import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const EmailNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket server
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('🔌 Connected to real-time email notifications');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from real-time email notifications');
      setIsConnected(false);
    });

    // Listen for meeting email notifications
    newSocket.on('meeting-email-notification', (notification) => {
      console.log('📧 New meeting email notification:', notification);
      
      setNotifications(prev => [{
        id: Date.now(),
        ...notification,
        isNew: true
      }, ...prev].slice(0, 10)); // Keep only last 10 notifications
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, isNew: false } : notif
      )
    );
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
    } catch (error) {
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
    } catch (error) {
      console.error('Manual check failed:', error);
      alert('❌ Failed to trigger manual check: ' + error.message);
    }
  };

  return (
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
          📧 Meeting Email Alerts
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

              {/* Confidence & Details */}
              {notification.data?.confidence && (
                <div style={{ 
                  fontSize: '12px',
                  marginBottom: '8px',
                  padding: '4px 8px',
                  backgroundColor: '#dbeafe',
                  borderRadius: '4px',
                  color: '#1e40af'
                }}>
                  🎯 AI Confidence: {(notification.data.confidence * 100).toFixed(0)}%
                </div>
              )}

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

              {/* Action Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '8px',
                flexWrap: 'wrap'
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
                
                <button
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                  onClick={() => alert('📅 Calendar integration coming in Phase 5 & 6!')}
                >
                  📅 View Calendar
                </button>
                
                <button
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                  onClick={() => alert('✉️ Response generation coming in Phase 5 & 6!')}
                >
                  ✉️ Draft Response
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EmailNotifications; 