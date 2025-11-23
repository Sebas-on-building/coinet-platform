import React from 'react';
import { useOthers, useSelf, useBroadcastEvent, useEventListener } from '@liveblocks/react';
import styles from './design.module.css';

interface AIHistoryEvent {
  id: string;
  user: { name: string; avatarUrl?: string; color?: string };
  type: 'query' | 'response' | 'action';
  content: string;
  timestamp: number;
}

export const AISharedHistory: React.FC<{ events: AIHistoryEvent[] }> = ({ events }) => {
  return (
    <div className={styles['ai-shared-history']} aria-label="AI Collaboration History">
      {events.map((event) => (
        <div key={event.id} className={styles['ai-history-event']} style={{ borderLeftColor: event.user.color || '#00ffe7' }}>
          <div className={styles['ai-history-avatar']} style={{ background: event.user.color || '#00ffe7' }}>
            {event.user.avatarUrl ? (
              <img src={event.user.avatarUrl} alt={event.user.name} />
            ) : (
              <span>{event.user.name[0]}</span>
            )}
          </div>
          <div className={styles['ai-history-content']}>
            <div className={styles['ai-history-meta']}>
              <span className={styles['ai-history-user']}>{event.user.name}</span>
              <span className={styles['ai-history-type']}>{event.type}</span>
              <span className={styles['ai-history-time']}>{new Date(event.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className={styles['ai-history-text']}>{event.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
}; 