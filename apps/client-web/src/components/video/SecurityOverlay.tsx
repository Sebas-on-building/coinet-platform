import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function SecurityOverlay({ videoId }) {
  const { tokens } = useTheme();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const ws = new WebSocket(`wss://api.coinet.com/video/${videoId}/security`);
    ws.onmessage = (e) => setEvents(evts => [...evts, JSON.parse(e.data)]);
    return () => ws.close();
  }, [videoId]);

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, background: tokens.colors.background, color: tokens.colors.text,
      borderRadius: tokens.borderRadius.md, padding: 12, boxShadow: tokens.shadow.sm, zIndex: 100
    }} aria-label="Security Events" role="region">
      <strong>Security Events</strong>
      <ul>
        {events.slice(-5).map((e, i) => <li key={i}>{e.type}: {e.detail}</li>)}
      </ul>
    </div>
  );
} 