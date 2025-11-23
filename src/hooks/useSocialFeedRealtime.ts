import { useEffect, useRef, useState } from "react";

export interface SocialFeedEvent {
  id: string;
  type: "news" | "tweet" | "comment";
  user: string;
  avatar: string;
  content: string;
  sentiment: "positive" | "neutral" | "negative";
  timestamp: number;
}

export function useSocialFeedRealtime(symbol: string) {
  const [events, setEvents] = useState<SocialFeedEvent[]>([]);
  const [latest, setLatest] = useState<SocialFeedEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!symbol) return;
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    function connect() {
      ws = new WebSocket(
        (window.location.protocol === "https:" ? "wss://" : "ws://") +
          window.location.host +
          `/api/ws/social-feed/${symbol}`,
      );
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLatest(data);
          setEvents((prev) => {
            const next = [data, ...prev].slice(0, 50);
            return next;
          });
        } catch {}
      };
      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 2000);
      };
      ws.onerror = () => {
        ws?.close();
      };
      wsRef.current = ws;
    }
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [symbol]);

  const clearLatest = () => setLatest(null);
  return { events, latest, clearLatest };
}
