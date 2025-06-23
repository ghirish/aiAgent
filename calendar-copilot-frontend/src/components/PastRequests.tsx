import React from 'react';
import { PastRequest } from '../App';
import './PastRequests.css';

interface PastRequestsProps {
  requests: PastRequest[];
}

const PastRequests: React.FC<PastRequestsProps> = ({ requests }) => {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (requests.length === 0) {
    return (
      <div className="past-requests-container">
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No past requests yet</h3>
          <p>Your request history will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="past-requests-container">
      <h2>📜 Request History</h2>
      
      <div className="requests-list">
        {requests.map((request) => (
          <div 
            key={request.id} 
            className={`request-card ${request.success ? 'success' : 'failed'}`}
          >
            <div className="request-header">
              <span className={`status-icon ${request.success ? 'success' : 'failed'}`}>
                {request.success ? '✅' : '❌'}
              </span>
              <span className="timestamp">
                {formatTimestamp(request.timestamp)}
              </span>
            </div>
            
            <div className="request-content">
              <div className="prompt-text">
                "{request.prompt}"
              </div>
              
              {request.success && request.eventTitle && (
                <div className="success-result">
                  <span className="result-label">Created:</span>
                  <span className="event-title">{request.eventTitle}</span>
                  {request.eventId && (
                    <span className="event-id">#{request.eventId.substring(0, 8)}</span>
                  )}
                </div>
              )}
              
              {!request.success && request.error && (
                <div className="error-result">
                  <span className="result-label">Error:</span>
                  <span className="error-text">{request.error}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PastRequests; 