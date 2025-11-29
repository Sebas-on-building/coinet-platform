import { useEffect } from 'react';

export function AlertListener({ userId, onAlert }: { userId: string, onAlert: (alert: any) => void }) {
  useEffect(() => {
    const ws = new WebSocket(`wss://your-ws-server/alerts?userId=${userId}`);
    ws.onmessage = (event) => {
      const alert = JSON.parse(event.data);
      onAlert(alert);
    };
    return () => ws.close();
  }, [userId, onAlert]);
  return null;
} 