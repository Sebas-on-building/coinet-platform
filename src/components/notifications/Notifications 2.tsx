import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketProvider';
import { Card } from '@/components/ui/Card/Card';

const Notifications = () => {
  const ws = useWebSocket();
  const [alerts, setAlerts] = useState<any[]>([]);
  useEffect(() => {
    if (!ws) return;
    ws.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      setAlerts((prev) => [data, ...prev]);
    };
  }, [ws]);
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 1000 }}>
      {alerts.slice(0, 3).map((alert, i) => (
        <Card key={i} style={{ marginBottom: 12, background: 'var(--color-surface)', color: 'var(--color-text)' }}>
          <div>{alert.message}</div>
        </Card>
      ))}
    </div>
  );
};
export default Notifications; 