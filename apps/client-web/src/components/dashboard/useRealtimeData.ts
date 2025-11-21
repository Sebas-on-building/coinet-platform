import { useEffect, useState } from 'react';

export function useRealtimeData(topic) {
  const [data, setData] = useState(null);
  useEffect(() => {
    const ws = new WebSocket('wss://api.coinet.com/stream');
    ws.onopen = () => ws.send(JSON.stringify({ subscribe: topic }));
    ws.onmessage = e => setData(JSON.parse(e.data));
    return () => ws.close();
  }, [topic]);
  return data;
} 