import React from 'react';
import { CalendarEvent } from '../App';
import './EventDisplay.css';

interface EventDisplayProps {
  events: CalendarEvent[];
}

const EventDisplay: React.FC<EventDisplayProps> = ({ events }) => {
  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const calculateDuration = (start: string, end: string) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    
    if (duration >= 60) {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${duration}m`;
  };

  const formatCreatedTime = (createdAt?: string) => {
    if (!createdAt) return '';
    
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just created';
    if (diffMinutes < 60) return `Created ${diffMinutes} min ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Created ${diffHours}h ago`;
    
    return `Created ${date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    })}`;
  };

  const getEventId = (event: CalendarEvent): string => {
    if (event.id && typeof event.id === 'string' && event.id.length > 0) {
      return event.id.substring(0, 8);
    }
    return 'new';
  };

  if (events.length === 0) {
    return (
      <div className="event-display-container">
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No events created yet</h3>
          <p>Events you create will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-display-container">
      <h2>📅 Created Events</h2>
      
      <div className="events-list">
        {events.map((event, index) => {
          // Safe checks for required fields
          if (!event.start || !event.end) {
            return null; // Skip events without required time data
          }

          const startFormat = formatDateTime(event.start);
          const endFormat = formatDateTime(event.end);
          const duration = calculateDuration(event.start, event.end);
          const createdTime = formatCreatedTime(event.createdAt);
          const eventId = getEventId(event);
          
          return (
            <div key={event.id || `event-${index}`} className="event-card">
              <div className="event-header">
                <h3 className="event-title">{event.title || 'Untitled Event'}</h3>
                <div className="event-id">#{eventId}</div>
              </div>
              
              {event.originalPrompt && (
                <div className="original-prompt">
                  <span className="prompt-label">📝 Original request:</span>
                  <span className="prompt-text">"{event.originalPrompt}"</span>
                </div>
              )}
              
              <div className="event-details">
                <div className="detail-row">
                  <span className="detail-icon">📅</span>
                  <span className="detail-text">{startFormat.date}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-icon">🕐</span>
                  <span className="detail-text">
                    {startFormat.time} - {endFormat.time} ({duration})
                  </span>
                </div>
                
                {event.location && (
                  <div className="detail-row">
                    <span className="detail-icon">📍</span>
                    <span className="detail-text">{event.location}</span>
                  </div>
                )}
                
                {event.description && (
                  <div className="detail-row">
                    <span className="detail-icon">📝</span>
                    <span className="detail-text">{event.description}</span>
                  </div>
                )}
              </div>
              
              <div className="event-footer">
                {createdTime && (
                  <span className="created-time">{createdTime}</span>
                )}
                {event.googleCalendarLink && (
                  <a 
                    href={event.googleCalendarLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="calendar-link"
                  >
                    📅 View in Google Calendar
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventDisplay; 