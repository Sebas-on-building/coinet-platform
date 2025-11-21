import React, { useEffect, useState } from 'react';

// <Notifications>: Atomic, presentational, real-time WebSocket alert listener
// Stateless, extensible, global notification system
interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // WebSocket connection for real-time alerts
    const ws = new WebSocket('wss://api.coinet.com/alerts');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setNotifications((prev) => [...prev, data]);
    };
    return () => ws.close();
  }, []);

  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 1000 }}>
      {notifications.map((n) => (
        <div key={n.id} style={{
          background: n.type === 'error' ? '#FF453A' : n.type === 'warning' ? '#FFD60A' : n.type === 'success' ? '#30D158' : '#0A84FF',
          color: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
          padding: '16px 24px',
          marginBottom: 16,
          fontWeight: 500,
          fontSize: 16,
          minWidth: 280
        }}>
          {n.message}
        </div>
      ))}
    </div>
  );
}; 